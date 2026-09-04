# Feature Specification: TTS CORS Preflight Support for /speak

**Feature Branch**: `019-fix-tts-cors-preflight`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: User description: "Hãy phân tích và khắc phục lỗi failing test sau trong python-backend/: test_speak_options_preflight_returns_cors_headers AssertionError: assert None == '*'. Yêu cầu: 1. Đọc và chỉnh sửa file python-backend/server.py. 2. Đảm bảo request OPTIONS tới /speak trả về mã trạng thái HTTP 204 cùng các CORS headers: Access-Control-Allow-Origin: *, Access-Control-Allow-Methods: POST, OPTIONS, Access-Control-Allow-Headers: Content-Type, Authorization. 3. Không làm ảnh hưởng đến các security headers hiện có (như X-Content-Type-Options: nosniff, X-Frame-Options: DENY) và logic POST /speak hiện tại. 4. Chạy lại lệnh test để xác nhận toàn bộ 5 test trong python-backend/tests/ đều PASSED."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cross-Origin TTS Preflight Support (Priority: P1) 🎯 MVP

As a frontend web application or browser extension communicating with the local Python TTS service across origins, I want the `/speak` endpoint to respond to HTTP `OPTIONS` preflight requests with status code 204 and standard CORS headers, so that the browser does not reject cross-origin text-to-speech audio requests.

**Why this priority**: When a client performs a cross-origin `fetch` or `XMLHttpRequest` with custom headers or `POST` JSON payloads, the browser automatically dispatches an `OPTIONS` preflight request. If the server does not return `Access-Control-Allow-Origin: *` and allowed methods/headers, the browser blocks the subsequent audio synthesis request entirely.

**Independent Test**:
1. Dispatch an HTTP `OPTIONS` request to `/speak`:
   - Verify HTTP status code is `204 No Content`.
   - Verify header `Access-Control-Allow-Origin` equals `*`.
   - Verify header `Access-Control-Allow-Methods` contains `POST, OPTIONS`.
   - Verify header `Access-Control-Allow-Headers` contains `Content-Type, Authorization`.
2. Verify security headers:
   - Verify `X-Content-Type-Options: nosniff` is present.
   - Verify `X-Frame-Options: DENY` is present.
3. Run `pytest python-backend/tests -v` to ensure all 5 tests pass.

**Acceptance Scenarios**:
1. **Given** a client sending an HTTP `OPTIONS` request to `/speak`, **When** received by the server, **Then** it immediately returns HTTP status 204 with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, and `Access-Control-Allow-Headers: Content-Type, Authorization`.
2. **Given** any response returned by the server (`OPTIONS`, `POST`, or `GET`), **When** inspected, **Then** `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` remain present on the response headers.
3. **Given** a valid client sending a `POST /speak` request with text, **When** processed, **Then** speech synthesis generates and returns `audio/wav` bytes with HTTP status 200 without regression.

---

### Edge Cases

- What happens if the `OPTIONS` request does not provide an `Origin` header (such as testing clients or script calls)?
  *The endpoint MUST return `Access-Control-Allow-Origin: *` unconditionally on `/speak` `OPTIONS` responses rather than omitting the header.*
- What happens if the `OPTIONS` request includes lowercase or uppercase method headers?
  *The server provides comma-separated uppercase HTTP methods (`POST, OPTIONS`) in compliance with RFC 7231.*
- What happens if invalid or empty body data is sent to `POST /speak`?
  *The endpoint continues to validate payload requirements and returns HTTP status 400 with a descriptive error message.*

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (OPTIONS Status Code)**: The server MUST return HTTP status `204` (No Content) for all `OPTIONS` requests addressed to `/speak`.
- **FR-002 (Access-Control-Allow-Origin)**: The server MUST include `Access-Control-Allow-Origin: *` on responses to `OPTIONS /speak`.
- **FR-003 (Access-Control-Allow-Methods)**: The server MUST include `Access-Control-Allow-Methods: POST, OPTIONS` on responses to `OPTIONS /speak`.
- **FR-004 (Access-Control-Allow-Headers)**: The server MUST include `Access-Control-Allow-Headers: Content-Type, Authorization` on responses to `OPTIONS /speak`.
- **FR-005 (Security Headers Invariance)**: The server MUST maintain baseline security headers on all endpoints and methods, specifically `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
- **FR-006 (TTS Synthesis Invariance)**: The server MUST NOT alter the text synthesis logic, validation boundaries (10,000 character limit), or audio byte generation of `POST /speak`.
- **FR-007 (Health Endpoint Invariance)**: The server MUST NOT alter the operational behavior or response schema of `GET /health`.

---

## Key Entities *(include if feature involves data)*

- **CORS Preflight Response**: An HTTP response with status code 204 carrying `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`.
- **Security Response Headers**: HTTP headers enforcing client-side defense in depth (`X-Content-Type-Options`, `X-Frame-Options`).
- **Speech Synthesis Request/Response**: Incoming JSON payload containing `text` and binary output stream containing WAV audio.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of HTTP `OPTIONS` requests to `/speak` return status code 204 with `Access-Control-Allow-Origin: *`.
- **SC-002**: `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` are present on all `OPTIONS /speak` responses.
- **SC-003**: 5 out of 5 tests in `python-backend/tests/test_server.py` pass cleanly when executed via pytest.
- **SC-004**: Zero regressions in `POST /speak` error handling (empty text, whitespace text, length > 10,000) or valid audio synthesis.

---

## Assumptions

- The TTS backend runs locally (default port 8008) and serves requests from web apps, browser extensions, and local test clients.
- Setting `Access-Control-Allow-Origin: *` for `/speak` preflight requests resolves cross-origin connectivity issues while preserving application security requirements.
- Existing Python virtual environment located at `python-backend/venv/` contains the necessary test dependencies (`pytest`, `flask`, `edge_tts`, etc.).
