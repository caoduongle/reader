# Feature Specification: Client-Side Timeout for RVC Speech Synthesis

**Feature Branch**: `047-rvc-speech-timeout`

**Created**: 2026-09-06

**Status**: Ready for Review

**Input**: User description: "Trong src/hooks/useTTS.ts, hàm fetchRVCSpeech hiện không có timeout: nếu Edge-TTS hoặc RVC phía server bị treo bất thường lâu hơn bình thường, request có thể chờ vô thời hạn phía client mà không có cách nào tự phục hồi. Yêu cầu: Trong fetchRVCSpeech, nếu không có abortController được truyền vào từ bên ngoài (tham số optional), tự tạo một AbortController nội bộ và gọi controller.abort() sau 20000ms (20 giây) bằng setTimeout, dùng clearTimeout khi request hoàn tất (thành công hoặc lỗi) để không rò rỉ timer. Nếu ĐÃ có abortController được truyền vào từ ngoài (trường hợp gọi từ prefetchUpcoming/speakSentence), gắn thêm timeout tương tự lên chính controller đó (không tạo controller thứ 2), vẫn phải clearTimeout đúng lúc. KHÔNG được thay đổi timeout của /health (đang là 2500ms ở checkRVCServerHealth, giữ nguyên). Xác minh: `npm run typecheck`, `npm run lint` sạch. Test: mock fetch trả về 1 promise không bao giờ resolve, dùng vi.useFakeTimers(), advance 20000ms, assert abortController.signal.aborted === true và fetchRVCSpeech resolve về null (không throw, không treo)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Self-Terminating Hanging Speech Requests (Priority: P1) 🎯 MVP

As a reader listening to books via local RVC synthesis, when Microsoft Edge-TTS or the local RVC synthesis server freezes indefinitely (e.g. deadlocked socket or frozen thread), I want the client request to automatically abort after 20 seconds, so that the application does not hang forever and can gracefully release resources.

**Why this priority**: Without an explicit client-side timeout on `/speak`, a server stall causes the client fetch promise to hang indefinitely. This blocks subsequent operations, prevents state cleanup, and traps the user in an unresponsive buffering state.

**Independent Test**:
1. Mount `useTTS` with a mocked `/speak` fetch that returns a hanging promise (never resolves or rejects).
2. Trigger `play(0)`.
3. Advance simulated time by 20,000ms using timer controls.
4. Verify that the request aborts, the hook does not throw, and playback state halts cleanly without hanging.

**Acceptance Scenarios**:
1. **Given** a speech synthesis request is dispatched to `/speak`, **When** the server takes longer than 20,000ms to respond, **Then** the associated `AbortController` triggers `abort()`.
2. **Given** an abort triggered by the 20-second timeout, **When** handling the abort, **Then** `fetchRVCSpeech` catches the abort signal, returns `null` cleanly without throwing an unhandled exception, and logs no uncaught errors.

---

### User Story 2 – Unified Controller Support & Timer Leak Prevention (Priority: P1) 🎯 MVP

As an application maintainer, when speech synthesis requests are invoked either with an existing caller-provided `AbortController` (such as from `speakSentence` or `prefetchUpcoming`) or without one (optional parameter omitted), I want a single 20-second timeout attached to the active controller and guaranteed `clearTimeout` execution in all outcomes, so that memory leaks and redundant controllers are prevented.

**Why this priority**: Memory leaks from dangling timers degrade performance over long reading sessions, and instantiating multiple conflicting controllers would break abort propagation.

**Independent Test**:
1. Call `fetchRVCSpeech` with an external `AbortController` and mock `/speak` to resolve successfully after 100ms.
2. Advance time past 20,000ms.
3. Verify that the external controller was NOT aborted after completion (confirming timer was cleared).
4. Call `fetchRVCSpeech` with an external `AbortController` and mock `/speak` to reject with an error after 100ms.
5. Verify timer was cleared and controller was not aborted post-completion.

**Acceptance Scenarios**:
1. **Given** `abortController` is provided by the caller, **When** starting the request, **Then** `fetchRVCSpeech` reuses that exact controller and attaches a 20,000ms timeout to it without creating a secondary controller.
2. **Given** `abortController` is omitted by the caller, **When** starting the request, **Then** `fetchRVCSpeech` instantiates an internal `AbortController` and attaches the 20,000ms timeout to it.
3. **Given** any request resolution (success, HTTP error, network error, or abort), **When** the execution flow exits the request block, **Then** `clearTimeout` is executed via a `finally` block or equivalent guarantee.

---

### User Story 3 – Health Probe Isolation (Priority: P2)

As a reader, when checking server health and connection status, I want the `/health` diagnostic probe to continue using its dedicated 2,500ms timeout, so that server status checks remain fast and lightweight.

**Why this priority**: Diagnosing whether the server is reachable must fail fast (2.5 seconds) and not wait for the much longer 20-second speech synthesis ceiling.

**Independent Test**:
1. Inspect `checkRVCServerHealth` in `src/hooks/useTTS.ts`.
2. Verify its internal timeout remains strictly 2,500ms (`setTimeout(() => controller.abort(), 2500)`).

**Acceptance Scenarios**:
1. **Given** `checkRVCServerHealth` probes `/health`, **When** the probe executes, **Then** its timeout remains strictly 2,500ms without modification.

---

### Edge Cases

- **Caller Aborts Before 20s**: If the user clicks pause, stop, or navigates to another chapter before the 20,000ms timer fires, the controller is aborted immediately by caller logic and the pending 20s timeout must be cleared immediately.
- **Retry Interaction (Feature 046)**: If a request fails with a retryable 500 error within 20s, the timeout for attempt 1 must be cleared upon attempt 1 completion. The subsequent retry attempt (attempt 2) initiates its own fresh 20s timeout.
- **Immediate Rejection/Success**: If the server responds in 200ms, the timer is cleared immediately so it does not fire in the background 19.8 seconds later.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `src/hooks/useTTS.ts`, define a constant for speech fetch timeout:
  `const RVC_FETCH_TIMEOUT_MS = 20000;` (20 seconds).
- **FR-002**: In `fetchRVCSpeech`, identify the effective `AbortController`:
  - If `abortController` is passed as an argument, use it as `controller`.
  - If `abortController` is undefined or omitted, instantiate a new `new AbortController()` as `controller`.
  - Do NOT create a secondary or redundant controller when one is already passed.
- **FR-003**: Schedule an abort timer on `controller`:
  - `const timeoutId = setTimeout(() => controller.abort(), RVC_FETCH_TIMEOUT_MS);`
- **FR-004**: Guarantee timer cleanup:
  - In a `finally` block enclosing the fetch operation, invoke `clearTimeout(timeoutId)` so no timers leak upon success, failure, or abort.
- **FR-005**: When the 20-second timeout fires:
  - `controller.abort()` is called.
  - The fetch operation throws `AbortError` or observes `signal.aborted === true`.
  - `fetchRVCSpeech` returns `null` without throwing an unhandled exception or hanging.
- **FR-006**: Do NOT modify the timeout in `checkRVCServerHealth` (which must remain strictly 2,500ms).
- **FR-007**: Pass `npm run typecheck` and `npm run lint` cleanly (0 errors, 0 warnings).
- **FR-008**: Add automated unit tests in `tests/hooks/useTTS.test.ts`:
  - Mock fetch to return a hanging promise (never resolves).
  - Use `vi.useFakeTimers()` (or test clock advancement) and advance time by 20,000ms.
  - Assert that `controller.signal.aborted === true` and `fetchRVCSpeech` resolves to `null`.
  - Verify timers are cleared when fetch completes early.

### Key Entities

- **FetchTimeoutConfiguration**:
  - `RVC_FETCH_TIMEOUT_MS`: 20,000 milliseconds (20s) for `/speak` synthesis.
  - `HealthProbeTimeout`: 2,500 milliseconds (2.5s) for `/health` probe (preserved unchanged).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of hanging speech requests are terminated at exactly 20,000ms without freezing the UI or application thread.
- **SC-002**: 0 timer leaks detected across fast-resolving, erroring, and timed-out requests.
- **SC-003**: `checkRVCServerHealth` timeout remains exactly 2,500ms.
- **SC-004**: 0 TypeScript compiler errors and 0 ESLint diagnostics.
- **SC-005**: 100% test pass rate in Vitest.

## Assumptions

- 20 seconds is sufficient time for Edge-TTS generation and RVC model inference on paragraph-length text under normal network loads.
- If a server request takes longer than 20 seconds, the upstream service or local model inference has stalled and aborting is the correct recovery strategy.
