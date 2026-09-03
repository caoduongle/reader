# Feature Specification: Codebase Hygiene, Redundancy Elimination & Client Bundle Optimization

**Feature Branch**: `003-cleanup-bundle-optimization`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "## ƯU TIÊN CAO — dọn file trùng lặp/rác, tránh sửa nhầm bản không dùng: 1. Xoá 2 bản server.py / requirements.txt trùng lặp ở gốc repo (electron/main.ts trỏ tới python-backend/server.py); 2. Xoá tts-extension/ (Chrome extension cũ); 3. local-voice-server/ (viXTTS + FastAPI — code chết, mặc định xoá); ## ƯU TIÊN TRUNG BÌNH — tối ưu bundle size: 4. Code-splitting để giảm bundle chính (fileParser dynamic import pdfjs-dist/jszip, SettingsModal/ReadingStatsModal React.lazy + Suspense); 5. Gộp về 1 package manager duy nhất (npm/bun lockfile, mặc định npm)."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rapid Application Startup via On-Demand Module Splitting (Priority: P1)

As a reader launching VoxRead on desktop or web, I want the core application to load rapidly with a minimal initial JavaScript download, so that the reading interface becomes interactive immediately without delaying startup to fetch heavy document parsing libraries or dormant settings dialogs until I actually need them.

**Why this priority**: In the baseline build, heavy parsing dependencies (`pdfjs-dist` and `jszip`) along with large modal components (`SettingsModal`, `ReadingStatsModal`) are compiled into a monolithic main entry bundle (~1.46MB minified). Splitting these off-path dependencies ensures faster cold-start times, lower baseline memory consumption, and a snappier interface for everyday reading sessions.

**Independent Test**: Can be independently verified by building the production bundle (`npm run build`) and observing the emitted chunk distribution: the primary entry bundle (`index-*.js`) shrinks substantially (from ~1.46MB to well under 500KB minified), while distinct asynchronous chunks are generated for PDF processing, ZIP/EPUB handling, and modal dialogs. Cold-start network requests only load the primary chunk; triggering file upload or opening modals asynchronously fetches their respective dedicated chunks.

**Acceptance Scenarios**:

1. **Given** a user opens VoxRead to continue reading a previously opened book or sample document, **When** the application starts up, **Then** the browser or Electron window downloads only the lightweight core reading bundle, without executing or evaluating `pdfjs-dist` or `jszip` in the main chunk.
2. **Given** the application is active and the user reads chapters or uses playback controls, **When** neither Settings nor Reading Statistics modals are invoked, **Then** modal component scripts remain unloaded and consume zero memory on the client.
3. **Given** a user clicks the "Cài đặt" (Settings) or "Thống kê" (Reading Stats) button, **When** the modal action is triggered, **Then** the respective modal bundle is dynamically imported via React lazy loading, rendered smoothly with a fallback state during transit, and becomes fully interactive.
4. **Given** a user selects or drops a PDF document for import, **When** PDF parsing is initiated via `parsePdfFile`, **Then** the dedicated `pdfjs-dist` chunk (and its local worker asset) is loaded on demand, successfully extracting document chapters without blocking initial application boot.
5. **Given** a user selects an EPUB file for import, **When** EPUB processing is initiated via `parseEpubFile`, **Then** the dedicated `jszip` chunk is loaded on demand to decompress and parse chapters seamlessly.

---

### User Story 2 - Elimination of Redundant Files & Obsolete Codebases (Priority: P1)

As a software engineer maintaining and extending VoxRead, I want a clean, single-source-of-truth repository structure free of phantom root server files, abandoned browser extensions, and dead alternative engines, so that I never accidentally inspect, edit, or package obsolete code.

**Why this priority**: Having duplicate backend files (`/server.py` and `/requirements.txt` at the root alongside `python-backend/`) creates extreme confusion and high risk of modifying the wrong file. Abandoned directories (`tts-extension/` and `local-voice-server/`) create noise, clutter search results, and mislead contributors regarding current system architecture.

**Independent Test**: Can be tested independently by checking the repository working tree and git tracking: root `server.py` and `requirements.txt` are absent, `tts-extension/` and `local-voice-server/` directories are absent, while `python-backend/server.py` and `python-backend/requirements.txt` remain intact and accurately referenced by Electron runtime launcher and packaging configurations.

**Acceptance Scenarios**:

1. **Given** the repository root directory, **When** inspecting Python backend scripts, **Then** only `python-backend/server.py` and `python-backend/requirements.txt` exist, and root duplicate copies are completely removed from git and filesystem.
2. **Given** the Electron startup script (`electron/main.ts`) and packaging build config (`package.json`), **When** packaging or launching the desktop application, **Then** the backend runner resolves explicitly to `python-backend/server.py` and `python-backend/requirements.txt`.
3. **Given** the repository file tree, **When** inspecting auxiliary directories, **Then** the obsolete Chrome extension (`tts-extension/`) and the unused experimental server (`local-voice-server/`) are completely removed.
4. **Given** all previous feature stabilization implementations (reading position storage separation, Error Boundary hierarchy, upload file size guards, RVC TTS hook logic, Electron subprocess lifecycle), **When** cleanup is executed, **Then** zero functional regressions occur in core features.

---

### User Story 3 - Unified Package Management & Deterministic Dependency Resolution (Priority: P2)

As a developer or automated build pipeline installing VoxRead dependencies across different workstations, I want a single authoritative package manager and lockfile (`npm` and `package-lock.json`), so that dependency resolution is 100% deterministic, reproducible, and free from multi-tool lockfile drift.

**Why this priority**: The simultaneous existence of both `bun.lock` and `package-lock.json` leads to discrepancies when different contributors use different package managers, causing non-deterministic builds and version mismatches. Standardizing on `npm` matches all existing `package.json` scripts and project documentation.

**Independent Test**: Can be tested independently by verifying that `package-lock.json` is preserved as the only committed lockfile, `bun.lock` is removed from git tracking, and `.gitignore` ignores future Bun lockfiles. Running clean installations (`npm ci` or `npm install`) succeeds without conflicts.

**Acceptance Scenarios**:

1. **Given** the project root, **When** inspecting package manager lockfiles in version control, **Then** only `package-lock.json` is tracked, while `bun.lock` is removed from git.
2. **Given** the project `.gitignore`, **When** inspecting dependency rules, **Then** patterns ignoring Bun lockfiles (`bun.lock`, `bun.lockb`) are present to prevent accidental re-introduction.
3. **Given** all build scripts in `package.json` (`npm run dev`, `npm run build`, `npm run electron:dev`, `npm run electron:build`, `npm run lint`), **When** executed using standard `npm`, **Then** all scripts run cleanly without errors.

---

### Edge Cases

- **Dynamic Chunk Loading Network/I/O Failure**: If dynamic importing of `SettingsModal`, `ReadingStatsModal`, or parser modules fails due to intermittent file read error or browser cache eviction, the error is trapped by the application `ErrorBoundary`, displaying a localized retry prompt without crashing the active reading session.
- **Rapid Successive Modal Toggling**: If a user opens and closes the Settings or Stats modal multiple times before the lazy chunk finishes loading, React's Suspense reconciliation unmounts gracefully without console warnings or memory leaks.
- **Mid-Import Abort with Lazy Parser**: If a user cancels file import while `import('pdfjs-dist')` or `import('jszip')` is resolving, the cooperative abort signal (`AbortSignal`) cleanly aborts the parsing sequence once the chunk arrives, leaving the current reading document undisturbed.
- **Offline PDF Parsing Integrity**: When `pdfjs-dist` is dynamically loaded, the local worker configuration (`pdfjsLib.GlobalWorkerOptions.workerSrc`) must continue to point to the locally bundled asset (`pdf.worker.min.mjs`), ensuring that offline PDF parsing remains 100% functional without remote CDN requests.
- **Git State Cleanliness**: Deleting tracked files must leave a clean git status without broken references or dangling untracked artifacts.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove duplicate root `/server.py` and `/requirements.txt` from repository version tracking and local workspace, maintaining `python-backend/server.py` and `python-backend/requirements.txt` as the single canonical source of truth.
- **FR-002**: System MUST remove obsolete directory `tts-extension/` (legacy Chrome extension) from repository version tracking and local workspace.
- **FR-003**: System MUST remove obsolete directory `local-voice-server/` (dead viXTTS + FastAPI implementation) from repository version tracking and local workspace.
- **FR-004**: System MUST convert the static import of `pdfjs-dist` in `src/utils/fileParser.ts` into a dynamic import (`await import('pdfjs-dist')`) executed within `parsePdfFile`, ensuring the PDF parsing engine is isolated into an asynchronous chunk.
- **FR-005**: System MUST configure the local PDF worker URL dynamically within or alongside the dynamic `pdfjs-dist` import, preserving fully offline PDF parsing capability without CDN dependencies.
- **FR-006**: System MUST convert the static import of `jszip` in `src/utils/fileParser.ts` into a dynamic import (`await import('jszip')`) executed within `parseEpubFile`, ensuring EPUB parsing dependencies are isolated into an asynchronous chunk.
- **FR-007**: System MUST convert `SettingsModal` in `src/App.tsx` into a lazy-loaded component via `React.lazy` and enclose its rendering within a `React.Suspense` boundary with a fallback.
- **FR-008**: System MUST convert `ReadingStatsModal` in `src/App.tsx` into a lazy-loaded component via `React.lazy` and enclose its rendering within a `React.Suspense` boundary with a fallback.
- **FR-009**: System MUST remove `bun.lock` from git tracking and record `bun.lock` and `bun.lockb` in `.gitignore` to establish `npm` as the project's sole package manager.
- **FR-010**: System MUST pass TypeScript type checking (`tsc --noEmit` / `npm run lint`) with 0 errors after code splitting and refactoring.
- **FR-011**: System MUST preserve all previously stabilized functionality without regression (storage coordinates separation, Error Boundary hierarchy, upload file size limits, RVC TTS hook logic, and Electron process lifecycle).

---

### Non-Functional & Scope Constraints

- **NFR-001 (Bundle Size Reduction)**: Production build (`dist/assets/index-*.js`) MUST reduce the primary JavaScript bundle from the 1.46MB baseline to under 500KB minified, eliminating Vite's bundle chunk warning.
- **NFR-002 (Startup Performance)**: Initial reader view rendering on cold boot MUST occur without loading or parsing unused document parser or modal code.
- **NFR-003 (Deterministic Builds)**: All project dependencies MUST resolve consistently and deterministically via `npm`.
- **Out of Scope (Explicitly Excluded)**:
  - Modifying or refactoring verified application core features (storage separation, Error Boundary hierarchy, file upload limits, RVC TTS hook logic in `useTTS.ts`, and Electron process management).
  - Adding new user-facing features or modifying UI layouts.
  - Altering the RVC Python backend server architecture in `python-backend/server.py`.

---

### Key Entities

- **CodeChunk**: An isolated asynchronous JavaScript bundle emitted by the build bundler.
  - Attributes: `chunkId` (string), `chunkType` ('core-entry' | 'pdf-parser' | 'epub-parser' | 'settings-modal' | 'stats-modal'), `sizeBytes` (number), `gzipSizeBytes` (number), `loadTiming` ('startup' | 'on-demand').
- **PackageManagerLock**: The authoritative dependency version snapshot for the project.
  - Attributes: `managerName` ('npm'), `lockfilePath` ('package-lock.json'), `isCanonical` (boolean).
- **LazyModalModule**: A lazily evaluated React UI component loaded upon user request.
  - Attributes: `componentName` (string), `isLoaded` (boolean), `suspenseFallback` (ReactNode).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The primary production JavaScript bundle (`dist/assets/index-*.js`) shrinks from 1.46MB to under 500KB minified, resolving Vite's large chunk warning completely.
- **SC-002**: Production build output generates distinct separate chunks for PDF parsing, EPUB parsing, and modal dialogs, confirming successful asynchronous code-splitting.
- **SC-003**: 100% of duplicate root backend files (`/server.py`, `/requirements.txt`) and obsolete directories (`tts-extension/`, `local-voice-server/`) are removed with zero residual broken references in build scripts or Electron configuration.
- **SC-004**: Repository tracks exactly one package manager lockfile (`package-lock.json`), and `bun.lock` is excluded from version control and ignored in `.gitignore`.
- **SC-005**: TypeScript compilation (`npm run lint` / `tsc --noEmit`) passes with 0 errors.
- **SC-006**: Cold-start initial UI rendering displays the reader interface without loading PDF parsing or modal assets into client memory.
- **SC-007**: Settings Modal and Reading Stats Modal open responsively upon user interaction with smooth lazy-loading transitions.

---

## Assumptions

- `npm` is the authoritative package manager for VoxRead as evidenced by `package.json` scripts and documentation.
- `python-backend/server.py` and `python-backend/requirements.txt` are the actual backend files packaged and executed by Electron.
- Modern evergreen browsers and Electron v44+ natively support ES dynamic imports (`import()`) and `React.lazy`.
- Retaining offline PDF parsing requires dynamically setting `pdfjsLib.GlobalWorkerOptions.workerSrc` using Vite's asset bundling (`new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`) within the deferred module context.
