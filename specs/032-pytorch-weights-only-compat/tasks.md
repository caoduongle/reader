# Implementation Tasks: PyTorch >= 2.6 weights_only Compatibility for RVC Pipeline

**Feature**: `032-pytorch-weights-only-compat`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify backend environment and PyTorch runtime dependencies

- [ ] T001 Verify backend virtual environment and torch availability in `python-backend/venv`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core monkeypatch installation in server before RVC initialization

- [ ] T002 Implement process-local `torch.load` monkeypatch immediately following `import torch` in `python-backend/server.py`

**Checkpoint**: Foundation ready - user story implementations can proceed.

---

## Phase 3: User Story 1 - Seamless Voice Synthesis with Legacy Model Checkpoints (Priority: P1) 🎯 MVP

**Goal**: Restore default `weights_only=False` behavior so that legacy checkpoints (`hubert_base.pt`, `rmvpe.pt`) containing custom Python objects deserialize cleanly on PyTorch >= 2.6 without unpickling errors.

**Independent Test**:
1. Invoke `torch.load` on a checkpoint containing custom pickled classes without passing `weights_only`.
2. Verify deserialization completes successfully without `_pickle.UnpicklingError`.
3. Trigger voice synthesis via `POST /speak` and confirm the model initialization proceeds past checkpoint loading.

### Implementation for User Story 1
- [ ] T003 [US1] Intercept `torch.load` before `from rvc_python.infer import RVCInference` and initial `reload_model()` in `python-backend/server.py`
- [ ] T004 [P] [US1] Add unit test `test_torch_load_monkeypatch_defaults_weights_only_false` in `python-backend/tests/test_server.py`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Respect Explicit Caller Parameters in Deserialization (Priority: P2)

**Goal**: Ensure explicit caller arguments for `weights_only` (either `True` or `False`) are strictly honored without being overwritten.

**Independent Test**:
1. Invoke `torch.load(..., weights_only=True)` and confirm `weights_only=True` is forwarded to the underlying loader.
2. Invoke `torch.load(..., weights_only=False)` and confirm `weights_only=False` is forwarded to the underlying loader.

### Implementation for User Story 2
- [ ] T005 [US2] Use `kwargs.setdefault("weights_only", False)` in `_patched_torch_load` in `python-backend/server.py`
- [ ] T006 [P] [US2] Add unit test `test_torch_load_monkeypatch_respects_explicit_weights_only` in `python-backend/tests/test_server.py`

**Checkpoint**: User Stories 1 and 2 are complete and verifiable independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Full automated testing, type checking, and quickstart validation across the repository

- [ ] T007 [P] Run Python backend pytest test suite in `python-backend/tests/test_server.py`
- [ ] T008 [P] Run frontend verification suite (`npm test`, `npm run typecheck`, `npm run lint`)
- [ ] T009 Validate quickstart verification procedures per `specs/032-pytorch-weights-only-compat/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on T001 - blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 - deliverable as standalone MVP.
- **User Story 2 (Phase 4)**: Builds on T002/T003 - independently testable.
- **Polish (Phase 5)**: Depends on completion of User Stories 1 and 2.

### User Story Dependencies
- **User Story 1 (P1)**: Can start after Foundational (Phase 2) completes.
- **User Story 2 (P2)**: Extends US1 monkeypatch logic to preserve explicit caller arguments.

### Parallel Opportunities
- T004 ([US1] test) and T006 ([US2] test) can be developed in parallel once foundational patch is in place.
- T007 (backend pytest) and T008 (frontend suite) can run in parallel during Phase 5.

---

## Parallel Example: User Stories 1 & 2

```bash
# Backend unit tests can run concurrently:
Task: "Add unit test test_torch_load_monkeypatch_defaults_weights_only_false in python-backend/tests/test_server.py"
Task: "Add unit test test_torch_load_monkeypatch_respects_explicit_weights_only in python-backend/tests/test_server.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational monkeypatch setup (T002).
3. Complete Phase 3: User Story 1 (T003, T004).
4. **STOP and VALIDATE**: Verify `hubert_base.pt` loads without unpickling errors.

### Incremental Delivery
1. Deliver US1 monkeypatch defaulting `weights_only=False`.
2. Deliver US2 explicit parameter preservation and comprehensive override tests.
3. Complete Phase 5 quality and regression validation.
