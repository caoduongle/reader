# Tasks: Auto-Rebuild Electron Main & Preload in Development

**Feature**: 036-electron-dev-auto-build | **Branch**: `036-electron-dev-auto-build` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/036-electron-dev-auto-build/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/036-electron-dev-auto-build/plan.md)

---

## Phase 1: User Story 1 – Automatic Rebuild on electron:dev (Priority: P1) 🎯 MVP

**Goal**: Prepend a lightweight esbuild compilation step to `electron:dev` so that edits to `electron/main.ts` and `electron/preload.ts` are automatically compiled to `dist-electron/` before Electron launches.

**Independent Test**: Execute `npm run build:electron:main`, verify that `dist-electron/main.cjs` and `dist-electron/preload.cjs` are updated, and launch `npm run electron:dev` to verify automatic pre-building.

### Implementation for User Story 1

- [X] T001 [US1] Add `"build:electron:main"` script in `package.json`: `"esbuild electron/main.ts --bundle --platform=node --target=node18 --outfile=dist-electron/main.cjs --external:electron && esbuild electron/preload.ts --bundle --platform=node --target=node18 --outfile=dist-electron/preload.cjs --external:electron"`
- [X] T002 [US1] Update `"electron:dev"` script in `package.json` to prepend `"npm run build:electron:main && "`: `"npm run build:electron:main && concurrently -k -s first \"npm run dev\" \"cross-env NODE_ENV=development electron .\""`

**Checkpoint**: User Story 1 complete — `package.json` now rebuilds Electron main and preload scripts before starting Electron in development.

---

## Phase 2: Polish & Cross-Cutting Concerns

**Purpose**: Validate build commands and test suite integrity

- [X] T003 Execute `npm run build:electron:main` and verify exit code 0 and bundle existence in `dist-electron/`
- [X] T004 Run full frontend test suite (`npm test`) to ensure zero regressions across the codebase

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Implementation)**: Modifies `package.json`
- **Phase 2 (Polish & Verification)**: Runs after Phase 1 completion

### User Story Dependencies

- **User Story 1 (P1)**: T001 and T002 modify `package.json` sequentially.

---

## Implementation Strategy

### Incremental Delivery

1. Add `"build:electron:main"` and update `"electron:dev"` in `package.json`.
2. Validate with `npm run build:electron:main`.
3. Verify test suite with `npm test`.
