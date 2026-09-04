# Feature Specification: Desktop OCR Screen Reader Fallback ("Tầng OCR dự phòng cho Đọc màn hình")

**Feature Branch**: `014-ocr-screen-reader`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: User description: "Thêm tầng OCR dự phòng cho tính năng 'Đọc màn hình' đã có (specs/013, electron/main.ts đã có phím tắt Ctrl+Shift+Space đọc clipboard). Tầng này xử lý trường hợp KHÔNG có văn bản thật để copy — ảnh, PDF scan, game, hoặc khi clipboard rỗng/không đổi lúc bấm phím tắt..."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interactive Region Snip & Screen Capture Fallback (Priority: P1) 🎯 MVP Part 1

As a user viewing non-selectable visual content on my computer (e.g. scanned PDF documents, infographic images, games, or web pages with text-selection disabled), I want pressing the global shortcut (`Ctrl+Shift+Space`) with an empty or unchanged clipboard to automatically prompt an on-screen region selector, so that I can drag a rectangle around the text I want VoxRead to read.

**Why this priority**: Without this fallback, the screen reader fails silently when users encounter non-copyable text. Providing an intuitive rectangular snip overlay bridges the gap between text-based copy and visual media.

**Independent Test**:
1. Clear the system clipboard or leave it unchanged.
2. Focus any application with non-selectable text (e.g. an image viewer showing Vietnamese text).
3. Press `Ctrl+Shift+Space`.
4. Verify a transparent, fullscreen overlay appears with a crosshair cursor.
5. Click and drag a rectangle over the desired text area and release the mouse.
6. Verify the overlay closes and the captured region is processed.
7. Alternatively, press `Esc` to verify the overlay cancels immediately with zero side effects.

**Acceptance Scenarios**:

1. **Given** the system clipboard is empty, whitespace-only, or unchanged since the last read, **When** the user presses `CommandOrControl+Shift+Space`, **Then** the application triggers the fallback workflow and opens a fullscreen, transparent, always-on-top region selection overlay.
2. **Given** the region overlay is active, **When** the user presses the `Escape` key, **Then** the overlay closes immediately, no screen capture or network requests are made, and the application returns to normal state.
3. **Given** the region overlay is active, **When** the user clicks and drags the mouse across a region, **Then** a visible selection rectangle tracks the cursor in real time.
4. **Given** the user releases the mouse button after selecting a valid rectangle (width > 5px, height > 5px), **When** mouse release occurs, **Then** the overlay captures the coordinates `{ x, y, width, height }`, triggers screen capture, and closes the selection interface.

---

### User Story 2 - Backend OCR Extraction via Gemini Vision & Automatic TTS Playback (Priority: P1) 🎯 MVP Part 2

As a user who has selected an on-screen area containing text, I want VoxRead to analyze the captured image using Gemini Vision OCR, extract verbatim plain text without formatting or conversational filler, and automatically load and read it aloud using the established reader pipeline.

**Why this priority**: Completes the core end-to-end loop: snip image → recognize text → seamless speech playback through the existing audio engine.

**Independent Test**:
1. Drag a selection box over an image containing readable Vietnamese text.
2. Observe visual feedback indicating text recognition is in progress.
3. Verify that within seconds, VoxRead's main window focuses and starts speaking the exact text found in the image.
4. Verify no conversational AI greetings, introductory remarks, or markdown code fences are read aloud.

**Acceptance Scenarios**:

1. **Given** a cropped screen capture image as base64 PNG, **When** sent to `POST /api/ocr`, **Then** the backend validates the image payload (rejecting empty or corrupt payloads with HTTP 400).
2. **Given** a valid base64 image and a configured `GEMINI_API_KEY`, **When** processed by the Gemini Vision model (`gemini-2.5-flash`), **Then** the backend returns `{ ok: true, text: string }` containing strictly the verbatim extracted text.
3. **Given** successful OCR text extraction in the main process, **When** the text is received, **Then** the main process emits the text through the existing IPC channel `'screen-reader:clipboard-captured'`, automatically loading the text into the reading UI and triggering speech synthesis from sentence 0.

---

### User Story 3 - Visual Feedback, API Key Pre-check & Localized Error Handling (Priority: P2)

As a user relying on the OCR screen reader, I want clear visual status while recognition is running and informative Vietnamese feedback if my API key is missing or the capture fails, so that I understand what is happening and how to resolve issues.

**Why this priority**: OCR requires cloud AI and internet access. Clear feedback prevents user confusion when offline, unconfigured, or when facing technical capture limitations (e.g. exclusive fullscreen games).

**Independent Test**:
1. Clear `GEMINI_API_KEY` from `.env` and restart the app.
2. Trigger `Ctrl+Shift+Space` with an empty clipboard.
3. Verify VoxRead displays an informative Vietnamese dialog explaining that OCR requires `GEMINI_API_KEY` configuration, without showing the capture overlay.
4. Reconfigure `GEMINI_API_KEY`, select an area with no text (e.g. blank background), and verify a helpful notification explains that no text was found.

**Acceptance Scenarios**:

1. **Given** `GEMINI_API_KEY` is not configured (as reported by `/health` `geminiConfigured: false`), **When** the user falls into the OCR fallback branch, **Then** the app displays an instructional dialog explaining how to configure the key and does NOT open the region overlay.
2. **Given** region selection has completed and the image is sent for OCR processing, **When** waiting for the Gemini API response, **Then** a visible indicator ("Đang nhận diện văn bản...") informs the user that recognition is active.
3. **Given** the image contains no readable text or recognition returns an empty string, **When** OCR completes, **Then** VoxRead displays a non-blocking notification in Vietnamese stating that no readable text was detected in the selected area.
4. **Given** screen capture fails (e.g. due to OS permissions or exclusive graphics mode), **When** capture errors, **Then** VoxRead displays a clear Vietnamese message distinguishing capture failure from AI recognition errors.

---

### Edge Cases

- **Zero-Area or Accidental Click**: If the user clicks without dragging (selection width or height < 5 pixels), the overlay closes without triggering screen capture or wasting Gemini API calls.
- **Large High-Resolution Screens**: Multi-monitor or 4K setups capture large PNG images; the Express server body parser limit must accommodate base64 images up to 15MB (`express.json({ limit: '15mb' })`).
- **Display DPI / Scaling Factor**: Screen capture coordinates from Electron's primary display must account for Windows display scaling factors (e.g. 125%, 150%) so the cropped image accurately matches the user's visual selection rectangle.
- **Exclusive Fullscreen Applications**: Certain 3D DirectX games running in exclusive fullscreen mode may return black or empty frames to `desktopCapturer`; this must be caught and reported as a capture failure rather than crashing.
- **Network or Gemini Quota Failure**: If the network connection drops or the Gemini API returns rate limit / quota errors during OCR, a descriptive Vietnamese error message is shown to the user.
- **Escape During Selection**: Pressing `Esc` while dragging terminates the drag and closes the overlay without making requests.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Part A: Express Backend OCR Route & Body Limit (server.js)
- **FR-001**: The Express JSON middleware in `server.js` MUST be configured with a 15MB payload limit: `app.use(express.json({ limit: '15mb' }))`.
- **FR-002**: The server MUST expose a new endpoint `POST /api/ocr` positioned after `/api/fetch-url`, inheriting the existing CORS whitelist middleware.
- **FR-003**: The `POST /api/ocr` endpoint MUST accept JSON `{ image: string }` where `image` is a base64-encoded string (with or without `data:image/...;base64,` data URI prefix).
- **FR-004**: The endpoint MUST reject empty, missing, non-string, or excessively large (>15MB decoded) image payloads with HTTP 400 and a descriptive Vietnamese error message.
- **FR-005**: The endpoint MUST verify `GEMINI_API_KEY` configuration using the exact verification pattern from `/api/generate`, returning HTTP 503 if the key is missing or unconfigured.
- **FR-006**: The endpoint MUST invoke the Google GenAI SDK (`@google/genai`) using model `gemini-2.5-flash` with the image passed as `inlineData` (`mimeType: 'image/png'`) and a system prompt requesting verbatim plain text only, omitting explanations, markdown, or commentary.
- **FR-007**: The endpoint MUST return HTTP 200 with JSON payload `{ ok: true, text: string }` upon successful recognition.

#### Part B: Region Selection Overlay (electron/screenReader/regionOverlay.ts)
- **FR-008**: The system MUST implement `regionOverlay.ts` providing an interactive fullscreen BrowserWindow across `screen.getPrimaryDisplay().bounds` with `frame: false`, `transparent: true`, `alwaysOnTop: true`, and `skipTaskbar: true`.
- **FR-009**: The overlay MUST display a crosshair cursor and provide a click-and-drag rubber-band selection box with visual boundary styling.
- **FR-010**: The overlay MUST listen for the `Escape` key to immediately cancel selection and close the window.
- **FR-011**: Upon mouse release with a valid selection (width > 5, height > 5), the overlay MUST send the bounding box `{ x, y, width, height }` to the main process and close or transition to loading state.

#### Part C: Screen Capture & Cropping (electron/screenReader/screenCapture.ts)
- **FR-012**: The system MUST implement `screenCapture.ts` utilizing `desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } })` to capture the primary display at full native resolution.
- **FR-013**: The capture module MUST crop the captured image to the selected bounding box using `nativeImage.crop()` and convert the cropped region to base64 PNG format via `toPNG().toString('base64')`.

#### Part D: Shortcut Integration & Playback Pipeline (electron/main.ts)
- **FR-014**: In `electron/main.ts`, the `CommandOrControl+Shift+Space` global shortcut handler MUST check clipboard text; if empty, whitespace-only, or identical to `lastCapturedClipboardText`, it MUST enter the OCR fallback branch instead of exiting silently.
- **FR-015**: Before opening the overlay, the fallback branch MUST verify that the proxy server's `/health` endpoint reports `geminiConfigured: true`; if false, it MUST show an informational dialog and abort.
- **FR-016**: While OCR processing is in progress, the application MUST present a clear visual loading indicator ("Đang nhận diện văn bản...").
- **FR-017**: Upon receiving OCR text, the main process MUST emit the text through the existing IPC channel `'screen-reader:clipboard-captured'`, allowing the existing renderer hook (`useScreenReaderClipboard.ts`) and reader component (`App.tsx`) to parse and play the speech without modifications.
- **FR-018**: If OCR recognition returns an empty string or error, the application MUST display an informative Vietnamese dialog/notification without crashing or interrupting the reader state.

---

### Non-Functional & Scope Constraints

- **NFR-001**: No additional OCR native dependencies (e.g. Tesseract, EasyOCR) shall be installed; OCR relies strictly on the existing `@google/genai` dependency.
- **NFR-002**: No modifications to the CORS or SSRF middleware logic established in Feature 012.
- **NFR-003**: The renderer IPC channel `'screen-reader:clipboard-captured'` MUST be reused directly to maintain zero regressions in `App.tsx` and `useScreenReaderClipboard.ts`.
- **NFR-004**: All quality gates MUST pass: `npm test`, `npx tsc --noEmit`, `npx eslint .`, and `npm run build:electron`.
- **NFR-005**: All user-facing error dialogs, tooltips, and status messages MUST be written in clear Vietnamese matching the application's tone.

---

### Key Entities

- **Region Bounding Box**: Spatial coordinate object `{ x: number, y: number, width: number, height: number }` defining the on-screen capture target.
- **OCR Request Payload**: Data transfer object `{ image: string }` sent to `/api/ocr`.
- **OCR Response Payload**: Contract `{ ok: boolean, text?: string, error?: string }`.
- **Overlay Window Controller**: Lifecycle manager for the transparent selection window.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can trigger region selection on non-copyable screen content via `Ctrl+Shift+Space` and begin hearing synthesized speech within 5 seconds of releasing the mouse.
- **SC-002**: Pressing `Esc` closes the region overlay in under 200ms with zero memory leaks or background process hang.
- **SC-003**: Extracted OCR text is clean and verbatim, containing 0% AI conversational chatter ("Here is the text...", "Sure, I can help").
- **SC-004**: Requests without `GEMINI_API_KEY` are blocked gracefully at pre-check with 100% reliability, preventing futile user snips.
- **SC-005**: All existing unit tests and new `/api/ocr` unit tests pass with 100% success rate, with 0 TypeScript and 0 ESLint errors.

---

## Assumptions

- The primary screen resolution and display bounds can be queried via Electron's `screen.getPrimaryDisplay()`.
- Windows display scaling factors are supported through Electron's native device pixel ratio methods.
- The user has an active internet connection when using the OCR fallback mode (unlike offline RVC / clipboard modes).
- `GEMINI_API_KEY` is provided via `.env` in the application environment.