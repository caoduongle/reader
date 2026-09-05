# Research: Auto-Rebuild Electron Main & Preload in Development

**Feature**: 036-electron-dev-auto-build | **Date**: 2026-09-06

## Research Task 1: npm Script Orchestration with concurrently

### Decision
Chain the pre-build command before `concurrently` using the shell `&&` operator:
```json
"electron:dev": "npm run build:electron:main && concurrently -k -s first \"npm run dev\" \"cross-env NODE_ENV=development electron .\""
```

### Rationale
- The `&&` operator guarantees sequential execution: `build:electron:main` must exit with code 0 before `concurrently` is launched.
- If TypeScript compilation fails in `electron/main.ts` or `electron/preload.ts`, the process stops immediately, preventing the developer from running with a broken build.
- Once compilation succeeds, `concurrently` launches Vite's dev server (`npm run dev`) and Electron (`electron .`) concurrently with flag `-k` (kill others if one exits) and `-s first` (exit when the first command exits).

### Alternatives Considered
1. **Adding `build:electron:main` as a third process inside `concurrently`**:
   - Rejected: `concurrently` runs all tasks in parallel. Electron would launch simultaneously with the build process, leading to race conditions where Electron loads stale or partially written bundles.
2. **Using esbuild watch mode (`--watch`) concurrently**:
   - Rejected: Electron doesn't automatically restart when files on disk change without an additional process watcher like `nodemon` or `electron-reload`. A pre-build step on launch is simpler, cleaner, and matches standard Electron dev patterns without adding watcher dependencies.

---

## Research Task 2: Separation of Dev Build vs Release Build

### Decision
Extract the esbuild commands into `"build:electron:main"` and keep `"build:electron"` for packaging.

### Rationale
- `"build:electron"` contains `node scripts/bundle-server.mjs`, which handles bundling the Python backend into `dist-electron/resources/`.
- During development, `electron/main.ts` resolves `python-backend` directly from the local project root (`app.getAppPath()`), so `bundle-server.mjs` is completely redundant.
- Omitting it saves seconds of startup time on every `npm run electron:dev`.
