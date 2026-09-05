# Feature Specification: WAV Audio Playback Error Diagnostics

**Feature Branch**: `034-wav-error-diagnostics`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: Improve error diagnostics when WAV playback fails in the browser. The frontend `audio.onerror` handler currently logs a generic DOM event instead of the real `MediaError` code, providing no actionable information. The backend provides no metadata about the WAV file it generated, making root-cause analysis impossible.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Actionable Browser-Side Audio Error Reporting (Priority: P1) 🎯 MVP

As a user or developer of VoxRead, when WAV audio playback fails in the browser, I want the error banner to display the specific MediaError code and description (e.g., "MEDIA_ERR_DECODE", "MEDIA_ERR_SRC_NOT_SUPPORTED"), so that I can immediately distinguish between a decoding failure, an unsupported format, a network issue, or an aborted playback — rather than seeing only a generic "Lỗi phát âm thanh WAV." message with no diagnostic detail.

**Why this priority**: The current generic error message tells neither the user nor the developer what went wrong. Browser `HTMLMediaElement.error` provides a structured `MediaError` object with a numeric code and optional message. Surfacing this information directly in the UI banner eliminates guesswork during troubleshooting.

**Independent Test**:
1. Trigger an audio playback error (e.g., by providing a corrupt WAV blob or a blob with an unsupported encoding).
2. Observe the error banner displayed in the application UI.
3. Verify that the banner text includes the specific MediaError code name (e.g., `MEDIA_ERR_DECODE`) and the browser-provided message if available.
4. Verify that the browser console logs the same structured error information with the `[VoxRead]` prefix.

**Acceptance Scenarios**:
1. **Given** audio playback fails due to a decode error, **When** the `onerror` handler fires, **Then** the UI banner displays "Lỗi phát âm thanh WAV (MEDIA_ERR_DECODE)" or "Lỗi phát âm thanh WAV (MEDIA_ERR_DECODE: \<browser message\>)" if the browser provides additional detail.
2. **Given** audio playback fails due to an unsupported source format, **When** the `onerror` handler fires, **Then** the UI banner displays "Lỗi phát âm thanh WAV (MEDIA_ERR_SRC_NOT_SUPPORTED)".
3. **Given** the browser's `MediaError` object is unexpectedly null, **When** the `onerror` handler fires, **Then** the UI banner displays "Lỗi phát âm thanh WAV (unknown)".
4. **Given** any audio playback error, **When** the `onerror` handler fires, **Then** a `console.error` line prefixed with `[VoxRead]` is emitted containing the resolved error reason string.
5. **Given** any audio playback error, **When** the `onerror` handler fires, **Then** the playback state is reset (`isPlaying` → false, `isPaused` → false), preserving existing behavior.

---

### User Story 2 – Backend WAV Output Telemetry for Cross-Referencing (Priority: P2)

As a developer investigating recurrent audio playback failures, I want the Python backend to log structured metadata about each WAV file it generates (shape, data type, sample rate, duration) immediately after RVC inference, so that when the frontend reports a specific error I can cross-reference the server terminal to identify backend-side anomalies such as zero-length audio, null sample rates, or unexpected data types.

**Why this priority**: The frontend error code alone (e.g., `MEDIA_ERR_DECODE`) indicates what failed but not why. Correlating it with the backend's WAV file properties — particularly duration near zero, sample rate of 0 or None, or unexpected dtype — can pinpoint the root cause (RVC producing empty audio, wrong sample rate, or corrupt data).

**Independent Test**:
1. Send a valid synthesis request to `POST /speak`.
2. Inspect the server terminal output.
3. Verify that a line starting with `[VoxRead][Debug] WAV output:` is printed, containing `shape=`, `dtype=`, `sample_rate=`, and `duration=` fields.
4. Verify that the duration value is consistent with the input text length (not near zero for normal-length text).

**Acceptance Scenarios**:
1. **Given** a successful RVC inference producing an audio array, **When** the `/speak` route generates a WAV file, **Then** the server prints `[VoxRead][Debug] WAV output: shape=<shape>, dtype=<dtype>, sample_rate=<sr>, duration=<seconds>s` to standard output.
2. **Given** the printed `duration` is 0.00s or negative, **When** a developer investigates, **Then** the log provides enough information to determine whether the issue is zero-length audio data, zero sample rate, or both.
3. **Given** the printed `sample_rate` is 0 or None, **When** a developer investigates, **Then** the anomaly is immediately visible in the log without needing to decode the WAV file manually.

---

### Edge Cases

- **MediaError with message**: Some browsers (Chrome) populate `MediaError.message` with additional detail; the handler displays it. Others leave it empty; the handler gracefully omits it.
- **MediaError is null**: In rare cases, `audio.error` may be null even when `onerror` fires. The handler maps this to `"unknown"`.
- **RVC produces a tuple (error case)**: The existing `_run_rvc_inference` function already raises `RuntimeError` for error tuples. The debug log is only reached for successful inference results, so it never attempts to log properties of an error tuple.
- **Concurrent requests**: Each `/speak` request has its own local `result` variable; WAV debug logs from concurrent requests are interleaved but individually correct.
- **Very short text (1-2 characters)**: May produce very short audio (< 0.1s). The debug log makes this visible.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `audio.onerror` handler in `src/hooks/useTTS.ts` MUST read `audio.error` (the `MediaError` object) instead of relying on the DOM event parameter.
- **FR-002**: The handler MUST map `MediaError.code` values (1–4) to their standard W3C names: `MEDIA_ERR_ABORTED`, `MEDIA_ERR_NETWORK`, `MEDIA_ERR_DECODE`, `MEDIA_ERR_SRC_NOT_SUPPORTED`.
- **FR-003**: The handler MUST append `MediaError.message` to the error string when the message is non-empty, separated by `: `.
- **FR-004**: The handler MUST fall back to the string `"unknown"` when `audio.error` is null.
- **FR-005**: The handler MUST set the user-visible error banner to `Lỗi phát âm thanh WAV (<reason>).` where `<reason>` is the resolved MediaError description.
- **FR-006**: The handler MUST emit a `console.error` log line prefixed with `[VoxRead]` containing the resolved reason string.
- **FR-007**: The handler MUST continue to reset `isPlaying` to false and `isPaused` to false, preserving existing state management behavior.
- **FR-008**: In `python-backend/server.py`, the `_run_rvc_inference` function MUST print a debug log line with format: `[VoxRead][Debug] WAV output: shape=<shape>, dtype=<dtype>, sample_rate=<sr>, duration=<duration>s` immediately after successful inference (before returning).
- **FR-009**: The backend debug log MUST NOT alter any return values, error handling, response codes, or file cleanup routines.

---

### Key Entities

- **MediaErrorInfo**: Browser-side error metadata extracted from `HTMLMediaElement.error`:
  - `code`: Numeric error code (1–4) per W3C `MediaError` spec.
  - `codeName`: Human-readable name mapped from the code.
  - `message`: Optional browser-provided error detail string.
  - `reason`: Formatted string combining `codeName` and `message` for display.

- **WAVOutputSnapshot**: Backend-side telemetry for generated audio:
  - `shape`: NumPy array shape of the inference result.
  - `dtype`: NumPy data type of the audio samples.
  - `sample_rate`: Target sample rate from the RVC voice converter.
  - `duration`: Computed duration in seconds (`len(result) / sample_rate`).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of frontend audio playback errors display the specific MediaError code name in the UI banner instead of a generic message.
- **SC-002**: 100% of successful `/speak` requests emit the `[VoxRead][Debug] WAV output:` telemetry line to server standard output.
- **SC-003**: Zero regression to existing playback state management — `isPlaying` and `isPaused` are correctly reset on every audio error.
- **SC-004**: Zero regression to HTTP response behavior — all existing API contracts, status codes, and response bodies remain unchanged.
- **SC-005**: Diagnostic cross-referencing capability: when a browser-side `MEDIA_ERR_DECODE` occurs, the corresponding server log provides enough metadata (shape, dtype, sample_rate, duration) to identify backend-side anomalies.

---

## Assumptions

- The `HTMLMediaElement.error` property is supported by all target browsers (Chromium/Electron — guaranteed support).
- The `rvc.vc.tgt_sr` property reliably reflects the target sample rate used by `wavfile.write`.
- The `result` variable returned by `rvc.vc.vc_single` on success is a NumPy array with `.shape` and `.dtype` attributes.
- Server standard output is accessible to developers in the terminal running `server.py`.
