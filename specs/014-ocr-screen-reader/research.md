# Phase 0 Research: Desktop OCR Screen Reader Fallback

**Feature**: `014-ocr-screen-reader`  
**Date**: 2026-09-04  
**Author**: Antigravity  

---

## 1. Express Body Parser Limit Expansion

### Context
In `server.js`, `app.use(express.json())` currently has no custom payload limit. Express defaults to `100kb`. When a user captures a rectangular region on a 1080p, 1440p, or 4K display, the resulting cropped PNG converted to base64 string typically ranges from 200KB to 4MB (with large or complex selections potentially reaching 8–10MB). Without explicit limit configuration, Express immediately terminates the request with HTTP `413 Payload Too Large`, returning a cryptic HTML error page.

### Decision
Update `server.js` at line 15 to:
```javascript
app.use(express.json({ limit: '15mb' }));
```
Additionally, inside `POST /api/ocr`, implement defensive validation checking that the base64 string length does not exceed `15 * 1024 * 1024 * 1.37` (~20MB encoded), returning a friendly Vietnamese error JSON if exceeded instead of unhandled parser crashes.

### Rationale
- 15MB easily accommodates high-resolution cropped captures and even full 4K PNG screen captures.
- Native Node.js buffers and modern V8 engines handle 15MB allocations with negligible memory impact for local desktop proxy throughput.

---

## 2. Gemini Vision OCR Integration (@google/genai)

### Context
The `@google/genai` dependency is already integrated in `server.js` for `/api/generate`. The user requirement mandates zero external OCR libraries (no Tesseract, EasyOCR, or native C++ binaries) to keep the packaged application lightweight and cross-platform.

### Decision
In `POST /api/ocr`:
1. Check `rawKey = process.env.GEMINI_API_KEY` using the exact check from `/api/generate`. If unconfigured, return HTTP 503.
2. Strip any data URI header (`data:image/png;base64,` or `data:image/jpeg;base64,`) if present.
3. Call `ai.models.generateContent` with:
   - `model: 'gemini-2.5-flash'`
   - `contents`:
     ```javascript
     [
       {
         inlineData: {
           mimeType: 'image/png',
           data: base64Data,
         },
       },
       'Chỉ trả về nguyên văn chữ nhận diện được trong ảnh, không thêm bất kỳ lời giải thích, lời chào hay định dạng markdown nào. Nếu không có chữ, trả về chuỗi rỗng.',
     ]
     ```
4. Extract `response.text`, trim, and return `{ ok: true, text }`.

### Rationale
- `gemini-2.5-flash` has exceptional OCR accuracy for Vietnamese diacritics, low-contrast text, stylized fonts, and complex multi-column layouts.
- Fast inference latency (~1–2 seconds), crucial for interactive desktop reading.
- No local GPU or heavy native binary requirements.

---

## 3. Screen Region Selection Overlay Architecture

### Context
When the fallback triggers, the user needs an intuitive, fluid way to select a rectangular area on their screen, similar to the Windows Snipping Tool (`Win+Shift+S`).

### Options Evaluated
1. **Option A (External Snipping Tool / OS CLI)**:
   - Call PowerShell or Windows snipping API.
   - *Downside*: Non-portable, cannot capture coordinates directly back to Electron, inconsistent behavior across Windows builds.
2. **Option B (Separate Dedicated React Route)**:
   - Route `mainWindow` or an auxiliary window to an internal React page.
   - *Downside*: Heavyweight, introduces React bundle overhead and routing complexity for a single mouse-drag canvas.
3. **Option C (Lightweight Frameless Transparent BrowserWindow with Inlined HTML)**:
   - Create a dedicated fullscreen `BrowserWindow` (`frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, fullscreen: true`).
   - Load an inlined, lightweight HTML/CSS/JS canvas via `loadURL('data:text/html;charset=utf-8,...')`.
   - The inlined page renders a semi-transparent dark backdrop, crosshair cursor, rubber-band selection box, and listens for `mousedown`, `mousemove`, `mouseup`, and `keydown (Escape)`.
   - Sends selected coordinates `{ x, y, width, height }` back to the main process via IPC.

### Decision
**Option C**. It is instantaneous (<50ms to render), completely self-contained, does not interfere with the main React reader UI, and allows customized visual feedback.

---

## 4. Screen Capture and Display Scaling Compensation

### Context
In Electron on Windows, displays often have DPI scaling factors (e.g. 125%, 150%, 200%). If the user selects a rectangle at screen coordinates `(100, 100, 400, 200)` on a 150% scaled display:
- `desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } })` captures the display at physical pixels (`size.width * scaleFactor`, `size.height * scaleFactor`).
- If `nativeImage.crop()` uses the unscaled logical coordinates, the cropped image will be offset and blurry!

### Decision
In `electron/screenReader/screenCapture.ts`:
1. Retrieve `primaryDisplay = screen.getPrimaryDisplay()`.
2. Compute `scaleFactor = primaryDisplay.scaleFactor || 1`.
3. Set `thumbnailSize`:
   ```typescript
   thumbnailSize: {
     width: Math.round(primaryDisplay.size.width * scaleFactor),
     height: Math.round(primaryDisplay.size.height * scaleFactor),
   }
   ```
4. Scale the crop rectangle:
   ```typescript
   const cropRect = {
     x: Math.round(rect.x * scaleFactor),
     y: Math.round(rect.y * scaleFactor),
     width: Math.round(rect.width * scaleFactor),
     height: Math.round(rect.height * scaleFactor),
   };
   ```
5. Crop using `screenImage.crop(cropRect)` and convert via `cropped.toPNG().toString('base64')`.

---

## 5. Loading Indicator Strategy During Recognition

### Context
User requirement 5 states:
> "Trong lúc chờ OCR xử lý (có thể mất vài giây), overlay hoặc mainWindow cần hiện trạng thái 'Đang nhận diện văn bản...' — quyết định vị trí hiển thị hợp lý (có thể giữ overlay ở dạng loading nhỏ góc màn hình thay vì đóng ngay) và ghi lại lựa chọn trong research.md."

### Evaluation
- **Option 1: Close overlay immediately, show status in mainWindow**:
  - *Problem*: `mainWindow` may be minimized, behind other windows, or not yet focused. The user just looked at a specific area on their screen; popping `mainWindow` immediately before text is ready feels jarring.
- **Option 2: Keep the entire full-screen overlay dark while waiting**:
  - *Problem*: Blocks the entire desktop while waiting for the network call; user cannot interact with their system if the API takes 3 seconds.
- **Option 3: Morph overlay into a compact floating pill at screen bottom-right or center**:
  - Upon `mouseup`, the overlay window resizes or updates its content to clear the full-screen backdrop and show a floating pill with a spinner and text:
    `"Đang nhận diện văn bản..."`
  - Positioned at the top/center or center of the screen with a semi-transparent dark background (`rgba(15, 15, 20, 0.9)`), emerald spinner, and clean typography.
  - When OCR completes or fails, the overlay closes immediately. If text is found, `mainWindow` focuses and audio starts.

### Decision
**Option 3**. The overlay window stays active during the OCR request, displaying an animated floating pill `"Đang nhận diện văn bản..."` with a pulsating spinner. When the request resolves, the overlay closes seamlessly and `mainWindow` focuses to begin audio playback. If OCR fails, the overlay closes and an informative dialog or notification is presented.

---

## 6. Pre-check for GEMINI_API_KEY Configuration

### Context
The clipboard screen reader (specs/013) and local RVC audio engine operate 100% offline. However, the OCR fallback requires cloud Gemini inference. If a user presses `Ctrl+Shift+Space` without a configured key, allowing them to draw a rectangle and wait, only to show an error at the very end, creates a frustrating experience.

### Decision
In `electron/main.ts`, before opening `regionOverlay`:
1. Perform a quick fetch to `http://127.0.0.1:3001/health`.
2. Inspect `geminiConfigured`.
3. If `geminiConfigured === false`:
   - Do NOT open the overlay.
   - Display `showPrerequisiteWarning` informing the user in Vietnamese:
     `"Tính năng nhận diện chữ từ vùng màn hình (OCR) yêu cầu cấu hình GEMINI_API_KEY trong file .env và kết nối Internet.\n\n(Lưu ý: Tính năng đọc văn bản bôi đen qua Ctrl+C và giọng đọc RVC local vẫn hoạt động offline bình thường)."`
4. If `geminiConfigured === true`: Proceed with overlay launch.

---

## 7. Pipeline Reuse Strategy

### Context
In Feature 013 (`specs/013-clipboard-screen-reader`), the renderer already has:
- IPC listener in `src/hooks/useScreenReaderClipboard.ts`:
  `window.voxreadDesktop.screenReader.onClipboardCaptured((text) => ...)`
- Handler in `src/App.tsx` that sets `currentDocument` with format `'screen-capture'`, resets chapter to 0, sets `pendingAutoPlay = true`, and auto-starts audio speech.

### Decision
When OCR succeeds and extracts text, `electron/main.ts` sends the text through the exact same IPC channel:
```typescript
mainWindow.webContents.send('screen-reader:clipboard-captured', extractedText);
```
Zero new IPC channels or renderer refactoring required! The existing TTS audio playback engine naturally consumes the OCR text as if it was captured from the clipboard.