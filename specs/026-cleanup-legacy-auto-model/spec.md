# Feature Specification: Legacy Chrome Extension Cleanup & Dynamic RVC Model Auto-Discovery

**Feature Branch**: `026-cleanup-legacy-auto-model`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "Bối cảnh: repo VoxRead đã trải qua nhiều lần refactor (xóa hệ thống SaaS/Auth, xóa Chrome extension tts-extension, xóa local-voice-server). Qua rà soát sâu, phát hiện code backend và tài liệu vẫn còn 'hồn ma' của kiến trúc cũ (Chrome extension), và có 1 lỗ hổng trải nghiệm người dùng thật sự (model giọng hardcode tên tác giả). Thực hiện các việc sau, theo đúng thứ tự, mỗi việc test riêng trước khi sang việc tiếp theo: VIỆC 1 — Dọn dependency & gitignore còn tồn đọng: xóa @testing-library/user-event, autoprefixer, tsx trong package.json devDependencies; cập nhật .gitignore thêm *.tsbuildinfo, .eslintcache, .pytest_cache/, xóa dist-app/; npm install và verify typecheck, lint, test. VIỆC 2 — Backend: xóa tàn dư Chrome extension & cơ chế tự tìm model giọng: sửa docstring server.py, xóa origin chrome-extension:// trong CORS, cơ chế tự động tìm file .pth và .index đầu tiên trong python-backend/model/ thay vì hardcode, không crash server khi thiếu model mà log cảnh báo và trả về HTTP 503 khi gọi /speak, tạo file python-backend/model/.gitkeep, cập nhật backend tests và chạy pytest pass. VIỆC 3 — Tài liệu: đồng bộ README (xóa nhánh Chrome Extension trong sơ đồ Mermaid, cập nhật hướng dẫn copy model không cần sửa code) và docs/rvc-voice-setup.md."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dead Dependency & Gitignore Hygiene (Priority: P1)

As a developer maintaining the VoxRead repository, I want unused devDependencies removed from `package.json` and build artifacts properly ignored in `.gitignore`, so that the project installation size is reduced, clean lockfiles are maintained, and build caches do not pollute version control.

**Why this priority**: Unused packages (`@testing-library/user-event`, `autoprefixer`, `tsx`) create unnecessary baggage and potential dependency audit vulnerabilities. Outdated ignore patterns (`dist-app/`) cause confusion with real build outputs (`release/`), while untracked caches (`*.tsbuildinfo`, `.eslintcache`, `.pytest_cache/`) cause git noise.

**Independent Test**:
1. Run `npm install` and verify cleanly updated lockfile without unused packages.
2. Run `npm run typecheck`, `npm run lint`, and `npm test` to ensure zero regressions in frontend builds and tests.
3. Check `.gitignore` to ensure cache rules are present and stale paths are absent.

**Acceptance Scenarios**:
1. **Given** `package.json`, **When** inspected, **Then** `@testing-library/user-event`, `autoprefixer`, and `tsx` are no longer present in `devDependencies`.
2. **Given** `.gitignore`, **When** inspected, **Then** `*.tsbuildinfo`, `.eslintcache`, and `.pytest_cache/` are ignored, and `dist-app/` is removed.
3. **Given** the frontend codebase, **When** executing `npm run typecheck && npm run lint && npm test`, **Then** all commands complete successfully with exit code 0.

---

### User Story 2 - Backend Extension Cleanup & Dynamic RVC Model Auto-Discovery (Priority: P2) 🎯 MVP

As an end user or developer setting up custom RVC voice models in VoxRead, I want to simply drop my `.pth` and optional `.index` files into `python-backend/model/` and have the backend automatically discover them without touching Python source code, and I want the server to start cleanly with informative diagnostics even if no model has been downloaded yet.

**Why this priority**: Hardcoding specific author model filenames (`Chess_25e_12750s.pth`) forces every user to manually edit `python-backend/server.py`, creating a major usability friction and crash risk. Starting the server without models must not crash the entire application; instead it should degrade gracefully and provide helpful guidance when voice generation is requested. Furthermore, lingering Chrome extension references and CORS permissions are obsolete now that VoxRead is a standalone desktop application.

**Independent Test**:
1. Inspect `python-backend/server.py` docstring and CORS logic: verify Chrome extension origins are rejected and documentation describes the desktop app backend on port 8008.
2. Start server without any model files in `python-backend/model/`: verify the server does not crash, logs a clear warning to console, and returns HTTP 503 with helpful JSON instructions when `POST /speak` is invoked.
3. Place a sample model file (`.pth`) in `python-backend/model/`: verify the server dynamically detects and loads the model.
4. Run `pytest python-backend/tests` and verify all tests pass.

**Acceptance Scenarios**:
1. **Given** `python-backend/server.py`, **When** an HTTP request originates from `chrome-extension://...`, **Then** CORS headers are NOT granted, restricting access exclusively to `http://localhost:3000`, `http://127.0.0.1:3000`, and `null` (Electron `file://`).
2. **Given** an empty `python-backend/model/` directory, **When** the backend server starts, **Then** it does NOT raise an unhandled exception or exit; it logs `[VoxRead] Chưa có model giọng RVC (.pth) trong thư mục python-backend/model/...`.
3. **Given** no model is loaded, **When** a client sends `POST /speak`, **Then** the server responds with HTTP 503 and a message instructing the user to add a `.pth` model file into `model/` and restart the server.
4. **Given** any valid `.pth` and optional `.index` file in `python-backend/model/`, **When** the server starts, **Then** it automatically discovers and binds them to `MODEL_PATH` and `INDEX_PATH`.
5. **Given** a fresh clone of the repository, **When** inspecting `python-backend/model/`, **Then** the directory exists because `python-backend/model/.gitkeep` is tracked by git.

---

### User Story 3 - Documentation & Architecture Diagram Alignment (Priority: P3)

As a new user or contributor reading the project documentation, I want the architecture diagram in `README.md` and the setup guide in `docs/rvc-voice-setup.md` to accurately reflect the current desktop application without obsolete Chrome extension components, and to explain how RVC models are automatically recognized.

**Why this priority**: Outdated documentation confusingly describes extension architectures and instructs users to manually edit `MODEL_PATH` in `server.py`, causing errors and poor developer experience.

**Independent Test**:
1. Inspect the Mermaid architecture diagram in `README.md`: verify no `EXT` or `GEMINI` extension blocks exist.
2. Inspect `README.md` and `docs/rvc-voice-setup.md`: verify instructions clearly state that copying `.pth` and `.index` files to `python-backend/model/` requires zero code edits.

**Acceptance Scenarios**:
1. **Given** `README.md`, **When** viewing the Mermaid diagram, **Then** only the desktop application, local microservices, and Web Speech / Gemini API integrations are shown.
2. **Given** `README.md` and `docs/rvc-voice-setup.md`, **When** reading the RVC configuration section, **Then** users are instructed to place model files in `python-backend/model/` with zero requirement to edit `server.py`.

---

### Edge Cases

- **What if `python-backend/model/` contains multiple `.pth` files?**  
  The discovery logic sorts all `.pth` files alphabetically and selects the first entry deterministically.
- **What if a `.pth` file exists but no `.index` file is provided?**  
  The discovery logic sets `INDEX_PATH = ""`. RVC inference runs without retrieval index (feature search), which is fully supported by `rvc-python`.
- **What if `python-backend/model/` is completely empty or missing?**  
  The directory is preserved in git via `.gitkeep`. On startup, if no `.pth` is found, the server sets `rvc = None`, logs a clear warning, and responds with HTTP 503 on `/speak` instead of crashing on startup.
- **What if a request sends an origin from another website or extension?**  
  `_add_cors_headers()` checks against strictly allowed origins (`http://localhost:3000`, `http://127.0.0.1:3000`, and `null`). Any other origin (including `chrome-extension://*`) will not receive `Access-Control-Allow-Origin`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Remove Unused devDependencies)**: Remove `@testing-library/user-event`, `autoprefixer`, and `tsx` from `package.json` devDependencies and update `package-lock.json` via `npm install`.
- **FR-002 (Update .gitignore)**: Add `*.tsbuildinfo`, `.eslintcache`, and `.pytest_cache/` to `.gitignore`, and remove `dist-app/`.
- **FR-003 (Clean Server Docstring)**: Rewrite the docstring in `python-backend/server.py` to describe the VoxRead desktop application backend on port 8008, removing all references to "Chrome extension", "background.js", and "popup".
- **FR-004 (Restrict Backend CORS)**: Remove `origin.startswith("chrome-extension://")` from `_add_cors_headers()` in `python-backend/server.py`, permitting only `http://localhost:3000`, `http://127.0.0.1:3000`, and `null`.
- **FR-005 (Dynamic RVC Model Auto-Discovery)**: Implement dynamic file scanning in `python-backend/server.py` to find the first `.pth` file and optional first `.index` file in `python-backend/model/`, eliminating hardcoded model filenames.
- **FR-006 (Graceful Missing Model Handling)**: If no `.pth` file is found in `python-backend/model/`, do not crash server startup. Set `rvc = None`, log a visible warning to the console, and return HTTP 503 with clear instructions on `POST /speak`.
- **FR-007 (Track Model Directory)**: Create empty file `python-backend/model/.gitkeep` to preserve the directory structure in git.
- **FR-008 (Update Backend Tests)**: Update `python-backend/tests/test_server.py` to assert that `chrome-extension://` origins are not allowed, and add test cases verifying graceful startup and HTTP 503 responses when models are missing.
- **FR-009 (Synchronize Documentation)**: Remove Chrome Extension branches from the `README.md` Mermaid diagram, update RVC setup instructions in `README.md` and `docs/rvc-voice-setup.md` to reflect zero-code model auto-discovery.
- **FR-010 (Quality Gate)**: Verify that `npm run typecheck`, `npm run lint`, `npm test`, and `pytest python-backend/tests` all pass cleanly.

---

### Key Entities

- **Dependency Manifest (`package.json`)**: Node.js package manifest listing project dependencies and scripts.
- **Ignore Rules (`.gitignore`)**: Version control ignore rules preventing build caches and temporary files from being committed.
- **Flask Voice Service (`python-backend/server.py`)**: Local microservice performing Edge-TTS audio synthesis and RVC voice transformation.
- **Model Directory (`python-backend/model/`)**: Local storage location for RVC model weights (`.pth`) and feature indices (`.index`).
- **Backend Test Suite (`python-backend/tests/test_server.py`)**: Pytest test suite asserting CORS security, TTS endpoints, and model handling.
- **Project Documentation (`README.md`, `docs/rvc-voice-setup.md`)**: Architectural overview and step-by-step user onboarding guides.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of frontend checks (`npm run typecheck`, `npm run lint`, `npm test`) pass without errors after dependency cleanup.
- **SC-002**: 100% of backend tests (`pytest python-backend/tests`) pass, including new tests for missing models and CORS restrictions.
- **SC-003**: 0 server startup crashes when `python-backend/model/` contains no `.pth` file, with `/speak` returning HTTP 503 and clear user guidance.
- **SC-004**: 0 manual code edits required in `python-backend/server.py` when adding or swapping RVC `.pth`/`.index` models.
- **SC-005**: 0 active Chrome Extension branches or obsolete configuration instructions remaining in `README.md` and `docs/rvc-voice-setup.md`.
