# Tasks: Secure Web Article Fetching & Extraction Pipeline

**Feature Branch**: `029-fetch-url-hardening`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Review existing dependencies in package.json and verify lib/ssrfGuard.js export bindings
- [X] T002 [P] Create initial module skeleton for lib/safeFetch.js with export declarations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T003 Implement error types and default configuration (maxRedirects, maxSizeBytes, timeoutMs) in lib/safeFetch.js
- [X] T004 Ensure server/validators/apiSchemas.js enforces HTTP/HTTPS schema constraints for incoming requests

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Multi-Hop SSRF Defense Across HTTP Redirects (Priority: P1) 🎯 MVP

**Goal**: Prevent SSRF attacks across HTTP redirects by re-validating destination hostnames on every redirect hop before connecting.

**Independent Test**: Send a request that redirects (HTTP 302) to `127.0.0.1:8008` or `169.254.169.254`; verify the request is blocked with HTTP 400 without connecting to the private address.

### Tests for User Story 1
- [X] T005 [P] [US1] Add unit tests for redirect SSRF prevention, infinite redirect loop detection, and relative redirect resolution in tests/unit/fetchUrl.test.ts

### Implementation for User Story 1
- [X] T006 [US1] Implement manual redirect loop with `redirect: 'manual'` and hop-by-hop `assertPublicHost(hostname)` in lib/safeFetch.js
- [X] T007 [US1] Implement relative `Location` resolution via `new URL(location, currentUrl).toString()` and enforce `maxRedirects = 5` in lib/safeFetch.js
- [X] T008 [US1] Wire safeFetchHtml into POST /api/fetch-url in server.js replacing direct fetch()

**Checkpoint**: User Story 1 MVP fully functional and verified against redirect SSRF attacks.

---

## Phase 4: User Story 2 - Streaming Body Consumption & Memory Overflow Protection (Priority: P2)

**Goal**: Protect server memory from DoS attacks by validating Content-Type and enforcing a 5MB streaming size limit.

**Independent Test**: Attempt fetching a binary file (PDF/JPEG) and a 10MB streaming payload; verify non-HTML returns HTTP 400 immediately and oversized streams are aborted with HTTP 400.

### Tests for User Story 2
- [X] T009 [P] [US2] Add unit tests for Content-Type rejection (non-HTML) and 5MB streaming body cutoff in tests/unit/fetchUrl.test.ts

### Implementation for User Story 2
- [X] T010 [US2] Implement pre-flight Content-Type header validation (accepting text/html, application/xhtml+xml, text/plain) in lib/safeFetch.js
- [X] T011 [US2] Implement chunk-by-chunk body streaming via `response.body.getReader()` with 5MB cutoff and `reader.cancel()` in lib/safeFetch.js
- [X] T012 [US2] Implement boundary-safe UTF-8 decoding using `new TextDecoder('utf-8', { fatal: false })` with `{ stream: true }` in lib/safeFetch.js

**Checkpoint**: User Stories 1 and 2 work independently with full memory and SSRF protection.

---

## Phase 5: User Story 3 - Authentic Browser Header Fingerprinting (Priority: P3)

**Goal**: Prevent HTTP 403 Forbidden errors from WAFs by sending realistic Chrome 124 desktop headers without identifying custom tokens.

**Independent Test**: Verify outgoing request headers contain Chrome 124 User-Agent and Sec-Fetch metadata, completely omitting `VoxRead/1.0`.

### Tests for User Story 3
- [X] T013 [P] [US3] Add unit tests asserting Chrome 124 headers and absence of `VoxRead/1.0` token in tests/unit/fetchUrl.test.ts

### Implementation for User Story 3
- [X] T014 [US3] Configure realistic Chrome 124 Windows desktop navigation headers in lib/safeFetch.js

**Checkpoint**: Requests mimic authentic browser navigation without WAF triggering signatures.

---

## Phase 6: User Story 4 - Structural Paragraph Preservation for Text-to-Speech Karaoke (Priority: P4)

**Goal**: Preserve `\n\n` paragraph boundaries for block elements so that `src/utils/textParser.ts` can properly separate paragraphs for synchronized reading.

**Independent Test**: Provide an HTML article with multiple `<p>`, `<h1>`-`<h6>`, `<blockquote>`, and `<br>` elements; verify `content` in response has paragraphs separated by `\n\n`.

### Tests for User Story 4
- [X] T015 [P] [US4] Add unit tests verifying paragraph `\n\n` preservation across block elements and `<br>` in tests/unit/fetchUrl.test.ts

### Implementation for User Story 4
- [X] T016 [US4] Implement htmlToParagraphText DOM transformation inserting `\n\n` for block elements and `\n` for `<br>` in lib/safeFetch.js
- [X] T017 [US4] Integrate htmlToParagraphText into Readability extracted content in server.js

**Checkpoint**: Extracted article text reliably formats into clean double-spaced paragraphs for textParser.

---

## Phase 7: User Story 5 - Resilient AI Fallback Extraction via Gemini (Priority: P5)

**Goal**: Extract article content via Gemini 2.5 Flash when Mozilla Readability fails or extracts less than 100 characters.

**Independent Test**: Fetch an article page where Readability yields empty text; verify Gemini is invoked and returns HTTP 200 with `byline: "AI Extracted"`.

### Tests for User Story 5
- [X] T018 [P] [US5] Add unit tests mocking Gemini AI fallback when Readability produces < 100 characters in tests/unit/fetchUrl.test.ts

### Implementation for User Story 5
- [X] T019 [US5] Implement Gemini 2.5 Flash fallback call using GoogleGenAI in server.js when article text length is < 100 characters
- [X] T020 [US5] Format AI fallback text with double newlines and set `byline: "AI Extracted"`, or return HTTP 422 if key is missing or AI fails in server.js

**Checkpoint**: System gracefully recovers from heuristic extraction failures using AI fallback.

---

## Phase 8: User Story 6 - Next Chapter Navigation Link Discovery (Priority: P6)

**Goal**: Automatically detect "Next Chapter" navigation links and provide them in the response for continuous reading.

**Independent Test**: Fetch a web page containing a link labeled "Chương sau" or "Next Chapter"; verify `nextChapterUrl` in response contains the resolved absolute URL.

### Tests for User Story 6
- [X] T021 [P] [US6] Add unit tests for detecting next chapter anchor tags and resolving relative URLs in tests/unit/fetchUrl.test.ts

### Implementation for User Story 6
- [X] T022 [US6] Implement anchor tag regex scanner matching `/chương\s*(sau|tiếp)|tiếp\s*theo|next\s*chapter/i` with URL resolution in server.js
- [X] T023 [US6] Expose optional nextChapterUrl field in POST /api/fetch-url response payload in server.js

**Checkpoint**: Next chapter links are automatically resolved and returned when present.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Verification, quality gates, and final validation

- [X] T024 [P] Run full vitest test suite via `npm test -- tests/unit/fetchUrl.test.ts` and verify 100% pass rate
- [X] T025 [P] Run TypeScript validation via `npm run typecheck` and ESLint via `npm run lint`
- [X] T026 Update quickstart.md validation log in specs/029-fetch-url-hardening/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Core SSRF security MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 2. Enhances `safeFetchHtml` with streaming.
- **User Story 3 (Phase 5)**: Depends on Phase 2. Header configuration in `safeFetchHtml`.
- **User Story 4 (Phase 6)**: Depends on Phase 2. Integrates with Readability extraction in `server.js`.
- **User Story 5 (Phase 7)**: Depends on Phase 2 and Phase 6. AI fallback when Readability is insufficient.
- **User Story 6 (Phase 8)**: Depends on Phase 2 and Phase 6. Next chapter link discovery in DOM.
- **Polish (Phase 9)**: Depends on all user stories being implemented.

### Parallel Opportunities
- T002, T005, T009, T013, T015, T018, T021 can all be drafted in parallel.
- Test tasks for each story can run in parallel before implementation.
- Polish tasks T024 and T025 can run concurrently.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`lib/safeFetch.js` skeleton).
2. Complete Phase 2: Foundational (configuration & schema check).
3. Complete Phase 3: User Story 1 (Multi-hop redirect SSRF prevention).
4. Validate with `npm test -- tests/unit/fetchUrl.test.ts`.

### Incremental Delivery
1. Foundation + US1 (MVP): SSRF secured across redirects.
2. Add US2: Streaming 5MB cutoff and Content-Type defense.
3. Add US3: Browser headers (Chrome 124, no `VoxRead/1.0`).
4. Add US4: Paragraph `\n\n` preservation.
5. Add US5: Gemini AI fallback.
6. Add US6: Next chapter discovery.
7. Final polish & lint validation.
