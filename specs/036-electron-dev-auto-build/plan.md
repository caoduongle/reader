# Implementation Plan: Auto-Rebuild Electron Main & Preload in Development

**Branch**: `036-electron-dev-auto-build` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/036-electron-dev-auto-build/spec.md)

**Input**: Feature specification from `/specs/036-electron-dev-auto-build/spec.md`

## Summary

The current `"electron:dev"` script in `package.json` launches Electron directly against pre-compiled bundles in `dist-electron/` without rebuilding them from `electron/main.ts` and `electron/preload.ts`.

This plan introduces a dedicated lightweight build script `"build:electron:main"` using `esbuild` that compiles only the Electron main and preload scripts without the heavy Python packaging step (`scripts/bundle-server.mjs`), and prefixes `"electron:dev"` with `"npm run build:electron:main && "`.

## Technical Context

**Language/Version**: JSON / Node.js 20+ / npm 10+

**Primary Dependencies**: `esbuild`, `concurrently`, `cross-env`, `electron`

**Storage**: N/A (Build artifacts output to `dist-electron/`)

**Testing**: `npm run build:electron:main`, `npm test`

**Target Platform**: Windows, macOS, Linux (development environment)

**Project Type**: npm package scripts / Electron desktop build configuration

**Performance Goals**: Development build overhead strictly under 1.5 seconds

**Constraints**:
- Must preserve existing `"build:electron"` script intact for release packaging
- Must not execute `scripts/bundle-server.mjs` during development startup

**Scale/Scope**: 1 file modified (`package.json`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an empty template. No active gates or constraints are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/036-electron-dev-auto-build/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json             # npm script definitions
dist-electron/
├── main.cjs             # Bundled main process
└── preload.cjs          # Bundled preload script
```

**Structure Decision**: Targeted modification to `package.json` scripts.
