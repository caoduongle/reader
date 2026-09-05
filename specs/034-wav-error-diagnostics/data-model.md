# Data Model: WAV Audio Playback Error Diagnostics

**Feature**: 034-wav-error-diagnostics | **Date**: 2026-09-05

> This feature does not introduce persistent data entities. The models below are ephemeral runtime structures used only for diagnostic logging.

---

## MediaErrorInfo (Frontend — TypeScript, runtime only)

Extracted from `HTMLMediaElement.error` inside the `audio.onerror` handler.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `code` | `number` (1–4) | `audio.error.code` | W3C MediaError code |
| `codeName` | `string` | Lookup map | Human-readable name: `MEDIA_ERR_ABORTED` / `MEDIA_ERR_NETWORK` / `MEDIA_ERR_DECODE` / `MEDIA_ERR_SRC_NOT_SUPPORTED` |
| `message` | `string \| undefined` | `audio.error.message` | Optional browser-provided detail (Chromium always provides this) |
| `reason` | `string` | Computed | Formatted display string: `"<codeName>"` or `"<codeName>: <message>"` or `"unknown"` |

### Code-to-Name Mapping

```
1 → MEDIA_ERR_ABORTED
2 → MEDIA_ERR_NETWORK
3 → MEDIA_ERR_DECODE
4 → MEDIA_ERR_SRC_NOT_SUPPORTED
```

### State Transitions

```
audio.onerror fires
  → Read audio.error (MediaError | null)
  → If non-null: map code → codeName, append message if non-empty
  → If null: reason = "unknown"
  → console.error("[VoxRead] Audio playback error:", reason, ...)
  → setServerErrorMessage(`Lỗi phát âm thanh WAV (${reason}).`)
  → setIsPlaying(false), setIsPaused(false)
```

---

## WAVOutputSnapshot (Backend — Python, runtime only)

Logged to stdout inside `_run_rvc_inference` after successful `vc_single` call.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `shape` | `tuple[int, ...]` | `result.shape` | NumPy array dimensions (e.g., `(16000,)` for mono) |
| `dtype` | `numpy.dtype` | `result.dtype` | Sample data type (expected: `int16`) |
| `sample_rate` | `int` | `rvc.vc.tgt_sr` | Target sample rate for WAV header |
| `duration` | `float` | `len(result) / rvc.vc.tgt_sr` | Computed audio duration in seconds |

### Validation Rules (Diagnostic — Not Enforced)

These are not programmatic checks but rather patterns a developer looks for when cross-referencing:

| Anomaly | Indicates |
|---------|-----------|
| `duration ≈ 0.0` | RVC produced empty or near-empty audio |
| `sample_rate = 0` | `tgt_sr` unset — WAV header will be invalid |
| `dtype = float64` | Unexpected format — some browsers reject non-int16 WAV |
| `shape = (0,)` | Zero-length array — empty WAV file |
