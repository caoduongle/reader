# Implementation Plan: Secure Web Article Fetching & Extraction Pipeline

**Branch**: `029-fetch-url-hardening` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/029-fetch-url-hardening/spec.md`

## Summary

Harden and upgrade the `POST /api/fetch-url` endpoint in `server.js` into an enterprise-grade, SSRF-resistant, memory-safe web article reader:
1. **Multi-Hop SSRF Defense**: Implement `safeFetchHtml(url, options)` executing a manual redirect loop (max 5 hops) using `redirect: 'manual'`, checking `assertPublicHost(parsedUrl.hostname)` before every single fetch hop and resolving relative redirect targets.
2. **Streaming Body & DoS Protection**: Validate MIME type from `Content-Type` header (must include `text/html`, `application/xhtml+xml`, or `text/plain`), stream chunks via `response.body.getReader()`, enforce a strict 5MB cap with `reader.cancel()`, and assemble UTF-8 text using `TextDecoder('utf-8', { fatal: false })` with chunk boundary streaming.
3. **Realistic Browser Headers**: Replace custom User-Agent tokens (`VoxRead/1.0`) with authentic modern Chrome 124 desktop headers to prevent WAF 403 blocks.
4. **Structural Paragraph Preservation**: Implement `htmlToParagraphText` to preserve `\n\n` paragraph boundaries for block elements (`p`, `h1`-`h6`, `div`, `blockquote`, `li`) and `\n` for `<br>`, condensing `\n{3,}` into `\n\n` for clean sentence tokenization in `src/utils/textParser.ts`.
5. **Resilient AI Fallback**: If Readability yields empty or `< 100` characters, trigger Google GenAI (`gemini-2.5-flash`) when `GEMINI_API_KEY` is present, returning HTTP 200 with `byline: "AI Extracted"` (or HTTP 422 if unconfigured/failed).
6. **Next Chapter Discovery**: Scan anchor tags matching `/chương\s*(sau|tiếp)|tiếp\s*theo|next\s*chapter/i` and return resolved absolute URL in `nextChapterUrl`.

---

## Technical Context

**Language/Version**: Node.js v24.16.0 / ES Modules (`"type": "module"`)  
**Primary Dependencies**: Express 5, JSDOM 26+, `@mozilla/readability`, `@google/genai`, `zod`, `sanitize-html`  
**Storage**: N/A (Stateless REST endpoint)  
**Testing**: Vitest v4 (`npm test -- tests/unit/fetchUrl.test.ts`)  
**Target Platform**: Electron Desktop App (Windows, macOS, Linux) with local Express backend  
**Project Type**: Desktop Hybrid (React + Electron + Express Proxy)  
**Performance Goals**: Article extraction < 1.5s for typical pages; immediate stream cancellation within 1 chunk upon crossing 5MB limit  
**Constraints**: Zero SSRF leakage across redirects; 5MB memory cutoff; 15,000ms total timeout; zero WAF blockages from custom User-Agent  
**Scale/Scope**: Single-user reading sessions; handles long serialized web fiction chapters and complex blogs  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Details |
|---|---|---|
| **Security & SSRF Hygiene** | PASSED | Pre-fetch DNS & IP validation across 100% of redirect hops. Rejects loopback, private, link-local metadata, carrier NAT. |
| **Memory & DoS Safety** | PASSED | Streaming chunk accumulator with `reader.cancel()` prevents buffering >5MB payloads in memory. Pre-flight Content-Type check blocks binary payloads. |
| **API Backwards Compatibility** | PASSED | Existing response fields (`ok`, `title`, `content`, `sanitizedHtml`, `byline`, `siteName`) preserved. `nextChapterUrl` added as an optional field. |
| **Test-Driven Rigor** | PASSED | Unit tests in `tests/unit/fetchUrl.test.ts` verify all 6 user stories and edge cases without regressions. |

---

## Project Structure

### Documentation (this feature)

```text
specs/029-fetch-url-hardening/
├── spec.md                  # Feature requirements and user stories
├── checklists/
│   └── requirements.md      # Specification quality validation
├── plan.md                  # Implementation plan (this file)
├── research.md              # Research decisions and alternatives
├── data-model.md            # Data models and entity pipeline
├── contracts/
│   └── api-endpoints.md     # Formal API contract for /api/fetch-url
├── quickstart.md            # Test and validation guide
└── tasks.md                 # Implementation tasks (generated in /speckit-tasks)
```

### Source Code Architecture

```text
lib/
├── ssrfGuard.js             # Existing IP & hostname validator (assertPublicHost, isPrivateOrReservedIp)
└── safeFetch.js             # [NEW] Reusable safe HTTP fetcher (manual redirects, streaming 5MB limit, browser headers)

server.js                    # Express app containing POST /api/fetch-url route:
                             # - safeFetchHtml integration
                             # - htmlToParagraphText converter
                             # - Readability extraction
                             # - Gemini AI fallback
                             # - Next chapter regex scanner

server/validators/
└── apiSchemas.js            # Input validation schemas (fetchUrlSchema)

tests/unit/
└── fetchUrl.test.ts         # Vitest unit test suite covering redirect SSRF, 5MB streaming, \n\n, AI fallback, etc.
```

---

## Architecture & Implementation Details

### Component 1: `lib/safeFetch.js`
A dedicated, standalone utility function:
```javascript
export async function safeFetchHtml(initialUrl, {
  maxRedirects = 5,
  maxSizeBytes = 5 * 1024 * 1024,
  timeoutMs = 15000
} = {})
```
- Performs manual redirect loop with `redirect: 'manual'`.
- Runs `await assertPublicHost(currentUrl.hostname)` before calling `fetch()`.
- Resolves relative `location` headers using `new URL(location, currentUrl).toString()`.
- Checks `Content-Type` header (must include `text/html`, `application/xhtml+xml`, or `text/plain`).
- Reads `response.body.getReader()`, accumulates byte length, cancels stream with `await reader.cancel()` if `> 5MB`.
- Decodes chunks using `new TextDecoder('utf-8', { fatal: false })` with `{ stream: true }`.
- Returns `{ html, finalUrl, response }`.

### Component 2: `htmlToParagraphText(contentHtml, dom)`
A structural converter function inside `server.js` or `lib/htmlToText.js`:
- Clones container or parses with JSDOM.
- Replaces `<br>` tags with `\n`.
- Prepends/appends `\n\n` to block tags (`p`, `h1`-`h6`, `div`, `blockquote`, `li`).
- Collapses `\n{3,}` to `\n\n`.
- Trims trailing whitespace.

### Component 3: Route Handler `POST /api/fetch-url` in `server.js`
- Validates input URL with `fetchUrlSchema`.
- Calls `safeFetchHtml(url)`.
- Instantiates JSDOM and Mozilla Readability.
- If Readability extracts $\ge 100$ characters:
  - Formats content using `htmlToParagraphText(article.content, dom)`.
  - Discovers next chapter URL.
  - Sanitizes HTML and returns HTTP 200.
- If Readability yields $< 100$ characters:
  - Checks `process.env.GEMINI_API_KEY`.
  - Calls `gemini-2.5-flash` with extraction prompt.
  - If AI extracts $\ge 100$ characters: returns HTTP 200 with `byline: 'AI Extracted'`.
  - Otherwise: returns HTTP 422.

---

## Complexity Tracking

| Item | Status | Justification |
|---|---|---|
| Manual Redirect Loop | Necessary | Node.js `fetch` cannot inspect intermediate redirect hosts without `redirect: 'manual'`. |
| Stream Reader & Byte Counting | Necessary | Preventing DoS from unbounded response bodies requires measuring bytes at the chunk level. |
| Gemini AI Fallback | Optional/Graceful | Activates only when heuristic reader fails and valid API key is present; returns clean 422 otherwise. |
