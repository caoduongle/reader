# Feature Specification: Read from Web URL ("Đọc từ liên kết")

**Feature Branch**: `011-read-from-url`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "Thêm khả năng đọc nội dung trực tiếp từ một URL vào VoxRead, bổ sung cho 3 cách nạp nội dung hiện có trong src/components/UploadModal.tsx (Upload file / Paste Text / Samples). Yêu cầu: Thêm tab thứ 4 'Đọc từ liên kết' trong UploadModal.tsx, có ô nhập URL + nút 'Lấy nội dung'. Thêm route mới POST /api/fetch-url trong server.js (Express, bind 127.0.0.1:3001). Route nhận { url: string }, validate http/https, fetch HTML phía server (timeout 10s), dùng @mozilla/readability + jsdom trích nội dung chính (title + text), trả JSON { ok: true, title, content }. Xử lý lỗi tiếng Việt rõ ràng. Gọi lại đúng parseNovelText() để tạo chapters. Giữ đúng style UI và giọng văn tiếng Việt."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Server-Side Web Article Extraction Endpoint (Priority: P1) 🎯 MVP

As a user browsing articles or online novel chapters on the web, I want VoxRead's local proxy server to fetch and extract readable article text from a provided URL, bypassing browser CORS restrictions and stripping away ads/navbars, so that I can immediately listen to clean content.

**Why this priority**: Without server-to-server fetching, renderer browsers fail on CORS policies and readers receive messy HTML with header/footer noise.

**Independent Test**: Send `POST /api/fetch-url` with `{ url: "https://example.com" }` and assert that `{ ok: true, title: "Example Domain", content: "..." }` is returned.

**Acceptance Scenarios**:

1. **Given** a valid article URL, **When** `POST /api/fetch-url` is called, **Then** it fetches HTML within 10s, extracts main content via `@mozilla/readability`, and returns `{ ok: true, title, content }`.
2. **Given** an invalid or non-HTTP URL (e.g. `ftp://...`, `javascript:...`, empty string), **When** `POST /api/fetch-url` is called, **Then** it returns HTTP 400 with `{ ok: false, error: "Địa chỉ liên kết (URL) không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://." }`.
3. **Given** a URL that times out (>10s) or fails DNS resolution, **When** `POST /api/fetch-url` is called, **Then** it returns HTTP 504/400 with a localized error message explaining the connection failure.
4. **Given** a web page from which Readability cannot parse an article body (e.g. image-only page or login wall), **When** `POST /api/fetch-url` is called, **Then** it returns HTTP 422 with `{ ok: false, error: "Không thể trích xuất nội dung bài đọc từ trang web này. Trang có thể yêu cầu đăng nhập hoặc không có nội dung văn bản phù hợp." }`.

---

### User Story 2 - Fourth Tab "Đọc từ liên kết" in UploadModal (Priority: P1)

As a reader, I want to switch to a dedicated "Đọc từ liên kết" tab in the upload modal, paste a web link, and click "Lấy nội dung" so that the document is parsed into readable chapters and loaded directly into VoxRead.

**Why this priority**: Provides the primary user interface for reading web content without manual copy-pasting.

**Independent Test**: Open `UploadModal`, select "Đọc từ liên kết", enter a URL, click "Lấy nội dung", and observe that the modal closes and the chapter reader displays the parsed story.

**Acceptance Scenarios**:

1. **Given** `UploadModal` is open, **When** viewing tabs, **Then** a 4th tab "Đọc từ liên kết" is visible alongside "Upload File", "Paste Text", and "Classic Library".
2. **Given** the "Đọc từ liên kết" tab is active, **When** the user inputs a valid URL and clicks "Lấy nội dung", **Then** a loading indicator appears while fetching.
3. **Given** the fetch succeeds, **When** `{ title, content }` is received, **Then** `UploadModal` calls `parseNovelText(content, title)`, constructs a `DocumentItem` with `format: 'url'`, passes it to `onDocumentLoaded`, and closes the modal.
4. **Given** the fetch fails, **When** an error response is returned, **Then** the loading indicator stops and a clear error banner displays the server error message in Vietnamese.

---

### User Story 3 - Automated Test Suite for URL Fetching & Parsing (Priority: P2)

As a maintainer, I want automated Vitest tests covering the server extraction logic and UploadModal tab behavior to prevent regressions.

**Why this priority**: Ensures network edge cases and parser formatting remain rock-solid.

**Independent Test**: Execute `npm test -- tests/unit/fetchUrl.test.ts` and verify all scenarios pass.

**Acceptance Scenarios**:

1. **Given** mock HTML containing article tags and boilerplate ads, **When** processed by the extraction logic, **Then** ads are removed and only article text and title remain.
2. **Given** invalid input parameters, **When** tested against endpoint validation, **Then** errors match contract definitions.

---

### Edge Cases

- **Slow / Hanging Web Servers**: Fetch calls MUST abort strictly after 10 seconds (`AbortSignal.timeout(10000)`) so server resources are not tied up.
- **Paywalls & Cloudflare Captchas**: The server returns 403 or unextractable text; the UI must display a polite Vietnamese error advising manual pasting if the site blocks automated readers.
- **Novel Chapter Splitting**: The extracted `content` text is passed to the existing `parseNovelText()` function so multi-scene chapters or subheadings are structured identically to pasted text.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Dependencies `@mozilla/readability` and `jsdom` MUST be added to `package.json`.
- **FR-002**: Express server in `server.js` MUST implement route `POST /api/fetch-url` bound to `127.0.0.1:3001`.
- **FR-003**: The endpoint MUST validate that `req.body.url` is a non-empty string with protocol `http:` or `https:`.
- **FR-004**: The endpoint MUST fetch HTML with a 10-second timeout and realistic `User-Agent` header to prevent generic bot rejections.
- **FR-005**: The endpoint MUST parse the fetched document using `JSDOM` and `Readability`, returning `{ ok: true, title: string, content: string }`.
- **FR-006**: On failure, the endpoint MUST return `{ ok: false, error: string }` with descriptive Vietnamese explanations.
- **FR-007**: `src/components/UploadModal.tsx` MUST add tab `"Đọc từ liên kết"` with URL input and submit button.
- **FR-008**: `UploadModal.tsx` MUST pass extracted text into `parseNovelText()` to generate chapters without duplicate parsing logic.
- **FR-009**: Automated Vitest tests MUST be added in `tests/unit/fetchUrl.test.ts`.

---

### Non-Functional & Scope Constraints

- **NFR-001**: Server-side request timeout MUST not exceed 10 seconds.
- **NFR-002**: No changes to `python-backend/` (keeps Python backend dedicated to RVC voice synthesis).
- **NFR-003**: Style, UI theme, and Vietnamese copywriting MUST be consistent with existing tabs in `UploadModal.tsx`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can load an online novel chapter or web article by entering its URL and clicking "Lấy nội dung".
- **SC-002**: Text is extracted cleanly without HTML tags, headers, or navbars, structured into sentences and chapters.
- **SC-003**: All invalid URLs or network failures produce clear Vietnamese feedback.
- **SC-004**: `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass with exit code 0.
