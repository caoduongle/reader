# Feature Specification: Transient Network Retry for RVC Speech Synthesis

**Feature Branch**: `046-rvc-speech-retry`

**Created**: 2026-09-06

**Status**: Ready for Review

**Input**: User description: "Trong python-backend/server.log có 2 lần lỗi dạng edge_tts.exceptions.NoAudioReceived (No audio was received) khiến /speak trả về HTTP 500, đây là lỗi mạng tạm thời từ dịch vụ Edge-TTS của Microsoft (không phải lỗi logic ứng dụng). Hiện tại trong src/hooks/useTTS.ts, hàm fetchRVCSpeech chỉ thử 1 lần: nếu thất bại, trả về null ngay, khiến speakSentence dừng hẳn việc đọc tự động (setIsPlaying(false)) và bắt người dùng phải tự bấm Play lại. Yêu cầu: Thêm cơ chế tự động thử lại NGAY BÊN TRONG fetchRVCSpeech (không sửa nơi gọi nó): - Thêm tham số tùy chọn maxRetries: number = 1 vào fetchRVCSpeech. - Nếu request thất bại do lỗi mạng/HTTP 5xx (KHÔNG retry với lỗi 4xx như 400/503 model chưa sẵn sàng — những lỗi này là lỗi cấu hình, retry không giúp ích), và maxRetries > 0, và abortController.signal.aborted !== true (không retry nếu người dùng đã hủy chủ động), thì chờ 400ms (dùng await new Promise(resolve => setTimeout(resolve, 400))) rồi gọi lại chính fetchRVCSpeech với maxRetries - 1. - Giới hạn tổng cộng tối đa 1 lần retry (tức tối đa 2 lần gọi HTTP thật sự cho mỗi câu). - Log ra console.warn khi đang retry, ví dụ: [VoxRead] Retry fetch RVC speech sau lỗi: ${errorMsg}. KHÔNG được thêm retry ở phía prefetchUpcoming hay speakSentence (giữ nguyên, vì retry đã nằm trong fetchRVCSpeech dùng chung cho cả 2 nơi gọi). KHÔNG được sửa gì ở backend server.py. Xác minh: npm run typecheck, npm run lint sạch. Test trong tests/hooks/useTTS.test.ts: mock fetch để lần gọi đầu trả về response ok:false status 500, lần gọi thứ hai trả về response thành công với blob hợp lệ — assert fetchRVCSpeech cuối cùng trả về blobUrl khác null, và mock fetch được gọi đúng 2 lần. Thêm 1 test khác: lỗi 400/503 KHÔNG được retry (mock fetch chỉ được gọi 1 lần)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Seamless Self-Healing on Transient Edge-TTS Upstream Failures (Priority: P1) 🎯 MVP

As a reader listening to a book with local RVC voice synthesis, when a transient network hiccup occurs on Microsoft Edge-TTS upstream services (e.g. `NoAudioReceived` triggering HTTP 500), I want the system to automatically retry the request once after a 400ms pause, so that reading continues uninterrupted without abruptly stopping or forcing me to manually click play again.

**Why this priority**: Upstream Edge-TTS service glitches occasionally drop connections. Without an automatic retry, a single dropped packet terminates the entire reading session, frustrating users and breaking continuous narration.

**Independent Test**:
1. Mount `useTTS` with mocked `fetch` where the first request to `/speak` returns HTTP 500 and the second attempt returns HTTP 200 with valid audio blob.
2. Call `play(0)`.
3. Verify that `fetch` was called exactly twice.
4. Verify that the hook transitions to playing the synthesized sentence rather than stopping.

**Acceptance Scenarios**:
1. **Given** `fetchRVCSpeech` encounters an HTTP 5xx error (excluding HTTP 503) or generic network exception, **When** `maxRetries > 0` and the request has not been aborted (`signal.aborted !== true`), **Then** it logs `[VoxRead] Retry fetch RVC speech sau lỗi: ...`, pauses for 400ms, and re-invokes `fetchRVCSpeech` with `maxRetries - 1`.
2. **Given** the retry attempt succeeds, **When** the synthesized blob URL is returned, **Then** playback commences normally and no error toast is presented to the user.

---

### User Story 2 – Immediate Bailout on Non-Retryable Configuration & Abort States (Priority: P1) 🎯 MVP

As a reader, when a voice synthesis request fails due to an unrecoverable client error (HTTP 4xx like bad text payload or HTTP 503 when the RVC model is not loaded) or when I explicitly navigate or stop playback, I want the system to fail fast without issuing pointless retry requests, so that errors are reported immediately and resources are not wasted.

**Why this priority**: Configuration and model loading errors cannot be resolved by immediate re-querying; retrying them merely introduces unnecessary delays before displaying actionable error messages.

**Independent Test**:
1. Mock `/speak` to return HTTP 400 or HTTP 503.
2. Trigger `play(0)`.
3. Assert that `fetch` was called exactly 1 time (no retry attempt).
4. Assert that the error message is surfaced immediately.

**Acceptance Scenarios**:
1. **Given** a request returns HTTP 4xx (e.g. 400) or HTTP 503, **When** evaluating retry eligibility, **Then** `fetchRVCSpeech` does NOT retry, immediately surfaces the error message via `setServerErrorMessage`, and returns `null`.
2. **Given** a request fails while `abortController.signal.aborted === true`, **When** error handling executes, **Then** `fetchRVCSpeech` does NOT retry and returns `null`.

---

### User Story 3 – Bounded Retry Cap and Final Failure Reporting (Priority: P2)

As a reader, when persistent server or network issues prevent speech synthesis even after the retry attempt, I want the system to cleanly terminate the request and notify me of the failure, so that the player does not loop endlessly.

**Why this priority**: Enforcing a strict retry ceiling (`maxRetries = 1`, maximum 2 total HTTP requests per sentence) guarantees bounded execution and predictable player state transitions.

**Independent Test**:
1. Mock `/speak` to return HTTP 500 continuously.
2. Trigger `play(0)`.
3. Assert that `fetch` was called exactly 2 times (initial + 1 retry).
4. Assert that `isPlaying` resets to `false` and the error is displayed.

**Acceptance Scenarios**:
1. **Given** `maxRetries === 0` and the retry attempt also fails, **When** handling the failure, **Then** no further retries occur, `setServerErrorMessage` is updated, and `fetchRVCSpeech` returns `null`.

---

### Edge Cases

- **Abort During 400ms Backoff Delay**: If user pauses, stops, or navigates while the 400ms timer is ticking, the aborted signal must be checked immediately after the delay to cancel the retry before issuing another HTTP request.
- **Prefetch vs. Active Playback**: Because `fetchRVCSpeech` is shared by both `speakSentence` and `prefetchUpcoming`, background prefetching also benefits transparently from the self-healing retry without additional code in either caller.
- **Zero Retries Explicit Override**: If a caller explicitly specifies `maxRetries = 0`, it executes strictly once without retrying.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `src/hooks/useTTS.ts`, update `fetchRVCSpeech` signature:
  ```typescript
  const fetchRVCSpeech = useCallback(
    async (
      text: string,
      serverUrl: string,
      abortController?: AbortController,
      maxRetries: number = 1
    ): Promise<string | null> => { ... }
  );
  ```
- **FR-002**: Classify an error as retryable if:
  - The request threw a network/transport error that is NOT an `AbortError`, OR
  - The HTTP response status is 5xx (`status >= 500`) EXCEPT status 503 (`status !== 503`).
  - HTTP 4xx (`status >= 400 && status < 500`) and HTTP 503 MUST NOT be retried.
- **FR-003**: When an error is retryable, `maxRetries > 0`, and `abortController?.signal?.aborted !== true`:
  - Log warning to console: `console.warn(`[VoxRead] Retry fetch RVC speech sau lỗi: ${errorMsg}`);`.
  - Await 400ms backoff: `await new Promise(resolve => setTimeout(resolve, 400));`.
  - If `abortController?.signal?.aborted === true`, return `null`.
  - Re-invoke `fetchRVCSpeech(text, serverUrl, abortController, maxRetries - 1)`.
- **FR-004**: If the error is non-retryable or `maxRetries <= 0`:
  - Do NOT retry.
  - If error is not an `AbortError`, invoke `setServerErrorMessage(errorMsg)`.
  - Return `null`.
- **FR-005**: Do NOT modify callers `prefetchUpcoming` or `speakSentence`. Do NOT modify `python-backend/server.py`.
- **FR-006**: Codebase MUST pass `npm run typecheck` and `npm run lint` cleanly (0 errors, 0 warnings).
- **FR-007**: Add unit tests in `tests/hooks/useTTS.test.ts` verifying:
  - Retries once on HTTP 500 and succeeds when 2nd attempt succeeds (total 2 fetches).
  - Does NOT retry on HTTP 400 (total 1 fetch).
  - Does NOT retry on HTTP 503 (total 1 fetch).
  - Does NOT retry when aborted.

### Key Entities

- **RetryPolicy**: Internal backoff configuration in `fetchRVCSpeech`:
  - `maxRetries`: default `1`
  - `delayMs`: `400ms`
  - `retryableStatuses`: `5xx \ {503}` + network exceptions (excluding `AbortError`)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of transient HTTP 500 / network failures trigger exactly one self-healing retry after 400ms.
- **SC-002**: Maximum HTTP calls per sentence synthesis strictly bounded to 2.
- **SC-003**: 0 retries performed for non-retryable HTTP 400, HTTP 503, or aborted requests.
- **SC-004**: Codebase passes `npm run typecheck` and `npm run lint` with 0 errors.
- **SC-005**: All unit and integration tests pass in `npm test`.

## Assumptions

- Transient Edge-TTS errors are typically resolved within a few hundred milliseconds.
- HTTP 503 from `python-backend/server.py` indicates model unavailable or server starting up; retrying within 400ms is futile.
