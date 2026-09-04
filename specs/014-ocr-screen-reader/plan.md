# Implementation Plan: Desktop OCR Screen Reader Fallback

**Branch**: `014-ocr-screen-reader` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/014-ocr-screen-reader/spec.md`  

---

## Summary

Enhance the desktop screen reader feature (introduced in `specs/013-clipboard-screen-reader`) with an automatic visual OCR fallback. When the user presses `Ctrl+Shift+Space` and the clipboard contains no fresh text (empty, whitespace-only, or unchanged from previous read), the application prompts a transparent, fullscreen region selection overlay. The user drags a rectangular bounding box around any non-copyable screen content (e.g. images, scanned PDFs, games). The screen is captured, cropped with display DPI scale compensation, and dispatched to a new `POST /api/ocr` route on the local Express proxy server (`server.js`). Powered by `gemini-2.5-flash` via `@google/genai`, verbatim text is extracted and forwarded to the existing `'screen-reader:clipboard-captured'` IPC pipeline, instantly auto-playing speech with zero renderer changes.

---

## Technical Context

**Language/Version**: TypeScript 5.8+ (Electron/React), Node.js 18+ (CommonJS bundle / Express)  
**Primary Dependencies**: Electron 44.x (`desktopCapturer`, `nativeImage`, `BrowserWindow`, `screen`), Express 4.21, `@google/genai` (Gemini Vision)  
**Storage**: Local `.env` file for `GEMINI_API_KEY`  
**Testing**: Vitest 4.x (Unit & mock tests in `tests/unit/`)  
**Target Platform**: Windows 10/11 x64 (Electron packaged executable & Vite dev server)  
**Project Type**: Desktop Application (Electron + React) + Local Express Proxy  
**Performance Goals**: Overlay opens in <100ms; OCR processing completes in <3s; Esc cancellation latency <200ms  
**Constraints**:
- Express JSON body parser expanded to `limit: '15mb'` to support base64 PNG captures without HTTP 413.
- Zero additional native OCR binaries or libraries (strictly reuse existing `@google/genai`).
- Direct reuse of existing IPC channel `'screen-reader:clipboard-captured'` to guarantee 100% compatibility with `useScreenReaderClipboard.ts` and `App.tsx`.
- Strict pre-check of `geminiConfigured` on `/health` before launching overlay.
- All quality gates (`npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build:electron`) must pass cleanly.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Constitution file `.specify/memory/constitution.md` is an unfilled template; constitution check is skipped gracefully per governance rules.
- Design strictly preserves non-regression on `python-backend/`, existing CORS origin policies, and JSON contracts.

---

## Project Structure

### Documentation (this feature)

```text
specs/014-ocr-screen-reader/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research, choices & rationale
├── data-model.md        # Entities, spatial coordinates, state machine
├── quickstart.md        # Automated & manual validation scenarios
├── contracts/
│   ├── ocr-endpoint.md  # HTTP contract for POST /api/ocr
│   └── overlay-ipc.md   # IPC contract for regionOverlay & main process
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Changes

```text
server.js                                     # Update express.json limit to 15mb, add POST /api/ocr
electron/
├── screenReader/
│   ├── regionOverlay.ts                      # [NEW] Fullscreen transparent selection window
│   └── screenCapture.ts                      # [NEW] DPI-compensated screen capture & crop
└── main.ts                                   # Wire fallback on empty clipboard, /health pre-check, IPC send
tests/
└── unit/
    └── ocrEndpoint.test.ts                   # [NEW] Vitest test suite for POST /api/ocr
```

---

## Implementation Phases

### Phase 1: Express Server OCR Route & Body Limit (`server.js`)
1. In `server.js`, modify `app.use(express.json())` to `app.use(express.json({ limit: '15mb' }))`.
2. Add route `POST /api/ocr` after `POST /api/fetch-url`:
   - Validate that `req.body.image` is a non-empty string.
   - Strip `data:image/...;base64,` prefix if present.
   - Validate decoded length does not exceed 15MB.
   - Verify `GEMINI_API_KEY` configuration (copying check from `/api/generate`), returning HTTP 503 if missing.
   - Call `ai.models.generateContent` with `gemini-2.5-flash`, passing image inline data and the verbatim prompt.
   - Return `{ ok: true, text }`.

### Phase 2: Automated Unit Tests (`tests/unit/ocrEndpoint.test.ts`)
1. Create `tests/unit/ocrEndpoint.test.ts` following `serverProxy.test.ts` pattern:
   - Test missing/empty image returns HTTP 400.
   - Test unconfigured `GEMINI_API_KEY` returns HTTP 503.
   - Test valid base64 payload (mocking `GoogleGenAI`) returns HTTP 200 with extracted text.

### Phase 3: Region Selection Overlay (`electron/screenReader/regionOverlay.ts`)
1. Implement `createRegionOverlay()`:
   - Queries `screen.getPrimaryDisplay().bounds`.
   - Creates a transparent, frameless, always-on-top, fullscreen `BrowserWindow`.
   - Loads an inlined HTML page rendering a semi-transparent dark veil and dynamic rubber-band rectangle.
   - Listens for `Esc` to cancel and close.
   - On valid mouseup (width > 5, height > 5), sends coordinates to main process and transitions to "Đang nhận diện văn bản..." loading pill.

### Phase 4: Screen Capture & Cropping (`electron/screenReader/screenCapture.ts`)
1. Implement `captureRegion(rect)`:
   - Obtains `primaryDisplay = screen.getPrimaryDisplay()`.
   - Multiplies dimensions and coordinates by `primaryDisplay.scaleFactor` to guarantee pixel-perfect cropping on high-DPI displays.
   - Calls `desktopCapturer.getSources({ types: ['screen'], thumbnailSize })`.
   - Crops thumbnail via `nativeImage.crop()` and converts to base64 PNG.

### Phase 5: Main Process Integration & Playback (`electron/main.ts`)
1. In `electron/main.ts`, update `handleScreenReaderShortcut`:
   - When clipboard text is empty, whitespace, or unchanged from `lastCapturedClipboardText`:
     - Fetch `http://127.0.0.1:3001/health`.
     - If `geminiConfigured === false`, show Vietnamese guide dialog and abort.
     - If true, launch `createRegionOverlay()`.
     - On selection: execute `captureRegion(rect)`, post to `http://127.0.0.1:3001/api/ocr`.
     - On success: close overlay, restore/focus `mainWindow`, emit `'screen-reader:clipboard-captured'` IPC message.
     - On failure or empty text: close overlay, display localized notification.

### Phase 6: Quality Gates & Verification
1. Run `npm test` verifying all unit tests pass (including `ocrEndpoint.test.ts`).
2. Run `npx tsc --noEmit` verifying 0 type errors.
3. Run `npx eslint .` verifying 0 lint errors.
4. Run `npm run build:electron` verifying esbuild bundling and packaging readiness.
