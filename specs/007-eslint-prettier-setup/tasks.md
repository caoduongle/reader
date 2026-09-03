# Tasks: ESLint 9 Flat Config, Prettier & Quality Tooling Setup

**Feature**: `007-eslint-prettier-setup`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Dependency Installation

**Purpose**: Install required devDependencies for ESLint 9 and Prettier tooling.

- [X] T001 Install `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `eslint-config-prettier`, `@eslint/js`, and `globals` as devDependencies via npm in `package.json`.

---

## Phase 2: User Story 1 — Modern ESLint 9 Flat Config & Prettier Integration (Priority: P1) 🎯 MVP

**Goal**: Establish conflict-free code linting and formatting configuration files for React 19 + TypeScript + Vite.

**Independent Test**: Verify `eslint.config.js` and `.prettierrc` exist; run `npx eslint --version` and `npx prettier --version` to confirm valid configuration syntax.

### Implementation for User Story 1

- [X] T002 [US1] Create ESLint 9 flat configuration file `eslint.config.js` with TypeScript, React Hooks, React Refresh, ignores, and `eslint-config-prettier` integration in `eslint.config.js`.
- [X] T003 [US1] Create `.prettierrc` formatting options and `.prettierignore` exclusion rules for build outputs and dependencies in `.prettierrc` and `.prettierignore`.

**Checkpoint**: Configuration files active and verified compatible.

---

## Phase 3: User Story 2 — Standardized Developer Scripts in `package.json` (Priority: P1)

**Goal**: Expose clear, standardized npm commands for linting, typechecking, and code formatting.

**Independent Test**: Verify `npm run lint`, `npm run typecheck`, `npm run lint:fix`, and `npm run format` are present in `package.json` scripts.

### Implementation for User Story 2

- [X] T004 [US2] Update developer scripts in `package.json` to define `"lint": "eslint ."`, `"typecheck": "tsc --noEmit"`, `"lint:fix": "eslint . --fix"`, and `"format": "prettier --write ."` in `package.json`.

**Checkpoint**: Developer commands operational.

---

## Phase 4: User Story 3 — Automated Style Remediation & Transparent Triage (Priority: P2)

**Goal**: Safely auto-format style issues and catalog any complex/behavioral lint items without invasive refactoring.

**Independent Test**: Execute `npm run format` and `npm run lint:fix`, then verify zero behavioral changes or blanket `eslint-disable` additions.

### Implementation for User Story 3

- [X] T005 [US3] Execute `npm run format` and `npm run lint:fix` across the codebase to auto-remediate safe stylistic formatting.
- [X] T006 [US3] Execute `npm run lint` to catalog any remaining manual lint findings (e.g. `any` types, `useEffect` dependencies) with file paths and line numbers for PR documentation.

**Checkpoint**: Codebase formatted; all residual lint findings transparently logged.

---

## Phase 5: Polish & Gate Enforcement

**Purpose**: Verify static type safety and production build integrity post-formatting.

- [X] T007 Run `npm run typecheck` (`tsc --noEmit`) to confirm zero TypeScript compilation errors.
- [X] T008 Run `npm run build` (`vite build`) to verify production bundle builds cleanly.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Dependency Installation (T001)
       │
       ▼
Phase 2: Configuration Files (T002 - T003) 🎯 MVP
       │
       ▼
Phase 3: Developer Scripts (T004)
       │
       ▼
Phase 4: Formatting & Triage (T005 - T006)
       │
       ▼
Phase 5: Polish & Verification Gates (T007 - T008)
```

### Parallel Opportunities

- `T002` (`eslint.config.js`) and `T003` (`.prettierrc`, `.prettierignore`) can be authored in parallel.
- `T007` (`typecheck`) and `T008` (`build`) run as sequential validation gates.

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Install devDependencies.
2. Complete Phase 2: Create `eslint.config.js` and `.prettierrc`.
3. Complete Phase 3: Update `package.json` scripts.
4. Complete Phase 4: Run `format` & `lint:fix`, and triage findings.
5. Complete Phase 5: Enforce `typecheck` and `build` verification gates.

---

## Notes

- Tasks strictly follow schema: `- [ ] [TaskID] [P?] [Story?] Description with file path`.
- No arbitrary logic changes to silence lint warnings.
- No blanket or file-wide `eslint-disable` comments.
