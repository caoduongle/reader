# Feature Specification: RVC Voice Model Management & One-Click Import

**Feature Branch**: `027-rvc-model-management`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "Bối cảnh dự án: Đây là app đọc web bằng giọng AI, gồm: extension Chrome, Electron app, và python-backend/server.py chạy RVC voice cloning local tại http://localhost:8008. Trong Settings UI (component Voice & Reader Settings / tab Giọng đọc & Tốc độ), khi chọn nguồn Giọng của tôi (RVC local), có ô nhập URL server + nút Kiểm tra để test kết nối. Hiện tại nếu thư mục model (chứa file .pth và .index) chưa tồn tại trong python-backend/, server.py không khởi động được / hoặc trả lỗi, khiến UI hiện banner đỏ: 'Không kết nối được server giọng đọc tại http://localhost:8008' kèm hướng dẫn chạy python server.py hoặc python python-backend/server.py. Nhiệm vụ: 1. Đọc kỹ python-backend/server.py... 2. Backend (python-backend): Đảm bảo thư mục model/ được tự động tạo ngay khi server khởi động; Thêm/sửa endpoint /health (hoặc /model/status) để trả về rõ ràng 3 trạng thái (server không chạy, server chạy nhưng chưa có model, server chạy và có model hợp lệ); Thêm endpoint mới (vd POST /model/create-folder hoặc /model/open-folder)... 3. Frontend/Electron: trong banner đỏ hiện nút '+ Thêm model' khi model_missing; bấm nút gọi IPC tạo thư mục, mở dialog chọn file .pth/.index, copy vào model/, tự động gọi lại Kiểm tra; Thêm VĨNH VIỄN mục 'Quản lý model giọng đọc' trong tab 'Giọng đọc & Tốc độ'... 4. UI/UX: giữ nguyên dark theme, style cam #f97316-ish... 5. Không phá vỡ luồng hiện tại... Cập nhật README... Tiêu chí hoàn thành: Xoá model/ -> Settings hiện banner kèm '+ Thêm model' -> Bấm nút chọn file -> Copy đúng -> Chuyển sang Đã kết nối -> Luôn có mục quản lý model."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Diagnostic Health State & Resilient Server Startup (Priority: P1) 🎯 MVP

As a user running the VoxRead application without pre-existing voice models, I want the Python backend to start cleanly without crashing and provide informative health diagnostics, so that the application can clearly distinguish between "server offline" and "server online but missing model weights".

**Why this priority**: A missing `model/` directory or missing `.pth` weights should never crash the background server process or report a misleading "server offline" error. Clear distinction between connection states is prerequisite for providing guided recovery actions.

**Independent Test**:
1. Remove or rename `python-backend/model/`.
2. Start `python-backend/server.py` or inspect server startup logic.
3. Verify that `python-backend/model/` is automatically created (`os.makedirs(..., exist_ok=True)`).
4. Query `GET /health` and verify it returns HTTP 200 with structured status: `{ "ok": false, "reason": "model_missing", "model_dir": "...", "model_loaded": false }`.
5. Place a valid `.pth` (and optional `.index`) into `model/` and verify `/health` returns `{ "ok": true, "model_loaded": true, "model_name": "...", "model_dir": "..." }`.

**Acceptance Scenarios**:
1. **Given** `python-backend/model/` does not exist on disk, **When** `server.py` starts, **Then** it automatically creates the directory without throwing an unhandled exception and continues listening on port 8008.
2. **Given** the server is running and `model/` contains no `.pth` files, **When** a client queries `GET /health`, **Then** the response indicates `ok: false`, `reason: "model_missing"`, `model_loaded: false`, and includes the absolute path to `model_dir`.
3. **Given** the server is running and `model/` contains at least one `.pth` file, **When** a client queries `GET /health`, **Then** the response indicates `ok: true`, `model_loaded: true`, and includes the loaded model filename and absolute `model_dir`.
4. **Given** the server is stopped, **When** the frontend attempts to check health, **Then** the client detects connection failure (network unreachable) as distinct from `model_missing`.

---

### User Story 2 - One-Click "+ Thêm model" Recovery in Connection Error Banner (Priority: P2)

As a user seeing a missing model warning in Settings, I want a prominent "+ Thêm model" button directly inside the alert banner, so that I can immediately select my voice files and have them imported and activated without manual file system manipulation or terminal commands.

**Why this priority**: Directly guiding the user from a diagnosed missing-model state to a single-click file picker minimizes configuration friction and prevents users from abandoning the custom voice feature.

**Independent Test**:
1. Ensure `python-backend/model/` has no `.pth` files.
2. In Settings > "Giọng đọc & Tốc độ" > "Giọng của tôi (RVC local)", click "Kiểm tra" or wait for status check.
3. Observe the alert banner: verify it indicates the server is running but missing models, and displays a "+ Thêm model" button alongside troubleshooting text.
4. Click "+ Thêm model", select a `.pth` (and/or `.index`) file from the system file picker dialog.
5. Verify files are copied into `python-backend/model/`, backend reloads the model, and the connection status transitions to "Đã kết nối" automatically.

**Acceptance Scenarios**:
1. **Given** the RVC local status is `model_missing`, **When** the alert banner renders, **Then** it shows a clear warning ("Server đang chạy nhưng chưa có file model...") and displays the "+ Thêm model" button styled with the application's orange/amber theme.
2. **Given** the user clicks "+ Thêm model" in the alert banner in the Electron app, **When** the file dialog opens, **Then** the dialog filters for voice model extensions (`.pth`, `.index`) and allows single or multiple file selection.
3. **Given** the user selects valid `.pth`/`.index` files, **When** the selection is confirmed, **Then** the application copies the files to `python-backend/model/`, calls the backend to refresh/reload models, and re-runs the health check.
4. **Given** the import succeeds, **When** health check finishes, **Then** the error banner disappears and the status turns to "Đã kết nối" (green badge) with loaded model information.
5. **Given** the user cancels the file dialog, **When** control returns, **Then** no error is shown and the banner remains in `model_missing` state.

---

### User Story 3 - Persistent "Quản lý model giọng đọc" Section in Settings (Priority: P3)

As a user configuring RVC voice cloning, I want a permanent "Quản lý model giọng đọc" management card in the "Giọng đọc & Tốc độ" settings tab, so that I can see the active model path, view available weights, open the folder in file explorer, or import new models at any time without waiting for an error.

**Why this priority**: Users need ongoing visibility and control over their installed voice models. They should be able to inspect what model is currently loaded or add new models even when the server is already connected and running normally.

**Independent Test**:
1. Open Settings > "Giọng đọc & Tốc độ" tab with "Giọng của tôi (RVC local)" selected.
2. Verify the "Quản lý model giọng đọc" section is visibly rendered beneath the server connection controls.
3. Check displayed information: active model directory path, current loaded model file name, and list of files in `model/`.
4. Click "Mở thư mục" and verify the OS file explorer opens directly to `python-backend/model/`.
5. Click "+ Thêm model" and verify that selecting an alternative `.pth`/`.index` copies it into `model/` and reloads the active voice.

**Acceptance Scenarios**:
1. **Given** the user has selected "Giọng của tôi (RVC local)", **When** the Settings modal renders, **Then** the "Quản lý model giọng đọc" section is always visible regardless of connection status (`connected`, `model_missing`, or `unreachable`).
2. **Given** the server is connected with models loaded, **When** viewing the management card, **Then** it shows the loaded model name, the full folder path, a button to open the directory in File Explorer, and a "+ Thêm model" button.
3. **Given** the server is reachable but has no models, **When** viewing the management card, **Then** it shows "Chưa có model trong thư mục", displays the folder path, and offers "+ Thêm model".
4. **Given** the user clicks "Mở thư mục", **When** running in Electron, **Then** the main process opens the folder in the native file manager (Windows Explorer / Finder).

---

### User Story 4 - Browser Fallback & Troubleshooting Documentation (Priority: P4)

As a user running VoxRead in a standard web browser or troubleshooting local setup, I want graceful fallback behaviors (such as copying the directory path to clipboard) and updated setup documentation in `README.md`, so that I understand how to manage models regardless of runtime environment.

**Why this priority**: In non-Electron environments where native file picker IPC is unavailable, the user must still receive actionable feedback. Updating documentation ensures long-term maintainability.

**Independent Test**:
1. Run application in a standard browser tab.
2. Click "+ Thêm model" or "Mở thư mục": verify the system provides a copy-to-clipboard action or manual upload modal with the target path.
3. Inspect `README.md` and verify the "Xử lý sự cố thường gặp" section explains the "+ Thêm model" feature and missing model status.

**Acceptance Scenarios**:
1. **Given** the application is running outside of Electron, **When** the user clicks "+ Thêm model", **Then** the application copies the target folder path to clipboard and displays an informative notification or file guidance dialog.
2. **Given** `README.md`, **When** the troubleshooting section is reviewed, **Then** it includes instructions on using "+ Thêm model" in Settings and explains the `model_missing` status.

---

### Edge Cases

- **File Collision / Overwrite**: When the user selects a file with the same name as an existing file in `python-backend/model/`, the copy operation safely overwrites the target file with the newer file.
- **Large Model File Transfer**: Model files (`.pth` can be ~60MB - 150MB, `.index` ~30MB - 80MB). Copying must be asynchronous and indicate a loading/processing state so the UI does not freeze.
- **Model Hot-Reload Without Restart**: When new files are copied into `model/`, the backend provides a reload mechanism (`POST /model/reload` or re-scan on `/health`) so the user does not have to terminate and restart the Python process in terminal.
- **Corrupted or Invalid File Selection**: If a user selects a non-model file (e.g. invalid extension or zero-byte file), the system validates file extensions (`.pth`, `.index`) before copying and surfaces a friendly error if loading fails.
- **Network / Permission Error during Copy**: If file copying fails due to disk permissions or missing target directories, an error toast/banner notifies the user with the failure reason.
- **Multiple `.pth` Files Present**: If multiple `.pth` files exist in `model/`, the backend consistently selects the first alphabetical `.pth` (and matching or first alphabetical `.index`) while listing all discovered files via `GET /model/list`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Backend MUST ensure `python-backend/model/` directory exists upon server startup, automatically creating it via `os.makedirs(..., exist_ok=True)` if missing.
- **FR-002**: Backend MUST provide a health endpoint (`GET /health`) that distinguishes between healthy (`ok: true, model_loaded: true`), missing model (`ok: false, reason: "model_missing", model_loaded: false, model_dir: "..."`), and provides absolute path to the model directory.
- **FR-003**: Backend MUST provide a model listing endpoint (`GET /model/list`) returning available `.pth` and `.index` files, current active model, and `model_dir`.
- **FR-004**: Backend MUST provide a model reload endpoint (`POST /model/reload`) to re-scan `model/` and initialize the RVC inference engine dynamically when new weights are imported.
- **FR-005**: Backend MUST provide a folder creation endpoint (`POST /model/create-folder`) that ensures `model/` exists and returns its absolute path.
- **FR-006**: Frontend connection polling and health check hook (`useVoiceServerStatus` & `useTTS`) MUST distinguish between three discrete states:
  1. `connected`: Server online and model successfully loaded.
  2. `model_missing`: Server online and reachable, but no `.pth` voice model exists.
  3. `unreachable`: Server offline or unreachable via HTTP.
- **FR-007**: Frontend Settings modal MUST display a "+ Thêm model" button within the warning banner when the state is `model_missing`.
- **FR-008**: Frontend Settings modal MUST permanently display a "Quản lý model giọng đọc" card under RVC local settings, showing the current directory path, active model status, a "+ Thêm model" button, and an "Mở thư mục" button.
- **FR-009**: Electron main process MUST expose secure IPC handlers for:
  - `models:import`: Invoking native open file dialog (`.pth`, `.index`) and copying selected files into `python-backend/model/`.
  - `models:open-folder`: Opening the model directory in the OS file explorer (`shell.openPath`).
  - `models:get-dir`: Retrieving the absolute path of the model directory.
- **FR-010**: Electron preload script MUST expose the model management IPC methods through `window.voxreadDesktop.models`.
- **FR-011**: Frontend MUST trigger an immediate connection re-check upon completing model import, transitioning to `connected` without user manual refresh.
- **FR-012**: In non-Electron environments, the application MUST provide a fallback behavior that copies the model directory path to the clipboard and displays instructions.
- **FR-013**: UI styling for "+ Thêm model" and management elements MUST maintain the existing dark theme palette (`#16161A` card background, `#f97316` / `amber-500` accent, standard borders and typography).
- **FR-014**: All user-facing labels and instructional messages MUST be in clear, concise Vietnamese consistent with the existing application terminology.
- **FR-015**: Project documentation (`README.md`) MUST be updated to document the "+ Thêm model" workflow and troubleshooting guidelines.

---

### Key Entities

- **VoiceServerStatus**:
  - `status`: `'checking' | 'connected' | 'model_missing' | 'unreachable'`
  - `modelLoaded`: `boolean`
  - `modelDir`: `string | null`
  - `activeModel`: `string | null`
  - `availableModels`: `string[]`
  - `errorMessage`: `string | null`
- **ModelImportResult**:
  - `success`: `boolean`
  - `importedFiles`: `string[]`
  - `targetDir`: `string`
  - `error`: `string | null`
- **ModelInfo**:
  - `filename`: `string`
  - `type`: `'pth' | 'index'`
  - `sizeBytes`: `number`
  - `isActive`: `boolean`

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When `python-backend/model/` is deleted, starting the server results in 0 crashes and the directory is re-created within 100ms of process start.
- **SC-002**: Frontend identifies the `model_missing` state and renders the "+ Thêm model" action button in under 1 second of polling response.
- **SC-003**: Users can import a valid `.pth` file using the "+ Thêm model" dialog in under 3 clicks (click "+ Thêm model" -> pick file -> confirm), with automated status refresh transitioning to "Đã kết nối" in under 3 seconds post-copy.
- **SC-004**: 100% of existing tests in `python-backend/tests` and frontend `tests/` pass with zero regressions, and new tests cover the 3 server states and model import lifecycle.
- **SC-005**: The "Quản lý model giọng đọc" section remains accessible and functional 100% of the time when RVC Local is active, whether models exist or not.

---

## Assumptions

- The Python backend runs in a local environment where it has read/write permissions to its own folder (`python-backend/model/`).
- Users possess trained RVC voice weights consisting of a `.pth` file (and optionally a `.index` feature index file).
- In desktop mode, Electron has permission to open native file dialogs and copy files on the local filesystem.
- When multiple `.pth` files are present in `model/`, the auto-discovery algorithm defaults to the first `.pth` alphabetically, preserving predictable deterministic behavior.
