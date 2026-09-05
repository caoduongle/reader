# Data Model: Auto-Rebuild Electron Main & Preload in Development

**Feature**: 036-electron-dev-auto-build | **Date**: 2026-09-06

> This feature modifies project configuration scripts only. No persistent data models or runtime databases are involved.

---

## Script Architecture in `package.json`

| Script Name | Command | Purpose |
|---|---|---|
| `build:electron:main` | `esbuild electron/main.ts --bundle --platform=node --target=node18 --outfile=dist-electron/main.cjs --external:electron && esbuild electron/preload.ts --bundle --platform=node --target=node18 --outfile=dist-electron/preload.cjs --external:electron` | Lightweight pre-build of main and preload scripts for dev |
| `electron:dev` | `npm run build:electron:main && concurrently -k -s first "npm run dev" "cross-env NODE_ENV=development electron ."` | Pre-builds bundles, then runs Vite + Electron |
| `build:electron` | `... && node scripts/bundle-server.mjs` | Full production build including Python packaging |
| `electron:build` | `npm run build && npm run build:electron && electron-builder --win` | Full release packaging pipeline |

### Execution Flow: `npm run electron:dev`

```text
npm run electron:dev
  │
  ├─► Phase 1: npm run build:electron:main
  │     ├── esbuild electron/main.ts ──► dist-electron/main.cjs
  │     └── esbuild electron/preload.ts ──► dist-electron/preload.cjs
  │
  └─► Phase 2: concurrently (only if Phase 1 exits with code 0)
        ├── Process A: npm run dev (Vite HTTP dev server on port 3000)
        └── Process B: electron . (Loads fresh dist-electron/main.cjs)
```
