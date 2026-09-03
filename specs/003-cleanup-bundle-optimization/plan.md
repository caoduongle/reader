# Implementation Plan: Codebase Hygiene, Redundancy Elimination & Client Bundle Optimization

**Branch**: `003-cleanup-bundle-optimization` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/003-cleanup-bundle-optimization/spec.md`  

---

## Summary

Eradicate repository confusion and dramatically optimize initial web/desktop bundle performance by:
1. **Eliminating Duplicate Backend Files**: Removing duplicate root `/server.py` and `/requirements.txt`, retaining `python-backend/server.py` and `python-backend/requirements.txt` as the sole canonical backend referenced by Electron runtime and build packaging.
2. **Pruning Obsolete Code**: Removing legacy Chrome extension (`tts-extension/`, `tts-extension.zip`) and abandoned experimental zero-shot server (`local-voice-server/`, `local-voice-server.zip`).
3. **Dynamic Code-Splitting for Document Parsers**: Converting static imports of `pdfjs-dist` and `jszip` in `src/utils/fileParser.ts` into on-demand dynamic imports (`await import(...)`), preserving local offline worker bundling for PDF parsing.
4. **Lazy-Loading Modal Dialogs**: Converting `SettingsModal` and `ReadingStatsModal` in `src/App.tsx` into `React.lazy` components with `<React.Suspense fallback={null}>`, removing heavy dependencies like `recharts` from initial load.
5. **Enforcing Package Manager Single-Lockfile Standard**: Standardizing on `npm` by removing `bun.lock` from Git tracking and configuring `.gitignore` to prevent lockfile drift.
6. **Achieving Bundle Target**: Reducing the primary production entry chunk (`index-*.js`) from **1,463.80 kB** to **$< 500\text{ kB}$**, eliminating Vite's build warning while maintaining 0 TypeScript errors.

---

## Technical Context

**Language/Version**: TypeScript 5.8 (Strict mode), React 19, Node.js $\ge 18$, Python 3.10+  
**Primary Dependencies**:
- Frontend: React 19, Lucide React, Tailwind CSS v4, Recharts 3.10, Framer Motion
- Document Parsing: `pdfjs-dist` (v6), `jszip` (v3.10)
- Desktop Platform: Electron 44, `esbuild`
**Package Management**: `npm` (with canonical `package-lock.json`)  
**Build Tooling**: Vite 6, Rollup code-splitting  
**Testing & Verification**: Manual smoke scenarios (`quickstart.md`), TypeScript compilation (`tsc --noEmit`), Vite build analyzer  
**Target Platform**: Windows 10/11 Desktop (Electron) & Modern Evergreen Browsers (Chrome, Edge, Firefox)  
**Project Type**: React Single Page Application + Electron Desktop Wrapper  
**Performance Goals**:
- Primary entry bundle minified size: $< 500\text{ kB}$ (down from 1,463.80 kB, a $\ge 65\%$ reduction)
- Zero Vite oversized chunk warnings during production build
- Cold-start initial UI render: instantaneous, without evaluating PDF/EPUB parsers or chart libraries
- On-demand modal transition latency: $< 100\text{ ms}$ upon click
**Constraints**:
- Zero modifications to previously stabilized logic (reading position storage coordinates separation, ErrorBoundary hierarchy, 100MB file size limit, RVC TTS playback engine in `useTTS.ts`, Electron process lifecycle)
- Maintain 100% offline PDF parsing capability via bundled local worker asset
- No new features or UI redesigns in this cycle
**Scale/Scope**: Clean removal of ~15 obsolete files/directories, optimization of 3 key source modules (`fileParser.ts`, `App.tsx`, `.gitignore`), and export updates for 2 components (`SettingsModal.tsx`, `ReadingStatsModal.tsx`).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Single Source of Truth | ✅ Passed | Python backend unified strictly in `python-backend/`; duplicate root scripts removed. |
| II. Bundle & Performance Hygiene | ✅ Passed | Heavy parsers and modals moved to async chunks; primary bundle drops below 500 kB ceiling. |
| III. Offline-First Preservation | ✅ Passed | `pdfjs-dist` dynamic loader continues to resolve `pdf.worker.min.mjs` locally via Vite asset bundling. |
| IV. Non-Interference with Core Logic | ✅ Passed | Storage, TTS synthesis (`useTTS.ts`), and Error Boundary mechanisms remain strictly untouched. |
| V. Deterministic Build Environment | ✅ Passed | Redundant `bun.lock` eradicated; `package-lock.json` enforced as sole authoritative lockfile. |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-cleanup-bundle-optimization/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Technical research and rationale
├── data-model.md        # Chunk descriptors, lazy state & package governance
├── quickstart.md        # End-to-end verification workflows
├── contracts/           # Interface contracts
│   ├── bundle-contracts.ts
│   └── hygiene-contracts.ts
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Layout

```text
reader/
├── python-backend/
│   ├── server.py              # [CANONICAL] Sole Python backend server
│   └── requirements.txt       # [CANONICAL] Sole Python dependency manifest
├── src/
│   ├── components/
│   │   ├── SettingsModal.tsx      # [MODIFY] Add default export for React.lazy
│   │   ├── ReadingStatsModal.tsx  # [MODIFY] Add default export for React.lazy
│   │   ├── UploadModal.tsx        # Uses fileParser functions (unchanged)
│   │   └── ReaderContent.tsx      # Unchanged
│   ├── utils/
│   │   └── fileParser.ts          # [MODIFY] Dynamic imports for pdfjs-dist & jszip, local worker config
│   └── App.tsx                    # [MODIFY] React.lazy + Suspense for SettingsModal & ReadingStatsModal
├── electron/
│   └── main.ts                    # Verified: points to python-backend/server.py (unchanged)
├── package.json                   # Verified: extraResources maps python-backend (unchanged)
├── .gitignore                     # [MODIFY] Add bun.lock, bun.lockb rules
├── server.py                      # [DELETE] Redundant root duplicate
├── requirements.txt               # [DELETE] Redundant root duplicate
├── bun.lock                       # [DELETE] Redundant lockfile
├── tts-extension/                 # [DELETE] Obsolete Chrome extension
├── tts-extension.zip             # [DELETE] Obsolete untracked zip
├── local-voice-server/            # [DELETE] Obsolete dead viXTTS server
└── local-voice-server.zip         # [DELETE] Obsolete untracked zip
```

---

## Phases & Deliverables

### Phase 1: Repository Hygiene & Dead Code Eradication
1. Remove duplicate backend files from git and filesystem:
   - `git rm server.py requirements.txt`
2. Remove obsolete directories and files:
   - `git rm -r tts-extension`
   - `git rm -r local-voice-server`
   - Remove untracked root zip archives: `tts-extension.zip`, `local-voice-server.zip`
3. Verify `python-backend/server.py` and `python-backend/requirements.txt` remain intact and properly referenced in `electron/main.ts` and `package.json`.

### Phase 2: Package Manager Unification
1. Remove `bun.lock` from git:
   - `git rm bun.lock`
2. Update `.gitignore`:
   - Append `# Package Manager Lockfile Hygiene` section with `bun.lock` and `bun.lockb`.
3. Verify that only `package-lock.json` is tracked by git.

### Phase 3: Parser Code-Splitting (`src/utils/fileParser.ts`)
1. Refactor `src/utils/fileParser.ts`:
   - Remove static imports: `import * as pdfjsLib from 'pdfjs-dist';` and `import JSZip from 'jszip';`.
   - Implement `getPdfJs()` helper function that lazily imports `pdfjs-dist` and configures `pdfjs.GlobalWorkerOptions.workerSrc` with the local worker URL (`new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`).
   - Implement `getJsZip()` helper function that lazily imports `jszip`.
   - In `parsePdfFile`: resolve `getPdfJs()` concurrently with `file.arrayBuffer()`.
   - In `parseEpubFile`: resolve `getJsZip()` concurrently with `file.arrayBuffer()`.
   - Preserve all existing cancellation logic (`signal?.aborted`) and size limit guards (`MAX_FILE_SIZE_MB = 100`).

### Phase 4: Modal Lazy-Loading (`src/App.tsx`)
1. Update `src/components/SettingsModal.tsx`:
   - Add `export default SettingsModal;` to complement named export.
2. Update `src/components/ReadingStatsModal.tsx`:
   - Add `export default ReadingStatsModal;` to complement named export.
3. Update `src/App.tsx`:
   - Replace static imports with:
     ```typescript
     const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
     const ReadingStatsModal = React.lazy(() => import('./components/ReadingStatsModal'));
     ```
   - Enclose `<SettingsModal>` rendering inside `{isSettingsOpen && <React.Suspense fallback={null}>...</React.Suspense>}`.
   - Enclose `<ReadingStatsModal>` rendering inside `{isStatsOpen && <React.Suspense fallback={null}>...</React.Suspense>}`.

### Phase 5: Verification & Bundle Analysis
1. Run `npm run lint` (`tsc --noEmit`):
   - Confirm 0 errors across entire TypeScript codebase.
2. Run `npm run build`:
   - Inspect build chunk distribution.
   - Confirm primary entry bundle (`index-*.js`) is $< 500\text{ kB}$.
   - Confirm absence of Vite 500 kB chunk warning.
   - Confirm emission of distinct async chunks for `pdfjs-dist`, `jszip`, `SettingsModal`, and `ReadingStatsModal`.
3. Check `git status --porcelain`:
   - Confirm clean working tree without untracked debris.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**
