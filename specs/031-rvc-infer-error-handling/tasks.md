# Implementation Tasks: RVC Pipeline Error Transparency & Active Model UI Clarity

**Feature**: `031-rvc-infer-error-handling`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verification of backend testing environment

- [X] T001 Verify backend test runner and dependencies in `python-backend/tests/test_server.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core dependency import in server required by User Story 1

- [X] T002 Import `wavfile` from `scipy.io` in `python-backend/server.py`

**Checkpoint**: Foundation ready - user story implementations can proceed.

---

## Phase 3: User Story 1 - RVC Pipeline Error Transparency and Crash Prevention (Priority: P1) 🎯 MVP

**Goal**: Direct `rvc.vc.vc_single` execution with explicit tuple error detection and descriptive `RuntimeError` reporting instead of crashing with `'tuple' object has no attribute 'dtype'`.

**Independent Test**:
1. When `rvc.vc.vc_single` returns an audio ndarray, `/speak` returns HTTP 200 `audio/wav`.
2. When `rvc.vc.vc_single` returns an error tuple `(error_msg, (None, None))`, `/speak` returns HTTP 500 containing `"Lỗi pipeline RVC: <error_msg>"`.

### Tests for User Story 1
- [X] T003 [P] [US1] Update `test_speak_valid_request_returns_audio_wav` and add `test_speak_rvc_pipeline_error_returns_500` mocking `rvc.vc.vc_single` in `python-backend/tests/test_server.py`

### Implementation for User Story 1
- [X] T004 [US1] Implement `_run_rvc_inference(base_path: str, out_path: str)` before `/speak` route in `python-backend/server.py` to call `rvc.vc.vc_single` directly, detect error tuple, and write audio via `wavfile.write`
- [X] T005 [US1] Replace `rvc.infer_file(base_path, out_path)` with `_run_rvc_inference(base_path, out_path)` inside `with rvc_lock:` in `python-backend/server.py`

**Checkpoint**: User Story 1 is functional and verifiable independently.

---

## Phase 4: User Story 2 - Accurate Model Status Label in Settings Modal (Priority: P2)

**Goal**: Reassure users that the active voice model is ready and loaded by updating the badge text from `"Đang nạp"` to `"Đang dùng"`.

**Independent Test**:
Verify that when `activeModelName === file`, the badge span renders `"Đang dùng"` in `src/components/SettingsModal.tsx`.

### Implementation for User Story 2
- [X] T006 [P] [US2] Change active model badge label from `"Đang nạp"` to `"Đang dùng"` in `src/components/SettingsModal.tsx`

**Checkpoint**: User Stories 1 and 2 are complete and verifiable independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation, linting, and quality checks across all changes

- [X] T007 [P] Run Python backend unit tests in `python-backend/tests/test_server.py`
- [X] T008 [P] Run frontend typecheck and unit tests (`npm run typecheck` and `npm test`)
- [X] T009 Run frontend linter (`npm run lint`)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001; unblocks US1.
- **User Story 1 (Phase 3)**: Depends on Phase 2; deliverable as standalone MVP.
- **User Story 2 (Phase 4)**: Independent of US1 (different file/language stack); can run in parallel with US1 or after.
- **Polish (Phase 5)**: Depends on completion of User Stories 1 and 2.

### Parallel Opportunities
- T003 ([US1] tests) and T006 ([US2] UI badge) can be implemented in parallel.
- T007 (backend tests) and T008 (frontend typecheck/tests) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete T001 (Setup) and T002 (Foundational import).
2. Complete T003 (Backend tests for `vc_single`).
3. Complete T004 (`_run_rvc_inference` implementation).
4. Complete T005 (Route `/speak` integration).
5. Validate MVP: `pytest python-backend/tests/test_server.py`.

### Incremental Delivery
1. Deliver US1 backend error fix and verify tests pass.
2. Deliver US2 UI badge change in `src/components/SettingsModal.tsx`.
3. Run full verification suite (T007, T008, T009).
