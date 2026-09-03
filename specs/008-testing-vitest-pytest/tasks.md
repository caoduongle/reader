# Tasks: Automated Testing Suite with Vitest & Pytest

**Feature**: `008-testing-vitest-pytest`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Infrastructure Initialization

**Purpose**: Install testing libraries and configure test runners for frontend and backend.

- [X] T001 Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom` as devDependencies via npm in `package.json`.
- [X] T002 Configure Vitest environment in `vitest.config.ts` with JSDOM and initialize testing setup in `tests/setup.ts`.
- [X] T003 Create `python-backend/requirements-dev.txt` specifying `pytest` and install `pytest` inside `python-backend/venv`.
- [X] T004 Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `package.json`.

---

## Phase 2: User Story 1 — Frontend Unit & Component Tests (Priority: P1) 🎯 MVP

**Goal**: Implement comprehensive unit and component tests verifying text parsing, proxy endpoints, and error handling.

**Independent Test**: Execute `npm test` to verify that all frontend tests pass cleanly with meaningful assertions.

### Implementation for User Story 1

- [X] T005 [US1] Author unit tests for multilingual sentence segmentation (`splitIntoSentences`) and novel parsing (`parseNovelText`) in `tests/unit/textParser.test.ts`.
- [X] T006 [US1] Author unit tests for Gemini Express proxy endpoints (`GET /health`, `POST /api/generate`) in `tests/unit/serverProxy.test.ts`.
- [X] T007 [US1] Author component tests for `ErrorBoundary` fallback rendering in `tests/components/ErrorBoundary.test.tsx`.

**Checkpoint**: Frontend test suite functional with 10 passing tests.

---

## Phase 3: User Story 2 — Backend Unit & Endpoint Tests with Pytest (Priority: P1)

**Goal**: Implement automated contract tests for the local Python Flask RVC microservice.

**Independent Test**: Run `pytest python-backend/tests` inside the Python virtual environment: verify all endpoint test cases pass.

### Implementation for User Story 2

- [X] T008 [US2] Author backend endpoint tests for `/health`, `/speak` input validation (empty/whitespace payloads), and CORS headers in `python-backend/tests/test_server.py`.

**Checkpoint**: Backend test suite functional with 5 passing tests.

---

## Phase 4: User Story 3 — Test Documentation & Backlog Tracking (Priority: P2)

**Goal**: Document test running instructions and catalog untested modules as a backlog.

**Independent Test**: Inspect `README.md` for dual test instructions and inspect PR documentation for untested backlog list.

### Implementation for User Story 3

- [X] T009 [US3] Update `README.md` with explicit instructions on running frontend tests (`npm test`) and Python tests (`pytest`) in `README.md`.
- [X] T010 [US3] Document itemized backlog of untested modules for future coverage in `specs/008-testing-vitest-pytest/plan.md` and walkthrough documentation.

**Checkpoint**: Documentation complete and transparent.

---

## Phase 5: Polish & Gate Enforcement

**Purpose**: Execute all test suites and enforce quality gates.

- [X] T011 Execute `npm test` and verify 100% pass across all frontend tests.
- [X] T012 Execute `pytest` and verify 100% pass across all backend tests.
- [X] T013 Verify `npm run typecheck`, `npm run lint`, and `npm run build` continue to succeed with zero errors.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Infrastructure Setup (T001 - T004)
       │
       ▼
Phase 2: Frontend Tests (T005 - T007) 🎯 MVP
       │
       ▼
Phase 3: Backend Tests (T008)
       │
       ▼
Phase 4: Documentation & Backlog (T009 - T010)
       │
       ▼
Phase 5: Gate Enforcement (T011 - T013)
```

### Parallel Opportunities

- `T005`, `T006`, and `T007` test files target distinct modules and can be written in parallel.
- `T009` (`README.md`) can be drafted alongside test authoring.

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup test runners.
2. Complete Phase 2: Author frontend tests and verify `npm test`.
3. Complete Phase 3: Author backend tests and verify `pytest`.
4. Complete Phase 4: Document in `README.md`.
5. Complete Phase 5: Run full verification suite.

---

## Notes

- All tasks follow the checklist schema: `- [ ] [TaskID] [P?] [Story?] Description with file path`.
- Strictly no trivial/fake assertions (`expect(true).toBe(true)`).
- Every test must fail if core logic is broken.
