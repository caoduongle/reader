# Data Model & Configuration Schemas: ESLint & Prettier Tooling

**Feature Branch**: `007-eslint-prettier-setup`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. Tooling Architecture Diagram

```
[Developer / Agent]
       │
       ├───> npm run format ──────> Prettier (.prettierrc)
       │                              └─ Writes formatting style (quotes, semi, spaces)
       │
       ├───> npm run lint ────────> ESLint 9 (eslint.config.js)
       │                              ├─ typescript-eslint (Syntax & Types)
       │                              ├─ eslint-plugin-react-hooks (Hook safety)
       │                              ├─ eslint-plugin-react-refresh (HMR compatibility)
       │                              └─ eslint-config-prettier (Disables conflicting format rules)
       │
       ├───> npm run typecheck ───> TypeScript Compiler (tsconfig.json)
       │                              └─ Pure static type validation (tsc --noEmit)
       │
       └───> npm run build ───────> Vite Build (Production distribution)
```

---

## 2. Configuration Schemas

### 2.1 Prettier Options (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

### 2.2 ESLint Flat Config Structure (`eslint.config.js`)

```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-electron',
      'release',
      'node_modules',
      'python-backend/venv',
      'specs',
      'coverage',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierConfig],
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  }
);
```
