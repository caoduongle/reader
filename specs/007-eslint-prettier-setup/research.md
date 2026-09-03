# Research: ESLint 9 Flat Config, Prettier & Quality Tooling Setup

**Feature**: `007-eslint-prettier-setup`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## 1. Tooling & Ecosystem Analysis

### A. ESLint 9 Flat Config Migration
- ESLint 9 deprecates the legacy `.eslintrc.*` format in favor of `eslint.config.js` (Flat Config).
- Modern Vite + React + TypeScript templates use:
  - `typescript-eslint`: Provides parser and typed linting rules.
  - `eslint-plugin-react-hooks`: Enforces React Hooks rules (`rules-of-hooks`, `exhaustive-deps`).
  - `eslint-plugin-react-refresh`: Warns when components cannot be safely hot-reloaded.
  - `@eslint/js`: Provides recommended base JS rules.
  - `globals`: Provides predefined global variables (`browser`, `node`).

### B. Prettier & Conflict Resolution
- Prettier is an opinionated code formatter.
- When ESLint and Prettier both run, rules related to quotes, semicolons, and indentation can conflict.
- **Solution**: `eslint-config-prettier` turns off all ESLint formatting rules that might conflict with Prettier, ensuring ESLint only checks code quality and syntax bugs, while Prettier handles code formatting.

### C. Developer Scripts Mapping
| Script Name | Command | Purpose |
|---|---|---|
| `lint` | `eslint .` | Lint whole project with ESLint 9 |
| `typecheck` | `tsc --noEmit` | Static TypeScript type verification |
| `lint:fix` | `eslint . --fix` | Automatically fix safe lint issues |
| `format` | `prettier --write .` | Format entire project with Prettier |

---

## 2. Ignore Boundaries & Safety Constraints

### Ignored Directories
Both ESLint and Prettier must ignore:
- `dist/`, `dist-electron/`, `release/`: Build outputs.
- `node_modules/`: External dependencies.
- `python-backend/venv/`: Python virtual environment.
- `specs/`: Spec-Kit generated documentation artifacts.
- `package-lock.json`: Lockfile formatting must remain canonical npm output.

### Behavioral Safety Guarantee
- `lint:fix` and `format` will only fix stylistic inconsistencies (whitespace, commas, quotes).
- Complex TypeScript or React hook warnings (e.g. `any` casts, missing hook dependencies) must NOT be rewritten automatically to avoid breaking reader playback state or causing unwanted component re-renders.
- Any unresolved issues will be itemized in the PR description with file and line references.
