# Feature Specification: Step-by-Step Latency Timing for /speak Route

**Feature Branch**: `033-speak-route-timing`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "File: python-backend/server.py. Mục tiêu: Đo thời gian từng bước trong route /speak để xác định chính xác bước nào đang chiếm phần lớn 20-30s (Edge-TTS tạo giọng nền, hay RVC inference), phục vụ tối ưu đúng chỗ. Yêu cầu sửa: Thêm import time ở đầu file. Trong route /speak, bọc timing quanh 2 bước chính: import time; ...; t0 = time.time(); asyncio.run(_synthesize_base(text, base_path)); t1 = time.time(); with rvc_lock: _run_rvc_inference(base_path, out_path); t2 = time.time(); print(f\"[VoxRead][Timing] Edge-TTS: {t1-t0:.2f}s | RVC inference: {t2-t1:.2f}s | Text length: {len(text)} ky tu\"). Không cần thay đổi gì khác trong logic hiện có, chỉ thêm đo thời gian và in ra terminal."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Step-by-Step Synthesis Timing Telemetry (Priority: P1) 🎯 MVP

As a developer or administrator running VoxRead, when speech synthesis requests are processed through `/speak`, I want detailed console timing metrics for Edge-TTS base voice generation and RVC neural voice conversion, so that I can immediately pinpoint which stage contributes the majority of the 20-30s overall synthesis latency and focus performance optimization efforts on the actual bottleneck.

**Why this priority**: Without granular timing instrumentation, developers cannot determine whether sluggish performance originates from network/cloud latency during Edge-TTS generation or CPU/GPU compute bottlenecks during RVC neural acoustic modeling. Clear visibility is essential to prioritize the right optimizations.

**Independent Test**:
1. Send a synthesis request to `POST /speak` with a valid Vietnamese text payload.
2. Inspect server standard output in the terminal.
3. Verify that a log line starting with `[VoxRead][Timing]` is printed, displaying elapsed time for Edge-TTS, elapsed time for RVC inference, and the exact character count of the input text.

**Acceptance Scenarios**:
1. **Given** an active voice model and a valid text request, **When** `/speak` processes the audio pipeline, **Then** the server records timestamps before and after `_synthesize_base(...)` and `_run_rvc_inference(...)`.
2. **Given** timestamps `t0`, `t1`, and `t2`, **When** both synthesis stages complete successfully, **Then** the server prints `[VoxRead][Timing] Edge-TTS: <t1-t0:.2f>s | RVC inference: <t2-t1:.2f>s | Text length: <len(text)> ky tu` to standard output.

---

### User Story 2 - Non-Intrusive Execution & Audio Contract Preservation (Priority: P2)

As a desktop user listening to voice synthesis, I want the timing telemetry to be completely non-intrusive, so that audio streaming quality, response headers, response latency, and error reporting remain identical to existing production behavior.

**Why this priority**: Diagnostic logging must never degrade end-user experience, introduce blocking overhead, or alter the HTTP contract expected by the Electron frontend.

**Independent Test**:
1. Submit valid and invalid requests (empty text, missing model, pipeline failures) to `POST /speak`.
2. Verify that successful calls continue to return HTTP 200 with `Content-Type: audio/wav` and valid binary WAV content.
3. Verify that failed calls continue to return appropriate status codes (400, 500, 503) without unhandled exceptions.

**Acceptance Scenarios**:
1. **Given** a request to `/speak`, **When** timing instrumentation runs, **Then** the returned HTTP response status, headers, and audio binary stream match previous behavior exactly.
2. **Given** an invalid request (empty text or text exceeding 10,000 characters), **When** validation fails, **Then** the request returns HTTP 400 immediately without logging uninitialized timing values.

---

### Edge Cases

- **Failure during Edge-TTS**: If `_synthesize_base` throws an exception (e.g., network disconnect), execution branches directly into the `except` block; timing logging is safely bypassed.
- **Failure during RVC inference**: If `_run_rvc_inference` raises `RuntimeError`, execution branches into the `except` block without attempting to print incomplete timing metrics.
- **Concurrent requests**: Multiple simultaneous requests each maintain local timestamps (`t0`, `t1`, `t2`) on the request stack, ensuring concurrency safety across requests.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `python-backend/server.py` MUST import the standard library `time` module at the module level.
- **FR-002**: Inside the `/speak` route handler, the server MUST capture `t0 = time.time()` immediately prior to calling `asyncio.run(_synthesize_base(text, base_path))`.
- **FR-003**: Inside `/speak`, the server MUST capture `t1 = time.time()` immediately after `_synthesize_base(...)` finishes.
- **FR-004**: Inside `/speak`, the server MUST capture `t2 = time.time()` immediately after the `with rvc_lock:` block containing `_run_rvc_inference(base_path, out_path)` exits.
- **FR-005**: Inside `/speak`, the server MUST print a log message to stdout with format:
  `[VoxRead][Timing] Edge-TTS: {t1-t0:.2f}s | RVC inference: {t2-t1:.2f}s | Text length: {len(text)} ky tu`
- **FR-006**: The timing instrumentation MUST NOT alter any response codes, response bodies, error handling logic, or temporary file cleanup routines in `server.py`.
- **FR-007**: `python-backend/tests/test_server.py` MUST verify that the timing log is emitted upon successful `/speak` requests and verify that all existing endpoint tests continue to pass.

---

### Key Entities

- **SynthesisTimingSnapshot**: Ephemeral duration measurements captured during request processing:
  - `edge_tts_duration`: Elapsed seconds (`t1 - t0`) for base TTS synthesis.
  - `rvc_inference_duration`: Elapsed seconds (`t2 - t1`) for neural voice conversion.
  - `text_length`: Character length of sanitized input text.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful speech synthesis requests emit the formatted timing log to standard output.
- **SC-002**: Zero regression to API response times (timing overhead strictly under 0.5 milliseconds).
- **SC-003**: 100% preservation of HTTP contracts: HTTP 200 with `audio/wav` for valid requests, unchanged JSON error payloads for errors.
- **SC-004**: 100% pass rate on Python backend tests (`pytest python-backend/tests/test_server.py`).

---

## Assumptions

- Standard output from `server.py` is logged and accessible in the developer console or terminal running the server process.
- The standard library `time.time()` provides sufficient sub-second precision for identifying bottlenecks spanning multiple seconds.
