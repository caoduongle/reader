# Feature Specification: Core Stability, Data Integrity & Offline Resilience

**Feature Branch**: `002-core-stability-fixes`  
**Created**: 2026-09-02  
**Status**: Draft  
**Input**: User description: "ƯU TIÊN CAO — bug thật, có rủi ro mất dữ liệu hoặc crash app: 1. localStorage đang lưu TOÀN BỘ nội dung sách mỗi khi đổi câu; 2. Không giới hạn kích thước file upload; 3. Không có Error Boundary; 4. Thống kê đọc sách hiển thị dữ liệu GIẢ; ƯU TIÊN TRUNG BÌNH: 5. PDF.js worker tải từ CDN; 6. Nhảy tới search match ở chương khác dùng setTimeout(100); 7. Tách câu tiếng Việt dựa trên danh sách viết tắt tiếng Anh; ƯU TIÊN THẤP: 8. key={idx} dùng index làm React key; 9. Parse file lớn chạy đồng bộ trên main thread."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Safe & Lightweight Reading Position Persistence (Priority: P1)

As a reader engaging with long books (such as multi-chapter EPUB or PDF documents), I want my reading progress (active chapter, sentence, and progress percentage) to be saved automatically and reliably as I read or listen to narration, so that I can resume at the exact same position when reopening the application without risking silent progress loss or experiencing audio/UI lag.

**Why this priority**: Preventing progress loss is critical. Saving full document objects on every sentence change exhausts browser quota limits, causing silent save failures, lost reading positions upon reopening, and unnecessary CPU strain during active playback.

**Independent Test**: Can be tested independently by loading a multi-chapter document, advancing through sentences (both manually and via automatic speech progression), verifying that only lightweight coordinate payloads are updated frequently, verifying that complete document text is retained in large-capacity local storage, and simulating storage constraints to ensure graceful warnings appear without breaking the reading session.

**Acceptance Scenarios**:

1. **Given** an open document with active reading or speech playback in progress, **When** the active sentence advances to a new sentence, **Then** the application persists only the active reading coordinates (`documentId`, `chapterIndex`, `sentenceIndex`, `progressPercentage`, `updatedAt`) without re-serializing full book chapters or paragraphs.
2. **Given** a user has closed or refreshed the application, **When** the application starts up, **Then** it retrieves the last active reading coordinates, loads the matching document from local durable storage, and positions the view directly at the recorded chapter and sentence with active highlighting.
3. **Given** local storage is constrained or a storage write failure occurs, **When** saving fails, **Then** the application logs a warning to diagnostic logs, displays a non-blocking toast alert informing the user ("Không lưu được tiến trình đọc — thiết bị đầy bộ nhớ trình duyệt"), and keeps the current reading session running without crashing.

---

### User Story 2 - File Upload Protection & Cancelable Parsing (Priority: P1)

As a user importing books into VoxRead, I want explicit boundaries on file sizes and the ability to cancel an ongoing import, so that selecting an oversized or complex file does not lock up my computer, freeze the interface, or crash the application tab.

**Why this priority**: Processing massive or malformed files without validation blocks the main interface, consumes excessive memory, and leaves users without an escape route if parsing hangs.

**Independent Test**: Can be tested independently by attempting to upload a file exceeding the size limit (100MB) to verify immediate rejection with clear feedback, and by starting a long document import and clicking "Huỷ" / Cancel to verify cooperative abort and clean memory release.

**Acceptance Scenarios**:

1. **Given** a user selects or drops a document file exceeding the 100MB size limit, **When** the file is chosen, **Then** the system rejects the file immediately before reading or parsing, displaying a clear explanatory message ("Tệp vượt quá dung lượng tối đa cho phép (100MB)").
2. **Given** a multi-page PDF or complex EPUB file is actively being parsed with a progress indicator visible, **When** the user clicks "Huỷ" (Cancel), **Then** parsing terminates immediately via cooperative abort signaling, temporary resources are cleaned up, and the previous reading view remains unchanged.
3. **Given** an unsupported or corrupted file is selected, **When** parsing fails, **Then** a friendly error notification describes the issue, and the import dialog remains accessible for the user to pick an alternate file.

---

### User Story 3 - Component Crash Containment via Error Boundaries (Priority: P1)

As a reader viewing diverse documents with varying formatting, I want unexpected rendering or parsing glitches in specific components to be contained safely, so that an isolated error does not crash the entire application into an unrecoverable blank white screen.

**Why this priority**: Without error boundaries, any rendering exception in a child component crashes the whole React application tree, forcing users to clear application state manually or re-upload files from scratch.

**Independent Test**: Can be tested independently by triggering a rendering failure within the document viewing area, verifying that an inline recovery interface renders ("Tải lại" / "Quay về tài liệu mẫu") while top navigation and toolbar actions remain fully responsive.

**Acceptance Scenarios**:

1. **Given** an unhandled rendering error occurs inside the document reading content area, **When** the error triggers, **Then** an localized recovery panel is displayed in place of the reader view, while the application navigation header, theme controls, and upload modal remain fully interactive.
2. **Given** a top-level application failure occurs, **When** caught by the root Error Boundary, **Then** a fallback screen is displayed offering options to "Tải lại" (Reload) and "Quay về tài liệu mẫu" (Reset to sample).
3. **Given** a user clicks "Quay về tài liệu mẫu" from an error state, **When** clicked, **Then** invalid document references in local storage are cleared, the default sample document is loaded, and normal application functionality is restored.

---

### User Story 4 - Truthful Zero-State Reading Statistics (Priority: P1)

As a new reader launching VoxRead for the first time, I want my reading statistics dashboard to truthfully reflect only my real reading activity, so that I can track my genuine habits without being presented with fabricated baseline numbers or dummy reading sessions.

**Why this priority**: Displaying fake seeded statistics (fabricated minutes, words, and dummy sessions from "A Study in Scarlet") misleads users, creates confusion, and diminishes the credibility of the tracking system.

**Independent Test**: Can be tested independently by opening the application with freshly initialized storage, viewing the Reading Statistics modal, confirming that all aggregate counters display zero, verifying that an informative empty state appears, and confirming that numbers only grow when actual reading occurs.

**Acceptance Scenarios**:

1. **Given** a new user profile with no logged reading history, **When** the Reading Statistics modal is opened, **Then** all summary metrics display zero values (0 mins, 0 words, 0-day streak) and a clear empty state message is shown ("Chưa có dữ liệu — bắt đầu đọc để xem thống kê ở đây").
2. **Given** active reading or speech playback is conducted, **When** sessions conclude, **Then** only genuine elapsed duration, verified word counts, and actual speech rates are appended to daily aggregates and session logs.
3. **Given** a user chooses to reset their reading data via the statistics modal, **When** confirmed, **Then** all saved statistics revert cleanly to the zero-state without reintroducing fake seed data.

---

### User Story 5 - Offline-Capable Local PDF Processing (Priority: P2)

As a desktop application user who frequently works without an internet connection, I want to open and parse local PDF documents completely offline, so that VoxRead does not depend on third-party CDNs to read local files.

**Why this priority**: For an offline-first desktop application, loading the PDF.js worker from a public CDN causes file imports to fail when offline, in airplane mode, or in firewalled environments.

**Independent Test**: Can be tested independently by disconnecting network connectivity, opening a local PDF file, and verifying that the PDF worker initializes from local application assets, extracting chapters and sentences without network access.

**Acceptance Scenarios**:

1. **Given** the device has no internet access, **When** a user uploads or opens a local PDF document, **Then** the PDF processing worker initializes from bundled local application assets without issuing remote network requests.
2. **Given** a local PDF document is imported offline, **When** text extraction runs, **Then** page progress is reported accurately and the novel structure is generated ready for reading and voice synthesis.

---

### User Story 6 - Reliable Cross-Chapter Search Navigation (Priority: P2)

As a reader searching for terms across an entire book, I want clicking a search match located in another chapter to navigate directly and reliably to that specific sentence, regardless of how long the target chapter is, so that I never get lost or miss the target sentence.

**Why this priority**: Using a fixed delay timer (`setTimeout(100)`) after switching chapters fails when chapter rendering takes longer than 100ms, causing the sentence jump to miss or fail silently.

**Independent Test**: Can be tested independently by searching for keywords located in a distant long chapter, clicking the result, and verifying that the chapter transition completes and the target sentence is scrolled into view and highlighted consistently.

**Acceptance Scenarios**:

1. **Given** a user clicks a search result located in chapter $K$ while viewing chapter $J$ ($J \neq K$), **When** navigation is requested, **Then** the application triggers the chapter switch and registers the target sentence index in reactive lifecycle state.
2. **Given** chapter $K$ finishes loading and its sentences are rendered, **When** the chapter update is committed, **Then** the reader navigates smoothly to the target sentence and highlights it without relying on fixed timing delays.

---

### User Story 7 - Natural Vietnamese Sentence Segmentation (Priority: P2)

As a Vietnamese reader listening to or reading Vietnamese text, I want sentences to be split naturally according to Vietnamese abbreviation rules, honorific titles, and dialogue punctuation, so that reading rhythm and speech synthesis cadence remain smooth and natural without abrupt mid-phrase breaks.

**Why this priority**: Current sentence splitting only protects English honorifics (`Mr`, `Dr`, etc.), causing common Vietnamese titles, administrative abbreviations ("TP.", "Q.", "P.", "GS.", "TS.", "ThS.", "BS."), Roman numerals, and dialogue quotes (`« »`, `“ ”`) to be fractured into disjointed sentence fragments.

**Independent Test**: Can be tested independently with curated Vietnamese passages containing professional titles, addresses, and dialogue quotes, confirming that abbreviation periods do not create erroneous sentence breaks and quotation boundaries are preserved intact.

**Acceptance Scenarios**:

1. **Given** text containing Vietnamese administrative, professional, or academic abbreviations (such as "TP. Hồ Chí Minh", "Q. 1", "P. Bến Nghé", "GS. TS. Nguyễn Văn A", "ThS. Hoàng", "BS. Trần"), **When** sentence splitting executes, **Then** abbreviation periods are preserved and do not create false sentence boundaries.
2. **Given** dialogue text wrapped in Vietnamese or international quotation marks (`«...»`, `“...”`, `"..."`), **When** followed by punctuation and dialogue tags, **Then** sentences maintain natural dialogue phrasing without awkward mid-quote fragmentation.
3. **Given** numerical values, decimals, or Roman numerals (e.g. "3.14", "thế kỷ XXI."), **When** parsed, **Then** numbers and century designations remain intact within their enclosing sentence.

---

### User Story 8 - Deterministic Search Match List Keying (Priority: P3)

As a user searching for various terms in the search drawer, I want search result lists to render predictably without visual glitches or stale card recycling, so that rapid searches feel snappy and accurate.

**Why this priority**: Using simple array indices (`key={idx}`) for search results causes React reconciliation anomalies when result list length or order updates between queries.

**Independent Test**: Can be tested independently by entering consecutive search terms and confirming that result cards update and animate cleanly without React duplicate key warnings or misaligned event targets.

**Acceptance Scenarios**:

1. **Given** search matches rendered in the search drawer, **When** query results change, **Then** each item is keyed with a unique, deterministic identifier combining chapter index, sentence index, and match position.

---

### Edge Cases

- **Storage Quota Exceeded**: If the browser storage quota is exhausted during a write operation, the system logs the error to diagnostic logs, presents a clear, polite toast notification to the user, and continues active in-memory operation without crashing.
- **IndexedDB Unavailable (Strict Private Mode)**: In private browsing modes where IndexedDB may be blocked, the system falls back gracefully to localStorage or session memory with a non-blocking advisory.
- **Corrupted Stored Document**: If a stored document cannot be parsed on startup, the application falls back safely to the default sample document and informs the user via notification.
- **Mid-Parsing User Abort**: When a user cancels during a multi-page PDF or EPUB import, the parsing process aborts immediately, avoids persisting partial chapters, and keeps the previously active document intact.
- **Oversized Files (>100MB)**: Selecting a file larger than 100MB triggers immediate validation on file metadata, rejecting the file with zero memory allocation or CPU freezing.
- **Empty or Whitespace-Only Files**: Uploaded files containing no readable text are detected and flagged with an error message ("Tệp không có nội dung văn bản hợp lệ").
- **Abbreviation at Natural Sentence End**: When an abbreviation appears at the genuine end of a sentence followed by capitalization, the tokenizer distinguishes between an abbreviation period and a sentence terminator.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST separate reading position persistence from document text persistence.
- **FR-002**: System MUST store current reading coordinates (`documentId`, `chapterIndex`, `sentenceIndex`, `progressPercentage`, `updatedAt`) as a lightweight payload in local storage, updating on every sentence change.
- **FR-003**: System MUST store full document structures (chapters, paragraphs, sentences) in large-capacity local storage (IndexedDB), updating only when a new document is imported or explicitly changed.
- **FR-004**: System MUST wrap all storage read/write operations in structured error handling, logging diagnostic warnings via `console.warn` and notifying the user when storage quota errors occur.
- **FR-005**: System MUST validate uploaded file size against a defined maximum limit (`MAX_FILE_SIZE_MB = 100`) and reject files exceeding this threshold before reading or parsing begins.
- **FR-006**: System MUST provide cooperative cancellation (`AbortController`) during PDF and EPUB parsing, allowing users to abort in-progress imports cleanly.
- **FR-007**: System MUST provide a React `ErrorBoundary` component with options to "Tải lại" (Reload) and "Quay về tài liệu mẫu" (Reset to sample document).
- **FR-008**: System MUST isolate the document reading view (`ReaderContent`) with an Error Boundary so that content rendering failures do not crash navigation or upload controls.
- **FR-009**: System MUST wrap the top-level application root in an Error Boundary to prevent unhandled white-screen crashes.
- **FR-010**: System MUST initialize reading statistics with an empty zero-state (`dailyDataMap = {}`, `recentSessions = []`) when no historical reading data is present.
- **FR-011**: System MUST display an informative empty state in the Reading Statistics modal ("Chưa có dữ liệu — bắt đầu đọc để xem thống kê ở đây") when no reading sessions have occurred.
- **FR-012**: System MUST load the PDF.js worker from local application bundle assets, eliminating all runtime dependencies on external CDNs.
- **FR-013**: System MUST handle cross-chapter search jumps reactively through lifecycle state (`pendingJumpSentenceIndex`) rather than fixed delay timers (`setTimeout`).
- **FR-014**: System MUST expand sentence segmentation abbreviations to include Vietnamese administrative titles ("TP.", "Q.", "P."), academic titles ("GS.", "TS.", "ThS.", "BS."), common abbreviations, and quotation marks.
- **FR-015**: System MUST assign deterministic, unique React keys to search result items in `SearchDrawer`.

---

### Non-Functional & Scope Constraints

- **NFR-001 (Offline-First)**: Document loading, text reading, parsing, and search MUST function without an active internet connection.
- **NFR-002 (Performance)**: Saving reading coordinates on sentence change MUST execute in under 5 milliseconds without UI thread stutter.
- **NFR-003 (Safety & Resilience)**: Storage quota or serialization failures MUST NEVER cause the reader or playback engine to crash.
- **Out of Scope (Explicitly Excluded)**:
  - Changes to the text-to-speech audio synthesis architecture (`useTTS.ts`) are reserved for a separate dedicated task (`INTEGRATION_PROMPT.md`).
  - Removal of unused dependencies (e.g. `@google/genai`) is preserved as-is.
  - New multi-document library management, tagging, or cloud synchronization features are deferred to future releases.

---

### Key Entities

- **ReadingPosition**: Lightweight entity representing active reading location.
  - Attributes: `documentId` (string), `chapterIndex` (number), `sentenceIndex` (number), `progressPercentage` (number), `updatedAt` (timestamp).
- **StoredDocument**: Durable entity representing complete parsed document contents.
  - Attributes: `id` (string), `title` (string), `author` (optional string), `format` ('txt' | 'pdf' | 'epub'), `chapters` (array of Chapter), `totalWords` (number), `totalSentences` (number), `createdAt` (timestamp).
- **UploadGuard**: File validation entity.
  - Attributes: `maxSizeMB` (number, default 100), `allowedExtensions` (array of string), `abortSignal` (AbortSignal).
- **ReadingStatsSummary**: Aggregated user reading metrics.
  - Attributes: `totalReadingTimeMinutes` (number), `todayDurationMinutes` (number), `totalWordsRead` (number), `overallAvgWpm` (number), `currentStreakDays` (number), `longestSessionMinutes` (number), `dailyData` (array of DailyReadingStat), `recentSessions` (array of ReadingSessionRecord).
- **ErrorBoundaryFallback**: Recovery UI model.
  - Attributes: `error` (Error object), `onReload` (function), `onResetToSample` (function), `isContentOnly` (boolean).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: During reading and TTS playback, storage write operations on sentence change execute in under 5ms, generating payloads under 500 bytes instead of megabyte-scale book objects.
- **SC-002**: 100% of files larger than 100MB are rejected within 100ms of selection with zero main-thread freezing.
- **SC-003**: Clicking "Cancel" during file parsing terminates processing and cleans up resources within 1 second.
- **SC-004**: Rendering errors inside the document reader display a localized recovery view within 200ms without crashing navigation or toolbars.
- **SC-005**: 100% of first-time users opening the Reading Statistics modal see a truthful zero-state without fabricated seed sessions or minutes.
- **SC-006**: Local PDF documents parse and display successfully while operating in an offline environment (airplane mode).
- **SC-007**: 100% of cross-chapter search jumps land accurately on the target sentence across chapters of any length.
- **SC-008**: Vietnamese text segmentation accurately preserves common administrative and academic abbreviations without erroneous sentence breaks across all validated test samples.

---

## Assumptions

- Target environments include modern evergreen browsers (Chrome, Edge, Safari, Firefox) and the Electron desktop wrapper.
- IndexedDB is available and supported in standard browser modes; for restricted/private modes, a fallback to local storage or session memory maintains functional continuity.
- A maximum file size limit of 100MB is appropriate for standard e-books, articles, and documents, preventing out-of-memory crashes on consumer devices.
- Sentence segmentation adheres to Vietnamese orthographic conventions and Unicode punctuation standards.
