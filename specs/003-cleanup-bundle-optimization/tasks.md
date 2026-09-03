# Tasks: Codebase Hygiene, Redundancy Elimination & Client Bundle Optimization

**Feature**: `003-cleanup-bundle-optimization`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Baseline Verification

**Purpose**: Verify working tree baseline and record initial bundle metrics before making code changes.

- [X] T001 Record baseline build metrics (1,463.80 kB minified / 439.36 kB gzip) and verify working tree status before changes in `specs/003-cleanup-bundle-optimization/plan.md`.

---

## Phase 2: User Story 1 — Rapid Application Startup via On-Demand Module Splitting (Priority: P1) 🎯 MVP

**Goal**: Split heavy document parsers (`pdfjs-dist`, `jszip`) and auxiliary dialogs (`SettingsModal`, `ReadingStatsModal`) out of the initial JavaScript bundle into asynchronous on-demand chunks, reducing primary bundle size below 500 kB.

**Independent Test**: Run `npm run build` and inspect `dist/assets/`: verify `index-*.js` drops below 500 kB minified, Vite produces no oversized chunk warning, and distinct chunks are emitted for `pdfjs-dist`, `jszip`, `SettingsModal`, and `ReadingStatsModal`.

### Implementation for User Story 1

- [X] T002 [P] [US1] Add default export for `SettingsModal` in `src/components/SettingsModal.tsx` to support `React.lazy` loading while preserving the existing named export.
- [X] T003 [P] [US1] Add default export for `ReadingStatsModal` in `src/components/ReadingStatsModal.tsx` to support `React.lazy` loading while preserving the existing named export.
- [X] T004 [US1] Refactor `src/utils/fileParser.ts` to dynamically import `pdfjs-dist` inside `parsePdfFile` with local offline worker configuration (`new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`), and dynamically import `jszip` inside `parseEpubFile`, preserving 100MB file limit guards and cancellation signal handling.
- [X] T005 [US1] Refactor `src/App.tsx` to lazy-load `SettingsModal` and `ReadingStatsModal` via `React.lazy` and enclose their conditional rendering (`isSettingsOpen && ...`, `isStatsOpen && ...`) within `<React.Suspense fallback={null}>` boundaries.

**Checkpoint**: Core bundle size reduced below 500 kB. Parsers and modals load asynchronously on demand.

---

## Phase 3: User Story 2 — Elimination of Redundant Files & Obsolete Codebases (Priority: P1)

**Goal**: Eradicate duplicate root Python backend files, obsolete Chrome extension code, and dead experimental servers to establish a clean, single source of truth in `python-backend/`.

**Independent Test**: Verify that root `/server.py`, `/requirements.txt`, `tts-extension/`, and `local-voice-server/` are absent from git tracking and filesystem, while `python-backend/server.py` and `python-backend/requirements.txt` remain intact and accurately referenced by Electron.

### Implementation for User Story 2

- [X] T006 [P] [US2] Remove duplicate root backend files `server.py` and `requirements.txt` via git removal (`git rm server.py requirements.txt`), preserving canonical files in `python-backend/server.py` and `python-backend/requirements.txt`.
- [X] T007 [P] [US2] Remove obsolete Chrome extension directory `tts-extension/` via git removal (`git rm -r tts-extension`) and delete untracked archive `tts-extension.zip`.
- [X] T008 [P] [US2] Remove obsolete dead viXTTS server directory `local-voice-server/` via git removal (`git rm -r local-voice-server`) and delete untracked archive `local-voice-server.zip`.
- [X] T009 [US2] Verify backend execution paths in `electron/main.ts` and packaging resource mappings in `package.json` resolve strictly to canonical files in `python-backend/`.

**Checkpoint**: Root directory is clean of duplicates and dead projects. Only canonical backend files remain.

---

## Phase 4: User Story 3 — Unified Package Management & Deterministic Dependency Resolution (Priority: P2)

**Goal**: Standardize exclusively on `npm` by removing `bun.lock` from git tracking and updating `.gitignore` to prevent multi-tool lockfile divergence.

**Independent Test**: Check `git ls-files "*lock*"`, confirming only `package-lock.json` is tracked, and verify that `bun.lock` and `bun.lockb` are ignored in `.gitignore`.

### Implementation for User Story 3

- [X] T010 [US3] Remove `bun.lock` from git version tracking via git removal (`git rm bun.lock`).
- [X] T011 [US3] Update `.gitignore` to add a `# Package Manager Lockfile Hygiene` section ignoring `bun.lock` and `bun.lockb`.

**Checkpoint**: Project tracks exactly one package manager lockfile (`package-lock.json`).

---

## Phase 5: Polish & Cross-Cutting Verification

**Purpose**: Validate TypeScript type safety, production build performance, and end-to-end functionality across all modified modules.

- [X] T012 Run TypeScript type checking via `npm run lint` (`tsc --noEmit`) to verify 0 compilation errors across all source files.
- [X] T013 Run production build via `npm run build` to confirm primary entry chunk `index-*.js` is $< 500\text{ kB}$ minified and Vite emits 0 oversized chunk warnings.
- [X] T014 Execute quickstart validation scenarios defined in `specs/003-cleanup-bundle-optimization/quickstart.md` (verifying dynamic modal loading and offline PDF parsing).
- [X] T015 Verify clean git working tree state using `git status --porcelain`.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup (T001)
       │
       ▼
Phase 2: User Story 1 - Bundle Splitting (T002 - T005) 🎯 MVP
       │
       ▼
Phase 3: User Story 2 - Redundancy Cleanup (T006 - T009)
       │
       ▼
Phase 4: User Story 3 - Package Manager Unification (T010 - T011)
       │
       ▼
Phase 5: Polish & Verification (T012 - T015)
```

### User Story Dependencies

- **User Story 1 (P1)**: Operates strictly within `src/` (`fileParser.ts`, `App.tsx`, `SettingsModal.tsx`, `ReadingStatsModal.tsx`). Can start immediately after Setup.
- **User Story 2 (P1)**: Operates on root Python scripts and obsolete directories (`server.py`, `tts-extension/`, `local-voice-server/`). Completely independent of User Story 1 code.
- **User Story 3 (P2)**: Operates on `bun.lock` and `.gitignore`. Completely independent of User Stories 1 & 2.
- **Polish (Phase 5)**: Requires completion of User Stories 1, 2, and 3.

### Parallel Opportunities

- Within Phase 2 (US1): `T002` (SettingsModal export) and `T003` (ReadingStatsModal export) can run concurrently.
- Within Phase 3 (US2): `T006` (root server removal), `T007` (tts-extension removal), and `T008` (local-voice-server removal) can run concurrently.
- User Story 2 and User Story 3 can execute in parallel with User Story 1 as they touch disjoint sets of files.

---

## Parallel Example: User Story 1

```bash
# Parallel modal export additions:
Task: "Add default export in src/components/SettingsModal.tsx"
Task: "Add default export in src/components/ReadingStatsModal.tsx"
```

## Parallel Example: User Story 2

```bash
# Parallel file removal operations:
Task: "git rm server.py requirements.txt"
Task: "git rm -r tts-extension"
Task: "git rm -r local-voice-server"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Core)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: User Story 1 (Code-splitting) $\rightarrow$ Validate bundle drops $< 500\text{ kB}$ (Immediate performance win)
3. Complete Phase 3: User Story 2 (Dead code removal) $\rightarrow$ Clean repository root
4. Complete Phase 4: User Story 3 (Package manager lockfile) $\rightarrow$ Prevent future drift
5. Complete Phase 5: Polish & Verification $\rightarrow$ Confirm zero regressions, zero lint errors, and clean git status

---

## Notes

- Every task strictly satisfies the checklist schema: `- [ ] [TaskID] [P?] [Story?] Description with file path`.
- No modifications will be made to verified logic in `useTTS.ts`, `storage.ts`, `indexedDB.ts`, or `ErrorBoundary.tsx`.
- Offline PDF reading capability is strictly preserved by pointing the dynamic loader to the local worker asset.
