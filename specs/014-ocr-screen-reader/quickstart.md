# Quickstart & Verification Guide: Desktop OCR Screen Reader Fallback

**Feature**: `014-ocr-screen-reader`  
**Date**: 2026-09-04  

---

## 1. Automated Test Verification

Run all Vitest unit tests including the new `POST /api/ocr` endpoint test suite:

```bash
npm test -- tests/unit/ocrEndpoint.test.ts
```

Expected output:
- Rejects missing or empty image payload with HTTP 400.
- Rejects payload when `GEMINI_API_KEY` is unconfigured with HTTP 503.
- Accepts valid base64 image (mocking GoogleGenAI) and returns HTTP 200 with recognized text.

Run complete quality gate suite:
```bash
npm test
npx tsc --noEmit
npx eslint .
npm run build:electron
```

---

## 2. Manual End-to-End Verification Scenarios

### Scenario 1: Clipboard Fallback to Region Overlay
1. Ensure `.env` has a valid `GEMINI_API_KEY`.
2. Launch the desktop app:
   ```bash
   npm run electron:dev
   ```
3. Open an image, scanned document, or video containing Vietnamese text.
4. Clear clipboard or do NOT copy anything (clipboard remains empty or unchanged).
5. Press `Ctrl+Shift+Space`.
6. **Expected Behavior**:
   - Instead of doing nothing, a transparent fullscreen overlay appears with a crosshair cursor.
   - Screen dims slightly with a dark semi-transparent veil.

### Scenario 2: Cancel Selection via Escape Key
1. While the region overlay is visible, press `Esc`.
2. **Expected Behavior**:
   - Overlay immediately closes.
   - No error dialog appears, no audio plays, VoxRead remains in its previous state.

### Scenario 3: Drag Selection & Automatic Audio Playback
1. Trigger `Ctrl+Shift+Space` with an empty clipboard.
2. Click and drag a rectangle over the visible text in the image/document.
3. Release the mouse button.
4. **Expected Behavior**:
   - Overlay transitions to a floating status pill: `"Đang nhận diện văn bản..."`.
   - Within 2–4 seconds, overlay disappears.
   - VoxRead window restores/focuses.
   - The document titled "Nội dung từ màn hình" is loaded.
   - VoxRead immediately begins speaking sentence 0 of the recognized text.

### Scenario 4: Missing GEMINI_API_KEY Pre-Check Guard
1. Temporarily comment out or rename `GEMINI_API_KEY` in `.env`.
2. Start the proxy server (`npm run proxy` or launch app).
3. Clear clipboard and press `Ctrl+Shift+Space`.
4. **Expected Behavior**:
   - The overlay does NOT open.
   - A clear Vietnamese informational dialog appears explaining that OCR requires `GEMINI_API_KEY` and internet access, while reminding that normal clipboard copying (`Ctrl+C`) and RVC local audio still work offline.

### Scenario 5: Image Without Text (Blank Selection)
1. Restore `GEMINI_API_KEY`.
2. Press `Ctrl+Shift+Space` and drag a rectangle over a completely blank wall/background.
3. **Expected Behavior**:
   - Overlay shows `"Đang nhận diện văn bản..."`.
   - Notification appears in Vietnamese: `"Không tìm thấy văn bản nào trong vùng đã chọn."`.
   - Existing playback state is preserved.