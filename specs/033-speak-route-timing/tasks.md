# Implementation Tasks: /speak Route Latency Timing

**Feature**: `033-speak-route-timing`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify backend environment and test runner infrastructure

- [ ] T001 Verify backend virtual environment and test runner in `python-backend/venv`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Module import prerequisite in server.py

- [ ] T002 Import `time` standard library module in `python-backend/server.py`

**Checkpoint**: Foundation ready - user story implementations can proceed.

---

## Phase 3: User Story 1 - Step-by-Step Synthesis Timing Telemetry (Priority: P1) 🎯 MVP

**Goal**: Capture timestamps before and after Edge-TTS synthesis and RVC inference, printing formatted diagnostics to standard output.

**Independent Test**:
Send a synthesis request to `POST /speak` and verify standard output logs:
`[VoxRead][Timing] Edge-TTS: <elapsed>s | RVC inference: <elapsed>s | Text length: <len> ky tu`

### Implementation for User Story 1
- [ ] T003 [US1] Wrap `_synthesize_base` and `_run_rvc_inference` with `t0`, `t1`, `t2` and print `[VoxRead][Timing]` log in `python-backend/server.py`
- [ ] T004 [P] [US1] Add unit test `test_speak_timing_log_emitted` using `capsys` in `python-backend/tests/test_server.py`

**Checkpoint**: User Story 1 is functional and verifiable independently.

---

## Phase 4: User Story 2 - Non-Intrusive Execution & Audio Contract Preservation (Priority: P2)

**Goal**: Ensure timing telemetry does not alter HTTP response status codes, binary WAV data streams, or error handling.

**Independent Test**:
Run existing `/speak` test cases to verify HTTP 200 with `audio/wav` on success and appropriate HTTP 400/500/503 on error without regression.

### Implementation for User Story 2
- [ ] T005 [US2] Verify timing print is enclosed in `try` block before audio file read and skipped on exception in `python-backend/server.py`
- [ ] T006 [P] [US2] Verify `test_speak_valid_request_returns_audio_wav` and error status tests pass in `python-backend/tests/test_server.py`

**Checkpoint**: User Stories 1 and 2 are complete and verifiable independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Full regression suite and verification

- [ ] T007 [P] Run Python backend pytest test suite in `python-backend/tests/test_server.py`
- [ ] T008 [P] Run frontend verification suite (`npm test`, `npm run typecheck`, `npm run lint`)
- [ ] T009 Validate quickstart verification procedures per `specs/033-speak-route-timing/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001; unblocks US1.
- **User Story 1 (Phase 3)**: Depends on Phase 2; standalone MVP.
- **User Story 2 (Phase 4)**: Validates US1 non-regression and exception boundaries.
- **Polish (Phase 5)**: Depends on completion of User Stories 1 and 2.

### User Story Dependencies
- **User Story 1 (P1)**: Can start after Foundational (Phase 2).
- **User Story 2 (P2)**: Verifies contract preservation alongside US1.

### Parallel Opportunities
- T004 ([US1] timing test) and T006 ([US2] contract verification) can be maintained in parallel.
- T007 (backend pytest) and T008 (frontend suite) can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Backend unit tests can run concurrently:
Task: "Add unit test test_speak_timing_log_emitted using capsys in python-backend/tests/test_server.py"
Task: "Verify test_speak_valid_request_returns_audio_wav and error status tests pass in python-backend/tests/test_server.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational import (T002).
3. Complete Phase 3: User Story 1 (T003, T004).
4. **STOP and VALIDATE**: Confirm `[VoxRead][Timing]` log output appears.

### Incremental Delivery
1. Deliver US1 timing telemetry.
2. Confirm US2 contract preservation and exception handling.
3. Execute Phase 5 full regression and quickstart validation.
