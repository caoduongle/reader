# Research: WAV Audio Playback Error Diagnostics

**Feature**: 034-wav-error-diagnostics | **Date**: 2026-09-05

## Research Task 1: W3C MediaError API in Chromium/Electron

### Decision
Use `HTMLMediaElement.error` property (returns `MediaError | null`) to extract error codes and messages in the `onerror` handler.

### Rationale
- The `onerror` event parameter is a generic DOM `Event` — it contains no audio-specific error information.
- `audio.error` returns a `MediaError` object with:
  - `.code`: numeric (1–4) per W3C spec
  - `.message`: optional browser-specific detail string (supported in Chrome/Chromium since ~2018)
- Electron uses Chromium, so `MediaError.message` is always available.
- The `onerror` callback signature can be `() => void` (no need for the event parameter at all).

### Alternatives Considered
1. **Wrap `audio.play()` in try/catch**: Only catches play-start errors, not mid-stream decode failures.
2. **Listen to `error` event on `<source>` element**: Not applicable — VoxRead sets `audio.src` directly, not via `<source>` child elements.
3. **Use `MediaSource` API with `sourceBuffer.error`**: Overkill for simple blob URL playback.

### W3C MediaError Code Reference

| Code | Constant | Meaning |
|------|----------|---------|
| 1 | `MEDIA_ERR_ABORTED` | Playback aborted by user agent or user |
| 2 | `MEDIA_ERR_NETWORK` | Network error during download (unlikely for blob URLs) |
| 3 | `MEDIA_ERR_DECODE` | Decoding failed despite confirmed supported format |
| 4 | `MEDIA_ERR_SRC_NOT_SUPPORTED` | Source format not supported |

---

## Research Task 2: NumPy Array Inspection for WAV Debug Logging

### Decision
Log `result.shape`, `result.dtype`, `rvc.vc.tgt_sr`, and `len(result) / rvc.vc.tgt_sr` after successful `vc_single` call, before `wavfile.write`.

### Rationale
- `vc_single` returns a NumPy `ndarray` on success (confirmed by existing code: `wavfile.write(out_path, rvc.vc.tgt_sr, result)`).
- `.shape` reveals dimensionality — a shape of `(0,)` would indicate empty audio.
- `.dtype` confirms the sample format — `int16` is expected for WAV; `float64` would indicate an unexpected conversion.
- `rvc.vc.tgt_sr` is the sample rate used by `wavfile.write` — if it's `0` or `None`, the WAV header will be invalid.
- `len(result) / tgt_sr` gives duration — values near `0.0` indicate RVC produced negligible audio.

### Alternatives Considered
1. **Log WAV file size after writing**: Less informative — file size doesn't reveal dtype or sample rate issues.
2. **Log inside `wavfile.write` (monkey-patch)**: Too invasive, breaks separation of concerns.
3. **Add WAV header validation after write**: Useful but out of scope — this feature is about diagnostic logging, not automated repair.

### Placement Decision
Insert the `print()` between the tuple-error check (line 193) and `wavfile.write` (line 195) — this ensures:
- The log only fires for successful inference (not error tuples).
- The data is logged before it's written to disk, so any corruption during write is still diagnosable.

---

## Research Task 3: Impact on Existing Tests

### Decision
Add one new test `test_speak_wav_debug_log_emitted` following the exact pattern of the existing `test_speak_timing_log_emitted` test. No existing tests need modification.

### Rationale
- The existing test at line 361 of `test_server.py` uses `capsys.readouterr()` to capture stdout and verify the `[VoxRead][Timing]` log — the same pattern works for `[VoxRead][Debug]`.
- The mock `vc_single` returns `np.zeros(16000, dtype=np.int16)` — this has known `.shape`, `.dtype`, and length for assertion.
- No existing tests are affected because the new `print()` is additive and the function signature/return value are unchanged.

### Alternatives Considered
1. **Use Python `logging` module instead of `print`**: Would be better practice long-term, but the entire codebase uses `print()` for server output. Consistency wins here.
2. **Mock `print` instead of using `capsys`**: `capsys` is cleaner and already used in the test suite.
