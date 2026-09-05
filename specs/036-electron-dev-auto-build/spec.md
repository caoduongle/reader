# Feature Specification: Auto-Rebuild Electron Main & Preload in Development

**Feature Branch**: `036-electron-dev-auto-build`  
**Created**: 2026-09-06  
**Status**: Draft  
**Input**: File `package.json`. Script `"electron:dev"` runs `"electron ."` directly without rebuilding `"dist-electron/main.cjs"` and `"dist-electron/preload.cjs"` from TypeScript source. Since `package.json` specifies `"main": "dist-electron/main.cjs"`, Electron always loads the pre-existing build bundle; edits in `electron/main.ts` or `electron/preload.ts` do not take effect until `"npm run build:electron"` is manually executed. Requirement: Add `"build:electron:main"` to build main + preload with esbuild (without the heavy release step `bundle-server.mjs`), and update `"electron:dev"` to run `"npm run build:electron:main"` prior to launching Vite and Electron. Keep `"build:electron"` intact.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Automatic Rebuild on electron:dev (Priority: P1) 🎯 MVP

As a developer modifying Electron main or preload TypeScript sources (`electron/main.ts`, `electron/preload.ts`), when I run `npm run electron:dev`, I want the TypeScript code for the main and preload processes to be automatically recompiled into `dist-electron/main.cjs` and `dist-electron/preload.cjs` before Electron launches, so that my latest code changes immediately take effect without requiring a manual pre-build step.

**Why this priority**: Without this automatic build step, developers regularly test stale bundles and waste significant debugging time believing code changes are ineffective or broken.

**Independent Test**:
1. Edit a log statement or variable in `electron/main.ts`.
2. Run `npm run electron:dev` directly (without running `npm run build:electron` or any other build command beforehand).
3. Verify that `dist-electron/main.cjs` timestamp is updated and the changed log appears when Electron starts.

**Acceptance Scenarios**:
1. **Given** uncompiled changes exist in `electron/main.ts` or `electron/preload.ts`, **When** the developer runs `npm run electron:dev`, **Then** `npm run build:electron:main` executes first, compiling both files into `dist-electron/`.
2. **Given** `build:electron:main` completes successfully, **When** Electron launches, **Then** Electron executes the freshly compiled code.
3. **Given** a compilation error in `electron/main.ts` or `electron/preload.ts`, **When** `npm run electron:dev` is run, **Then** execution terminates early with the esbuild error without launching Electron or Vite.

---

### User Story 2 – Fast Development Build without Server Bundling (Priority: P2)

As a developer running `npm run electron:dev`, I want the development build script (`build:electron:main`) to only bundle TypeScript files and omit `scripts/bundle-server.mjs`, so that development startup remains fast and does not perform redundant Python packaging operations meant exclusively for releases.

**Why this priority**: `scripts/bundle-server.mjs` is intended for packaging Python backend assets for release installers (`electron-builder`). Running it during development would add unnecessary latency to every development restart.

**Independent Test**:
1. Run `npm run build:electron:main`.
2. Verify that `dist-electron/main.cjs` and `dist-electron/preload.cjs` are generated.
3. Verify that `scripts/bundle-server.mjs` is NOT executed.
4. Verify that the command completes in sub-second time.

**Acceptance Scenarios**:
1. **Given** `npm run build:electron:main` is invoked, **Then** only `esbuild electron/main.ts ...` and `esbuild electron/preload.ts ...` are run.
2. **Given** `npm run build:electron` (used for releases) is invoked, **Then** it continues to execute `bundle-server.mjs` as before.

---

### Edge Cases

- **Build failure**: If esbuild encounters a TypeScript syntax or import error, the `&&` operator prevents `concurrently` from starting `vite` or `electron`, alerting the developer immediately.
- **Vite Hot Module Replacement**: Vite continues to handle React frontend hot module replacement independently during `concurrently` execution; the pre-build only applies to the Node.js/Electron main & preload processes.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `package.json` MUST add a new script entry `"build:electron:main"`:
  `"build:electron:main": "esbuild electron/main.ts --bundle --platform=node --target=node18 --outfile=dist-electron/main.cjs --external:electron && esbuild electron/preload.ts --bundle --platform=node --target=node18 --outfile=dist-electron/preload.cjs --external:electron"`
- **FR-002**: `package.json` MUST update `"electron:dev"` to prepend `"npm run build:electron:main && "`:
  `"electron:dev": "npm run build:electron:main && concurrently -k -s first \"npm run dev\" \"cross-env NODE_ENV=development electron .\""`
- **FR-003**: The existing `"build:electron"` script MUST remain unchanged to preserve production packaging workflows.
- **FR-004**: Running `npm run build:electron:main` MUST produce valid bundles at `dist-electron/main.cjs` and `dist-electron/preload.cjs`.

---

### Key Entities

- **BuildScripts**:
  - `build:electron:main`: Development compilation script for Electron main and preload bundles.
  - `electron:dev`: Main development command orchestrating pre-build, Vite dev server, and Electron runner.
  - `build:electron`: Production build script including Python bundling.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of `npm run electron:dev` executions compile the latest TypeScript code from `electron/main.ts` and `electron/preload.ts` before starting the application.
- **SC-002**: Development compilation overhead (`build:electron:main`) is strictly under 1.5 seconds.
- **SC-003**: Production release script (`build:electron` and `electron:build`) remains completely functional without behavioral changes.
- **SC-004**: All existing frontend and backend automated test suites continue to pass.

---

## Assumptions

- `esbuild` is installed in `devDependencies` (confirmed in `package.json`).
- Node 18+ is the target platform for Electron main process bundling.
