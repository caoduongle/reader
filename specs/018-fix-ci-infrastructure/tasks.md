# Tasks: CI Infrastructure Hardening (Node 22 Upgrade & Pip Pinning)

**Feature**: `018-fix-ci-infrastructure`  
**Spec**: [specs/018-fix-ci-infrastructure/spec.md](file:///e:/reader/specs/018-fix-ci-infrastructure/spec.md)  
**Plan**: [specs/018-fix-ci-infrastructure/plan.md](file:///e:/reader/specs/018-fix-ci-infrastructure/plan.md)  
**Target Date**: 2026-09-04  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Workflow baseline inspection and environment state check.

- [x] T001 [P] Verify workflow files existence and clean git status in `.github/workflows/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Automated verification test ensuring workflow contracts are verified programmatically.

**⚠️ CRITICAL**: Verification test must be defined before modifying workflow files.

- [x] T002 [P] Create workflow configuration verification test in `tests/ci/verifyWorkflows.test.ts`

**Checkpoint**: Foundational verification ready — User story implementation can proceed.

---

## Phase 3: User Story 1 - CI Workflow Reliability & Runtime Compatibility (Priority: P1) 🎯 MVP

**Goal**: Upgrade Node.js runtime to version 22 across all workflow files and pin pip to `<24.1` in the backend CI job.

**Independent Test**:
1. Run `tests/ci/verifyWorkflows.test.ts`: verify all three workflows specify `node-version: 22` and backend job executes `python -m pip install "pip<24.1"`.
2. Execute `grep -Hn "node-version: 22" .github/workflows/*.yml`: returns 3 matches.
3. Execute `grep -Hn 'python -m pip install "pip<24.1"' .github/workflows/ci.yml`: returns 1 match.

### Implementation for User Story 1
- [x] T003 [US1] Update `node-version: 20` to `node-version: 22` in frontend job and pin `python -m pip install "pip<24.1"` in backend job in `.github/workflows/ci.yml`
- [x] T004 [P] [US1] Update `node-version: 20` to `node-version: 22` in `.github/workflows/security-audit.yml`
- [x] T005 [P] [US1] Update `node-version: 20` to `node-version: 22` in `.github/workflows/build-electron.yml`

**Checkpoint**: User Story 1 complete — CI workflows updated to Node 22 and pip<24.1 (MVP Achieved).

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Verification of zero unintended modifications and validation of local test suites.

- [x] T006 [P] Execute quickstart verification scenarios defined in `specs/018-fix-ci-infrastructure/quickstart.md`
- [x] T007 [P] Verify zero unintended changes outside `.github/workflows/` and `.specify/` via `git status`
- [x] T008 Run comprehensive test suite (`npm run test`) and lint check (`npm run lint`) to guarantee zero regressions

---

## Dependencies & Execution Order

### Phase Dependencies

```mermaid
flowchart TD
  P1[Phase 1: Setup] --> P2[Phase 2: Foundational]
  P2 --> P3[Phase 3: US1 - Node 22 & Pip Pinning (MVP)]
  P3 --> P4[Phase 4: Polish & Verification]
```

- **Setup (Phase 1)**: Independent — can begin immediately.
- **Foundational (Phase 2)**: Verification test suite creation.
- **User Story 1 (Phase 3 - MVP)**: Apply targeted modifications to the 3 workflow files.
- **Polish (Phase 4)**: Verify strict scope isolation and zero regressions.

---

## Parallel Opportunities

- **Phase 1 (Setup)**: T001 is standalone.
- **Phase 2 (Foundational)**: T002 runs independently.
- **Phase 3 (User Story 1)**: T004 (`security-audit.yml`) and T005 (`build-electron.yml`) can execute in parallel after T003 (`ci.yml`).
- **Phase 4 (Polish)**: T006 and T007 can execute in parallel before T008.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002).
3. Complete Phase 3: User Story 1 (T003 - T005).
4. **STOP & VALIDATE**: Run `verifyWorkflows.test.ts` and grep commands from `quickstart.md`.
5. Complete Phase 4: Polish & Verification (T006 - T008).
