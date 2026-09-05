# Research: RVC Voice Model Management & One-Click Import

**Feature Branch**: `027-rvc-model-management`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Background & Problem Analysis

In the current VoxRead architecture, the local RVC TTS engine runs as a standalone Python process (`python-backend/server.py`) communicating with the Electron desktop app via HTTP (`http://localhost:8008`).

### Current Limitations Identified
1. **Startup Failure on Missing Directory**: If `python-backend/model/` is deleted or missing on a fresh installation, `discover_model_paths()` checks `if not os.path.isdir(model_dir)` and returns `(None, "")`. While `server.py` prints a warning, the directory is never created on disk, leading to potential write failures if files are later moved or if external scripts assume the directory exists.
2. **Ambiguous Health Reporting**: `server.py` currently returns `{"ok": True, "model_loaded": False}` on `GET /health` even when no model is loaded. At the same time, the frontend (`useVoiceServerStatus.ts` and `useTTS.ts`) only understands a binary `connected` vs `unreachable` state. When users try to speak or test connections with a missing model, the UI displays a generic red error banner stating:
   *"Không kết nối được server giọng đọc tại http://localhost:8008 ... Server Python có đang chạy không?"*
   This confuses users because the Python server **is** running, but lacks `.pth` weights.
3. **No In-App Model Import**: Users are currently required to manually navigate their file system to locate the backend folder, create `model/`, paste `.pth` and `.index` files, and restart the terminal command.
4. **Lack of Hot-Reload**: `RVCInference` is only instantiated during initial module execution of `server.py`. Adding a model while the server is running does not take effect unless the server is restarted.

---

## 2. Technical Decisions & Trade-Offs

### Decision 1: Health Diagnostic Contract & Status Distinctions

- **Chosen Approach**:
  - `GET /health` returns HTTP 200 with structured JSON:
    - When healthy & model loaded: `{ "ok": true, "model_loaded": true, "model_name": "...", "model_dir": "..." }`
    - When running but missing model: `{ "ok": false, "reason": "model_missing", "model_loaded": false, "model_dir": "..." }`
  - Frontend classifies connection into 4 explicit states:
    1. `'checking'`: Initial or in-flight probe.
    2. `'connected'`: HTTP 200, `data.ok === true && data.model_loaded === true`.
    3. `'model_missing'`: HTTP 200, `data.reason === 'model_missing'` or `data.model_loaded === false`.
    4. `'unreachable'`: Network error, fetch timeout, connection refused, or HTTP 5xx.
- **Rationale**:
  - Returning HTTP 200 allows `res.json()` to be cleanly parsed without throwing network errors.
  - Distinguishing `model_missing` from `unreachable` allows the UI to show an actionable "+ Thêm model" banner instead of an unhelpful "Is Python running?" message.
- **Alternatives Considered**:
  - *Returning HTTP 503 for missing model*: Rejected because standard fetch hooks treat 503 as generic server errors or network failures, making it harder to extract diagnostic payloads cleanly across libraries.

---

### Decision 2: Hot-Reload Mechanism (`POST /model/reload`)

- **Chosen Approach**:
  - Implement a thread-safe `reload_model()` function in `server.py`.
  - Expose `POST /model/reload` endpoint protected by `rvc_lock`.
  - When invoked, re-scans `model/` via `discover_model_paths()`. If a `.pth` file is found, initializes or rebinds `rvc = RVCInference(...)` and returns the newly loaded model metadata.
- **Rationale**:
  - Allows seamless transition from `model_missing` to `connected` immediately after the user imports a model, eliminating the need to terminate and restart the Python process.
- **Alternatives Considered**:
  - *File system watcher (watchdog / inotify)*: Adds complex daemon threading and file lock issues during active file copies.
  - *Process restart via Electron*: Killing and re-spawning Python is slower (~3-5s) and riskier than a direct Python-level model reload (~500ms).

---

### Decision 3: Electron Native File Dialog & File Copy Pipeline

- **Chosen Approach**:
  - Expose IPC channel `models:import` in `electron/main.ts`.
  - Opens `dialog.showOpenDialog` with multi-selection enabled, filtered to `['pth', 'index']`.
  - For each selected file, ensures `python-backend/model/` exists and copies files into the directory using Node.js `fs.copyFileSync` with overwrite support.
  - Preload script exposes `window.voxreadDesktop.models.importModel()`, `openFolder()`, and `getDir()`.
- **Rationale**:
  - Adheres to the established Electron IPC security patterns (context isolation, preload bridge, zero nodeIntegration in renderer).
  - Native file picker provides the best user experience on Windows and macOS.
- **Alternatives Considered**:
  - *HTML `<input type="file">` upload via HTTP POST*: Transmitting 100MB+ files over local HTTP is redundant in a desktop app when Electron already runs on the host filesystem and can perform zero-overhead local file copies.

---

### Decision 4: UI/UX Placement & Consistency

- **Chosen Approach**:
  - **In Alert Banner**: When `effectiveStatus === 'model_missing'`, render an amber-accented banner:
    - Clear explanation: *"Server Python đang chạy nhưng chưa tìm thấy file model (.pth/.index) trong thư mục model."*
    - Action button: **"+ Thêm model"** styled with `bg-amber-500 hover:bg-amber-600 text-black font-semibold`.
  - **Permanent Card**: Under "Cấu hình Server RVC Local", add a dedicated card: **"Quản lý model giọng đọc"**:
    - Always visible whenever "Giọng của tôi (RVC local)" is selected.
    - Displays: Current model folder path, active model file status, **"Mở thư mục"** button (opens OS Explorer), and **"+ Thêm model"** button.
- **Rationale**:
  - Fulfills the requirement that the management UI is permanent and not just an error state reaction.
  - Preserves VoxRead dark theme aesthetic (`#16161A` background, white/10 borders, amber accents).

---

### Decision 5: Non-Electron Fallback

- **Chosen Approach**:
  - If `window.voxreadDesktop?.models` is undefined (e.g., app loaded in standard web browser), clicking "+ Thêm model" or "Mở thư mục" copies the backend model directory path to the clipboard and shows an informative tooltip/toast instructing the user where to place their files.
- **Rationale**:
  - Prevents JavaScript runtime exceptions in web development mode while maintaining usability.

---

## 3. Summary of Resolved Architectural Decisions

| Aspect | Decision | Location |
|---|---|---|
| Auto-create folder | `os.makedirs(model_dir, exist_ok=True)` on startup | `python-backend/server.py` |
| Health contract | `{ ok, model_loaded, reason, model_dir, model_name }` | `python-backend/server.py` (`/health`) |
| Hot-reload | Thread-safe re-scan & load via `POST /model/reload` | `python-backend/server.py` (`/model/reload`) |
| Model listing | `GET /model/list` returning `.pth` and `.index` files | `python-backend/server.py` (`/model/list`) |
| Electron IPC | `models:import`, `models:open-folder`, `models:get-dir` | `electron/main.ts`, `electron/preload.ts` |
| UI States | `'checking'`, `'connected'`, `'model_missing'`, `'unreachable'` | `useVoiceServerStatus.ts`, `SettingsModal.tsx` |
| UI Action | "+ Thêm model" in banner + permanent management card | `src/components/SettingsModal.tsx` |
