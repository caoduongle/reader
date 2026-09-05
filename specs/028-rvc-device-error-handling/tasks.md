# Implementation Tasks: RVC Device Auto-Detection & Speech Error Visibility

**Branch**: `028-rvc-device-error-handling` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline infrastructure and shared status type definitions

- [X] T001 [P] Verify PyTorch device detection capability and environment variable support in `python-backend/server.py`
- [X] T002 [P] Extend TypeScript status type definitions to include `'no-model'` in `src/types.ts`

---

## Phase 2: Foundational (Core State Types & Hook Engine)

**Purpose**: Core state machine and interface alignment required before user stories

**⚠️ CRITICAL**: Must complete before User Story implementation tasks begin

- [X] T003 [P] Extend `VoiceServerConnectionStatus` type with `'no-model'` and update `HealthResponse` interface in `src/hooks/useVoiceServerStatus.ts`
- [X] T004 [P] Update `checkRVCServerHealth` signature and error handling contract in `src/hooks/useTTS.ts`

**Checkpoint**: Core types aligned - User Story phases can now proceed.

---

## Phase 3: User Story 1 - Dynamic Hardware Detection & Diagnostic Backend Health (Priority: P1) 🎯 MVP

**Goal**: Backend dynamically detects CUDA vs CPU at startup, logs device to stdout, preserves `last_init_error`, and returns structured diagnostics with `model_loaded: false` in `/health` and `/speak`.

**Independent Test**:
Start server without CUDA or with empty `model/`: terminal logs `[VoxRead] Dang dung thiet bi: cpu:0` (or `cuda:0`), and `GET /health` returns HTTP 200 with `model_loaded: false`, `reason: "model_missing"`, and descriptive `error`.

### Tests for User Story 1
- [X] T005 [P] [US1] Add pytest tests for device detection (`cuda:0` / `cpu:0` fallback / `VOXREAD_DEVICE` override) and `/health` error contract in `python-backend/tests/test_server.py`
- [X] T006 [P] [US1] Add pytest tests for `/speak` HTTP 503 error contract with custom error payload in `python-backend/tests/test_server.py`

### Implementation for User Story 1
- [X] T007 [US1] Implement dynamic device detection (`DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu:0"`), `VOXREAD_DEVICE` override, and startup logging `[VoxRead] Dang dung thiet bi: {DEVICE}` in `python-backend/server.py`
- [X] T008 [US1] Implement `last_init_error` tracking in `reload_model()` to capture and retain model initialization exceptions in `python-backend/server.py`
- [X] T009 [US1] Update `GET /health` endpoint to return `model_loaded: false`, `reason: "model_init_failed"` (or `"model_missing"`), and `error: last_init_error` in `python-backend/server.py`
- [X] T010 [US1] Update `POST /speak` endpoint to return HTTP 503 with `{"error": last_init_error}` when no model is loaded in `python-backend/server.py`

**Checkpoint**: User Story 1 complete and independently verifiable via `pytest` and `curl`.

---

## Phase 4: User Story 2 - Accurate Missing / Incompatible Model State in Settings (Priority: P2)

**Goal**: Frontend connection hooks strictly validate `model_loaded === true` before setting `'connected'`, transitioning to `'no-model'` / `'model_missing'` with detailed backend error messages, and rendering an amber warning banner in SettingsModal.

**Independent Test**:
Start backend with missing or corrupt model -> open Settings > "Giọng của tôi (RVC local)" -> observe amber badge ("Chưa có model") and amber warning banner with detailed error message instead of false green "Đã kết nối".

### Tests for User Story 2
- [X] T011 [P] [US2] Add unit tests for `data.model_loaded === false` transitioning to `'no-model'` and setting `errorMessage` in `tests/hooks/useVoiceServerStatus.test.ts`

### Implementation for User Story 2
- [X] T012 [US2] Update `checkHealth` in `src/hooks/useVoiceServerStatus.ts` to strictly require `data.model_loaded === true` for `'connected'`, transitioning to `'no-model'` with descriptive `errorMessage` otherwise
- [X] T013 [US2] Update `checkRVCServerHealth` in `src/hooks/useTTS.ts` to strictly require `data.model_loaded === true` for `'connected'`, transitioning to `'no-model'` / `'model_missing'` and setting `serverErrorMessage` otherwise
- [X] T014 [US2] Destructure `serverErrorMessage` and render amber warning banner for `effectiveStatus === 'no-model' || effectiveStatus === 'model_missing'` displaying detailed error message in `src/components/SettingsModal.tsx`

**Checkpoint**: User Story 2 complete - Settings UI never falsely reports "ready" when model is missing or failed to initialize.

---

## Phase 5: User Story 3 - Visible Feedback on Speech Generation & Test Voice Failures (Priority: P3)

**Goal**: Un-swallow HTTP 503/500 JSON error bodies in `/speak` requests, display backend error in `SettingsModal` upon "Thử giọng" failure, and show an on-screen toast in `App.tsx` during active book reading when speech synthesis fails mid-sentence.

**Independent Test**:
In Settings with no model loaded, click "Thử giọng" -> error banner displays backend error message. While reading in main screen, trigger synthesis error -> toast notification pops up explaining error and reading stops cleanly.

### Implementation for User Story 3
- [X] T015 [US3] Parse JSON error body (`await res.json()`) on HTTP 503/500 responses in `fetchRVCSpeech` in `src/hooks/useTTS.ts`
- [X] T016 [US3] Parse JSON error body in `testVoice` and set `serverErrorMessage` upon failure in `src/hooks/useTTS.ts`
- [X] T017 [US3] Update `speakSentence` in `src/hooks/useTTS.ts` to propagate the specific synthesis error into `serverErrorMessage`
- [X] T018 [US3] Render `serverErrorMessage` in error banner or test voice feedback within `src/components/SettingsModal.tsx`
- [X] T019 [US3] Add `useEffect` in `src/App.tsx` to trigger `showToast(serverErrorMessage)` when speech synthesis fails mid-reading with Settings modal closed

**Checkpoint**: User Story 3 complete - speech synthesis errors are fully visible across test voice and audiobook playback.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression testing, typechecking, linting, and end-to-end validation

- [X] T020 [P] Run backend pytest suite via `.\python-backend\venv\Scripts\python.exe -m pytest python-backend/tests`
- [X] T021 [P] Run frontend vitest suite via `npm test`
- [X] T022 Run typecheck and linting via `npm run typecheck && npx tsc --noEmit -p electron/tsconfig.json && npm run lint`
- [X] T023 Validate manual test scenarios per `specs/028-rvc-device-error-handling/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can execute immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS User Story implementation.
- **User Story 1 (Phase 3)**: Depends on Phase 2 - delivers backend hardware detection and diagnostic health contracts.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and US1 health endpoint contract.
- **User Story 3 (Phase 5)**: Depends on US1 `/speak` error contract and US2 hook error states.
- **Polish (Phase 6)**: Depends on all user stories completed.

### User Story Dependencies
- **US1 (P1)**: Independent backend service deliverable.
- **US2 (P2)**: Consumes US1 `/health` response contract.
- **US3 (P3)**: Consumes US1 `/speak` error response contract and US2 `serverErrorMessage` pipeline.

### Parallel Opportunities
- T001 (Python) and T002 (TypeScript) in Setup can execute in parallel.
- T003 (`useVoiceServerStatus`) and T004 (`useTTS`) in Foundational can execute in parallel.
- T005 and T006 (pytest test cases) can execute in parallel before backend implementation.
- T020 (pytest) and T021 (vitest) can execute in parallel during Polish.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Setup (Phase 1) + Foundational (Phase 2).
2. Complete User Story 1 (Phase 3).
3. Validate: Backend auto-detects GPU/CPU, logs to terminal, retains init errors, and returns structured diagnostics on `/health` and `/speak`.

### Incremental Delivery
1. Add User Story 2: Settings connection state correctly reflects missing/failed models with amber warning banner.
2. Add User Story 3: Un-swallowed synthesis errors, test voice error feedback, and mid-reading toast in `App.tsx`.
3. Run Polish (Phase 6): pytest, vitest, typecheck, lint, quickstart validation.
