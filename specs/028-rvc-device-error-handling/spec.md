# Feature Specification: RVC Device Auto-Detection & Speech Error Visibility

**Feature Branch**: `028-rvc-device-error-handling`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "Repo VoxRead (Electron + React + Flask python-backend/server.py chạy RVC voice cloning tại localhost:8008). Đã xác định 3 vấn đề cụ thể cần sửa: VẤN ĐỀ 1 — DEVICE hardcode gây init model thất bại âm thầm trên máy không có GPU phù hợp (auto detect GPU bằng torch: cuda:0 nếu có GPU, cpu:0 nếu không có; in ra terminal thiết bị lúc khởi động; hỗ trợ override). VẤN ĐỀ 2 — Frontend không đọc field 'model_loaded' từ /health, khiến Settings luôn hiện 'đã sẵn sàng' dù model init thất bại (sửa checkRVCServerHealth trong useTTS và checkHealth trong useVoiceServerStatus; kiểm tra data.model_loaded; thêm status 'no-model' / 'model_missing' và errorMessage chi tiết; thêm banner vàng/cam trong SettingsModal). VẤN ĐỀ 3 — Lỗi thật từ /speak (503/500/network) bị nuốt, không hiện UI khi Play/Thử giọng thất bại (parse JSON error body 503/500 trong fetchRVCSpeech, testVoice, speakSentence; gán vào serverErrorMessage; destructure và hiển thị trong SettingsModal; hiển thị showToast trong App.tsx khi đang đọc sách mà /speak lỗi giữa chừng)."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dynamic Hardware Detection & Diagnostic Backend Health (Priority: P1) 🎯 MVP

As a user running VoxRead on diverse PC hardware (with or without an NVIDIA GPU), I want the local RVC speech engine to automatically detect whether a compatible GPU is available or fall back gracefully to CPU without crashing or failing silently, and provide accurate health diagnostics indicating whether voice weights are truly loaded and operational.

**Why this priority**: If the engine crashes or fails to initialize because of hardcoded GPU device identifiers on CPU-only machines, voice synthesis cannot work at all. Clear diagnostic health endpoints are essential for the application to report actual engine readiness.

**Independent Test**:
1. Run the backend on a machine without CUDA (or with CUDA disabled via environment).
2. Verify the server logs display the detected device (`cpu:0` or `cuda:0`) on startup.
3. Query `GET /health` when no valid model exists or initialization fails; verify the response clearly reports `model_loaded: false` and the specific reason/error.
4. Place a valid model in `python-backend/model/`, verify successful initialization, and verify `GET /health` reports `ok: true` and `model_loaded: true`.

**Acceptance Scenarios**:
1. **Given** a host environment without CUDA hardware acceleration, **When** the backend starts, **Then** it automatically configures device execution as CPU (`cpu:0`), logs `[VoxRead] Dang dung thiet bi: cpu:0` to the terminal, and does not terminate with CUDA initialization errors.
2. **Given** a host environment with a compatible NVIDIA GPU, **When** the backend starts, **Then** it automatically configures device execution as CUDA (`cuda:0`) and logs `[VoxRead] Dang dung thiet bi: cuda:0`.
3. **Given** an environment variable override (e.g. `VOXREAD_DEVICE`), **When** the backend initializes, **Then** it respects the override device value if specified.
4. **Given** model weights are absent or fail to load due to corrupted file format, **When** `GET /health` is queried, **Then** the response returns HTTP 200 with `model_loaded: false`, structured `reason`, and a descriptive error message capturing the failure.
5. **Given** model weights load successfully, **When** `GET /health` is queried, **Then** the response returns `ok: true`, `model_loaded: true`, and the active model name.

---

### User Story 2 - Accurate Missing / Incompatible Model State in Settings (Priority: P2)

As a user opening Settings > "Giọng đọc & Tốc độ", I want the connection indicator and status message to reflect whether voice models are actually loaded and ready, so that I am never falsely told the system is "ready" when model initialization has failed.

**Why this priority**: Misleading "Đã kết nối" / "Đã sẵn sàng" statuses when the model failed to load confuse users, who then wonder why audio generation fails when they press Play or Test Voice.

**Independent Test**:
1. Start the server with an empty `model/` directory or an invalid `.pth` file.
2. Open Settings in VoxRead and navigate to "Giọng của tôi (RVC local)".
3. Observe the connection badge and banner: verify it does not show "Đã kết nối" (green), but instead displays an amber/warning state (e.g. `no-model` / `model_missing`) with an explanatory message instructing the user or citing the backend error.
4. Add valid model files and reload; verify the status cleanly transitions to "Đã kết nối" (green).

**Acceptance Scenarios**:
1. **Given** the backend responds with HTTP 200 but `model_loaded: false`, **When** the frontend health check evaluates the response, **Then** it sets the connection state to `no-model` (or `model_missing`) and does NOT set `connected`.
2. **Given** connection state is `no-model` or `model_missing`, **When** viewing the Settings modal, **Then** a distinct warning banner (amber/orange accent) renders with the specific error message rather than a generic offline error.
3. **Given** connection state is `connected`, **When** viewing the Settings modal, **Then** the green "Đã kết nối" indicator displays with the loaded model name.

---

### User Story 3 - Visible Feedback on Speech Generation & Test Voice Failures (Priority: P3)

As a user testing voice cloning or listening to an audiobook, I want clear, informative notifications whenever speech generation encounters an error (such as missing model, server error, or network timeout), so that I immediately understand why audio stopped playing instead of experiencing confusing silent failures.

**Why this priority**: Silent audio dropouts during reading or clicking "Thử giọng" without visual feedback lead users to assume the app is frozen or broken. Surfacing backend error details enables quick diagnosis and self-recovery.

**Independent Test**:
1. In Settings, select "Giọng của tôi (RVC local)" while the server is running without a loaded model or in an error state.
2. Click "Thử giọng". Verify an error banner or notification appears displaying the backend error message (e.g. "Chưa có model giọng RVC...").
3. While reading a chapter in the main reader with RVC selected, simulate a synthesis failure (e.g. 503 or 500 error).
4. Verify a visible toast notification pops up immediately on the reader screen with the error reason, and reading halts gracefully.

**Acceptance Scenarios**:
1. **Given** the user clicks "Thử giọng" and `/speak` returns an HTTP error (503/500), **When** the response is received, **Then** the client parses the `error` message from the response body and displays it in the Settings error banner.
2. **Given** the user is reading text in the main reader interface (Settings modal closed) and `/speak` fails, **When** playback stops, **Then** the system triggers a toast notification on screen showing the backend error message.
3. **Given** network disconnection occurs during synthesis, **When** the request fails, **Then** the system falls back to a friendly Vietnamese error message rather than throwing an unhandled rejection.

---

### Edge Cases

- **Corrupted or Incomplete Model File**: If a `.pth` file is 0 bytes or damaged, backend model loading will throw an exception. The backend must catch this exception, set `model_loaded: false`, store the error detail, and return it in `/health` and `/speak` instead of crashing the server process.
- **Concurrent Hardware Requests**: If multiple requests hit the backend while running on CPU, requests must be queued or guarded via lock to prevent race conditions in temporary audio file generation.
- **Fast Sentence Skipping**: If a user rapidly jumps between sentences while a previous `/speak` request failed, stale error messages from aborted requests must not trigger confusing toast notifications.
- **Malformed Error JSON**: If the server returns HTTP 500/502 with HTML instead of JSON (e.g., from a reverse proxy or crash), JSON parsing failure must be caught and fall back to an informative generic message.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Backend MUST dynamically detect the hardware execution device at startup using `torch.cuda.is_available()`, assigning `"cuda:0"` if CUDA is available and `"cpu:0"` otherwise.
- **FR-002**: Backend MUST log the active execution device to standard output on startup (e.g. `[VoxRead] Dang dung thiet bi: <device>`).
- **FR-003**: Backend MUST support an optional manual device override via configuration or environment variable (e.g. `VOXREAD_DEVICE`).
- **FR-004**: Backend `reload_model()` MUST capture any exception raised during model initialization, retain the error message, and ensure the server process continues running.
- **FR-005**: Backend `GET /health` MUST report `model_loaded: false` whenever voice weights have not been successfully initialized, including the error detail or failure reason.
- **FR-006**: Backend `POST /speak` MUST return HTTP 503 with a structured JSON body `{"error": "<message>"}` when called while no model is loaded or initialization failed.
- **FR-007**: Frontend hook `useVoiceServerStatus` MUST inspect `data.model_loaded` from `/health` responses; if `model_loaded === false`, it MUST NOT set status to `'connected'` and MUST transition to `'no-model'` (or `'model_missing'`) with an explanatory error message.
- **FR-008**: Frontend hook `useTTS` (`checkRVCServerHealth`) MUST inspect `data.model_loaded` from `/health`; if `model_loaded === false`, it MUST NOT set status to `'connected'` and MUST set an appropriate error message.
- **FR-009**: Type definitions for `RVCServerStatus` and `VoiceServerConnectionStatus` MUST support both `'no-model'` and `'model_missing'` statuses for backward compatibility and semantic clarity.
- **FR-010**: Frontend `fetchRVCSpeech` in `useTTS` MUST read and parse the JSON error body (`error` field) when HTTP response `res.ok === false`, setting the detailed error message into state.
- **FR-011**: Frontend `testVoice` in `useTTS` MUST read and parse the JSON error body when testing RVC voice synthesis fails, updating `serverErrorMessage` and connection status accordingly.
- **FR-012**: Frontend `speakSentence` in `useTTS` MUST set `serverErrorMessage` with the backend error message when speech generation fails.
- **FR-013**: Component `SettingsModal` MUST destructure and render `serverErrorMessage` in an error or warning banner when present.
- **FR-014**: Component `SettingsModal` MUST render an amber/orange warning banner when connection status is `'no-model'` (or `'model_missing'`), displaying the hook's diagnostic message.
- **FR-015**: Component `App` MUST display a toast notification (`showToast`) with the error content when `/speak` fails during active reading outside the Settings modal.

---

### Key Entities

- **VoiceServerStatus**:
  - `status`: `'checking' | 'connected' | 'no-model' | 'model_missing' | 'unreachable'`
  - `modelLoaded`: `boolean`
  - `modelDir`: `string | null`
  - `modelName`: `string | null`
  - `errorMessage`: `string | null`
- **SpeechSynthesisError**:
  - `statusCode`: `number`
  - `error`: `string`
  - `isNetworkError`: `boolean`

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of startup attempts on CPU-only machines succeed without throwing unhandled CUDA runtime exceptions.
- **SC-002**: When voice models are missing or corrupted, 0% of health checks report a false "ready" or "connected" state to the user.
- **SC-003**: In 100% of failed speech generation attempts (503/500 HTTP errors), the user is presented with a visible diagnostic notification containing the reason within 1 second of failure.
- **SC-004**: When reading an ebook and speech fails mid-sentence, the reader halts and displays an explanatory toast message 100% of the time instead of hanging silently.
- **SC-005**: All existing and updated unit/integration tests across backend (`pytest`) and frontend (`vitest`) pass with 0 regressions.

---

## Assumptions

- PyTorch (`torch`) is installed in the Python backend environment (`python-backend/venv`).
- The Python backend returns UTF-8 encoded JSON with an `"error"` string field on HTTP 4xx and 5xx error responses.
- In standard usage, users interact with the reader primarily through the main screen; modal dialogs are closed during normal reading.
- CPU fallback inference will operate slower than GPU inference, but functional execution and error visibility must remain identical.
