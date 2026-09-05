# Feature Specification: Secure Web Article Fetching & Extraction Pipeline

**Feature Branch**: `029-fetch-url-hardening`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "Nâng cấp toàn diện tính năng 'Đọc từ URL' (POST /api/fetch-url) trong dự án VoxRead. TASK 1 — Vá SSRF qua redirect (ưu tiên cao nhất, viết safeFetchHtml lặp tối đa 5 redirect, assertPublicHost trước mỗi fetch, redirect: 'manual', resolve absolute Location). TASK 2 — Chống DoS / tràn bộ nhớ khi đọc body (kiểm tra content-type chỉ nhận text/html, application/xhtml+xml, text/plain; đọc streaming qua reader, tối đa 5MB, TextDecoder UTF-8). TASK 3 — Header giả lập trình duyệt thật (Chrome 124, bỏ VoxRead/1.0). TASK 4 — Giữ cấu trúc đoạn văn (\n\n) khi trích xuất (htmlToParagraphText chèn \n\n trước block tags và \n cho br). TASK 5 — AI fallback bằng Gemini 2.5 flash khi Readability thất bại hoặc <100 ký tự (byline 'AI Extracted'). TASK 6 — Tự động phát hiện link 'chương tiếp theo' qua regex và trả về field nextChapterUrl. RESPONSE SCHEMA: ok, title, content, sanitizedHtml, byline, siteName, nextChapterUrl."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Hop SSRF Defense Across HTTP Redirects (Priority: P1) 🎯 MVP

As a security-conscious user of VoxRead, I want the web fetcher to strictly re-verify every target destination during HTTP redirects, so that malicious websites cannot redirect the application into internal services, local backend ports, or cloud instance metadata.

**Why this priority**: Preventing Server-Side Request Forgery (SSRF) is the highest security imperative. Without redirect validation, an external website could bypass initial hostname checks with an HTTP 302 pointing to `http://127.0.0.1:8008` or cloud metadata endpoints.

**Independent Test**:
1. Configure an external test server to issue an HTTP 302 redirect to `http://127.0.0.1:8008` or `http://169.254.169.254`.
2. Send a request to `POST /api/fetch-url` with this initial URL.
3. Verify that the request is rejected with HTTP 400 with an SSRF error message before any internal connection is established.
4. Verify that safe multi-hop redirects (e.g. `http` -> `https` -> final public domain) succeed normally up to the maximum redirect limit (5).

**Acceptance Scenarios**:
1. **Given** a target URL that responds with an HTTP redirect (301, 302, 303, 307, or 308) pointing to a private or loopback IP address, **When** `/api/fetch-url` processes the request, **Then** the redirect is intercepted and blocked with HTTP 400 without connecting to the private address.
2. **Given** a target URL that redirects in an infinite loop or exceeds 5 consecutive redirects, **When** `/api/fetch-url` processes the request, **Then** the request halts and returns HTTP 400 with a clear error indicating too many redirects.
3. **Given** a target URL that responds with a relative redirect path (e.g. `Location: /story/part-2`), **When** the fetcher processes the redirect, **Then** it accurately resolves the path against the current URL to an absolute URL and re-verifies its host.
4. **Given** a target URL that redirects to a missing `Location` header, **When** the fetcher evaluates the response, **Then** it safely terminates and reports a malformed redirect error.

---

### User Story 2 - Streaming Body Consumption & Memory Overflow Protection (Priority: P2)

As a system host running VoxRead, I want the URL reader to reject non-HTML content and stream large response bodies with a hard 5MB cap, so that malicious actors or oversized web resources cannot cause memory exhaustion or crash the server.

**Why this priority**: Unbounded body buffering allows attackers to submit URLs to multi-gigabyte ISOs, video streams, or zip bombs, consuming server RAM and degrading application responsiveness.

**Independent Test**:
1. Target an endpoint returning a non-HTML MIME type (e.g. `application/pdf` or `image/jpeg`).
2. Verify the fetcher terminates immediately upon checking headers and returns HTTP 400 with an unsupported content-type message without reading the body.
3. Target an endpoint streaming over 5MB of HTML data.
4. Verify the reader cancels the stream when the 5MB threshold is crossed and returns HTTP 400 indicating the page exceeds allowed size.
5. Fetch a normal UTF-8 webpage containing Vietnamese diacritics split across chunks; verify all characters decode without corruption.

**Acceptance Scenarios**:
1. **Given** a remote response whose `Content-Type` header does not include `text/html`, `application/xhtml+xml`, or `text/plain`, **When** headers are inspected, **Then** the fetcher aborts the request and returns HTTP 400 stating only HTML content is supported.
2. **Given** a remote response whose total body size exceeds 5 megabytes (5,242,880 bytes), **When** reading chunks through the stream reader, **Then** the reader cancels further downloading and returns HTTP 400 with a message that the page exceeds 5MB.
3. **Given** a valid HTML page under 5MB with multi-byte UTF-8 characters, **When** chunks are gathered and decoded, **Then** characters spanning chunk boundaries are preserved without replacement characters or corrupt symbols.

---

### User Story 3 - Authentic Browser Header Fingerprinting (Priority: P3)

As an avid reader accessing online articles and serialized web fiction, I want my fetch requests to include realistic web browser headers, so that standard anti-bot protections and Web Application Firewalls (WAFs) do not block my reading sessions with HTTP 403 Forbidden.

**Why this priority**: Many literary websites and blogs sit behind Cloudflare or generic WAF rules that block unrecognized custom User-Agent strings (such as `VoxRead/1.0`) or requests missing standard navigation headers.

**Independent Test**:
1. Inspect the outgoing request headers dispatched by `safeFetchHtml`.
2. Verify that the `User-Agent` identifies as modern Chrome/Windows without any custom `VoxRead` branding.
3. Verify that standard navigation headers (`Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`, `Sec-Fetch-User`, `Upgrade-Insecure-Requests`, `Accept`, `Accept-Language`) are present.
4. Submit a URL from a site requiring standard browser headers; verify the request succeeds instead of receiving HTTP 403.

**Acceptance Scenarios**:
1. **Given** an outgoing fetch request, **When** headers are constructed, **Then** `User-Agent` matches standard Chrome desktop without containing `VoxRead`.
2. **Given** an outgoing fetch request, **When** headers are inspected, **Then** modern Fetch Metadata and navigation headers are included to emulate an authentic browser navigation.

---

### User Story 4 - Structural Paragraph Preservation for Text-to-Speech Karaoke (Priority: P4)

As a listener using VoxRead's synchronized text-to-speech reading features, I want the web content extractor to preserve distinct paragraph breaks (`\n\n`), so that the reader sentence parser can correctly structure paragraphs and enable accurate sentence highlighting and audio playback.

**Why this priority**: When HTML text extraction squashes separate `<p>` or `<div>` elements into single unspaced strings, the downstream sentence tokenizer fails to identify paragraphs, destroying readable layout and impairing synchronized speech highlighting.

**Independent Test**:
1. Provide an HTML document containing multiple `<p>`, `<h1>`-`<h6>`, `<blockquote>`, `<li>`, and `<br>` elements.
2. Call `/api/fetch-url` and inspect the returned `content` field.
3. Verify that consecutive paragraphs are separated by exactly `\n\n` and `<br>` generates line breaks.
4. Verify that excess whitespace and multiple consecutive blank lines are condensed into clean double newlines.

**Acceptance Scenarios**:
1. **Given** an HTML article with multiple block elements (`p`, `h1`-`h6`, `div`, `blockquote`, `li`), **When** content is transformed to text, **Then** each block is separated from surrounding content by `\n\n`.
2. **Given** an HTML article containing `<br>` tags within text, **When** content is transformed, **Then** each break produces a newline.
3. **Given** raw extracted text with three or more consecutive newlines, **When** paragraph normalization runs, **Then** extraneous newlines are collapsed into `\n\n`.

---

### User Story 5 - Resilient AI Fallback Extraction via Gemini (Priority: P5)

As a user importing complex web pages or JavaScript-heavy layouts where standard heuristic readers fail, I want the system to automatically fall back to an AI extraction model, so that I can still read the article content even when conventional rule-based algorithms extract nothing.

**Why this priority**: Heuristic extractors like Mozilla Readability frequently fail on non-standard novel sites, dynamic blog themes, or text nested in unusual layouts, yielding 0 or <100 characters and disappointing the user.

**Independent Test**:
1. Submit a web page where Readability produces empty content or less than 100 characters.
2. Verify that when a valid `GEMINI_API_KEY` is present, the server invokes the Gemini 2.5 Flash model with raw HTML.
3. Verify the server returns HTTP 200 with the AI-extracted article, structured paragraph breaks, and `byline: "AI Extracted"`.
4. If no API key is configured or the AI returns empty content, verify the server cleanly returns HTTP 422.

**Acceptance Scenarios**:
1. **Given** Readability extraction returns null or text content under 100 characters, **When** a valid `GEMINI_API_KEY` is configured, **Then** the server queries Gemini to extract the core story content.
2. **Given** Gemini returns cleanly extracted text of at least 100 characters, **When** the response is assembled, **Then** it returns HTTP 200 with `byline: "AI Extracted"` and formatted paragraphs.
3. **Given** Readability yields insufficient text and no valid Gemini key is configured (or AI extraction fails), **When** processing concludes, **Then** the server returns HTTP 422 with a user-friendly error message.

---

### User Story 6 - Next Chapter Navigation Link Discovery (Priority: P6)

As a serialized fiction reader reading multi-part web novels, I want VoxRead to automatically detect the link to the next chapter on the page, so that the reader interface can offer continuous reading without requiring me to return to the browser.

**Why this priority**: Readers consuming web novels frequently read consecutive chapters. Automatically extracting the "next chapter" URL saves repetitive copy-pasting.

**Independent Test**:
1. Provide an HTML page containing navigation links with labels such as "Chương sau", "Chương tiếp", "Tiếp theo", or "Next Chapter".
2. Send request to `/api/fetch-url`.
3. Verify the response JSON includes a `nextChapterUrl` field containing the fully resolved absolute URL.
4. Verify that if no next chapter link exists, `nextChapterUrl` is undefined or omitted.

**Acceptance Scenarios**:
1. **Given** an HTML page containing an anchor tag whose text matches patterns like `/chương\s*(sau|tiếp)|tiếp\s*theo|next\s*chapter/i`, **When** the page is analyzed, **Then** the link is resolved against the source URL to an absolute address and included in `nextChapterUrl`.
2. **Given** an HTML page with no matching next chapter link, **When** analyzed, **Then** `nextChapterUrl` is omitted from the response.

---

### Edge Cases

- **Relative Redirects with Query Parameters**: A site redirects from `/read?id=1` to `next?page=2`. The URL resolver must compute `new URL('next?page=2', currentUrl).toString()` correctly without dropping origin or path segments.
- **Protocol Downgrade**: If a redirect attempts to move from `https:` to `http:`, the resolver must verify that the new URL is valid and does not target a non-HTTP scheme (e.g. `file:`, `javascript:`, `ftp:`).
- **Chunk-Boundary Multibyte UTF-8**: A Vietnamese accented character like "ế" (3 bytes in UTF-8: `0xE1 0xBA 0xBF`) may have its first 2 bytes in chunk 1 and 3rd byte in chunk 2. The `TextDecoder` must use `{ stream: true }` so characters are decoded seamlessly without corruption.
- **Zero-Byte Stream Abort**: If a remote server sends headers declaring 10GB length or attempts a slowloris stream, the streaming reader checks each chunk and stops immediately if byte count exceeds 5MB or if the 15-second timeout triggers.
- **XSS in Extracted Content**: Any HTML produced by Readability, JSDOM, or AI fallback must pass through the existing `sanitizeContent()` routine before returning to the frontend.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST perform SSRF validation using `assertPublicHost()` on the destination hostname BEFORE every HTTP request, including both the initial URL and all subsequent redirect destinations.
- **FR-002**: System MUST disable automated redirect following (`redirect: 'manual'`) in its HTTP client and manage redirect steps explicitly in a controlled loop.
- **FR-003**: System MUST support a configurable maximum redirect limit (default 5 hops); if exceeded, it MUST terminate and return HTTP 400 with a descriptive error.
- **FR-004**: System MUST resolve relative redirect URLs from the `Location` response header against the current URL to form a valid absolute URL.
- **FR-005**: System MUST enforce a request timeout (default 15,000ms) using `AbortSignal.timeout()` across the fetch lifecycle.
- **FR-006**: System MUST inspect the `Content-Type` header of the final response and reject payloads that do not contain `text/html`, `application/xhtml+xml`, or `text/plain` with HTTP 400.
- **FR-007**: System MUST stream response bodies via `response.body.getReader()`, enforcing a maximum payload size limit of 5MB (5 * 1024 * 1024 bytes).
- **FR-008**: System MUST cancel the active stream reader (`reader.cancel()`) immediately upon exceeding the 5MB size limit and throw an error without buffering further data.
- **FR-009**: System MUST decode streamed chunks into UTF-8 text using `TextDecoder('utf-8', { fatal: false })` with stream buffering to ensure boundary-split multibyte characters are preserved.
- **FR-010**: System MUST send realistic modern desktop browser headers (User-Agent Chrome 124, Accept, Accept-Language, Sec-Fetch-* metadata) and MUST NOT send identifying strings like `VoxRead/1.0`.
- **FR-011**: System MUST convert HTML block elements (`p`, `h1`-`h6`, `div`, `blockquote`, `li`) into text blocks separated by `\n\n`, and convert `<br>` into `\n`.
- **FR-012**: System MUST collapse consecutive whitespace and multiple blank lines (`\n{3,}`) into clean `\n\n` separators and trim trailing whitespace.
- **FR-013**: System MUST trigger an AI fallback when standard Readability parsing yields no article or extracted text under 100 characters, provided a valid `GEMINI_API_KEY` is configured.
- **FR-014**: When AI fallback succeeds with at least 100 characters, the response MUST set `byline: "AI Extracted"`.
- **FR-015**: System MUST return HTTP 422 if both Readability and AI fallback fail to extract usable content (or if Gemini API key is unconfigured).
- **FR-016**: System MUST scan document anchors (`<a href>`) to detect next chapter navigation matching `/chương\s*(sau|tiếp)|tiếp\s*theo|next\s*chapter/i`, resolve it to an absolute URL, and return it in `nextChapterUrl`.
- **FR-017**: System MUST sanitize extracted content HTML using `sanitizeContent()` to eliminate potential stored Cross-Site Scripting (XSS).
- **FR-018**: System response payload MUST conform to the enhanced schema containing `ok`, `title`, `content`, `sanitizedHtml`, `byline`, `siteName`, and optional `nextChapterUrl`.

---

### Key Entities

- **FetchUrlRequest**:
  - `url`: Validated absolute URL string (HTTP/HTTPS, max 2048 characters).
- **FetchUrlResponse**:
  - `ok`: `true`
  - `title`: Extracted or document title string.
  - `content`: Extracted article text with structural `\n\n` paragraph breaks.
  - `sanitizedHtml`: XSS-safe HTML string of the extracted article.
  - `byline`: Author, source attribution, or `"AI Extracted"`.
  - `siteName`: Hostname or identified publisher name.
  - `nextChapterUrl`: Optional absolute URL to the subsequent chapter.
- **SafeFetchOptions**:
  - `maxRedirects`: Maximum allowed redirect hops (default: 5).
  - `maxSizeBytes`: Maximum allowed HTML response body size (default: 5,242,880 bytes).
  - `timeoutMs`: Network timeout per request (default: 15,000ms).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of malicious redirect chains targeting private, loopback, or metadata addresses are rejected before socket connection to the internal target.
- **SC-002**: 100% of responses exceeding 5MB are halted during streaming within 1 chunk of the threshold, preventing excessive memory allocation.
- **SC-003**: 0% of fetch requests are rejected by common WAFs due to deprecated or customized User-Agent tokens.
- **SC-004**: Extracted text content preserves distinct paragraph boundaries such that 100% of multi-paragraph test articles parse into multiple discrete paragraphs in the reader.
- **SC-005**: 100% of pages containing standard "Next Chapter" navigation indicators correctly expose the target URL in the response payload.
- **SC-006**: All existing and enhanced unit tests pass with zero regressions.

---

## Assumptions

- Node.js runtime provides native global `fetch`, `Response`, `ReadableStream`, `TextDecoder`, and `AbortSignal.timeout`.
- When `GEMINI_API_KEY` is not present, the system gracefully falls back to reporting standard HTTP 422 extraction errors rather than failing with unhandled exceptions.
- Web novel sites follow common Vietnamese and English chapter navigation conventions matching the specified regex patterns.
