# Research Findings: Secure Web Article Fetching & Extraction Pipeline

**Feature Branch**: `029-fetch-url-hardening`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Multi-Hop Redirect Handling & SSRF Prevention

### Problem
`POST /api/fetch-url` originally validated `assertPublicHost(parsedUrl.hostname)` only once before initiating `fetch()`. Because Node.js `fetch()` automatically follows HTTP redirects (`redirect: 'follow'`), a public domain (e.g., `attacker.com`) could return an HTTP 301/302 response with `Location: http://127.0.0.1:8008/` or `http://169.254.169.254/latest/meta-data`, completely bypassing SSRF controls and enabling internal network reconnaissance or cloud credential theft.

### Decision
Implement `safeFetchHtml(initialUrl, options)` with manual redirect control:
- Set `redirect: 'manual'` on all underlying fetch calls.
- Enforce loop iteration up to `maxRedirects = 5`.
- Validate each destination hop with `assertPublicHost(parsedUrl.hostname)` before calling `fetch()`.
- Check response status: if redirected (`[301, 302, 303, 307, 308].includes(res.status)`), extract `res.headers.get('location')`.
- Resolve relative redirect locations against `currentUrl` using `new URL(location, currentUrl).toString()`.
- Validate that the target protocol remains `http:` or `https:`.
- Throw HTTP 400 error on redirect limit exceeded, missing Location header, or internal destination.

### Alternatives Considered
1. **Custom `http.Agent` / `https.Agent` socket lookup**: Provides TCP-level validation against DNS rebinding, but bypasses standard `fetch` streaming APIs and requires complex protocol-switching code between HTTP and HTTPS.
2. **External library (e.g. `follow-redirects`)**: Adds unnecessary dependencies and doesn't natively integrate with custom `assertPublicHost` validation per hop.
3. **Manual loop with native `fetch`**: Selected because it natively integrates with Node 20+ `fetch`, `AbortSignal`, and `ReadableStream`, while giving full control over every redirect step.

---

## 2. Streaming Body Consumption & DoS Protection

### Problem
Using `response.text()` buffers the entire HTTP response body into memory without size constraints. An attacker submitting a link to a multi-gigabyte ISO, video stream, or zip bomb can exhaust Node.js heap memory, resulting in server crashes (`ERR_WORKER_OUT_OF_MEMORY` or `OOM`).

### Decision
1. **Content-Type Pre-Flight Validation**:
   - Inspect `response.headers.get('content-type')`.
   - Require MIME type to include `text/html`, `application/xhtml+xml`, or `text/plain`.
   - Reject invalid MIME types immediately with HTTP 400 without reading the body.
2. **Chunk-by-Chunk Streaming**:
   - Obtain reader: `const reader = response.body.getReader()`.
   - Track total bytes: `totalBytes += chunk.byteLength`.
   - If `totalBytes > maxSizeBytes` (default 5MB = 5,242,880 bytes):
     - Immediately invoke `await reader.cancel()`.
     - Throw a specific error caught by the route handler to return HTTP 400.
3. **Boundary-Safe UTF-8 Decoding**:
   - Instantiate `const decoder = new TextDecoder('utf-8', { fatal: false })`.
   - Decode each chunk with `decoder.decode(chunk, { stream: true })`.
   - On completion of reading, call `decoder.decode()` to flush any trailing multibyte buffer.
   - This prevents corruption of Vietnamese multi-byte characters split across chunk boundaries.

### Alternatives Considered
- Relying on `Content-Length` header: Rejected because servers may omit `Content-Length`, send transfer-encoding chunked, or lie about payload length.

---

## 3. Browser Header Emulation

### Problem
The existing fetch implementation included `'VoxRead/1.0'` in its `User-Agent`. Web Application Firewalls (Cloudflare, Sucuri, Akamai) and novel sites regularly block non-standard user-agent tokens or requests without standard browser headers with HTTP 403 Forbidden.

### Decision
Remove `VoxRead/1.0` and configure authentic Chrome 124 desktop headers:
```javascript
headers: {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1'
}
```

---

## 4. Paragraph Structure Preservation (`\n\n`)

### Problem
Mozilla Readability's `article.textContent` collapses adjacent `<p>`, `<div>`, and `<h1>`-`<h6>` blocks into contiguous text if there is no explicit whitespace between elements. Downstream in `src/utils/textParser.ts`, `parseNovelText()` relies on `\n\s*\n+` to split paragraphs. Without `\n\n`, an entire chapter becomes a single paragraph, ruining reading presentation and sentence tracking.

### Decision
Implement `htmlToParagraphText(htmlContent, dom)`:
1. Parse or leverage existing JSDOM document.
2. In the article container DOM, replace `<br>` with `\n` text nodes.
3. For block-level elements (`p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `div`, `blockquote`, `li`, `article`, `section`), insert `\n\n` boundaries before and after each block.
4. Extract text and clean up:
   - Normalize `\r\n` and `\r` to `\n`.
   - Collapse horizontal whitespace per line (`[ \t]+` -> ` `).
   - Collapse 3 or more consecutive newlines (`\n{3,}`) into `\n\n`.
   - Trim leading and trailing whitespace.

---

## 5. Resilient AI Fallback via Gemini 2.5 Flash

### Problem
Certain web fiction sites render novel chapters using canvas, dynamic DOM injection, or deeply nested non-standard tags where Readability fails, returning `article === null` or `textContent.trim().length < 100`.

### Decision
When Readability produces null or `< 100` characters:
1. Check `process.env.GEMINI_API_KEY`. If unconfigured or equal to `'MY_GEMINI_API_KEY'`, return HTTP 422.
2. If configured, instantiate GoogleGenAI and invoke `gemini-2.5-flash`:
   - Pass cleaned HTML snippet (or text) asking Gemini to extract the raw story/article content.
   - Instruct Gemini to format paragraphs with double newlines (`\n\n`) and omit conversational pleasantries, explanations, or markdown fences.
3. If extracted text is >= 100 characters:
   - Return HTTP 200 with `title`, `content: aiExtractedText`, `sanitizedHtml: ...`, `byline: "AI Extracted"`.
4. If AI extraction also yields < 100 characters or fails, return HTTP 422.

---

## 6. Next Chapter Link Discovery

### Problem
Readers binge-reading serialized web fiction must constantly switch back to the browser to copy the next chapter URL.

### Decision
1. Query all anchor elements `dom.window.document.querySelectorAll('a[href]')`.
2. Inspect `a.textContent` and `a.title` against regular expression:
   `/(?:chương\s*(?:sau|tiếp)|tiếp\s*theo|next\s*chapter|chap\s*sau)/i`
3. If a match is found:
   - Resolve `const resolved = new URL(href, currentUrl).toString()`.
   - Verify protocol is `http:` or `https:`.
   - Return in `nextChapterUrl` field.
