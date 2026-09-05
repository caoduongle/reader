# Tasks: Legacy Chrome Extension Cleanup & Dynamic RVC Model Auto-Discovery

**Feature**: `026-cleanup-legacy-auto-model`  
**Input**: Feature specification from `specs/026-cleanup-legacy-auto-model/spec.md` and design artifacts  
**Status**: Ready for Implementation  

---

## Phase 1: Setup (Baseline Inspection)

**Purpose**: Inspect current dependencies, gitignore patterns, backend server, and test suites

- [X] T001 Inspect `package.json` devDependencies (`@testing-library/user-event`, `autoprefixer`, `tsx`) and `.gitignore`
- [X] T002 Inspect `python-backend/server.py` docstring, CORS logic, model loading, and `python-backend/tests/test_server.py`

---

## Phase 2: Foundational (Baseline Test Verification)

**Purpose**: Verify existing tests pass before applying any modifications

- [X] T003 Execute baseline frontend checks via `npm run typecheck && npm run lint && npm test`
- [X] T004 Execute baseline backend checks via `python-backend\venv\Scripts\python.exe -m pytest python-backend/tests`

**Checkpoint**: Baselines verified — implementation can safely begin

---

## Phase 3: User Story 1 - Dead Dependency & Gitignore Hygiene (Priority: P1)

**Goal**: Remove unused frontend devDependencies, update `.gitignore`, update lockfile, and verify zero regressions.

**Independent Test**: Run `npm install` and verify `npm run typecheck && npm run lint && npm test` pass cleanly.

### Implementation for User Story 1

- [X] T005 [US1] Remove `@testing-library/user-event`, `autoprefixer`, and `tsx` from `devDependencies` in `package.json`
- [X] T006 [US1] Update `.gitignore` to add `*.tsbuildinfo`, `.eslintcache`, `.pytest_cache/` and remove stale `dist-app/`
- [X] T007 [US1] Run `npm install` to synchronize `package-lock.json`
- [X] T008 [US1] Run `npm run typecheck && npm run lint && npm test` to verify frontend builds and tests pass

**Checkpoint**: User Story 1 complete and independently verified.

---

## Phase 4: User Story 2 - Backend Extension Cleanup & Dynamic Model Auto-Discovery (Priority: P2) 🎯 MVP

**Goal**: Remove extension residue, restrict CORS, automatically discover models in `model/`, prevent startup crash on missing model (returning 503 on `/speak`), track `.gitkeep`, and verify with tests.

**Independent Test**: Run `python-backend\venv\Scripts\python.exe -m pytest python-backend/tests -v` and verify CORS restrictions and 503 responses.

### Implementation for User Story 2

- [X] T009 [US2] Create empty file `python-backend/model/.gitkeep` to track the model directory in git
- [X] T010 [US2] Rewrite top docstring in `python-backend/server.py` for VoxRead Electron desktop backend on port 8008, removing all Chrome extension references
- [X] T011 [US2] Remove `origin.startswith("chrome-extension://")` from `_add_cors_headers()` in `python-backend/server.py`, keeping only localhost/127.0.0.1/null
- [X] T012 [US2] Implement `discover_model_paths(base_dir)` in `python-backend/server.py` to scan `model/` for first `.pth` (alphabetical order) and optional first `.index` file
- [X] T013 [US2] Update server initialization and `/speak` / `/health` endpoints in `python-backend/server.py`:
  - If no `.pth` exists, do NOT crash: log console warning, set `rvc = None`
  - In `POST /speak`, if `rvc is None`, return HTTP 503 with clear user guidance
  - In `GET /health`, set `model_loaded` to `rvc is not None`
- [X] T014 [US2] Update `python-backend/tests/test_server.py`:
  - Add test asserting `chrome-extension://` origins are not granted CORS headers
  - Add test asserting `POST /speak` returns 503 when `rvc is None`
  - Add unit tests for `discover_model_paths()`
- [X] T015 [US2] Run `python-backend\venv\Scripts\python.exe -m pytest python-backend/tests -v` to ensure all tests pass

**Checkpoint**: User Story 2 complete and independently verified.

---

## Phase 5: User Story 3 - Documentation & Architecture Diagram Alignment (Priority: P3)

**Goal**: Synchronize `README.md` and `docs/rvc-voice-setup.md` with desktop architecture and zero-code model deployment.

**Independent Test**: Verify Mermaid diagram in `README.md` has no `EXT`/`GEMINI` blocks, and setup guides instruct dropping files in `model/` without editing code.

### Implementation for User Story 3

- [X] T016 [US3] Update `README.md`: clean Mermaid architecture diagram and update RVC setup section to describe zero-code model auto-discovery
- [X] T017 [US3] Update `docs/rvc-voice-setup.md`: remove instructions directing users to edit `MODEL_PATH`/`INDEX_PATH` in `server.py`, and remove legacy Chrome extension usage section

**Checkpoint**: User Story 3 complete and documentation fully synchronized.

---

## Phase 6: Polish & Verification

**Purpose**: Execute end-to-end verification across both frontend and backend

- [X] T018 Execute full frontend validation: `npm run typecheck && npm run lint && npm test`
- [X] T019 Execute full backend validation: `python-backend\venv\Scripts\python.exe -m pytest python-backend/tests -v`
- [X] T020 Check `git status` and `git diff` to ensure repository cleanliness and review all changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — verifies test baseline.
- **User Story 1 (Phase 3)**: Depends on Phase 2 — cleans frontend dependencies & gitignore.
- **User Story 2 (Phase 4)**: Depends on Phase 2 — updates backend server and Pytest suite. Can run after or in parallel with US1.
- **User Story 3 (Phase 5)**: Depends on Phase 4 — aligns documentation with the new zero-code model auto-discovery.
- **Polish (Phase 6)**: Depends on completion of all user story tasks.

---

## Implementation Strategy

### Sequential Execution (Strict Safety Order)
1. **VIỆC 1 (Phase 3)**: Clean dependencies & gitignore, run `npm install`, verify `typecheck`, `lint`, `test`.
2. **VIỆC 2 (Phase 4)**: Update `server.py` (docstring, CORS, auto-discovery, 503 handling), add `.gitkeep`, update `test_server.py`, run `pytest`.
3. **VIỆC 3 (Phase 5)**: Update `README.md` and `docs/rvc-voice-setup.md`.
4. **Final Polish (Phase 6)**: Run complete verification suite and inspect git diff.
