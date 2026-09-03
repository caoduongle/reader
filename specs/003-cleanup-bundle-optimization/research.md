# Research: Codebase Hygiene, Redundancy Elimination & Client Bundle Optimization

**Feature**: `003-cleanup-bundle-optimization`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## Executive Summary

VoxRead currently faces two architectural hygiene issues:
1. **Repository Duplication & Dead Code**: Redundant server files at the root (`server.py`, `requirements.txt`) duplicate the canonical files in `python-backend/`, while obsolete directories (`tts-extension/`, `local-voice-server/`) and conflicting lockfiles (`bun.lock`) introduce operational ambiguity.
2. **Monolithic Initial Client Bundle**: Production builds emit a single primary entry bundle of **1,463.80 kB** (439.36 kB gzip), triggering Vite's 500 kB chunk warning. The primary drivers are static imports of `pdfjs-dist`, `jszip`, `SettingsModal`, and `ReadingStatsModal` on the critical initial rendering path.

This research resolves all technical unknowns for safe dead code removal, dynamic on-demand code-splitting, and package manager unification without functional regressions.

---

## Research Topics & Decisions

### 1. Verification of Canonical Python Backend vs Root Duplicate

- **Issue**: Root repository contains `/server.py` and `/requirements.txt`. A second set exists in `/python-backend/server.py` and `/python-backend/requirements.txt`.
- **Investigation**:
  - `electron/main.ts` (lines 52–61) resolves the backend script via `path.join(baseDir, 'server.py')` where `baseDir` points strictly to `python-backend` (in development: `app.getAppPath()/python-backend`; in packaged production: `process.resourcesPath/python-backend`).
  - `package.json` (lines 27–36) defines `extraResources` mapping specifically:
    ```json
    { "from": "python-backend/server.py", "to": "python-backend/server.py" },
    { "from": "python-backend/requirements.txt", "to": "python-backend/requirements.txt" }
    ```
  - Byte-by-byte file comparison (`git diff --no-index`) confirmed that `/server.py` is 100% identical to `/python-backend/server.py`, and `/requirements.txt` is 100% identical to `/python-backend/requirements.txt`.
- **Decision**: Safely remove root `server.py` and root `requirements.txt` via `git rm`.
- **Rationale**: Retaining duplicate files risks developer modifications being made to the unused root file while Electron runs the file in `python-backend/`. Eliminating the root duplicates leaves a single canonical source of truth.
- **Alternatives Considered**: Retaining root files with symlinks or warning banners (rejected: adds clutter and fails on Windows environments).

---

### 2. Status of `tts-extension/` and `local-voice-server/`

- **Investigation**:
  - `tts-extension/`: A legacy manifest v3 Chrome browser extension with rudimentary DOM text extraction and a background player. VoxRead has transitioned entirely to a standalone desktop (Electron) and web reading application. The extension is not referenced by any build script or runtime module.
  - `local-voice-server/`: An alternative experimental backend using FastAPI and viXTTS zero-shot voice cloning. The current production engine in VoxRead is built around the RVC (Retrieval-based Voice Conversion) pipeline in `python-backend/server.py` running at port 5005. Neither `electron/main.ts` nor frontend hooks (`useTTS.ts`) connect to the viXTTS FastAPI server.
  - Root directory also contains untracked zip files `tts-extension.zip` and `local-voice-server.zip` (ignored by `*.zip` in `.gitignore`).
- **Decision**: Delete `tts-extension/` and `local-voice-server/` from Git tracking and remove local zip backups to ensure repository hygiene.
- **Rationale**: Removes thousands of lines of dead code and eliminates onboarding confusion for developers.

---

### 3. Dynamic Code-Splitting for `pdfjs-dist` & Local Worker Configuration

- **Issue**: `src/utils/fileParser.ts` currently has top-level static imports:
  ```typescript
  import * as pdfjsLib from 'pdfjs-dist';
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  ```
  This single import pulls the entire PDF parsing engine (~1.2MB unminified) into the main entry chunk (`index-*.js`), even though the vast majority of user sessions read already-imported books or sample texts.
- **Technical Challenge**: In an offline-ready Electron/Vite app, `pdfjs-dist` requires its worker script (`pdf.worker.min.mjs`). The worker configuration must continue pointing to the local bundled asset without resorting to external CDNs.
- **Solution**:
  Extract the loader into an asynchronous helper inside `fileParser.ts`:
  ```typescript
  let pdfjsInstance: typeof import('pdfjs-dist') | null = null;

  async function getPdfJs(): Promise<typeof import('pdfjs-dist')> {
    if (!pdfjsInstance) {
      const pdfjs = await import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      }
      pdfjsInstance = pdfjs;
    }
    return pdfjsInstance;
  }
  ```
  Inside `parsePdfFile`:
  ```typescript
  export async function parsePdfFile(file: File, onProgress?: (percent: number) => void, signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException('Parsing cancelled', 'AbortError');
    const [pdfjsLib, arrayBuffer] = await Promise.all([getPdfJs(), file.arrayBuffer()]);
    if (signal?.aborted) throw new DOMException('Parsing cancelled', 'AbortError');
    // Proceed with extraction
  }
  ```
- **Rationale**: Vite automatically detects `await import('pdfjs-dist')` and splits it into an independent chunk. The URL constructor `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` is recognized by Vite's static asset plugin and bundles the worker locally.
- **Alternatives Considered**: Web Worker offloading (adds architectural complexity without reducing bundle size); CDN worker script (violates offline-first requirement).

---

### 4. Dynamic Code-Splitting for `jszip`

- **Issue**: `src/utils/fileParser.ts` imports `import JSZip from 'jszip'` statically. While smaller than `pdfjs-dist`, `jszip` (~100 kB) is only needed when unzipping EPUB containers.
- **Solution**:
  ```typescript
  let jszipInstance: typeof import('jszip') | null = null;

  async function getJsZip() {
    if (!jszipInstance) {
      const mod = await import('jszip');
      jszipInstance = mod.default || mod;
    }
    return jszipInstance;
  }
  ```
  Inside `parseEpubFile`:
  ```typescript
  export async function parseEpubFile(file: File, signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException('Parsing cancelled', 'AbortError');
    const [JSZip, arrayBuffer] = await Promise.all([getJsZip(), file.arrayBuffer()]);
    if (signal?.aborted) throw new DOMException('Parsing cancelled', 'AbortError');
    const zip = await JSZip.loadAsync(arrayBuffer);
    // Proceed with EPUB XML manifest extraction
  }
  ```
- **Rationale**: Defers loading until the user explicitly selects an `.epub` file.

---

### 5. Lazy Loading for `SettingsModal` & `ReadingStatsModal`

- **Issue**: `SettingsModal.tsx` (~400 lines, imports Lucide icons, server health checks, audio testing) and `ReadingStatsModal.tsx` (~350 lines, imports `recharts` for charts, calendar heatmaps, confetti) are statically imported in `App.tsx`. They are modal dialogs that are hidden 99% of the session time.
- **Solution**:
  1. Add `default` export aliases in `SettingsModal.tsx` and `ReadingStatsModal.tsx`:
     ```typescript
     export default SettingsModal;
     export default ReadingStatsModal;
     ```
  2. In `App.tsx`, declare lazy components:
     ```typescript
     const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
     const ReadingStatsModal = React.lazy(() => import('./components/ReadingStatsModal'));
     ```
  3. Render with conditional rendering and `Suspense`:
     ```tsx
     {isSettingsOpen && (
       <React.Suspense fallback={null}>
         <SettingsModal
           isOpen={isSettingsOpen}
           onClose={() => setIsSettingsOpen(false)}
           ...
         />
       </React.Suspense>
     )}

     {isStatsOpen && (
       <React.Suspense fallback={null}>
         <ReadingStatsModal
           isOpen={isStatsOpen}
           onClose={() => setIsStatsOpen(false)}
           ...
         />
       </React.Suspense>
     )}
     ```
- **Rationale**: Because modals are rendered only when `isSettingsOpen` or `isStatsOpen` is `true`, their JS bundles (and nested dependencies like `recharts`) will not be fetched on cold start. This cuts hundreds of kilobytes from the critical path.
- **Alternatives Considered**: Modal rendering without Suspense (causes React runtime error); Eager prefetching on hover (unnecessary for desktop/fast local disk, but could be added later).

---

### 6. Package Manager Unification (`npm` vs `bun`)

- **Investigation**:
  - `package.json` specifies standard npm scripts (`npm run dev`, `npm run build`, `npm run electron:dev`).
  - `package-lock.json` is 316 kB and actively updated.
  - `bun.lock` is 90 kB and present in the root directory.
  - Having dual lockfiles risks mismatched dependency trees between contributors using `npm` and `bun`.
- **Decision**: Designate `npm` as the sole canonical package manager. Remove `bun.lock` from Git tracking (`git rm bun.lock`) and add `bun.lock` and `bun.lockb` to `.gitignore`.
- **Rationale**: `package.json` lifecycle and documentation are standard npm-oriented. Eliminates lockfile divergence.

---

## Expected Bundle Metrics Post-Optimization

| Metric | Baseline (Current) | Target (Post-Optimization) | Impact |
|---|---|---|---|
| Primary Entry Chunk (`index-*.js`) | **1,463.80 kB** (439.36 kB gzip) | **< 480 kB** (< 150 kB gzip) | **~67% reduction**, eliminates Vite warning |
| PDF Processing Chunk | Bundled in main | ~1,100 kB (separate async chunk) | Loaded strictly on PDF upload |
| EPUB/ZIP Processing Chunk | Bundled in main | ~100 kB (separate async chunk) | Loaded strictly on EPUB upload |
| Settings Modal Chunk | Bundled in main | ~40 kB (separate async chunk) | Loaded on clicking Settings |
| Reading Stats Modal Chunk | Bundled in main | ~220 kB (separate async chunk, with Recharts) | Loaded on clicking Stats |
| TypeScript Lint Errors | 0 | 0 | Clean type safety preserved |
