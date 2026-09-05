# Quickstart & Verification Guide: RVC Error Handling & Model Badge

**Feature Branch**: `031-rvc-infer-error-handling`  
**Date**: 2026-09-05  

---

## Prerequisites

1. Python 3.10+ virtual environment in `python-backend/venv` with `pytest` installed.
2. Node.js dependencies installed in project root (`node_modules`).

---

## Automated Verification

### 1. Run Python Backend Unit Tests
Verify `_run_rvc_inference`, direct `vc_single` invocation, and error handling for RVC tuple returns:
```powershell
cd python-backend
.\venv\Scripts\pytest tests/test_server.py -v
```
Expected: All tests pass, including:
- `test_speak_valid_request_returns_audio_wav` (verifies `vc_single` returning `ndarray` generates 200 `audio/wav`).
- `test_speak_rvc_pipeline_error_returns_500` (verifies `vc_single` returning error `tuple` generates 500 with meaningful error message).

### 2. Run Frontend Tests, Lint, and Typecheck
Verify `SettingsModal.tsx` changes cause no regressions:
```powershell
npm test
npm run typecheck
npm run lint
```
Expected: All tests pass with 0 errors.

---

## Manual Verification

1. Start Python backend:
   ```powershell
   cd python-backend
   .\venv\Scripts\python server.py
   ```
2. Start Electron/Vite app:
   ```powershell
   npm run dev
   ```
3. Open Voice Settings modal:
   - Check the model list under Voice settings.
   - Confirm the badge for the active model reads **"Đang dùng"** instead of **"Đang nạp"**.
4. Test speech synthesis:
   - Click to read any article paragraph.
   - If an invalid or corrupted RVC model/index is supplied, confirm the server displays the specific error reason instead of crashing with `'tuple' object has no attribute 'dtype'`.
