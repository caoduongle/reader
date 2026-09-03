# Quickstart & Verification Guide: Codebase Hygiene & Bundle Optimization

**Feature Branch**: `003-cleanup-bundle-optimization`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Setup & Environment Verification Commands

Run the following commands in the workspace root to verify system hygiene and compilation health:

```bash
# 1. Verify TypeScript type-checking (0 errors required)
npm run lint

# 2. Run production build and inspect emitted chunk sizes
npm run build

# 3. Check git status to ensure working tree is clean
git status --porcelain
```

---

## 2. End-to-End Verification Scenarios

### Scenario 1: Verification of Clean Repository & Canonical Backend
**Objective**: Confirm duplicate and dead files are eradicated and the desktop packaging configuration references canonical backend files.

1. In the repository root, confirm the removal of obsolete files:
   - Root `/server.py` and `/requirements.txt` do **NOT** exist.
   - `tts-extension/` and `local-voice-server/` directories do **NOT** exist.
   - `tts-extension.zip` and `local-voice-server.zip` are cleaned up.
2. Confirm the presence and integrity of canonical backend files:
   - `python-backend/server.py` exists.
   - `python-backend/requirements.txt` exists.
3. Inspect `electron/main.ts` (lines 52–61) and `package.json` (`extraResources`):
   - Confirm backend execution path points to `python-backend/server.py`.
   - Confirm packaging resources bundle `python-backend/server.py` and `python-backend/requirements.txt`.

---

### Scenario 2: Verification of Package Manager Single-Lockfile Policy
**Objective**: Guarantee that `npm` is the sole package manager and multi-tool drift is impossible.

1. Inspect git tracked files for lockfiles:
   ```bash
   git ls-files "*lock*"
   ```
   - **Expected**: Only `package-lock.json` is returned. `bun.lock` is **NOT** tracked.
2. Inspect `.gitignore`:
   - Confirm `bun.lock` and `bun.lockb` are present in `.gitignore`.
3. Run `npm install` or `npm ci`:
   - Confirm clean dependency installation without warning or lockfile modification.

---

### Scenario 3: Verification of Bundle Code-Splitting & Size Threshold (< 500 kB)
**Objective**: Verify that the primary bundle is drastically reduced from 1.46MB and the Vite warning is eliminated.

1. Run the build command:
   ```bash
   npm run build
   ```
2. Inspect the terminal output under `dist/assets/`:
   - **Primary entry chunk (`index-*.js`)**: Must be **$< 500\text{ kB}$** (expected: ~350–480 kB minified, down from 1,463.80 kB).
   - **No Vite Warning**: Output must **NOT** contain `(!) Some chunks are larger than 500 kB after minification` for the main entry chunk.
   - **Asynchronous chunks present**:
     - Distinct chunk for PDF parsing (`pdfjs-dist`).
     - Distinct chunk for EPUB parsing (`jszip`).
     - Distinct chunks for `SettingsModal` and `ReadingStatsModal`.

---

### Scenario 4: Verification of On-Demand Modal Lazy Loading
**Objective**: Confirm modals only load network/script assets when opened by the user.

1. Start the local preview server:
   ```bash
   npm run preview
   ```
2. Open the app in Chrome/Edge (`http://localhost:4173`) with DevTools (`F12`) $\rightarrow$ **Network** tab $\rightarrow$ Filter: **JS**.
3. On initial page load:
   - Verify `index-*.js` loads.
   - Verify neither `SettingsModal-*.js` nor `ReadingStatsModal-*.js` are loaded.
4. Click the **Cài đặt** (Settings) icon:
   - Verify `SettingsModal-*.js` is requested and loaded dynamically.
   - Verify Settings Modal opens smoothly and all controls work (voice dropdown, speed, pitch).
5. Close Settings and click the **Thống kê** (Reading Stats) icon:
   - Verify `ReadingStatsModal-*.js` (and `recharts` chunk) is requested and loaded dynamically.
   - Verify Reading Statistics modal opens smoothly with chart rendering.

---

### Scenario 5: Verification of Offline PDF & EPUB Dynamic Parsing
**Objective**: Confirm dynamic import does not break document parsing or require an internet connection.

1. Open VoxRead in the browser or Electron.
2. Click **Tải lên** (Upload) $\rightarrow$ select a local `.pdf` file.
3. Observe Network tab / console:
   - `pdfjs-dist` chunk loads dynamically.
   - Local worker (`pdf.worker.min.mjs`) initializes from bundled assets.
   - Document chapters extract accurately and display in the reader view.
4. Click **Tải lên** (Upload) $\rightarrow$ select a local `.epub` file.
   - `jszip` chunk loads dynamically.
   - Chapters extract accurately and display in the reader view.
5. In browser DevTools Network tab, toggle **Offline** mode, import a local PDF:
   - Verify document parses successfully offline without remote network failures.
