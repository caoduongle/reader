# Implementation Plan: ESLint 9 Flat Config, Prettier & Quality Tooling Setup

**Branch**: `007-eslint-prettier-setup` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/007-eslint-prettier-setup/spec.md`  

---

## Summary

Integrate ESLint 9 flat configuration and Prettier code formatting into the VoxRead React 19 + TypeScript + Vite project:
1. **Install Dependencies**: Install `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `eslint-config-prettier`, `@eslint/js`, and `globals` as devDependencies.
2. **Configure ESLint 9 Flat Config**: Create `eslint.config.js` incorporating TypeScript and React rules, with `eslint-config-prettier` to deactivate conflicting formatting rules.
3. **Configure Prettier**: Create `.prettierrc` and `.prettierignore` with standardized formatting settings.
4. **Standardize Developer Scripts**: Update `package.json` to define `lint`, `typecheck`, `lint:fix`, and `format`.
5. **Execute Automated Style Remediation & Triage**: Run `npm run lint:fix` and `npm run format`. Catalog any complex, behavioral findings transparently for human review rather than adding blanket `eslint-disable` comments.
6. **Verify Non-Regression**: Validate that `npm run typecheck` and `npm run build` continue to succeed with 0 errors.

---

## Technical Context

**Language/Format**: TypeScript / JavaScript (Node.js, ES modules), JSON, Markdown  
**Target Files**:
- `package.json` [MODIFY] (Add devDependencies and update scripts)
- `eslint.config.js` [NEW] (ESLint 9 flat config)
- `.prettierrc` [NEW] (Prettier rules)
- `.prettierignore` [NEW] (Prettier ignore rules)
**Primary Dependencies**: `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `eslint-config-prettier`, `@eslint/js`, `globals`  
**Testing & Verification**: `npm run lint`, `npm run typecheck`, `npm run build`  
**Constraints**:
- Strictly zero arbitrary logic rewrites to bypass lint warnings
- No indiscriminate or file-wide `eslint-disable` suppressions
- Both `typecheck` and `build` must pass cleanly after formatting

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Tooling Modernity | ✅ Passed | Using ESLint 9 flat config standard (`eslint.config.js`). |
| II. Conflict-Free Formatting | ✅ Passed | `eslint-config-prettier` eliminates duplicate formatting rules. |
| III. Behavioral Preservation | ✅ Passed | No invasive component refactoring; only safe style formatting applied. |
| IV. Build & Type Verification | ✅ Passed | `typecheck` and `build` gates strictly enforced. |

---

## Project Structure

### Documentation (this feature)

```text
specs/007-eslint-prettier-setup/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Technical research on ESLint 9 + Prettier
├── data-model.md        # Tooling architecture and config schemas
├── quickstart.md        # Developer guide for linting and formatting
├── contracts/           # Tooling contracts & scripts
│   └── tooling-contracts.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── eslint.config.js     # [NEW] ESLint 9 flat config
├── .prettierrc          # [NEW] Prettier formatting rules
├── .prettierignore      # [NEW] Prettier ignore rules
├── package.json         # [MODIFY] Update devDependencies & scripts
└── src/                 # [FORMATTED] Stylistically formatted via Prettier & lint:fix
```

---

## Phases & Deliverables

### Phase 1: Tooling Installation & Configuration
1. Install ESLint 9, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, and `eslint-config-prettier`.
2. Author `eslint.config.js` in ESLint 9 flat config format.
3. Author `.prettierrc` and `.prettierignore`.

### Phase 2: Standardize Developer Scripts
1. Update `package.json` scripts:
   - `"lint": "eslint ."`
   - `"typecheck": "tsc --noEmit"`
   - `"lint:fix": "eslint . --fix"`
   - `"format": "prettier --write ."`

### Phase 3: Automated Formatting & Triage
1. Execute `npm run format` across the repository.
2. Execute `npm run lint:fix` to auto-remediate safe linting rules.
3. Run `npm run lint` and catalog any manual triage items (e.g. `any` types, `useEffect` dependencies) with file paths and line numbers for the PR description.

### Phase 4: Verification & Gate Enforcement
1. Run `npm run typecheck` (`tsc --noEmit`) to confirm 0 type errors.
2. Run `npm run build` (`vite build`) to confirm production build passes cleanly.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**
