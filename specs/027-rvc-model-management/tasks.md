# Implementation Tasks: RVC Voice Model Management & One-Click Import

**Branch**: `027-rvc-model-management` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize directory baseline and shared TypeScript contracts for model management

- [X] T001 Inspect and verify `python-backend/model/.gitkeep` tracking in `python-backend/model/.gitkeep`
- [X] T002 [P] Update TypeScript definitions to declare `DesktopModelsBridge` and `ModelImportResult` on `window.voxreadDesktop.models` in `src/vite-env.d.ts`

---

## Phase 2: Foundational (Core State Types & Hook Engine)

**Purpose**: Establish 4-state connection machine and model metadata propagation before UI implementation

**⚠️ CRITICAL**: Must complete before User Story UI tasks can begin

- [X] T003 [P] Extend `VoiceServerConnectionStatus` type with `'checking' | 'connected' | 'model_missing' | 'unreachable'` in `src/hooks/useVoiceServerStatus.ts`
- [X] T004 [P] Update `HealthResponse` interface and response parsing logic in `src/hooks/useVoiceServerStatus.ts`
- [X] T005 Expose model metadata (`modelDir`, `modelName`) and `reloadModel` callback from `src/hooks/useVoiceServerStatus.ts`

**Checkpoint**: Foundation ready - User Story implementation can proceed.

---

## Phase 3: User Story 1 - Diagnostic Health State & Resilient Server Startup (Priority: P1) 🎯 MVP

**Goal**: Backend auto-creates `model/` folder on start, avoids crashing without models, reports distinct `model_missing` status, and supports hot-reload endpoints.

**Independent Test**:
Start server without models -> query `GET /health` -> returns HTTP 200 with `{ ok: false, reason: "model_missing", model_dir: "..." }`. Place `.pth` file in `model/` -> query `POST /model/reload` -> returns `{ ok: true, model_loaded: true }`.

### Tests for User Story 1
- [X] T006 [P] [US1] Add unit tests for directory auto-creation, missing model `/health` contract, and `/model/reload` in `python-backend/tests/test_server.py`
- [X] T007 [P] [US1] Add unit tests for 4-state status transitions (`checking`, `connected`, `model_missing`, `unreachable`) in `tests/hooks/useVoiceServerStatus.test.ts`

### Implementation for User Story 1
- [X] T008 [US1] Ensure `python-backend/model/` is created on startup via `os.makedirs(model_dir, exist_ok=True)` in `python-backend/server.py`
- [X] T009 [US1] Implement thread-safe `reload_model()` helper and update `GET /health` endpoint to return `reason: "model_missing"`, `model_dir`, and `model_name` in `python-backend/server.py`
- [X] T010 [US1] Implement `GET /model/list`, `POST /model/reload`, and `POST /model/create-folder` endpoints in `python-backend/server.py`
- [X] T011 [US1] Update `checkRVCServerHealth` and synthesis fallback logic in `src/hooks/useTTS.ts` to recognize `model_missing`

**Checkpoint**: User Story 1 complete and independently testable via `pytest` and `curl`.

---

## Phase 4: User Story 2 - One-Click "+ Thêm model" Recovery in Connection Error Banner (Priority: P2)

**Goal**: When server reports `model_missing`, show a prominent "+ Thêm model" button in the warning banner that opens the native file dialog, copies weights to `model/`, and reloads the connection automatically.

**Independent Test**:
In Settings with empty `model/`, observe amber/warning banner with "+ Thêm model" button. Click button -> select `.pth` file -> file is copied to `python-backend/model/` -> server auto-reloads -> status turns to "Đã kết nối" without manual restart.

### Implementation for User Story 2
- [X] T012 [P] [US2] Implement Electron IPC handlers `models:import`, `models:open-folder`, and `models:get-dir` with extension filtering (`.pth`, `.index`) in `electron/main.ts`
- [X] T013 [P] [US2] Expose `voxreadDesktop.models` bridge methods in `electron/preload.ts`
- [X] T014 [US2] Update RVC connection error banner in `src/components/SettingsModal.tsx` to render distinct `model_missing` message with styled "+ Thêm model" button
- [X] T015 [US2] Implement `handleImportModel` in `src/components/SettingsModal.tsx` to invoke IPC `models.importModel()`, trigger backend `/model/reload`, and re-check health

**Checkpoint**: User Story 2 functional - users can recover from missing model state with a single click.

---

## Phase 5: User Story 3 - Persistent "Quản lý model giọng đọc" Section in Settings (Priority: P3)

**Goal**: Permanent model management card under RVC settings showing current folder path, loaded model status, "Mở thư mục" button, and "+ Thêm model" button.

**Independent Test**:
Navigate to Settings > "Giọng đọc & Tốc độ" > "Giọng của tôi (RVC local)". Verify "Quản lý model giọng đọc" section is rendered regardless of connection status. Click "Mở thư mục" -> system file explorer opens `model/`. Click "+ Thêm model" -> new model file imported.

### Implementation for User Story 3
- [X] T016 [US3] Add permanent "Quản lý model giọng đọc" card UI structure under RVC settings in `src/components/SettingsModal.tsx`
- [X] T017 [US3] Fetch and display active model name, model directory path, and discovered `.pth`/`.index` files via `GET /model/list` in `src/components/SettingsModal.tsx`
- [X] T018 [US3] Implement "Mở thư mục" button action calling `voxreadDesktop.models.openFolder()` in `src/components/SettingsModal.tsx`

**Checkpoint**: User Story 3 functional - ongoing model visibility and explorer access available at all times.

---

## Phase 6: User Story 4 - Browser Fallback & Troubleshooting Documentation (Priority: P4)

**Goal**: Provide clipboard fallback when running in non-Electron environments and update troubleshooting docs in `README.md`.

**Independent Test**:
In standard browser, click "+ Thêm model" -> folder path is copied to clipboard and notification is shown. Check `README.md` for updated troubleshooting instructions.

### Implementation for User Story 4
- [X] T019 [P] [US4] Implement browser fallback in `handleImportModel` and "Mở thư mục" to copy folder path to clipboard with user notification in `src/components/SettingsModal.tsx`
- [X] T020 [P] [US4] Update troubleshooting and RVC model setup instructions with the new "+ Thêm model" button in `README.md`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation, regression testing, and build verification

- [X] T021 [P] Run backend test suite via `pytest python-backend/tests`
- [X] T022 [P] Run frontend test suite via `npm test`
- [X] T023 Run typecheck and linting via `npm run typecheck && npm run lint`
- [X] T024 Validate manual scenarios per `specs/027-rvc-model-management/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can execute immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS User Story implementation.
- **User Story 1 (Phase 3)**: Depends on Phase 2 - delivers backend startup resilience and health contract.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs `/model/reload` endpoint from US1).
- **User Story 3 (Phase 5)**: Depends on Phase 4 (reuses `handleImportModel` and IPC handlers from US2).
- **User Story 4 (Phase 6)**: Depends on Phase 5.
- **Polish (Phase 7)**: Depends on all user stories completed.

### Parallel Opportunities
- T002 (type definitions), T003 (status type), and T004 (health interface) can be prepared in parallel.
- T006 (backend pytest) and T007 (frontend vitest) can be written in parallel before implementation.
- T012 (Electron main IPC) and T013 (Electron preload) can be developed in parallel.
- T019 (browser fallback) and T020 (documentation) can be done in parallel.
- T021 (pytest) and T022 (npm test) can execute in parallel during the polish phase.

---

## Implementation Strategy

### MVP First (User Story 1)
1. Complete Setup (Phase 1) + Foundational (Phase 2).
2. Complete User Story 1 (Phase 3).
3. Validate: Backend creates `model/`, doesn't crash, returns structured `model_missing` on `/health`.

### Incremental Delivery
1. Add User Story 2: "+ Thêm model" button in error banner with native file dialog copy and hot-reload.
2. Add User Story 3: Permanent "Quản lý model giọng đọc" card in Settings.
3. Add User Story 4: Browser fallback and README documentation.
4. Run full test suite and typecheck (Phase 7).
