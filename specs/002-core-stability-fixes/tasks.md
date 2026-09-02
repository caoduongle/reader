# Tasks: Core Stability, Data Integrity & Offline Resilience

**Feature**: `002-core-stability-fixes`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-02

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new utility modules that multiple user stories depend on.

- [X] T001 [P] Create IndexedDB document storage wrapper in `src/utils/indexedDB.ts` — implement promise-based `openDB()`, `saveDocument(doc)`, `getDocument(id)`, `getActiveDocument()`, `setActiveDocumentId(id)`, `deleteDocument(id)`, `clearAllDocuments()` methods targeting database `voxread_db` (version 1) with object store `documents` (keyPath `id`). Include a metadata key `active_document_id` to track the currently active document. Add graceful fallback if IndexedDB is unavailable (return null / log warning).
- [X] T002 [P] Create reading position storage helpers in `src/utils/storage.ts` — implement `saveReadingPosition(position: StoredReadingPosition, onQuotaError?: () => void): boolean`, `getReadingPosition(): StoredReadingPosition | null`, `clearReadingPosition(): void`. Storage key: `voxread_reading_position_v1`. All writes must be wrapped in try/catch with `console.warn('[VoxRead Storage]', error)` on failure. If error name contains `Quota`, invoke `onQuotaError` callback. Define `StoredReadingPosition` interface (`documentId`, `chapterIndex`, `sentenceIndex`, `progressPercentage`, `updatedAt`).
- [X] T003 [P] Create ErrorBoundary component in `src/components/ErrorBoundary.tsx` — implement as a React class component with `getDerivedStateFromError` and `componentDidCatch`. Props: `children`, `fallbackTitle?: string`, `fallbackDescription?: string`, `isContentOnly?: boolean`, `onResetToSample?: () => void`. When `isContentOnly` is true, render a compact inline error card with Tailwind styling matching the app's dark theme. When false, render a full-screen fallback. Both modes provide "Tải lại trang" button (calls `window.location.reload()`) and "Quay về tài liệu mẫu" button (calls `onResetToSample` then clears `voxread_reading_position_v1` and `voxread_active_document_v1` from localStorage, then reloads). Log error details via `console.error` in `componentDidCatch`.

**Checkpoint**: Shared utilities ready — user story implementation can begin.

---

## Phase 2: User Story 1 — Safe & Lightweight Reading Position Persistence (Priority: P1) 🎯 MVP

**Goal**: Decouple reading position persistence from full document payload. Save only lightweight coordinates (~250 bytes) to localStorage on every sentence change. Store full document in IndexedDB only on import/switch. Restore position on app startup. Show toast on quota errors.

**Independent Test**: Load a long EPUB, advance 20+ sentences via TTS, inspect `voxread_reading_position_v1` in DevTools Application → Local Storage (should be ~250 bytes), verify `voxread_active_document_v1` is NOT re-written per sentence. Refresh page, verify reader resumes at exact saved sentence. Simulate quota exhaustion via DevTools to confirm toast appears.

### Implementation for User Story 1

- [X] T004 [US1] Refactor `onSentenceChange` callback in `src/App.tsx` (lines ~126-144) — replace the full `JSON.stringify(currentDocument)` + `localStorage.setItem(RECENT_DOC_STORAGE_KEY, ...)` with a call to `saveReadingPosition()` from `src/utils/storage.ts`, passing only `{ documentId: currentDocument.id, chapterIndex: currentChapterIndex, sentenceIndex: sentenceIdx, progressPercentage: Math.round(((sentenceIdx + 1) / Math.max(1, currentSentences.length)) * 100), updatedAt: Date.now() }`. Pass `() => showToast('Không lưu được tiến trình đọc — bộ nhớ trình duyệt đã đầy')` as `onQuotaError` callback. Remove the old try/catch block that silently swallowed errors.
- [X] T005 [US1] Refactor `handleDocumentLoaded` in `src/App.tsx` (lines ~150-159) — after `setCurrentDocument(newDoc)`, save document to IndexedDB via `saveDocument(newDoc)` and `setActiveDocumentId(newDoc.id)` (both from `src/utils/indexedDB.ts`), and save initial reading position via `saveReadingPosition({ documentId: newDoc.id, chapterIndex: 0, sentenceIndex: 0, progressPercentage: 0, updatedAt: Date.now() })`. Remove the old `localStorage.setItem(RECENT_DOC_STORAGE_KEY, JSON.stringify(newDoc))` call. Keep `stop()` and `setCurrentChapterIndex(0)` as-is.
- [X] T006 [US1] Refactor document restoration on app startup in `src/App.tsx` (lines ~22-37) — replace the `useState<DocumentItem>(() => { ... localStorage.getItem(RECENT_DOC_STORAGE_KEY) ... })` initializer with synchronous initialization to `SAMPLE_DOCUMENTS[0]` as default, then add a `useEffect` that runs once on mount to: (1) read `getReadingPosition()` from `src/utils/storage.ts`, (2) if position exists, call `getDocument(position.documentId)` from IndexedDB, (3) if document found in IndexedDB, set it as `currentDocument` and apply `position.chapterIndex` and `position.sentenceIndex`, (4) if IndexedDB returns null, attempt legacy fallback by reading `voxread_active_document_v1` from localStorage, migrating it to IndexedDB if found, (5) if all sources return null, keep `SAMPLE_DOCUMENTS[0]`. Similarly update `currentChapterIndex` initializer to start at 0, then update in the useEffect based on restored position. Import `saveDocument`, `getDocument`, `setActiveDocumentId` from `src/utils/indexedDB.ts` and `getReadingPosition` from `src/utils/storage.ts`.

**Checkpoint**: Reading position persistence is decoupled. Large documents no longer exhaust localStorage. Position restores accurately after reload.

---

## Phase 3: User Story 2 — File Upload Protection & Cancelable Parsing (Priority: P1)

**Goal**: Block files larger than 100MB immediately. Make PDF and EPUB parsing cancelable via AbortController. Add a visible Cancel button during import.

**Independent Test**: Try uploading a file >100MB — verify immediate error message without freezing. Upload a large PDF (~30MB), click Cancel during progress — verify parsing stops cleanly within 1 second.

### Implementation for User Story 2

- [X] T007 [US2] Add file size constants and local PDF worker configuration in `src/utils/fileParser.ts` — add `export const MAX_FILE_SIZE_MB = 100;` and `export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;`. Replace the CDN worker URL (line ~9, `https://cdnjs.cloudflare.com/...`) with a local Vite-compatible import: add `import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';` at the top of the file, then set `pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;`. Remove the try/catch block wrapping the old CDN assignment (lines ~7-12).
- [X] T008 [US2] Add cooperative abort support to `parsePdfFile` in `src/utils/fileParser.ts` — change signature to `parsePdfFile(file: File, onProgress?: (percent: number) => void, signal?: AbortSignal)`. Inside the page extraction loop (`for (let i = 1; i <= numPages; i++)`), add at the top of each iteration: `if (signal?.aborted) { throw new DOMException('Parsing cancelled', 'AbortError'); }`. Keep existing progress callback and text extraction logic unchanged.
- [X] T009 [US2] Add cooperative abort support to `parseEpubFile` in `src/utils/fileParser.ts` — change signature to `parseEpubFile(file: File, onProgress?: (percent: number) => void, signal?: AbortSignal)`. Inside the chapter content extraction loop (where spine items are iterated), add at the start of each iteration: `if (signal?.aborted) { throw new DOMException('Parsing cancelled', 'AbortError'); }`.
- [X] T010 [US2] Add file size validation and cancel button to `src/components/UploadModal.tsx` — import `MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES` from `../utils/fileParser`. In `handleProcessFile(file)`, add a size check before any parsing: `if (file.size > MAX_FILE_SIZE_BYTES) { setErrorMessage(\`Tệp vượt quá dung lượng tối đa cho phép (${MAX_FILE_SIZE_MB}MB)\`); setIsLoading(false); return; }`. Add `const abortControllerRef = useRef<AbortController | null>(null);`. At the start of `handleProcessFile`, create a new controller: `abortControllerRef.current = new AbortController(); const signal = abortControllerRef.current.signal;`. Pass `signal` as third argument to `parsePdfFile` and `parseEpubFile` calls. In the catch block, check for `AbortError` and set a neutral message ("Đã huỷ xử lý tệp") instead of a generic error. Add a "Huỷ xử lý" button (visible when `isLoading === true`) that calls `abortControllerRef.current?.abort()`, `setIsLoading(false)`, `setProgress(0)`. Also apply the same `file.size` check in the drag-and-drop handler (`onDrop`).

**Checkpoint**: Oversized files are rejected instantly. Users can cancel ongoing imports. PDF parsing works offline.

---

## Phase 4: User Story 3 — Component Crash Containment via Error Boundaries (Priority: P1)

**Goal**: Wrap the app in two-tier error boundaries to prevent white-screen crashes. Reader content errors show a scoped recovery card; root-level errors show a full fallback.

**Independent Test**: Temporarily inject `throw new Error('test')` inside `ReaderContent` render — verify inline error card appears while navbar and upload button remain functional. Click "Quay về tài liệu mẫu" — verify recovery works.

### Implementation for User Story 3

- [X] T011 [US3] Wrap `<App />` with root ErrorBoundary in `src/main.tsx` — import `ErrorBoundary` from `./components/ErrorBoundary`. Wrap the `<App />` JSX (inside `createRoot(...).render(...)`) with `<ErrorBoundary fallbackTitle="Đã xảy ra lỗi không mong muốn" fallbackDescription="Ứng dụng gặp sự cố. Vui lòng thử tải lại trang.">`. This provides a last-resort catch-all for global crashes.
- [X] T012 [US3] Wrap `<ReaderContent />` with content-scoped ErrorBoundary in `src/App.tsx` — import `ErrorBoundary` from `./components/ErrorBoundary`. Find the `<ReaderContent ... />` JSX element in the render output. Wrap it with `<ErrorBoundary isContentOnly fallbackTitle="Lỗi hiển thị nội dung" fallbackDescription="Nội dung tài liệu gặp sự cố khi hiển thị." onResetToSample={() => { clearReadingPosition(); setCurrentDocument(SAMPLE_DOCUMENTS[0]); setCurrentChapterIndex(0); }}>`. Import `clearReadingPosition` from `./utils/storage`. This ensures rendering errors in the reading area don't crash the navbar, controls, or upload modal.

**Checkpoint**: Application never shows a blank white screen on render errors. Users can always recover or switch documents.

---

## Phase 5: User Story 4 — Truthful Zero-State Reading Statistics (Priority: P1)

**Goal**: Remove all fake seed data from reading statistics. First-time users see honest zeros and an inviting empty state message.

**Independent Test**: Clear localStorage keys `voxread_daily_reading_stats_v1` and `voxread_recent_sessions_v1`, refresh page, open Reading Statistics modal — verify 0 mins, 0 words, 0 WPM, no fake sessions, and a friendly banner.

### Implementation for User Story 4

- [X] T013 [P] [US4] Remove fake seed data from `src/hooks/useReadingStats.ts` — delete the entire `generateSeedStats()` function (lines ~36-53). Change the `dailyDataMap` useState initializer fallback from `return generateSeedStats();` to `return {};`. Delete the hardcoded seed sessions array (lines ~88-107, the array with `'seed-1'` and `'seed-2'` entries referencing "A Study in Scarlet" and "The Picture of Dorian Gray"). Change the `recentSessions` useState initializer fallback from `return [ { id: 'seed-1', ... }, { id: 'seed-2', ... } ];` to `return [];`. Keep all localStorage read/parse logic in the initializers — only replace the fallback default values.
- [X] T014 [P] [US4] Add empty state view to `src/components/ReadingStatsModal.tsx` — add a check near the top of the render body (after the `if (!isOpen) return null;` guard): `const hasReadingData = stats.totalReadingTimeMinutes > 0 || stats.totalWordsRead > 0 || (stats.recentSessions && stats.recentSessions.length > 0);`. If `!hasReadingData`, render after the modal header and before the chart section: a centered card with a `BookOpen` icon, the text "Chưa có dữ liệu đọc sách", a subtitle "Bắt đầu đọc hoặc nghe sách để xem thống kê tại đây", styled with the app's dark theme (`bg-[#16161A]`, `border border-white/10`, `rounded-2xl`, `p-8`, `text-center`). The core metric cards and chart area should still render (showing 0 values), but the empty state banner provides clear guidance to the user.

**Checkpoint**: First-time users see truthful zeros. No fabricated "A Study in Scarlet" phantom sessions.

---

## Phase 6: User Story 5 — Offline-Capable Local PDF Processing (Priority: P2)

**Goal**: PDF.js worker loads from local bundled assets, not from a CDN.

**Independent Test**: Disconnect network, upload a local PDF — verify it parses successfully. Check DevTools Network tab for zero requests to `cdnjs.cloudflare.com`.

### Implementation for User Story 5

> **Note**: This task is already completed as part of T007 (the local worker URL change in `fileParser.ts`). No additional implementation task is needed. Verification is covered separately in Phase 9.

**Checkpoint**: PDF parsing works fully offline.

---

## Phase 7: User Story 6 — Reliable Cross-Chapter Search Navigation (Priority: P2)

**Goal**: Replace `setTimeout(100)` with reactive state-based chapter jump to guarantee search navigation works regardless of chapter render time.

**Independent Test**: Search for a term in a distant, long chapter. Click the result. Verify the chapter loads and the target sentence is scrolled into view and highlighted every time.

### Implementation for User Story 6

- [X] T015 [US6] Replace setTimeout-based search jump with reactive pending state in `src/App.tsx` — add a new state variable: `const [pendingJumpSentence, setPendingJumpSentence] = useState<number | null>(null);`. Refactor `handleJumpToSearchMatch` (lines ~181-190): remove the `setTimeout(() => { jumpToSentence(sentenceIdx, true); }, 100);` block. Replace with: if `chapterIdx !== currentChapterIndex`, call `setCurrentChapterIndex(chapterIdx)` and `setPendingJumpSentence(sentenceIdx)`; else, call `jumpToSentence(sentenceIdx, true)` directly. Add a new `useEffect`: `useEffect(() => { if (pendingJumpSentence !== null && currentSentences.length > 0) { const target = Math.min(pendingJumpSentence, currentSentences.length - 1); jumpToSentence(target, true); setPendingJumpSentence(null); } }, [currentChapterIndex, currentSentences, pendingJumpSentence]);`. Include `jumpToSentence` in the dependency array if it is not already stable (wrapped in useCallback).

**Checkpoint**: Cross-chapter search jumps are 100% reliable regardless of chapter rendering time.

---

## Phase 8: User Story 7 — Natural Vietnamese Sentence Segmentation (Priority: P2)

**Goal**: Expand abbreviation protection in sentence splitting to cover Vietnamese administrative titles, academic degrees, Roman numerals, and dialogue quotation marks.

**Independent Test**: Verify with test strings from `quickstart.md` Scenario 7: "TP. Hồ Chí Minh" stays intact, "GS. TS. Nguyễn Văn A" stays intact, dialogue with `«...»` is properly bounded.

### Implementation for User Story 7

- [X] T016 [US7] Expand Vietnamese abbreviation protection in `splitIntoSentences` in `src/utils/textParser.ts` — update the first `.replace(...)` regex (line ~13) that protects abbreviation periods. Add Vietnamese administrative abbreviations (`TP|TX|TT|Q|P|H|X`), academic and professional titles (`GS|PGS|TS|ThS|BS|DS|CN|KTS|LS|KS`), common Vietnamese abbreviations (`NXB|HĐND|UBND|THPT|THCS|TH|ĐH|CĐ|TC`), and keep existing English abbreviations. The updated regex pattern should be: `(?<=\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|No|Vol|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|St|Ave|TP|TX|TT|Q|P|H|X|GS|PGS|TS|ThS|BS|DS|CN|KTS|LS|KS|NXB|HĐND|UBND|THPT|THCS|TH|ĐH|CĐ|TC))\.` (case-insensitive flag kept). Also add a new protection for single uppercase Vietnamese letters that may be administrative abbreviations (already partially handled by the existing `(?<=\b[A-Z])\.` pattern). Verify that the existing regex for dialogue quotation closers in the sentence boundary regex (line ~20) already includes `»` and `"` via the `["'"'»]?` group — if not, add them.

**Checkpoint**: Vietnamese text with titles, addresses, and dialogue quotes splits into sentences naturally without false breaks.

---

## Phase 9: User Story 8 — Deterministic Search Match List Keying (Priority: P3)

**Goal**: Replace `key={idx}` with stable composite keys in SearchDrawer.

**Independent Test**: Rapidly change search queries — verify no React key warnings in console and no visual glitches in result list.

### Implementation for User Story 8

- [X] T017 [US8] Replace array index key with composite key in `src/components/SearchDrawer.tsx` — on line ~94, change `key={idx}` to `` key={`${m.chapterIndex}-${m.sentenceIndex}-${idx}`} `` in the `matches.map((m, idx) => ...)` JSX. This provides a deterministic, unique key combining the content coordinates with the iteration index as a fallback for duplicate positions.

**Checkpoint**: Search drawer renders predictably without stale DOM node reuse.

---

## Phase 10: Polish & Verification

**Purpose**: Final compilation check, build validation, and end-to-end verification.

- [X] T018 Run TypeScript compilation check via `npm run lint` (`tsc --noEmit`) — fix any type errors introduced by the changes above
- [X] T019 Run production build via `npm run build` — verify the build succeeds, PDF.js worker is bundled locally (check `dist/assets/` for worker file), and no references to `cdnjs.cloudflare.com` exist in the output
- [X] T020 Execute quickstart.md verification scenarios 1–8 — manually verify each scenario passes per the acceptance criteria in `specs/002-core-stability-fixes/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **US1 (Phase 2)**: Depends on T001 (`indexedDB.ts`) and T002 (`storage.ts`) from Phase 1
- **US2 (Phase 3)**: No dependency on Phase 1 or 2 — can run in parallel with US1
- **US3 (Phase 4)**: Depends on T003 (`ErrorBoundary.tsx`) from Phase 1 and T002 (`storage.ts`) for `clearReadingPosition`
- **US4 (Phase 5)**: No dependency on other user stories — can run in parallel
- **US5 (Phase 6)**: Completed as part of T007 (US2)
- **US6 (Phase 7)**: No dependency on other user stories — can run in parallel
- **US7 (Phase 8)**: No dependency on other user stories — can run in parallel
- **US8 (Phase 9)**: No dependency on other user stories — can run in parallel
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Setup (Phase 1) — T001, T002
- **US2 (P1)**: Independent — can start after Phase 1 or in parallel
- **US3 (P1)**: Depends on Setup (Phase 1) — T003
- **US4 (P1)**: Fully independent — no shared infrastructure needed
- **US5 (P2)**: Included in US2 (T007)
- **US6 (P2)**: Fully independent
- **US7 (P2)**: Fully independent
- **US8 (P3)**: Fully independent

### Within Each User Story

- Infrastructure utilities (T001, T002, T003) must complete before dependent story tasks
- App.tsx modifications in US1 (T004, T005, T006) should be done sequentially to avoid merge conflicts
- US2 tasks T007, T008, T009 can run in parallel (different functions in same file); T010 depends on T007-T009
- US3 tasks T011 and T012 can run in parallel (different files)
- US4 tasks T013 and T014 can run in parallel (different files)

### Parallel Opportunities

- After Phase 1 completes, the following can run simultaneously:
  - US1 (T004-T006) — `App.tsx` + storage integration
  - US2 (T007-T010) — `fileParser.ts` + `UploadModal.tsx`
  - US3 (T011-T012) — `main.tsx` + `App.tsx` ErrorBoundary wrappers
  - US4 (T013-T014) — `useReadingStats.ts` + `ReadingStatsModal.tsx`
- Independently of everything:
  - US6 (T015) — `App.tsx` search jump
  - US7 (T016) — `textParser.ts`
  - US8 (T017) — `SearchDrawer.tsx`

---

## Parallel Example: User Story 2

```bash
# Launch parser changes in parallel (different functions, same file):
Task: "T007 — Add size constants & local worker in src/utils/fileParser.ts"
Task: "T008 — Add abort support to parsePdfFile in src/utils/fileParser.ts"
Task: "T009 — Add abort support to parseEpubFile in src/utils/fileParser.ts"

# Then sequentially:
Task: "T010 — Add size validation & cancel to src/components/UploadModal.tsx" (depends on T007-T009)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002, T003)
2. Complete Phase 2: US1 — Reading Position Decoupling (T004, T005, T006)
3. **STOP and VALIDATE**: Test position persistence per quickstart.md Scenario 1
4. The most critical data-loss risk is eliminated

### Incremental Delivery

1. Setup → US1 → Validate (MVP — data loss risk eliminated)
2. + US2 → Validate (upload guard & cancel — crash risk eliminated)
3. + US3 → Validate (error boundaries — white-screen risk eliminated)
4. + US4 → Validate (honest stats — UX integrity restored)
5. + US5/6/7/8 → Validate (offline PDF, search reliability, Vietnamese text, key stability)
6. Polish → Final build & quickstart verification

### Parallel Team Strategy

With 2–3 developers after Phase 1:
- Developer A: US1 (App.tsx storage refactoring) + US6 (search jump in same file)
- Developer B: US2 (fileParser.ts + UploadModal.tsx) — includes US5 (offline PDF)
- Developer C: US3 (ErrorBoundary + wrappers) + US4 (stats cleanup) + US7 (textParser) + US8 (SearchDrawer)

---

## Notes

- [P] tasks = different files, no dependencies — safe to parallelize
- [USx] label maps each task to its user story for traceability
- Each user story is independently completable and testable
- US5 (offline PDF) is absorbed into US2's T007 — no separate implementation needed
- All tasks touch existing files via surgical, targeted modifications — no architectural rewrites
- `useTTS.ts` is explicitly NOT modified (out of scope per spec constraints)
- Commit after each task or logical group for safe rollback points

---

## Phase 11: Convergence

**Purpose**: Close remaining gaps identified by convergence assessment against spec.md edge cases. All core functional requirements (FR-001 to FR-015) and acceptance scenarios (US1–US8) are fully satisfied; these tasks address partial edge case coverage.

- [X] T021 Add post-parse empty content validation in `src/components/UploadModal.tsx` — after computing `totalWords` and `totalSentences` (line ~91), add a guard: `if (totalSentences === 0 || totalWords === 0) { setErrorMessage('Tệp không có nội dung văn bản hợp lệ.'); setIsLoading(false); setProgress(0); abortControllerRef.current = null; if (fileInputRef.current) fileInputRef.current.value = ''; return; }`. This ensures empty or whitespace-only uploaded files (e.g. 0-byte `.txt`, blank `.pdf`) are rejected with a clear Vietnamese error message before constructing a `DocumentItem`, per Edge Case spec.md L143 (partial)
- [X] T022 Add non-blocking toast advisory when IndexedDB document save fails in `src/App.tsx` — in `handleDocumentLoaded` (line ~210), chain a `.catch()` on `saveDocument(newDoc)`: `saveDocument(newDoc).catch(() => showToast('Không lưu được tài liệu vào bộ nhớ dài hạn — phiên đọc chỉ tồn tại trong tab hiện tại'))`. This informs users in private browsing or restricted IndexedDB environments that their imported document will not persist beyond the current session, per Edge Case spec.md L139 (partial)
- [X] T023 Add toast notification on failed session restoration in `src/App.tsx` — in `restoreSession()` (line ~88), change the catch block from `console.warn('[VoxRead] Failed to restore session:', error)` to also call `if (isMounted) showToast('Không thể khôi phục phiên đọc trước đó, đang mở tài liệu mẫu')`. Additionally, after line ~87, add an else branch: when `savedPos` exists (indicating user had a previous session) but `loadedDoc` is still null after all fallback attempts, show the same advisory toast so the user knows their previous document was unrecoverable, per Edge Case spec.md L140 (partial)
