# Quickstart & Validation Guide: Secure Web Article Fetching Pipeline

**Feature Branch**: `029-fetch-url-hardening`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Prerequisites & Environment

- **Node.js**: v20+ (current: v24.16.0)
- **Dependencies**: Express, JSDOM, Mozilla Readability, `@google/genai`, Zod
- **Environment Variables**:
  - `PORT`: (default 3001)
  - `HOST`: (default 127.0.0.1)
  - `GEMINI_API_KEY`: Required only for AI fallback (User Story 5)

---

## 2. Running Automated Unit & Integration Tests

Execute the unit test suite covering `fetchUrl`:

```powershell
# Run full unit tests
npm test -- tests/unit/fetchUrl.test.ts

# Run tests in watch mode
npm run test:watch -- tests/unit/fetchUrl.test.ts
```

Expected test coverage:
1. Rejection of missing / non-HTTP URLs with 400.
2. Direct loopback/private IP blocking (SSRF prevention) with 400.
3. Multi-hop redirect SSRF blocking (e.g. `public.test` -> `127.0.0.1:8008`) with 400.
4. Infinite / > 5 redirect hop detection with 400.
5. Relative redirect resolution (`/chapter-2` -> `https://example.com/chapter-2`).
6. Content-Type rejection (PDF / binary) before reading body with 400.
7. 5MB streaming size limit cancellation with 400.
8. Multi-byte UTF-8 preservation across chunk boundaries.
9. Browser headers (Chrome 124, no `VoxRead/1.0`).
10. Preservation of structural `\n\n` paragraph boundaries.
11. Gemini AI fallback when Readability produces < 100 characters.
12. Discovery of next chapter link regex matching.

---

## 3. Manual Verification Scenarios

Start the Express backend proxy:

```powershell
npm run dev
# or: node server.js
```

### Scenario A: Verify Multi-Hop SSRF Interception
Send a request that redirects to loopback:

```powershell
$body = @{ url = "https://httpbin.org/redirect-to?url=http%3A%2F%2F127.0.0.1%3A8008%2Fhealth" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/fetch-url" -Method Post -ContentType "application/json" -Body $body
```
*Expected Result*: HTTP 400 error message `Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này.`

### Scenario B: Verify Successful Public Article Extraction with Paragraphs
Send a public news or blog article:

```powershell
$body = @{ url = "https://vnexpress.net" } | ConvertTo-Json
$res = Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/fetch-url" -Method Post -ContentType "application/json" -Body $body
$res.title
$res.content.Substring(0, 200)
```
*Expected Result*: Returns HTTP 200 with `title`, `content` containing `\n\n` between paragraphs, and `siteName`.

### Scenario C: Verify Next Chapter Link Detection
Send a chapter page from a web fiction website:

```powershell
$body = @{ url = "https://truyenfull.io/..." } | ConvertTo-Json
$res = Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/fetch-url" -Method Post -ContentType "application/json" -Body $body
$res.nextChapterUrl
```
*Expected Result*: Returns HTTP 200 with `nextChapterUrl` pointing to the next chapter URL.

---

## 4. Validation Results Summary

- **Unit Test Suite**: 23/23 tests passed (`tests/unit/fetchUrl.test.ts`).
- **Full Repository Test Suite**: 16/16 test files passed, 92/92 tests passed.
- **Typecheck**: `tsc --noEmit` passed with 0 errors.
- **Linter**: `eslint .` passed with 0 errors and 0 warnings.
