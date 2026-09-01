# Quickstart & Verification Guide: Local RVC Voice Cloning & Windows Desktop App

**Feature**: `001-rvc-tts-desktop`  
**Date**: 2026-09-01  
**Status**: Ready for Verification

---

## 1. Prerequisites

### 1.1 Node.js Environment
- Node.js $\ge 18$
- npm dependencies installed (`npm install`)

### 1.2 Python Environment (For Local RVC Audio Verification)
- Python 3.10 virtual environment in `python-backend/venv/`
- Dependencies from `python-backend/requirements.txt` + `torch` matching your system GPU/CPU
- Cloned model files in `python-backend/model/`:
  - `Chess_25e_12750s.pth`
  - `Chess.index`

*(Note: If the Python backend is not configured yet, the app gracefully falls back to browser voices and displays clear status indicators).*

---

## 2. Verification Scenarios

### Scenario 1: Verify Voice Provider Switching in Settings

1. Run web dev mode:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000` in the browser.
3. Click the **Settings** icon (top bar) $\rightarrow$ select **Voice & Speed** tab.
4. Verify the new voice provider segmented selector is present:
   - **"Giọng máy (mặc định)"**: Standard list of system voices is shown.
   - **"Giọng của tôi (RVC local)"**: System voice list is hidden; Server URL input (`http://localhost:8008`) and connection status dot appear.
5. With the Python server stopped, verify that the connection status displays **🔴 Không thể kết nối** and a descriptive warning banner is shown.

---

### Scenario 2: Verify RVC Audio Synthesis & Prefetching

1. Start the local Python backend:
   ```bash
   cd python-backend
   ./venv/Scripts/python.exe server.py
   ```
2. Refresh VoxRead Settings:
   - Verify connection status dot turns **🟢 Đã kết nối**.
3. Click **"Thử giọng" (Test Voice)**:
   - A Vietnamese sample phrase is synthesized and plays back with the cloned voice timbre.
4. Open a chapter with multiple sentences and click **Play**:
   - Verify sentence $N$ plays smoothly.
   - Inspect Network tab: observe that sentence $N+1$ is fetched while sentence $N$ is still playing.
   - When sentence $N$ completes, transition to sentence $N+1$ occurs seamlessly without an audible gap ($< 200\text{ ms}$).
5. Verify controls: Pause, Resume, Next, Prev, and Jump to sentence work accurately.

---

### Scenario 3: Verify Electron Desktop Development Mode

1. Run the unified Electron dev command:
   ```bash
   npm run electron:dev
   ```
2. Expected behavior:
   - Vite dev server starts on `http://localhost:3000`.
   - Electron main process spawns `python-backend/server.py` using `python-backend/venv/Scripts/pythonw.exe`.
   - Main desktop window opens with VoxRead loaded.
   - System tray icon appears in the Windows taskbar notifications area.
3. Test window close:
   - Click the window close button (`X`).
   - The window hides into the system tray.
4. Test tray restore:
   - Click or right-click the tray icon $\rightarrow$ select **"Mở VoxRead"**.
   - The window restores to the foreground.
5. Test exit & process cleanup:
   - Right-click the tray icon $\rightarrow$ select **"Thoát"**.
   - App exits cleanly. Open Task Manager and verify no orphaned `pythonw.exe` processes remain.

---

### Scenario 4: Verify Windows Desktop Packaging (`.exe`)

1. Build the production application:
   ```bash
   npm run electron:build
   ```
2. Expected outcome:
   - Vite compiles the React app into `dist/`.
   - `esbuild` compiles Electron scripts into `dist-electron/`.
   - `electron-builder` packages the application into `release/` (or `dist-app/`).
   - Package size is reasonable (~$80-120\text{ MB}$, NOT gigabytes) because `venv/` and `model/` are excluded.
3. Launch the generated `.exe` file to verify standalone execution.
