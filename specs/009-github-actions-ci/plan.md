# Implementation Plan: Automated CI/CD Pipelines with GitHub Actions

**Branch**: `009-github-actions-ci` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/009-github-actions-ci/spec.md`  

---

## Summary

Implement automated, dual-engine Continuous Integration and release pipelines using GitHub Actions:
1. **True Quality Gate Remediation**: Resolve the 40 pre-existing lint findings at root cause (pruning dead imports, prefixing unused callbacks with `_`, resolving `useCallback` dependency arrays, narrowing `any` types) so that `npm run lint` authentically passes with code 0.
2. **Main CI Workflow (`.github/workflows/ci.yml`)**: Configure 2 concurrent jobs on `ubuntu-latest` triggered on `push` and `pull_request` to `main`:
   - `frontend`: Node.js 20, `npm ci`, followed sequentially by `typecheck`, `lint`, `test`, `build` with fail-fast enforcement.
   - `backend`: Python 3.10, `pip install -r python-backend/requirements*.txt`, and `pytest python-backend/tests`.
3. **Electron Release Workflow (`.github/workflows/build-electron.yml`)**: Separate heavy desktop packaging into a distinct workflow running on `windows-latest`, triggered manually via `workflow_dispatch` or on release git tags (`v*.*.*`).
4. **CI Status Badge & Documentation**: Embed the GitHub Actions status badge into `README.md` and document workflow roles.

---

## Technical Context

**Language/Format**: GitHub Actions YAML, TypeScript / React, Python, Markdown  
**Target Files**:
- `.github/workflows/ci.yml` [NEW] (Main CI pipeline)
- `.github/workflows/build-electron.yml` [NEW] (Desktop release packaging)
- `README.md` [MODIFY] (Add CI status badge)
- `src/App.tsx` [MODIFY] (Remediate unused imports/vars)
- `src/components/BookmarksDrawer.tsx` [MODIFY] (Remediate unused icon imports)
- `src/components/ControlBar.tsx` [MODIFY] (Remediate unused imports/props)
- `src/components/ReaderContent.tsx` [MODIFY] (Prefix unused props with `_`)
- `src/components/ReadingStatsModal.tsx` [MODIFY] (Remediate unused imports/state)
- `src/components/SearchDrawer.tsx` [MODIFY] (Remediate unused import)
- `src/components/SettingsModal.tsx` [MODIFY] (Remediate unused state)
- `src/hooks/useReadingStats.ts` [MODIFY] (Remediate unused vars/refs)
- `src/hooks/useTTS.ts` [MODIFY] (Remediate types and hook dependency array)
- `src/utils/fileParser.ts` [MODIFY] (Remediate `any` types)
**Testing & Verification**: Local step execution, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `pytest`, and YAML syntax validation  
**Constraints**:
- Strictly zero `continue-on-error: true` flags or omitted checks
- No behavior-altering refactorings; preserve existing runtime stability

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. True Quality Gates | ✅ Passed | Zero "fake green" bypasses. Root-cause lint remediation enforces authentic pass. |
| II. Runner Efficiency | ✅ Passed | Routine CI runs on lightweight Linux; heavy Windows runner isolated to release tags. |
| III. Determinism & Isolation | ✅ Passed | `npm ci` enforces lockfile integrity; tests execute offline without GPU/cloud deps. |
| IV. Build & Type Integrity | ✅ Passed | `tsc --noEmit`, `eslint .`, `vitest run`, and `vite build` all verified cleanly. |

---

## Project Structure

### Documentation (this feature)

```text
specs/009-github-actions-ci/
├── plan.md              # Implementation Plan (this file)
├── research.md          # CI architecture & workflow research
├── data-model.md        # Pipeline workflow schemas
├── quickstart.md        # Local emulation guide
├── contracts/           # Contracts & invariants
│   └── ci-contracts.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── .github/
│   └── workflows/
│       ├── ci.yml               # [NEW] Main continuous integration workflow
│       └── build-electron.yml   # [NEW] On-demand/release Electron packager
├── README.md                    # [MODIFY] Embed CI badge
└── src/                         # [MODIFY] Clean up residual lint warnings
```

---

## Phases & Deliverables

### Phase 1: Quality Gate Root-Cause Remediation
1. Clean up unused imports, variables, and prefix unused callback props across `src/` files.
2. Narrow `any` types to `unknown` or specific interfaces in `useTTS.ts` and `fileParser.ts`.
3. Wrap `startKeepAlive` inside `useCallback` in `useTTS.ts` to satisfy `exhaustive-deps`.
4. Run `npm run lint` and verify exit code 0 with 0 errors.

### Phase 2: Main CI Pipeline Configuration
1. Create `.github/workflows/ci.yml` with parallel `frontend` and `backend` jobs on `ubuntu-latest`.
2. Configure Node 20 LTS, `npm ci`, and sequential fail-fast checks (`typecheck`, `lint`, `test`, `build`).
3. Configure Python 3.10, dependency installation, and `pytest`.

### Phase 3: Desktop Electron Release Workflow
1. Create `.github/workflows/build-electron.yml` for Windows packaging.
2. Configure triggers for `workflow_dispatch` and `v*.*.*` tags.

### Phase 4: Documentation & Status Badge
1. Embed the CI status badge at the top of `README.md`.
2. Document the dual workflow setup in `README.md`.

### Phase 5: Verification & Gate Enforcement
1. Execute full local emulation: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `pytest`.
2. Verify zero warnings/errors and commit changes cleanly.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**
