# Quickstart & Verification Guide: Core Stability, Data Integrity & Offline Resilience

**Feature Branch**: `002-core-stability-fixes`  
**Date**: 2026-09-02  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## 1. Setup & Environment Verification

Verify dependencies and ensure TypeScript compilation passes without errors:

```bash
# 1. Check TypeScript compilation
npm run lint

# 2. Verify Vite build bundling (ensuring PDF.js worker bundles locally)
npm run build

# 3. Start local development server
npm run dev
```

---

## 2. End-to-End Verification Scenarios

### Scenario 1: Lightweight Reading Position Persistence & Storage Decoupling
**Objective**: Ensure reading coordinates are stored efficiently without re-serializing entire books to `localStorage`.

1. Open VoxRead in your browser (`http://localhost:3000`).
2. Open Browser DevTools (`F12`) $\rightarrow$ **Application** tab $\rightarrow$ **Storage**:
   - Inspect **Local Storage**: verify `voxread_reading_position_v1` exists with a small JSON payload:
     `{"documentId":"...","chapterIndex":0,"sentenceIndex":0,"progressPercentage":0,"updatedAt":172524...}`
   - Inspect **IndexedDB** $\rightarrow$ `voxread_db` $\rightarrow$ `documents`: verify full document payload is stored there once.
3. Start TTS playback or click through several sentences:
   - Verify `voxread_reading_position_v1` updates on each sentence change.
   - Verify `voxread_active_document_v1` in `localStorage` is **NOT** re-written on every sentence.
4. Refresh the browser page (`F5`):
   - Verify the reader restores exactly to the saved sentence index with active highlighting.

---

### Scenario 2: Upload File Size Guard & Cancelable Parsing
**Objective**: Verify files exceeding 100MB are blocked immediately and active parsing can be canceled cooperatively.

1. In VoxRead, click the **"Tải lên"** (Upload) button in the top navigation bar.
2. **File Size Guard Test**:
   - Select or drag-and-drop a file larger than 100MB.
   - **Expected**: Upload modal immediately displays: `"Tệp vượt quá dung lượng tối đa cho phép (100MB)"`. No freezing, zero network/disk lag.
3. **Cancellation Test**:
   - Select a large multi-page PDF or EPUB (e.g. 20-50MB).
   - While the progress bar is advancing (e.g. at 25%), click the newly added **"Huỷ"** (Cancel) button.
   - **Expected**: Parsing immediately halts; progress resets; modal cleanly resets without freezing the interface.

---

### Scenario 3: Error Boundary Crash Containment
**Objective**: Verify component rendering exceptions do not result in a blank white screen.

1. **Reader Content Boundary Test**:
   - If an unexpected error occurs during chapter rendering, verify an inline recovery card is displayed in place of the reader view.
   - Verify the top navigation bar, mascot widget, and upload buttons remain functional.
   - Click **"Quay về tài liệu mẫu"**: verify active document resets to sample novel and normal reading resumes.
2. **Root Application Boundary Test**:
   - If a top-level error occurs, verify a full-screen recovery view appears offering **"Tải lại"** and **"Quay về tài liệu mẫu"**.

---

### Scenario 4: Truthful Zero-State Reading Statistics
**Objective**: Verify first-time users see honest zero-states instead of fake seed data.

1. Open DevTools $\rightarrow$ Application $\rightarrow$ Local Storage: clear keys `voxread_daily_reading_stats_v1` and `voxread_recent_sessions_v1`.
2. Refresh the page and click the **"Thống kê"** (Stats) icon in the navigation bar.
3. **Expected**:
   - Total Reading Time: `0 mins`.
   - Average Speed: `0 WPM`.
   - Session Duration: `0 mins` (Streak: `0d`).
   - A friendly empty-state banner: `"Chưa có dữ liệu đọc sách — bắt đầu đọc để xem thống kê ở đây"`.
   - Fictitious sessions ("A Study in Scarlet", etc.) are completely absent.
4. Read for 1-2 minutes with TTS active:
   - Reopen stats modal: verify real session time and real word count are recorded.

---

### Scenario 5: Offline-First PDF Parsing (Local Worker)
**Objective**: Confirm PDF documents parse without internet connectivity.

1. Disconnect your computer from Wi-Fi / Ethernet or toggle Airplane mode in Windows.
2. In VoxRead, click **"Tải lên"** $\rightarrow$ choose a local `.pdf` file.
3. **Expected**:
   - PDF parses completely, extracts chapters, and opens in the reader.
   - Open DevTools Network tab: verify **zero** requests to `cdnjs.cloudflare.com`.

---

### Scenario 6: Reactive Cross-Chapter Search Navigation
**Objective**: Ensure clicking search matches in distant chapters lands reliably on the target sentence.

1. Load a novel with multiple chapters.
2. Click the **Search** icon, enter a query that occurs in chapter 2 or 3.
3. Click a search result located in a different chapter.
4. **Expected**:
   - The reader switches to the new chapter and immediately scrolls to and highlights the matched sentence.
   - No 100ms timing dependency; works consistently even on long chapters.

---

### Scenario 7: Vietnamese Sentence Segmentation Test Cases
**Objective**: Verify that Vietnamese abbreviations and quotation marks do not fracture sentences.

Run or verify the following test strings in `splitIntoSentences`:
1. **Administrative abbreviations**:
   - Input: `"Trụ sở công ty đặt tại TP. Hồ Chí Minh, gần Q. 1 và P. Bến Nghé. Đây là khu vực sầm uất."`
   - Output: 2 sentences (not split at "TP.", "Q.", "P.").
2. **Academic & professional titles**:
   - Input: `"GS. TS. Nguyễn Văn A cùng ThS. Lê Văn B và BS. Trần Văn C vừa công bố nghiên cứu mới."`
   - Output: 1 sentence (not split at "GS.", "TS.", "ThS.", "BS.").
3. **Dialogue and quotation marks**:
   - Input: `"«Hôm nay trời đẹp quá!» - Lan reo lên. Cả nhóm cùng mỉm cười."`
   - Output: 2 sentences (`«Hôm nay trời đẹp quá!» - Lan reo lên.` and `Cả nhóm cùng mỉm cười.`).
4. **Roman numerals**:
   - Input: `"Tác phẩm ra đời vào thế kỷ XXI. Đây là giai đoạn chuyển mình mạnh mẽ."`
   - Output: 2 sentences (not split at "XXI.").

---

### Scenario 8: SearchDrawer React Key Stability
**Objective**: Ensure search result list has unique keys.

1. Open the search drawer and type a search term.
2. DevTools Console should emit zero `Warning: Encountered two children with the same key` warnings.
