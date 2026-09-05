# Quickstart Validation Guide: WAV Audio Playback Error Diagnostics

**Feature**: 034-wav-error-diagnostics | **Date**: 2026-09-05

---

## Prerequisites

- Node.js and npm installed (for running the Electron/React frontend)
- Python 3.11+ with the backend dependencies (`flask`, `scipy`, `rvc_python`, `edge_tts`)
- A valid RVC model (`.pth`) in `python-backend/model/`
- `pytest` and `numpy` installed in the Python environment

---

## Validation Scenario 1: Backend WAV Debug Log

**Goal**: Verify that every successful `/speak` request emits a `[VoxRead][Debug] WAV output:` log line.

### Steps

1. Start the Python backend:
   ```bash
   cd python-backend
   python server.py
   ```

2. Send a test request:
   ```bash
   curl -X POST http://localhost:8008/speak \
     -H "Content-Type: application/json" \
     -d '{"text": "Hôm nay trời rất đẹp."}'
   ```

3. Check the server terminal for two log lines:
   ```
   [VoxRead][Debug] WAV output: shape=(XXXXX,), dtype=int16, sample_rate=40000, duration=X.XXs
   [VoxRead][Timing] Edge-TTS: X.XXs | RVC inference: X.XXs | Text length: 21 ky tu
   ```

### Expected Outcomes

- The `[VoxRead][Debug]` line appears **before** the `[VoxRead][Timing]` line.
- `shape` is a non-empty tuple (e.g., `(48000,)`).
- `dtype` is `int16`.
- `sample_rate` is a positive integer (typically `40000`).
- `duration` is a positive float consistent with the text length.

---

## Validation Scenario 2: Frontend MediaError Banner (Manual)

**Goal**: Verify that the UI banner displays a specific MediaError code when audio playback fails.

### Steps

1. Start both the backend (`python server.py`) and the frontend (`npm start`).
2. Load a document and start TTS playback.
3. To simulate a decode error (advanced):
   - Temporarily modify `fetchRVCSpeech` to return an invalid blob (e.g., `new Blob([new Uint8Array(0)], { type: 'audio/wav' })`).
   - Or: intercept the network request via DevTools and replace the response with a corrupt WAV.
4. Observe the error banner in the UI.

### Expected Outcomes

- The banner reads: `Lỗi phát âm thanh WAV (MEDIA_ERR_DECODE).` or similar with the specific code.
- The browser console shows: `[VoxRead] Audio playback error: MEDIA_ERR_DECODE ...`
- Playback state resets: play button returns to the "play" icon.

---

## Validation Scenario 3: Backend Automated Tests

**Goal**: Verify all existing tests pass and the new debug log test passes.

### Steps

```bash
cd python-backend
pytest tests/test_server.py -v
```

### Expected Outcomes

- All existing tests pass (26 tests including `test_speak_timing_log_emitted`).
- New test `test_speak_wav_debug_log_emitted` passes, verifying:
  - `[VoxRead][Debug] WAV output:` appears in captured stdout.
  - Log contains `shape=`, `dtype=`, `sample_rate=`, `duration=`.

---

## Cross-Reference Workflow (Post-Deployment)

When the error `Lỗi phát âm thanh WAV (MEDIA_ERR_DECODE)` appears in the UI:

1. Note the **banner text** (includes the MediaError code).
2. Check the **server terminal** for the corresponding `[VoxRead][Debug] WAV output:` line.
3. Look for anomalies:
   - `duration=0.00s` → RVC produced empty audio
   - `sample_rate=0` → Invalid WAV header
   - `dtype=float64` → Unexpected sample format
4. Note the **input text** from the `[VoxRead][Timing]` line (`Text length: N ky tu`) to identify patterns (very short text, special characters, etc.).
