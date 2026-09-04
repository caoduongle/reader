# Tasks: Desktop OCR Screen Reader Fallback

**Feature**: `014-ocr-screen-reader`
**Generated**: 2026-09-04
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Expand the Express body parser limit to support base64 image payloads and prepare foundational config.

- [X] T001 Update `app.use(express.json())` to `app.use(express.json({ limit: '15mb' }))` in `server.js` (FR-001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the backend OCR endpoint that all downstream Electron integration depends on.

> **CRITICAL**: The `/api/ocr` route must be functional and tested before Electron overlay or main process integration begins.

- [X] T002 Add `POST /api/ocr` route in `server.js` after the existing `POST /api/fetch-url` route, including: validate `req.body.image` is a non-empty string (HTTP 400), strip optional `data:image/...;base64,` prefix, validate decoded size ≤ 15MB (HTTP 400), verify `GEMINI_API_KEY` configuration using the same check as `/api/generate` (HTTP 503), call `ai.models.generateContent` with model `gemini-2.5-flash` using `inlineData` and Vietnamese verbatim-only prompt, return `{ ok: true, text }` on success or `{ ok: false, error }` on failure (FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)
- [X] T003 Create unit test file `tests/unit/ocrEndpoint.test.ts` following the `serverProxy.test.ts` pattern: test missing/empty image returns HTTP 400, test non-string image returns HTTP 400, test unconfigured `GEMINI_API_KEY` returns HTTP 503, test valid base64 payload with mocked `GoogleGenAI` returns HTTP 200 with `{ ok: true, text }` (NFR-004)

**Checkpoint**: `POST /api/ocr` endpoint is fully implemented and all unit tests pass via `npm test`.

---

## Phase 3: User Story 1 – Interactive Region Snip & Screen Capture Fallback (Priority: P1) 🎯 MVP Part 1

**Goal**: When `Ctrl+Shift+Space` is pressed with an empty/unchanged clipboard, a transparent fullscreen overlay appears allowing the user to drag a rectangle over non-copyable text, then captures and crops the selected region with DPI compensation.

**Independent Test**: Clear clipboard → press `Ctrl+Shift+Space` → overlay opens with crosshair → drag rectangle → release mouse → region coordinates are captured. Pressing `Esc` cancels cleanly.

### Implementation for User Story 1

- [X] T004 [P] [US1] Create `electron/screenReader/regionOverlay.ts` implementing `createRegionOverlay()` that: queries `screen.getPrimaryDisplay().bounds`, creates a fullscreen transparent frameless always-on-top `BrowserWindow` (`frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true`), loads an inlined HTML page with crosshair cursor, semi-transparent dark veil, and rubber-band selection rectangle, listens for `Escape` key to emit `'screen-reader:overlay:cancel'` IPC and close, on valid `mouseup` (width > 5, height > 5) emits `'screen-reader:overlay:region-selected'` IPC with `{ x, y, width, height }` and transitions to loading pill displaying `"Đang nhận diện văn bản..."` (FR-008, FR-009, FR-010, FR-011)
- [X] T005 [P] [US1] Create `electron/screenReader/screenCapture.ts` implementing `captureRegion(rect: RegionRect): Promise<string>` that: obtains `screen.getPrimaryDisplay()`, computes `scaleFactor`, sets `thumbnailSize` to `{ width: size.width * scaleFactor, height: size.height * scaleFactor }`, calls `desktopCapturer.getSources({ types: ['screen'], thumbnailSize })`, crops the thumbnail via `nativeImage.crop()` using DPI-scaled coordinates, returns cropped image as base64 PNG string via `toPNG().toString('base64')` (FR-012, FR-013)

**Checkpoint**: Both `regionOverlay.ts` and `screenCapture.ts` compile without TypeScript errors (`npx tsc --noEmit`). Overlay can be instantiated and returns region coordinates.

---

## Phase 4: User Story 2 – Backend OCR Extraction & Automatic TTS Playback (Priority: P1) 🎯 MVP Part 2

**Goal**: The main process wires the overlay → screen capture → `/api/ocr` → existing IPC pipeline so that OCR text is automatically loaded and spoken aloud by the existing reader.

**Independent Test**: Select a region with readable Vietnamese text → hear VoxRead speaking the exact text within seconds, with document titled "Nội dung từ màn hình".

### Implementation for User Story 2

- [X] T006 [US2] In `electron/main.ts`, update the `handleScreenReaderShortcut` function: when clipboard text is empty, whitespace-only, or identical to `lastCapturedClipboardText`, enter the OCR fallback branch — call `createRegionOverlay()`, listen for `'screen-reader:overlay:region-selected'` IPC to invoke `captureRegion(rect)`, POST the base64 image to `http://127.0.0.1:3001/api/ocr`, on success emit `mainWindow.webContents.send('screen-reader:clipboard-captured', text)`, close overlay, restore/focus `mainWindow`; listen for `'screen-reader:overlay:cancel'` IPC to close overlay cleanly (FR-014, FR-017)

**Checkpoint**: End-to-end flow works: empty clipboard → `Ctrl+Shift+Space` → overlay → drag selection → OCR → speech playback via existing pipeline.

---

## Phase 5: User Story 3 – Visual Feedback, API Key Pre-check & Localized Error Handling (Priority: P2)

**Goal**: Add clear pre-flight checks, loading indicators, and localized error messages so users always understand the system state.

**Independent Test**: Without `GEMINI_API_KEY` → `Ctrl+Shift+Space` shows guidance dialog without overlay. With key configured → select blank area → Vietnamese "no text found" notification.

### Implementation for User Story 3

- [X] T007 [US3] In `electron/main.ts`, add `/health` pre-check before opening overlay: fetch `http://127.0.0.1:3001/health`, if `geminiConfigured === false` show informational Vietnamese dialog via `dialog.showMessageBox()` explaining OCR requires `GEMINI_API_KEY` and internet, do NOT open overlay (FR-015)
- [X] T008 [US3] In `electron/main.ts`, add differentiated error handling: if `captureRegion()` throws (e.g. permissions, exclusive fullscreen), show Vietnamese capture failure dialog; if `/api/ocr` returns `{ ok: false }` or network error, show Vietnamese OCR error notification; if OCR returns empty text (`text.trim() === ''`), show Vietnamese notification `"Không tìm thấy văn bản nào trong vùng đã chọn."` (FR-016, FR-018)

**Checkpoint**: All error branches produce correct Vietnamese messages. Pre-check guard blocks overlay when key is missing.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, build verification, and final validation.

- [X] T009 Run `npm test` and verify all unit tests pass including `ocrEndpoint.test.ts`
- [X] T010 [P] Run `npx tsc --noEmit` and verify 0 TypeScript errors across the entire project
- [X] T011 [P] Run `npx eslint .` and verify 0 lint errors
- [X] T012 Run `npm run build:electron` and verify esbuild bundling completes successfully (dist-electron/server.cjs produced)
- [X] T013 Run manual verification scenarios from [quickstart.md](./quickstart.md): Scenario 1 (overlay trigger), Scenario 2 (Esc cancel), Scenario 3 (drag & auto-play), Scenario 4 (missing key guard), Scenario 5 (blank selection)
- [X] T014 Git commit all changes with descriptive message referencing `specs/014-ocr-screen-reader`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (`express.json` limit must be set before `/api/ocr` route can accept payloads)
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (needs `/api/ocr` endpoint to exist for integration)
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion (needs `regionOverlay.ts` and `screenCapture.ts`)
- **User Story 3 (Phase 5)**: Depends on Phase 4 completion (adds error handling and pre-checks to the already-wired main process flow)
- **Polish (Phase 6)**: Depends on all Phases 1–5

### Within Each Phase

- T001 → T002 → T003 (sequential: limit → route → tests)
- T004 ‖ T005 (parallel: overlay and capture modules are independent files)
- T006 depends on T004 + T005 (wires both modules together)
- T007 ‖ T008 (parallel: pre-check and error handling are independent additions to `main.ts`, but both come after T006)

### Parallel Opportunities

```text
# After Phase 2 completes, these can run in parallel:
Task T004: "Create regionOverlay.ts"
Task T005: "Create screenCapture.ts"

# After Phase 4 completes, these can run in parallel:
Task T007: "Add /health pre-check"
Task T008: "Add differentiated error handling"

# During Phase 6, these can run in parallel:
Task T010: "TypeScript check"
Task T011: "ESLint check"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003)
3. Complete Phase 3: User Story 1 (T004, T005)
4. Complete Phase 4: User Story 2 (T006)
5. **STOP and VALIDATE**: Test the full snip → OCR → speech pipeline end-to-end
6. Deploy/demo if ready — the core OCR fallback works

### Incremental Delivery

1. Setup + Foundational → Backend OCR route operational
2. Add User Story 1 → Region overlay + screen capture working
3. Add User Story 2 → Full pipeline wired, audio auto-plays (**MVP complete!**)
4. Add User Story 3 → Polish with pre-checks and localized errors
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to specific user story for traceability
- The spec explicitly requires unit tests for the OCR endpoint (NFR-004, Phase 2 plan)
- All user-facing text MUST be in Vietnamese (NFR-005)
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
