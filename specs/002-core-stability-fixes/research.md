# Technical Research: Core Stability, Data Integrity & Offline Resilience

**Feature Branch**: `002-core-stability-fixes`  
**Date**: 2026-09-02  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)

---

## 1. Storage Architecture: Decoupling Reading Position from Document Content

### Problem
In `src/App.tsx`, the callback `onSentenceChange` passed to `useTTS` serialized the entire `currentDocument` object (all chapters, paragraphs, sentences, and metadata) and saved it to `localStorage` under `RECENT_DOC_STORAGE_KEY` on **every single sentence transition**:
```ts
(sentenceIdx) => {
  if (currentDocument) {
    const updated = {
      ...currentDocument,
      lastRead: {
        chapterIndex: currentChapterIndex,
        sentenceIndex: sentenceIdx,
        progressPercentage: Math.round(((sentenceIdx + 1) / Math.max(1, currentSentences.length)) * 100),
        updatedAt: Date.now(),
      },
    };
    try {
      localStorage.setItem(RECENT_DOC_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignored!
    }
  }
}
```

This caused:
1. Frequent serialization of large objects (megabytes) blocking the main thread during audio playback.
2. Rapid exhaustion of browser `localStorage` quotas (~5-10MB total). When `QuotaExceededError` was thrown, it was silently swallowed by `catch {}`, resulting in complete reading progress loss for the user upon reopening.

### Decision
Decouple persistent storage into two specialized layers:
1. **Lightweight Reading Position (`localStorage`)**:
   - Storage Key: `voxread_reading_position_v1`
   - Payload: Small JSON object (~250 bytes) containing only coordinates:
     ```ts
     interface StoredReadingPosition {
       documentId: string;
       chapterIndex: number;
       sentenceIndex: number;
       progressPercentage: number;
       updatedAt: number;
     }
     ```
   - Frequency: Updated whenever sentence changes or chapter switches.
   - Overhead: $< 0.2\text{ ms}$ per write, virtually zero quota consumption.

2. **Durable Heavy Document Storage (IndexedDB)**:
   - Database Name: `voxread_db` (Version 1)
   - Object Store: `documents` (keyPath: `id`)
   - Payload: Complete `DocumentItem` (chapters, paragraphs, sentences, word count).
   - Frequency: Saved **only** when a new document is uploaded, pasted, or selected from samples.
   - Capacity: IndexedDB typically allows 50MB+ or up to 60% of available disk space, perfectly suited for large multi-chapter books.
   - Implementation: Minimalist, promise-based native IndexedDB wrapper in `src/utils/indexedDB.ts` without external dependencies.

3. **Quota Safety & User Notification**:
   - All `localStorage` and `indexedDB` writes are guarded with explicit try/catch blocks.
   - If an error is caught:
     - Log diagnostic warning via `console.warn('[Storage Error]', error)`.
     - Check if error is `QuotaExceededError` (or name contains `Quota`). If so, invoke `showToast('Không lưu được tiến trình đọc — bộ nhớ trình duyệt đã đầy')`.

4. **Backward Compatibility & Startup Flow**:
   - On app startup, read `StoredReadingPosition` from `voxread_reading_position_v1`.
   - Retrieve document from IndexedDB by `position.documentId` (or fall back to active document store).
   - If IndexedDB is empty, check legacy `RECENT_DOC_STORAGE_KEY` (`voxread_active_document_v1`) in `localStorage` for automatic migration; if still empty, load `SAMPLE_DOCUMENTS[0]`.

### Alternatives Considered
- **Keeping everything in `localStorage` with compression (e.g. `lz-string`)**: Rejected because compression still consumes main thread CPU on every sentence and only delays quota exhaustion without solving the architectural flaw.
- **External library like `idb` or `dexie`**: Rejected because native IndexedDB operations required for VoxRead are minimal (get by key, put, delete, get active). A ~80-line clean wrapper in `src/utils/indexedDB.ts` avoids adding new node dependencies.

---

## 2. Upload Guard & Cooperative Abort Controller

### Problem
`UploadModal.tsx` and `fileParser.ts` had no file size limits (`file.size` was not inspected). Parsing PDF or EPUB files happens synchronously or sequentially on the main JavaScript thread. Uploading a large PDF (e.g. 150MB+) hung the browser tab or caused out-of-memory crashes, with no way for the user to cancel once started.

### Decision
1. **Size Limit Constant**:
   - Define in `src/utils/fileParser.ts`:
     ```ts
     export const MAX_FILE_SIZE_MB = 100;
     export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
     ```
2. **Immediate File Validation**:
   - In `UploadModal.tsx`, validate `file.size <= MAX_FILE_SIZE_BYTES` immediately when selected via `<input type="file">` or drag-and-drop.
   - If exceeded, set `errorMessage = 'Tệp vượt quá dung lượng tối đa cho phép (100MB)'` and immediately exit before reading array buffers or calling parsers.
3. **Cancelable Parsing via `AbortController`**:
   - Pass optional `signal?: AbortSignal` into `parsePdfFile(file, onProgress, signal)` and `parseEpubFile(file, onProgress, signal)`.
   - In `parsePdfFile`: inside the page loop `for (let i = 1; i <= numPages; i++)`, check:
     ```ts
     if (signal?.aborted) {
       throw new DOMException('Parsing aborted by user', 'AbortError');
     }
     ```
   - In `parseEpubFile`: check `signal?.aborted` between chapter extraction steps.
   - In `UploadModal.tsx`: store `abortControllerRef = useRef<AbortController | null>(null)`. Show a "Huỷ xử lý" / Cancel button during `isLoading === true`. If clicked, call `abortControllerRef.current?.abort()`, reset loading state, and close gracefully.

### Alternatives Considered
- **Web Worker for all parsing**: While beneficial for long-term background processing, worker serialization of complex PDF/EPUB objects requires significant message-passing architecture. File size limits + cooperative cancellation solve the immediate freeze and crash risks safely within existing architecture.

---

## 3. Two-Tier Error Boundary Architecture

### Problem
The application had no `ErrorBoundary` or `componentDidCatch` anywhere. Any unhandled exception during rendering (e.g. malformed novel text, unexpected unicode characters, or chart rendering glitches) caused a complete white screen with total loss of interaction.

### Decision
1. **Standard React Class ErrorBoundary Component**:
   - Create `src/components/ErrorBoundary.tsx` implementing `getDerivedStateFromError` and `componentDidCatch`.
   - UI features:
     - Clear alert icon and error summary.
     - "Tải lại trang" (Reload page).
     - "Quay về tài liệu mẫu" (Reset to default sample document and clear broken storage pointers).
2. **Two-Tier Containment**:
   - **Root Boundary** (`src/main.tsx`): Wraps `<App />` to prevent white-screen crashes for global errors.
   - **Content Boundary** (`src/App.tsx`): Wraps `<ReaderContent />` with `isContentOnly={true}`.
     - If an uploaded book has bad data that crashes rendering, only the reader content area shows the error card.
     - The top navigation bar, controls, and upload modal remain fully functional, allowing the user to simply upload another book or reset to sample without refreshing.

### Alternatives Considered
- **Single root error boundary**: Rejected because an error in document text rendering would crash the top bar, preventing the user from opening the upload modal to load a different file.

---

## 4. Honest Zero-State Reading Statistics

### Problem
`src/hooks/useReadingStats.ts` contained `generateSeedStats()` (lines ~37-53) and hardcoded seed sessions (lines ~88-107) that generated fake reading minutes (22-45 mins/day), fake word counts, and dummy sessions from "A Study in Scarlet" for past days. First-time users saw fabricated statistics, creating confusion and undermining feature credibility.

### Decision
1. **Remove Seed Generators**:
   - Remove `generateSeedStats()` and fake session arrays.
   - Default `dailyDataMap` state to `{}` and `recentSessions` to `[]` when `localStorage` has no saved data.
2. **Empty State in `ReadingStatsModal.tsx`**:
   - Detect if total reading history is empty:
     ```ts
     const hasHistory = stats.totalReadingTimeMinutes > 0 || stats.totalWordsRead > 0 || stats.recentSessions.length > 0;
     ```
   - When `!hasHistory`:
     - Display an inviting, clean empty state banner: "Chưa có dữ liệu đọc sách — bắt đầu đọc hoặc nghe sách để xem thống kê tại đây".
     - Display clean zero counters (0 mins, 0 words, 0 WPM, 0d streak).
     - Hide or display a welcoming placeholder for the chart.
3. **Reset Behavior**:
   - `onResetStats` clears storage to `{}` and `[]` without re-populating fake seed data.

---

## 5. Offline PDF.js Worker Resolution

### Problem
`src/utils/fileParser.ts` loaded worker from `cdnjs.cloudflare.com`:
```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
```
In an Electron offline desktop environment or without internet connection, parsing local PDF files fails completely.

### Decision
Configure local worker resolution via Vite:
In modern Vite with `pdfjs-dist` installed, we can import the worker script directly via Vite's `?url` query or resolve it locally:
```ts
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
```
Or use a dynamic fallback:
```ts
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}
```
This bundles the worker locally into `dist/assets/`, eliminating any remote network dependency.

---

## 6. Reactive Cross-Chapter Search Match Navigation

### Problem
`handleJumpToSearchMatch` in `src/App.tsx` used a static `setTimeout(100)`:
```ts
const handleJumpToSearchMatch = (chapterIdx: number, sentenceIdx: number) => {
  if (chapterIdx !== currentChapterIndex) {
    setCurrentChapterIndex(chapterIdx);
    setTimeout(() => {
      jumpToSentence(sentenceIdx, true);
    }, 100);
  } else {
    jumpToSentence(sentenceIdx, true);
  }
};
```
If the new chapter is long, rendering takes longer than 100ms, causing `jumpToSentence` to execute against stale sentences or miss its target.

### Decision
Replace `setTimeout` with reactive pending state:
1. Define state: `const [pendingJumpSentence, setPendingJumpSentence] = useState<number | null>(null);`
2. In `handleJumpToSearchMatch`:
   ```ts
   if (chapterIdx !== currentChapterIndex) {
     setCurrentChapterIndex(chapterIdx);
     setPendingJumpSentence(sentenceIdx);
   } else {
     jumpToSentence(sentenceIdx, true);
   }
   ```
3. In `useEffect`:
   ```ts
   useEffect(() => {
     if (pendingJumpSentence !== null && currentSentences.length > 0) {
       const target = Math.min(pendingJumpSentence, currentSentences.length - 1);
       jumpToSentence(target, true);
       setPendingJumpSentence(null);
     }
   }, [currentChapterIndex, currentSentences, pendingJumpSentence]);
   ```
This guarantees execution immediately when the chapter finishes recomputing sentences, with zero reliance on arbitrary timing.

---

## 7. Vietnamese Sentence Segmentation & Abbreviation Preservation

### Problem
`splitIntoSentences` in `src/utils/textParser.ts` only protected English abbreviations (`Mr|Mrs|Dr...`). Vietnamese administrative terms ("TP.", "Q.", "P."), academic titles ("GS.", "TS.", "ThS.", "BS."), Roman numerals, and dialogue quotes (`« »`, `“ ”`) were broken into false sentence fragments.

### Decision
1. Expand the protected abbreviation list in `src/utils/textParser.ts`:
   - Vietnamese titles & degrees: `GS|PGS|TS|ThS|BS|DS|CN|KTS|LS|Th\.S|P\.GS|T\.S`
   - Vietnamese administrative abbreviations: `TP|Q|P|TX|TT|H|X`
   - Common abbreviations: `đ\/c|Đ\/c|v\.v|v\.\.v|th|tr|đoàn|NXB|HĐND|UBND`
   - Roman numerals: `(?<=\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|XXI))\.(?=\s)`
2. Enhance dialogue quotation boundary regex to preserve trailing quote characters:
   ```ts
   const regex = /([^.!?。！？\n]+[.!?。！？]+["'”’»\)]?|[^.!?。！？\n]+$)/g;
   ```
3. Test suite in `quickstart.md` verifies preservation of Vietnamese addresses, degrees, and dialogues.

---

## 8. SearchDrawer React Key Stability

### Problem
`src/components/SearchDrawer.tsx` line 94:
```tsx
{matches.map((m, idx) => (
  <div key={idx} ...>
```
Using `idx` causes React reconciliation bugs when search results update.

### Decision
Change to:
```tsx
key={`${m.chapterIndex}-${m.sentenceIndex}-${idx}`}
```
Provides deterministic, unique keys based on content coordinates.
