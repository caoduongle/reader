# Tasks: GitHub Actions Workflow Permissions for Electron Release Publishing

**Feature**: `025-electron-publish-permissions`  
**Input**: Feature specification from `specs/025-electron-publish-permissions/spec.md` and design artifacts  
**Status**: Ready for Implementation  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline inspection of workflow structure and triggers

- [X] T001 Inspect `.github/workflows/build-electron.yml` and verify baseline workflow triggers (`workflow_dispatch`, `push tags`) and step definitions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Baseline test verification before modifying workflow files

- [X] T002 Execute CI workflow test baseline via `npm test` to ensure existing workflow checks in `tests/ci/verifyWorkflows.test.ts` pass cleanly

**Checkpoint**: Baseline verified — implementation of workflow permissions can proceed

---

## Phase 3: User Story 1 - GitHub Release Publishing Permissions (Priority: P1) 🎯 MVP

**Goal**: Grant `contents: write` permissions to `build-windows` job in `.github/workflows/build-electron.yml` to resolve HTTP 403 "Resource not accessible by integration" during tag releases.

**Independent Test**: Parse `.github/workflows/build-electron.yml` and verify `jobs.build-windows.permissions.contents` is `'write'`.

### Implementation for User Story 1

- [X] T003 [US1] Add `permissions: contents: write` under `jobs.build-windows` in `.github/workflows/build-electron.yml`

**Checkpoint**: At this point, `GITHUB_TOKEN` has elevated write permissions to publish releases on tag push.

---

## Phase 4: User Story 2 - Packaging Environment & Token Wiring Verification (Priority: P2)

**Goal**: Verify that `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` is properly passed to electron-builder in the packaging step.

**Independent Test**: Parse `.github/workflows/build-electron.yml` and assert `GH_TOKEN` is present in `env` on the `Package Desktop Installer (Electron Builder)` step.

### Implementation for User Story 2

- [X] T004 [US2] Verify and retain `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in the `Package Desktop Installer (Electron Builder)` step in `.github/workflows/build-electron.yml`

**Checkpoint**: Both permissions and token environment mapping are confirmed.

---

## Phase 5: User Story 3 - Fork & PR Security Advisory Documentation (Priority: P3)

**Goal**: Document fork and pull request token scoping limitations directly in the workflow file for future maintainers.

**Independent Test**: Read `.github/workflows/build-electron.yml` and verify the presence of the fork/PAT security advisory comment.

### Implementation for User Story 3

- [X] T005 [US3] Add inline security advisory comment above `permissions:` explaining read-only GITHUB_TOKEN on forks and PAT requirements in `.github/workflows/build-electron.yml`

**Checkpoint**: Workflow file is documented with clear security rationale.

---

## Phase 6: Polish & Verification

**Purpose**: Execute end-to-end verification, regression checks, and print diff

- [X] T006 [P] Execute automated verification scenarios in `specs/025-electron-publish-permissions/quickstart.md`
- [X] T007 [P] Execute full test suite `npm test` to verify zero regression across CI tests
- [X] T008 Generate git diff and format change explanation for `.github/workflows/build-electron.yml`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on T001 — verifies baseline test suite.
- **User Story 1 (Phase 3)**: Depends on Phase 2 — MVP that adds `permissions: contents: write`.
- **User Story 2 (Phase 4)**: Depends on Phase 3 — verifies `GH_TOKEN` step wiring.
- **User Story 3 (Phase 5)**: Depends on Phase 4 — adds security comment documentation.
- **Polish (Phase 6)**: Depends on completion of all user story tasks.

### Parallel Opportunities

- Within Phase 6: `T006` (quickstart verification) and `T007` (npm test) can run in parallel.

---

## Implementation Strategy

### Incremental Delivery
1. Verify baseline workflow tests (`T001`–`T002`).
2. Add `permissions: contents: write` and security comment to `.github/workflows/build-electron.yml` (`T003`–`T005`).
3. Run validation suite and tests (`T006`–`T007`).
4. Display diff and explanation (`T008`).
