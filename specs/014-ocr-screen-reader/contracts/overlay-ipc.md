# IPC Contract: Screen Reader Region Overlay

**Feature**: `014-ocr-screen-reader`  
**Layers**: Electron Main Process ↔ Region Overlay Window ↔ Main Window Renderer  

---

## 1. Overlay ↔ Main Process Internal Communication

These channels coordinate the lifecycle of the fullscreen selection overlay window.

### 1.1 Channel: `screen-reader:overlay:region-selected`
- **Direction**: Region Overlay Renderer → Main Process
- **Trigger**: User finishes dragging and releases the mouse with a valid rectangle (`width > 5` and `height > 5`).
- **Payload**:
  ```typescript
  interface RegionRect {
    x: number;      // Top-left logical X coordinate on primary screen
    y: number;      // Top-left logical Y coordinate on primary screen
    width: number;  // Width in logical pixels
    height: number; // Height in logical pixels
  }
  ```
- **Main Process Action**:
  1. Transitions overlay window to loading indicator state ("Đang nhận diện văn bản...").
  2. Invokes `captureRegion(rect)` via `desktopCapturer`.
  3. Dispatches image to `POST /api/ocr`.
  4. Closes overlay window when recognition succeeds or fails.

---

### 1.2 Channel: `screen-reader:overlay:cancel`
- **Direction**: Region Overlay Renderer → Main Process
- **Trigger**: User presses `Escape` key or clicks without dragging (`width <= 5` or `height <= 5`).
- **Payload**: `void`
- **Main Process Action**:
  1. Closes and destroys the overlay window immediately.
  2. Aborts capture workflow with zero side effects.

---

## 2. Main Process ↔ Main Window (Reused Contract)

### 2.1 Channel: `screen-reader:clipboard-captured`
- **Direction**: Main Process → Main Window Renderer
- **Trigger**: OCR text successfully returned from `POST /api/ocr` (or clipboard capture from Feature 013).
- **Payload**:
  ```typescript
  text: string // Extracted verbatim text
  ```
- **Renderer Behavior (Existing / Untouched)**:
  1. Handled by `useScreenReaderClipboard.ts`.
  2. Parses text into chapters and sentences via `parseNovelText(text, 'Nội dung từ màn hình')`.
  3. Creates `DocumentItem` with `format: 'screen-capture'`.
  4. Resets `currentChapterIndex` to 0 and sets `pendingAutoPlay` to `true`.
  5. Auto-plays sentence 0 using active TTS voice.