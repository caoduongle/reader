# Tooling Contracts & Developer Scripts Specification

**Feature**: `007-eslint-prettier-setup`  
**Date**: 2026-09-03  

---

## 1. Package Manifest Contract (`package.json`)

`package.json` MUST expose the following four scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write ."
  }
}
```

### Invariants:
1. `npm run lint` MUST invoke `eslint .` using `eslint.config.js`.
2. `npm run typecheck` MUST execute `tsc --noEmit` without emitting files.
3. `npm run lint:fix` MUST execute `eslint . --fix`.
4. `npm run format` MUST execute `prettier --write .`.

---

## 2. Ignore Contract (`.prettierignore` and `eslint.config.js`)

The following paths MUST be excluded from linting and formatting:
- `dist/`
- `dist-electron/`
- `release/`
- `node_modules/`
- `python-backend/venv/`
- `specs/`
- `package-lock.json`
- `coverage/`
