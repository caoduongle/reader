# Data Model: Secure Web Article Fetching & Extraction Pipeline

**Feature Branch**: `029-fetch-url-hardening`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Request Entities

### `FetchUrlRequest`
Input payload submitted to `POST /api/fetch-url`.

| Field | Type | Validation Rules | Description |
|---|---|---|---|
| `url` | `string` | Required, non-empty, max 2048 chars, protocol must be `http:` or `https:`. | The absolute web URL of the article/chapter to fetch. |

Validation Schema (`fetchUrlSchema` in `server/validators/apiSchemas.js`):
```javascript
export const fetchUrlSchema = z.object({
  url: z
    .string({ required_error: 'Địa chỉ liên kết (URL) không được để trống.' })
    .trim()
    .min(1, 'Địa chỉ liên kết (URL) không được để trống.')
    .refine(
      (val) => {
        try {
          const u = new URL(val);
          return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Địa chỉ liên kết (URL) không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://.' }
    )
    .max(2048, 'Địa chỉ liên kết quá dài (tối đa 2048 ký tự).'),
}).strict();
```

---

## 2. Response Entities

### `FetchUrlSuccessResponse`
Successful HTTP 200 payload returned to caller.

| Field | Type | Optional | Description |
|---|---|---|---|
| `ok` | `boolean` | No | Constant `true`. |
| `title` | `string` | No | Extracted article title or document `<title>`. Defaults to `'Bài viết từ web'`. |
| `content` | `string` | No | Plain text article content with structural `\n\n` paragraph breaks. |
| `sanitizedHtml` | `string` | No | XSS-sanitized HTML representation of the article. |
| `byline` | `string` | Yes | Author or `'AI Extracted'` when extracted via Gemini fallback. |
| `siteName` | `string` | No | Publisher or domain hostname (e.g. `'truyen.test'`). |
| `nextChapterUrl`| `string` | Yes | Fully qualified absolute URL to next chapter, if detected in DOM. |

### `FetchUrlErrorResponse`
Error payload returned when validation or extraction fails (HTTP 400, 422, 502, 504).

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | Constant `false`. |
| `error` | `string` | Localized, human-readable error description explaining the failure reason. |

---

## 3. Internal Entities & Options

### `SafeFetchOptions`
Configuration passed to `safeFetchHtml(url, options)`:

| Field | Type | Default | Description |
|---|---|---|---|
| `maxRedirects` | `number` | `5` | Maximum number of HTTP redirect hops allowed before aborting. |
| `maxSizeBytes` | `number` | `5242880` (5MB) | Maximum payload size in bytes before stream reader cancels download. |
| `timeoutMs` | `number` | `15000` (15s) | Total timeout for fetch connection and body streaming. |

### `SafeFetchResult`
Output returned by `safeFetchHtml`:

| Field | Type | Description |
|---|---|---|
| `html` | `string` | Assembled UTF-8 decoded HTML content. |
| `finalUrl` | `string` | The resolved absolute URL after following all safe redirects. |
| `response` | `Response` | The final HTTP `Response` object. |

---

## 4. State Transitions & Processing Pipeline

```text
[Incoming POST /api/fetch-url]
             │
             ▼
[Zod Schema Validation] ─── Invalid ───► HTTP 400 (URL không hợp lệ)
             │
             Valid
             ▼
[Initial assertPublicHost] ─── Private/Local ───► HTTP 400 (Địa chỉ nội bộ)
             │
             Public
             ▼
[safeFetchHtml Loop (max 5 hops)]
    ├── On Redirect (301/302/303/307/308):
    │      ├── Check Hop Count <= 5 ─── Exceeded ───► HTTP 400 (Quá nhiều redirect)
    │      ├── Resolve new URL(location, current)
    │      └── assertPublicHost(newHost) ─── Private ───► HTTP 400 (Địa chỉ nội bộ)
    │
    ├── On Content-Type Header:
    │      └── Is HTML / XHTML / plain? ─── No ───► HTTP 400 (Chỉ hỗ trợ HTML)
    │
    └── On Body Stream:
           ├── Chunk byte counter > 5MB? ─── Yes ───► HTTP 400 (Dung lượng vượt quá 5MB)
           └── Stream timeout? ─── Yes ───► HTTP 504 (Quá thời gian chờ)
             │
             ▼
[JSDOM + Readability Extraction]
             │
     Content >= 100 chars?
    ├── YES ──► htmlToParagraphText() -> format \n\n
    └── NO  ──► Check GEMINI_API_KEY
                     │
            Configured & Valid?
           ├── NO  ──► HTTP 422 (Không thể trích xuất nội dung)
           └── YES ──► Gemini 2.5 Flash Fallback
                            │
                   Content >= 100 chars?
                  ├── NO  ──► HTTP 422
                  └── YES ──► byline: 'AI Extracted'
                                   │
                                   ▼
[Discover Next Chapter Link] (Regex matching /chương\s*(sau|tiếp)|tiếp\s*theo|next\s*chapter/i)
             │
             ▼
[Sanitize Content via sanitizeContent()]
             │
             ▼
[Return HTTP 200 JSON Response]
```
