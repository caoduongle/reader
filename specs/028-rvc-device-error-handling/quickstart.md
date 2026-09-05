# Quickstart Validation Guide: RVC Device Auto-Detection & Speech Error Visibility

**Feature**: `028-rvc-device-error-handling`  
**Date**: 2026-09-05  

---

## Scenario 1: Verify Hardware Auto-Detection & Startup Logging

1. Open a terminal in `python-backend/`.
2. Run server directly:
   ```bash
   .\venv\Scripts\python.exe server.py
   ```
3. **Expected Output**:
   The terminal outputs:
   `[VoxRead] Dang dung thiet bi: cuda:0` (if NVIDIA GPU present) OR
   `[VoxRead] Dang dung thiet bi: cpu:0` (if CPU-only).
4. Run with manual override:
   ```powershell
   $env:VOXREAD_DEVICE="cpu:0"; .\venv\Scripts\python.exe server.py
   ```
5. **Expected Output**:
   Terminal logs `[VoxRead] Dang dung thiet bi: cpu:0`.

---

## Scenario 2: Verify `model_loaded: false` and Settings Amber Banner

1. Ensure `python-backend/model/` contains no `.pth` files (or contains a corrupt dummy file).
2. Start the backend:
   ```bash
   .\venv\Scripts\python.exe server.py
   ```
3. Check `/health`:
   ```powershell
   curl.exe http://localhost:8008/health
   ```
   **Expected**: Response contains `"ok": false`, `"model_loaded": false`, and `"reason": "model_missing"` (or `"model_init_failed"`).
4. Launch the desktop app (`npm run dev` or Electron).
5. Open Settings > "Giọng đọc & Tốc độ" > select "Giọng của tôi (RVC local)".
6. **Expected UI**:
   - Connection badge displays an amber dot with `"Chưa có model"`.
   - Amber warning banner is shown with detailed error text.
   - UI does NOT say "Đã kết nối" or "Đã sẵn sàng".

---

## Scenario 3: Verify Test Voice Error Surfacing in Settings

1. With no model loaded on `http://localhost:8008`, click "Thử giọng" in Settings.
2. **Expected UI**:
   - Network call to `POST /speak` returns HTTP 503 with error JSON.
   - SettingsModal displays the error message from the backend (e.g. "Chưa có model giọng RVC (.pth)...").
   - The error is not silently swallowed.

---

## Scenario 4: Verify Mid-Reading Error Toast in Reader Interface

1. Start reading an ebook with RVC voice cloning selected.
2. Stop the Python server (or trigger a 503 error on `/speak`).
3. While on the reader screen (Settings closed), observe the application behavior.
4. **Expected UI**:
   - Playback halts cleanly.
   - A visible toast appears on screen showing the error message (`showToast(serverErrorMessage)`).
   - Audio does not stop silently without user feedback.

---

## Automated Test Execution

Run backend test suite:
```powershell
.\python-backend\venv\Scripts\python.exe -m pytest python-backend/tests
```

Run frontend test suite:
```powershell
npm test
```

Run typecheck & linter:
```powershell
npm run typecheck
npx tsc --noEmit -p electron/tsconfig.json
npm run lint
```
