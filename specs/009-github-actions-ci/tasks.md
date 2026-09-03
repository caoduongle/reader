# Tasks: Automated CI/CD Pipelines with GitHub Actions

**Feature**: `009-github-actions-ci`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Quality Gate Root-Cause Remediation (Blocking Prerequisites)

**Purpose**: Resolve all residual lint errors so that the CI quality gate passes authentically without "fake green" bypasses.

- [X] T001 Remove unused imports and unreferenced variables in `src/App.tsx`, `src/components/BookmarksDrawer.tsx`, `src/components/ControlBar.tsx`, `src/components/SearchDrawer.tsx`, and `src/components/SettingsModal.tsx`.
- [X] T002 Remove unused imports, variables, and prefix unreferenced callback props with `_` in `src/components/ReaderContent.tsx`, `src/components/ReadingStatsModal.tsx`, and `src/hooks/useReadingStats.ts`.
- [X] T003 Narrow `any` types and wrap `startKeepAlive` in `useCallback` in `src/hooks/useTTS.ts` and `src/utils/fileParser.ts`.
- [X] T004 Run `npm run lint` and verify exit code 0 with 0 errors across the entire codebase.

---

## Phase 2: User Story 1 — Continuous Integration Pipeline (Priority: P1) 🎯 MVP

**Goal**: Create the primary `.github/workflows/ci.yml` workflow executing parallel frontend and backend quality gates on push and pull requests to `main`.

**Independent Test**: Trigger workflow syntax check and run all sequential checks locally: `typecheck`, `lint`, `test`, `build`, and `pytest`.

### Implementation for User Story 1

- [X] T005 [US1] Create `.github/workflows/ci.yml` with workflow triggers for `push` and `pull_request` targeting `main`.
- [X] T006 [US1] Configure the `frontend` job on `ubuntu-latest` using Node.js 20 LTS, `npm ci`, and sequential fail-fast checks (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`).
- [X] T007 [US1] Configure the `backend` job on `ubuntu-latest` using Python 3.10, installing dependencies via `pip install`, and executing `pytest python-backend/tests`.

**Checkpoint**: Main CI workflow configured and ready for execution.

---

## Phase 3: User Story 2 — Dedicated Desktop Electron Packaging (Priority: P1)

**Goal**: Create an isolated, on-demand/release workflow for compiling Windows Electron desktop installers without burdening routine PR builds.

**Independent Test**: Validate `.github/workflows/build-electron.yml` YAML schema and verify triggers restricted to `workflow_dispatch` and `v*.*.*` tags.

### Implementation for User Story 2

- [X] T008 [US2] Create `.github/workflows/build-electron.yml` executing on `windows-latest` with `workflow_dispatch` and release tag triggers, running `npm run electron:build` and uploading the `.exe` installer artifact.

**Checkpoint**: Electron packaging workflow isolated.

---

## Phase 4: User Story 3 — CI Status Badge & Documentation (Priority: P2)

**Goal**: Display real-time build status on GitHub and document workflow triggers.

**Independent Test**: Inspect `README.md` to verify the presence of the CI status badge and updated workflow documentation.

### Implementation for User Story 3

- [X] T009 [US3] Embed official GitHub Actions CI workflow status badge at the top of `README.md`.
- [X] T010 [US3] Document CI workflow architecture and desktop build procedures in `README.md`.

**Checkpoint**: Documentation updated with live CI badge.

---

## Phase 5: Polish & Gate Enforcement

**Purpose**: Execute full local verification ensuring authentic CI pass and clean commit.

- [X] T011 Run all CI commands locally in exact sequence (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `pytest`) and verify 100% exit code 0.
- [X] T012 Validate GitHub Actions YAML syntax for `.github/workflows/ci.yml` and `.github/workflows/build-electron.yml`.

---

## Dependencies & Execution Order

```
Phase 1: Lint Remediation (T001 - T004) [BLOCKING]
       │
       ▼
Phase 2: CI Pipeline (T005 - T007) 🎯 MVP
       │
       ▼
Phase 3: Electron Packaging (T008)
       │
       ▼
Phase 4: Badge & Docs (T009 - T010)
       │
       ▼
Phase 5: Gate Enforcement (T011 - T012)
```

---

## Implementation Strategy

### MVP First
1. Complete Phase 1: Remediate residual lint errors so `npm run lint` passes authentically.
2. Complete Phase 2: Create `.github/workflows/ci.yml`.
3. Complete Phase 3: Create `.github/workflows/build-electron.yml`.
4. Complete Phase 4: Add badge to `README.md`.
5. Complete Phase 5: Run full validation.
