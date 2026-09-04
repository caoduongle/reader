# Quickstart & Verification Guide: Desktop Clipboard Screen Reader

**Feature**: `013-clipboard-screen-reader`  
**Date**: 2026-09-04  

---

## 1. Automated Verification Commands

Run the full automated testing and linting suite to guarantee zero type errors, lint regressions, or broken unit tests:

```bash
# 1. Run Vitest Unit Tests
npm test

# 2. Verify TypeScript Compilation Across All Targets
npx tsc --noEmit

# 3. Check ESLint Rules
npx eslint .
```

All 3 commands must exit with code `0`.

---

## 2. End-to-End Manual Verification Workflow

### Scenario A: Screen Reader Activation from External App (MVP Journey)

1. **Launch Electron in Development Mode**:
   ```bash
   npm run electron:dev
   ```
2. **Open an External Application**:
   - Open Windows **Notepad**, a web browser, or a PDF reader.
   - Type or select a paragraph of Vietnamese text (e.g.: `Hôm nay là một ngày tuyệt vời để đọc sách cùng VoxRead. Tính năng đọc màn hình hoạt động rất nhanh.`).
   - Highlight the text and press `Ctrl + C` (copies to clipboard).
3. **Minimize or Blur VoxRead**:
   - Minimize VoxRead to the taskbar or close it to the system tray.
4. **Trigger Global Shortcut**:
   - Press `Ctrl + Shift + Space` while focused in Notepad or anywhere on the desktop.
5. **Expected Outcome**:
   - VoxRead window instantly restores/shows and takes focus.
   - The document reader displays a new document titled **"Nội dung từ màn hình"**.
   - Speech synthesis automatically starts speaking sentence 1, with the active sentence highlighted visually.

---

### Scenario B: Deduplication & Empty Clipboard Edge Cases

1. **Consecutive Shortcut Press Without New Text**:
   - Without copying anything new, press `Ctrl + Shift + Space` again.
   - **Expected**: Nothing happens. VoxRead continues playing uninterrupted without restarting or resetting the document.
2. **Empty Clipboard**:
   - Copy an image or empty space in another app.
   - Press `Ctrl + Shift + Space`.
   - **Expected**: VoxRead ignores the shortcut silently without displaying errors or creating blank documents.

---

### Scenario C: UI Discovery & Guidance

1. **ControlBar Screen Reader Button**:
   - On the floating `ControlBar`, locate the screen reader icon button (tooltip: *"Đọc màn hình (Ctrl+Shift+Space)"*).
   - Click the button.
   - **Expected**: An instructional modal or toast appears in Vietnamese explaining the 3-step usage:
     > "Bôi đen văn bản ở bất kỳ đâu, nhấn Ctrl+C, rồi bấm Ctrl+Shift+Space để đọc."
2. **System Tray Menu**:
   - Right-click the VoxRead icon in the Windows taskbar notification area (System Tray).
   - Click **"🖥️ Đọc màn hình (Ctrl+Shift+Space)"**.
   - **Expected**: The VoxRead window restores, and an informational dialog displays the screen reader instructions.
