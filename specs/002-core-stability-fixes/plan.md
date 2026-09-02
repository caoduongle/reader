# Implementation Plan: Core Stability, Data Integrity & Offline Resilience

**Branch**: `002-core-stability-fixes` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

---

## Summary

Eliminate high-risk data loss and crash vulnerabilities across VoxRead by:
1. Decoupling reading progress persistence (`localStorage` coordinates only, ~250 bytes) from full document payload persistence (IndexedDB, saving only on document import/switch), backed by diagnostic error logging and user quota alerts.
2. Hardening file uploads with a 100MB size ceiling and cooperative cancellation (`AbortController`) across PDF/EPUB parsers.
3. Introducing a two-tier React `ErrorBoundary` (root app level and reader content level) with recovery actions ("Tải lại", "Quay về tài liệu mẫu").
4. Eradicating fake seed statistics in `useReadingStats` and providing honest zero-state presentation in `ReadingStatsModal`.
5. Bundling the PDF.js worker locally to guarantee offline operation.
6. Replacing brittle `setTimeout(100)` search jumps with reactive lifecycle state.
7. Enhancing sentence splitting to preserve Vietnamese titles, administrative abbreviations, and dialogue quotations.
8. Stabilizing React keys in `SearchDrawer`.

---

## Technical Context

**Language/Version**: TypeScript 5.8 (Strict mode), React 19, Node.js $\ge 18$  
**Primary Dependencies**:
- Frontend: React 19, Lucide React, Tailwind CSS v4, Recharts 3.10
- Document Parsing: `pdfjs-dist` (v6), `jszip` (v3.10)
- Desktop Platform: Electron 44, `esbuild`
**Storage**:
- High-frequency: `localStorage` (`voxread_reading_position_v1`, ~250 bytes)
- High-capacity: IndexedDB (`voxread_db` $\rightarrow$ `documents` store)
- Statistics: `localStorage` (`voxread_daily_reading_stats_v1`, `voxread_recent_sessions_v1`)
**Testing**: Manual smoke scenarios (`quickstart.md`), TypeScript compilation (`tsc --noEmit`), Vite build verification  
**Target Platform**: Windows 10/11 Desktop (Electron) & Modern Evergreen Browsers (Chrome, Edge, Firefox)  
**Project Type**: React Single Page Application + Electron Desktop Wrapper  
**Performance Goals**:
- Sentence transition storage write latency $< 1\text{ ms}$ (payload $< 300\text{ bytes}$)
- File validation check $< 10\text{ ms}$ upon selection
- Cooperative parsing cancellation response $< 1\text{ second}$
- Cross-chapter search jump response instantaneous upon chapter load
**Constraints**:
- Zero modifications to TTS architecture (`useTTS.ts` audio synthesis engine)
- No removal or alteration of `@google/genai` dependency
- Offline-first: local PDF parsing must not require an internet connection
**Scale/Scope**: Single local reader user session, multi-chapter documents up to 100MB, 100% truthful statistics

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Data Loss Prevention | ✅ Passed | Reading position decoupled from heavy document; IndexedDB handles large text payloads safely. |
| II. Crash Resilience & Error Containment | ✅ Passed | Two-tier ErrorBoundary prevents white-screen crashes and isolates content rendering. |
| III. Offline-First Compatibility | ✅ Passed | PDF worker resolved locally, eliminating dependency on CDN. |
| IV. Honest Analytics & UX Integrity | ✅ Passed | Fake seed data removed; empty state guides first-time users honestly. |
| V. Non-Interference with TTS Engine | ✅ Passed | TTS engine (`useTTS.ts` synthesis architecture) untouched; only reading position callback payload is decoupled. |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-core-stability-fixes/
├── plan.md              # Implementation Plan
├── research.md          # Technical research and rationale
├── data-model.md        # Schemas and storage lifecycles
├── quickstart.md        # End-to-end verification workflows
├── contracts/           # Interface contracts
│   ├── storage-contracts.ts
│   ├── parser-contracts.ts
│   └── error-boundary-contracts.ts
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Layout

```text
reader/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx      # [NEW] Two-tier React error boundary with reload & reset
│   │   ├── UploadModal.tsx        # [MODIFY] File size guard, abort controller, cancel button
│   │   ├── ReadingStatsModal.tsx  # [MODIFY] Zero-state empty view, truthful telemetry
│   │   ├── SearchDrawer.tsx       # [MODIFY] Stable composite keys for search results
│   │   └── ReaderContent.tsx      # Target for content-level error boundary
│   ├── hooks/
│   │   └── useReadingStats.ts     # [MODIFY] Remove fake seed data, initialize clean empty state
│   ├── utils/
│   │   ├── indexedDB.ts           # [NEW] Lightweight native IndexedDB document store
│   │   ├── fileParser.ts          # [MODIFY] Size constants, local worker URL, cancelable parsing
│   │   ├── textParser.ts          # [MODIFY] Vietnamese abbreviations, titles, quotation handling
│   │   └── storage.ts             # [NEW / HELPER] Decoupled position storage with quota alerts
│   ├── App.tsx                    # [MODIFY] Decoupled position save, reactive search jump, ErrorBoundary
│   └── main.tsx                   # [MODIFY] Wrap root <App /> in top-level ErrorBoundary
```

---

## Phases & Deliverables

### Phase 1: Storage Decoupling & IndexedDB Integration
1. Implement `src/utils/indexedDB.ts`:
   - Database `voxread_db`, store `documents`, keyPath `id`.
   - Promise-based methods: `saveDocument`, `getDocument`, `getActiveDocument`, `setActiveDocumentId`, `clearAllDocuments`.
2. Implement `src/utils/storage.ts`:
   - Helper functions: `saveReadingPosition(coords, onQuotaError)`, `getReadingPosition()`, `clearReadingPosition()`.
   - Graceful error catching with `console.warn` and quota exceeded toast trigger.
3. Update `src/App.tsx`:
   - In `onSentenceChange`: write only `StoredReadingPosition` via `saveReadingPosition`.
   - In `handleDocumentLoaded`: save full document to IndexedDB, save position coordinates to `localStorage`.
   - On initial mount: restore `StoredReadingPosition`, fetch document from IndexedDB (with fallback to legacy `localStorage` or `SAMPLE_DOCUMENTS[0]`), and apply chapter/sentence index.

### Phase 2: File Upload Guard & Cancelable Parsing
1. Update `src/utils/fileParser.ts`:
   - Add `MAX_FILE_SIZE_MB = 100` and `MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024`.
   - Configure local PDF.js worker URL (removing `cdnjs.cloudflare.com`).
   - Add `signal?: AbortSignal` parameter to `parsePdfFile` and `parseEpubFile`.
   - Inject cooperative abort checks (`signal?.aborted`) in PDF page loop and EPUB chapter loop.
2. Update `src/components/UploadModal.tsx`:
   - Check `file.size <= MAX_FILE_SIZE_BYTES` on file select and drop. Reject with clear error immediately if exceeded.
   - Maintain `abortControllerRef = useRef<AbortController | null>(null)`.
   - Add a "Huỷ" (Cancel) button during loading. On click, call `abortControllerRef.current?.abort()` and reset state.

### Phase 3: Error Boundary Implementation
1. Create `src/components/ErrorBoundary.tsx`:
   - React class component with `getDerivedStateFromError` and `componentDidCatch`.
   - Support `isContentOnly` prop for compact scoped inline error card.
   - Actions: "Tải lại trang" (`window.location.reload()`) and "Quay về tài liệu mẫu" (clears corrupted storage and resets to sample).
2. Wrap components:
   - In `src/main.tsx`: wrap `<App />` with `<ErrorBoundary>`.
   - In `src/App.tsx`: wrap `<ReaderContent />` with `<ErrorBoundary isContentOnly onResetToSample={...}>`.

### Phase 4: Honest Reading Statistics
1. Update `src/hooks/useReadingStats.ts`:
   - Remove `generateSeedStats()` function and hardcoded sample sessions array.
   - Default `dailyDataMap` state to `{}` and `recentSessions` to `[]` when no stored data exists.
2. Update `src/components/ReadingStatsModal.tsx`:
   - Detect empty state (`hasData = totalReadingTimeMinutes > 0 || totalWordsRead > 0 || recentSessions.length > 0`).
   - If `!hasData`: display an encouraging empty state banner instead of empty or misleading chart elements.

### Phase 5: Search Navigation, Vietnamese Sentence Splitting & React Keys
1. Update `src/App.tsx`:
   - Replace `setTimeout(100)` in `handleJumpToSearchMatch` with `pendingJumpSentence` state and `useEffect` targeting `currentChapterIndex` and `currentSentences`.
2. Update `src/utils/textParser.ts`:
   - Expand abbreviation protection regex for Vietnamese administrative titles ("TP.", "Q.", "P.", "TX.", "TT.", "H."), academic titles ("GS.", "TS.", "ThS.", "BS.", "DS."), Roman numerals, and dialogue quotation marks (`« »`, `“ ”`).
3. Update `src/components/SearchDrawer.tsx`:
   - Replace `key={idx}` with `key={`${m.chapterIndex}-${m.sentenceIndex}-${idx}`}`.

### Phase 6: Verification & Compilation
1. Run `npm run lint` (`tsc --noEmit`) to verify 100% type safety.
2. Run `npm run build` to verify local bundling without external CDN references.
3. Verify test cases in `quickstart.md`.
