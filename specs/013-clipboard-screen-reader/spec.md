# Feature Specification: Desktop Clipboard Screen Reader ("Đọc màn hình từ Clipboard")

**Feature Branch**: `013-clipboard-screen-reader`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: User description: "Thêm tính năng 'Đọc màn hình' (tầng clipboard) vào VoxRead desktop: người dùng bôi đen + Ctrl+C nội dung ở BẤT KỲ app nào đang mở (Word, PDF reader, tab trình duyệt khác, Notepad...), sau đó bấm phím tắt toàn cục của VoxRead để đọc ngay nội dung vừa copy, dùng lại nguyên vẹn pipeline đọc/TTS hiện có."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Global Shortcut & Direct Clipboard Audio Playback (Priority: P1) 🎯 MVP

As a user reading or working in any external desktop application (e.g. Word, web browser, PDF viewer, Notepad), I want to highlight text, copy it with Ctrl+C, and immediately trigger VoxRead via a global keyboard shortcut (`Ctrl+Shift+Space`) to read the text aloud, without manually switching windows or pasting text into VoxRead.

**Why this priority**: This is the core functionality and MVP value proposition of the screen-reader feature—providing instant, frictionless TTS consumption of selected content anywhere in the OS.

**Independent Test**:
1. Copy a passage of text from Notepad or a browser with `Ctrl+C`.
2. Press `Ctrl+Shift+Space` anywhere in the operating system.
3. Verify VoxRead window restores/focuses, loads the document titled "Nội dung từ màn hình", and automatically begins reading the first sentence aloud using the active TTS voice.

**Acceptance Scenarios**:

1. **Given** text has been copied to the system clipboard from an external application, **When** the user presses `CommandOrControl+Shift+Space`, **Then** VoxRead restores and focuses its main window, parses the clipboard text into chapters and sentences, creates a `DocumentItem` with format `'screen-capture'` and title `'Nội dung từ màn hình'`, and automatically begins TTS playback from sentence 0 without manual user intervention.
2. **Given** VoxRead is currently minimized or hidden in the system tray, **When** the user presses `CommandOrControl+Shift+Space` with newly copied text, **Then** the window is shown and focused, and speech playback begins immediately.
3. **Given** the user presses `CommandOrControl+Shift+Space` twice consecutively without copying new text, **When** the second press occurs, **Then** VoxRead detects that the clipboard content is identical to the last captured text and ignores the request silently without resetting or restarting playback.
4. **Given** the system clipboard is empty or contains only whitespace characters, **When** the user presses `CommandOrControl+Shift+Space`, **Then** the system ignores the trigger silently without displaying errors or interrupting existing reading state.

---

### User Story 2 - UI Guidance & Discovery via ControlBar and System Tray (Priority: P2)

As a VoxRead user, I want clear visual cues and guidance in the ControlBar and system tray context menu explaining how the clipboard screen reader works, so that I can easily discover and utilize the global shortcut.

**Why this priority**: Users need discoverability and a reminder of the global shortcut workflow directly within the app interface. Since clicking a mouse button necessarily changes OS focus away from the source text, the UI buttons serve primarily as guidance and workflow reminders.

**Independent Test**:
1. In the VoxRead reading interface, locate and click the "Đọc màn hình" button on the floating `ControlBar`.
2. Verify an instructional toast or dialog appears in Vietnamese detailing the 3-step usage: "Bôi đen văn bản ở bất kỳ đâu, nhấn Ctrl+C, rồi bấm Ctrl+Shift+Space để đọc".
3. Right-click the VoxRead system tray icon, select "Đọc màn hình (Ctrl+Shift+Space)", and verify the same instructional guidance is presented.

**Acceptance Scenarios**:

1. **Given** the VoxRead ControlBar is displayed, **When** the user views the control actions, **Then** a dedicated button with a screen reader icon (`ScanText` or `MonitorSpeaker`) and tooltip `"Đọc màn hình (Ctrl+Shift+Space)"` is visible.
2. **Given** the user clicks the "Đọc màn hình" button in the ControlBar, **When** triggered, **Then** a friendly instructional message is displayed explaining how to highlight, copy (`Ctrl+C`), and activate via shortcut.
3. **Given** the VoxRead tray icon is right-clicked, **When** viewing the tray menu, **Then** a menu item `"Đọc màn hình (Ctrl+Shift+Space)"` is present and triggers the instructional guidance dialog when clicked.
4. **Given** VoxRead is running in a standard web browser (non-Electron environment), **When** components load, **Then** the desktop-specific IPC integrations gracefully no-op without throwing errors or breaking UI rendering.

---

### User Story 3 - Conflict Handling and Safe Lifecycle Teardown (Priority: P3)

As a desktop user, I want VoxRead to gracefully handle shortcut conflicts and properly release OS keyboard hooks upon quitting, so that system stability and other applications remain unaffected.

**Why this priority**: Ensures system-level stability and conflict transparency without causing crashes or persistent hook locks on Windows.

**Independent Test**:
1. Simulate or test startup when `CommandOrControl+Shift+Space` is already bound by another application.
2. Verify VoxRead displays a non-blocking informational dialog in Vietnamese (`showPrerequisiteWarning`) and continues running normally.
3. Quit the application and verify `globalShortcut.unregisterAll()` executes on the `will-quit` lifecycle event.

**Acceptance Scenarios**:

1. **Given** the global shortcut cannot be registered (occupied by another background tool or system app), **When** VoxRead initializes, **Then** `showPrerequisiteWarning` is called with a clear Vietnamese explanation, and the application proceeds with normal startup without throwing unhandled exceptions.
2. **Given** the application is closing, **When** the `will-quit` event fires, **Then** all global shortcuts are explicitly unregistered to leave system shortcuts clean.

---

### Edge Cases

- **Empty or Whitespace-Only Clipboard**: When `clipboard.readText().trim()` produces an empty string, the shortcut handler terminates immediately without window popping or state disruption.
- **Consecutive Duplicate Triggers**: A module-level tracker (`lastCapturedClipboardText`) prevents re-capturing or restarting audio playback if the user presses the shortcut multiple times with unchanged clipboard content.
- **Large Multi-Paragraph Text**: Text parsed from clipboard is processed by `parseNovelText()` with natural chapter splitting and sentence segmentation, preserving full reading navigation (prev/next sentence, progress saving).
- **Web Browser Fallback**: In non-Electron web mode, `window.voxreadDesktop?.screenReader` is undefined; all hook invocations safely no-op via optional chaining.
- **Simultaneous Audio Playing**: If VoxRead is actively playing another book or chapter when a new screen capture is invoked, loading the new document seamlessly resets reading to chapter 0 and begins playing the newly captured text from sentence 0.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Electron main process (`electron/main.ts`) MUST register a global shortcut for `CommandOrControl+Shift+Space` during application initialization after `mainWindow` is created.
- **FR-002**: If `globalShortcut.register` returns `false`, the main process MUST call `showPrerequisiteWarning()` with an informative Vietnamese explanation and MUST NOT crash or terminate the application.
- **FR-003**: The main process MUST register a dedicated `app.on('will-quit')` lifecycle handler that invokes `globalShortcut.unregisterAll()`, kept distinct from the `before-quit` child process termination handler.
- **FR-004**: When the global shortcut is triggered, the main process MUST read text from `clipboard.readText()` and compare it to a module-level variable `lastCapturedClipboardText`.
- **FR-005**: If the clipboard text is empty, contains only whitespace, or matches `lastCapturedClipboardText`, the handler MUST exit silently without performing window or IPC actions.
- **FR-006**: When fresh non-empty clipboard text is detected, the main process MUST update `lastCapturedClipboardText`, show and focus `mainWindow` (restoring if minimized), and send the text to the renderer via IPC channel `'screen-reader:clipboard-captured'`.
- **FR-007**: The preload script (`electron/preload.ts`) MUST expose a `screenReader` namespace under `window.voxreadDesktop` containing `onClipboardCaptured(callback: (text: string) => void)` and `removeClipboardListener()`, with `onClipboardCaptured` returning an unsubscribe cleanup function.
- **FR-008**: The `DocumentItem.format` type definition in `src/types.ts` MUST include `'screen-capture'` in its union type (`'txt' | 'pdf' | 'epub' | 'pasted' | 'sample' | 'url' | 'screen-capture'`).
- **FR-009**: A custom React hook `useScreenReaderClipboard` in `src/hooks/useScreenReaderClipboard.ts` MUST subscribe to clipboard capture events using safe optional chaining on `window.voxreadDesktop?.screenReader?.onClipboardCaptured`.
- **FR-010**: Upon receiving text, `useScreenReaderClipboard` MUST parse the content with `parseNovelText(text, 'Nội dung từ màn hình')`, construct a `DocumentItem` with format `'screen-capture'`, and invoke an `onNewScreenCapture` callback prop.
- **FR-011**: In `src/App.tsx`, receiving a new screen-capture document MUST set `currentDocument`, reset `currentChapterIndex` to 0, and set a reactive state `pendingAutoPlay` to `true`.
- **FR-012**: In `src/App.tsx`, the reactive synchronization effect MUST check if `pendingAutoPlay` is `true` and `currentSentences.length > 0`; when satisfied, it MUST call `play(0)` from `useTTS` and reset `pendingAutoPlay` to `false`.
- **FR-013**: The floating `ControlBar` component (`src/components/ControlBar.tsx`) MUST include a button with a screen reader icon and tooltip, invoking an `onOpenScreenReaderGuide` callback passed from `App.tsx`.
- **FR-014**: The system tray menu in `electron/main.ts` MUST include an item `"Đọc màn hình (Ctrl+Shift+Space)"` that triggers the instructional guidance dialog.
- **FR-015**: Unit tests MUST be provided for `useScreenReaderClipboard` (mocking `window.voxreadDesktop`) and for document structure parsing of screen-capture text.

---

### Non-Functional & Scope Constraints

- **NFR-001**: No external robotics or keyboard simulation dependencies (such as `@nut-tree/nut-js` or `robotjs`) may be installed. Only native Electron `clipboard` and `globalShortcut` modules are permitted.
- **NFR-002**: Zero modifications to `python-backend/` or `server.js`.
- **NFR-003**: Security boundaries (`contextIsolation: true`, `nodeIntegration: false`) MUST remain intact with IPC exclusively exposed via `contextBridge`.
- **NFR-004**: All user-facing dialogue and prompts MUST be in clear, natural Vietnamese consistent with the existing application tone.
- **NFR-005**: All automated verification suites (`npm test`, `npx tsc --noEmit`, `npx eslint .`) MUST pass cleanly.

---

### Key Entities

- **ScreenCaptureDocument**: A `DocumentItem` instance having `format: 'screen-capture'`, `title: 'Nội dung từ màn hình'`, and parsed chapters, paragraphs, and sentence items generated by `parseNovelText`.
- **ScreenReaderAPI**: The contextBridge contract exposed on `window.voxreadDesktop.screenReader`:
  - `onClipboardCaptured(callback: (text: string) => void): () => void`
  - `removeClipboardListener(): void`

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can copy text in any external application and press `Ctrl+Shift+Space` to have VoxRead automatically restore the window and start speaking within 1.5 seconds.
- **SC-002**: Duplicate consecutive shortcut triggers with identical clipboard content result in zero duplicate document loads or playback interruptions.
- **SC-003**: Shortcut collision on startup triggers a non-blocking informational dialog in Vietnamese without application crashes.
- **SC-004**: On application quit, all registered shortcuts are released cleanly without leaving lingering OS bindings.
- **SC-005**: Complete automated validation: `npm test`, `npx tsc --noEmit`, and `npx eslint .` exit with status code 0.

---

## Assumptions

- Target operating environment is Windows desktop running Electron, with web browsers supported as a graceful fallback where the shortcut/tray features safely no-op.
- Text selection and copying is performed by the user (`Ctrl+C` or right-click copy); VoxRead acts strictly as a clipboard consumer and audio orchestrator.
- Default global shortcut accelerator string `CommandOrControl+Shift+Space` maps to `Ctrl+Shift+Space` on Windows/Linux and `Cmd+Shift+Space` on macOS.
- Auto-play uses the existing `useTTS` pipeline (browser speech synthesis or local RVC) based on the user's active settings without requiring separate audio logic.
