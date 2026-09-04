# Implementation Plan: Desktop Clipboard Screen Reader ("Đọc màn hình từ Clipboard")

**Branch**: `013-clipboard-screen-reader` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/013-clipboard-screen-reader/spec.md`  

---

## Summary

Implement the "Đọc màn hình" (clipboard tier) feature for VoxRead desktop, allowing users to copy text in any application (`Ctrl+C`) and press a global shortcut (`Ctrl+Shift+Space`) to immediately load and read the text aloud via the existing TTS pipeline without manual copy-paste:
1. **Electron Main Process (`electron/main.ts`)**: Register global shortcut `CommandOrControl+Shift+Space` after window creation, handle conflicts safely using `showPrerequisiteWarning()`, unregister on `will-quit`. When triggered, read clipboard via `clipboard.readText()`, deduplicate with `lastCapturedClipboardText`, ignore empty strings, restore/focus `mainWindow`, and dispatch text via IPC channel `'screen-reader:clipboard-captured'`. Add tray menu item for discovery.
2. **Secure Preload (`electron/preload.ts`)**: Expose `screenReader` namespace under `window.voxreadDesktop` with `onClipboardCaptured` (returning unsubscribe callback) and `removeClipboardListener` using `contextBridge`.
3. **Data Model Extension (`src/types.ts`)**: Add `'screen-capture'` to `DocumentItem.format` union.
4. **React Hook (`src/hooks/useScreenReaderClipboard.ts`)**: Subscribe to clipboard capture events using optional chaining, parse content with `parseNovelText(text, 'Nội dung từ màn hình')`, construct a `DocumentItem`, and deliver it to `onNewScreenCapture`.
5. **Autoplay Integration (`src/App.tsx`)**: Re-use reactive state pattern (`pendingAutoPlay` matching existing `pendingJumpSentence`) to trigger `play(0)` from `useTTS` once `currentSentences` is populated. Add guide modal/toast for screen reader workflow.
6. **UI Controls (`src/components/ControlBar.tsx`)**: Add screen reader button with icon (`ScanText` from `lucide-react`) to provide workflow instructions when clicked.
7. **Automated Testing**: Author unit tests for `useScreenReaderClipboard` and document parsing in `tests/unit/screenReaderClipboard.test.ts`.

---

## Technical Context

**Language/Version**: TypeScript 5.6+, React 19, Electron 34+  
**Target Files**:
- `electron/main.ts` [MODIFY] (Register `globalShortcut`, clipboard read & deduplication, tray item, `will-quit` teardown)
- `electron/preload.ts` [MODIFY] (Expose `screenReader` IPC methods via `contextBridge`)
- `src/types.ts` [MODIFY] (Add `'screen-capture'` to `DocumentItem.format`, add `ScreenReaderBridge` interface)
- `src/hooks/useScreenReaderClipboard.ts` [NEW] (Subscribe to IPC, parse text via `parseNovelText`, build `DocumentItem`)
- `src/App.tsx` [MODIFY] (Wire `useScreenReaderClipboard`, manage `pendingAutoPlay` state, trigger `play(0)`)
- `src/components/ControlBar.tsx` [MODIFY] (Add screen reader icon button and guidance callback)
- `tests/unit/screenReaderClipboard.test.ts` [NEW] (Unit tests for hook and parser integration)

**Primary Dependencies**: Native Electron modules (`clipboard`, `globalShortcut`, `contextBridge`, `ipcRenderer`, `dialog`, `Menu`), `lucide-react`, React hooks. Zero external robotic automation dependencies (`robotjs`, `@nut-tree/nut-js` forbidden).  
**Testing & Verification**: Vitest unit tests (`npm test`), TypeScript verification (`npx tsc --noEmit`), ESLint (`npx eslint .`).  
**Constraints**:
- Zero changes to `python-backend/` or `server.js`.
- Security boundaries (`contextIsolation: true`, `nodeIntegration: false`) strictly maintained.
- Non-blocking error handling on shortcut conflicts (`showPrerequisiteWarning`).
- Proper shortcut cleanup on `will-quit` (kept separate from `before-quit`).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Dual-Stack Integrity | ✅ Passed | Python backend and proxy server remain completely untouched. Screen reader operates purely at Electron desktop & React layers. |
| II. True Quality Gates | ✅ Passed | Full Vitest test suite, TypeScript strict checking, and ESLint without bypassing checks. |
| III. Resource Conservation | ✅ Passed | Zero polling timers; clipboard read on demand when shortcut triggers. Deduplication prevents unnecessary parsing. Clean IPC listener teardown. |
| IV. Build & Type Integrity | ✅ Passed | Strict typing in `src/types.ts` and preload definitions; clean compilation with `tsc`. |
| V. Dependency Discipline | ✅ Passed | 100% native Electron APIs used (`clipboard`, `globalShortcut`). No third-party robot/key-simulation packages installed. |

---

## Project Structure

### Documentation (this feature)

```text
specs/013-clipboard-screen-reader/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Architecture decisions, shortcut lifecycle & deduplication
├── data-model.md        # Data models, type definitions, and reactive state transitions
├── quickstart.md        # Automated verification & end-to-end manual testing guide
├── contracts/           # Contracts
│   └── screen-reader-ipc-contract.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── electron/
│   ├── main.ts                          # [MODIFY] Global shortcut, clipboard capture, tray menu, will-quit unregister
│   └── preload.ts                       # [MODIFY] Expose screenReader namespace via contextBridge
├── src/
│   ├── types.ts                         # [MODIFY] Add 'screen-capture' to DocumentItem.format, declare ScreenReaderBridge
│   ├── hooks/
│   │   └── useScreenReaderClipboard.ts  # [NEW] IPC listener hook, parseNovelText caller, DocumentItem builder
│   ├── App.tsx                          # [MODIFY] Wire hook, pendingAutoPlay reactive effect, guide modal state
│   └── components/
│       └── ControlBar.tsx               # [MODIFY] Screen reader button with ScanText icon
└── tests/
    └── unit/
        └── screenReaderClipboard.test.ts # [NEW] Vitest suite for hook & parsing behavior
```

---

## Phases & Deliverables

### Phase 1: Electron Native Shell & IPC Bridge
1. In `electron/main.ts`:
   - Register `CommandOrControl+Shift+Space` in `app.whenReady()`.
   - Implement conflict warning with `showPrerequisiteWarning()`.
   - Store `lastCapturedClipboardText` for deduplication.
   - Read clipboard on shortcut, ignore empty/unchanged text, restore/focus window, emit `'screen-reader:clipboard-captured'`.
   - Unregister shortcuts in `app.on('will-quit')`.
   - Add `"🖥️ Đọc màn hình (Ctrl+Shift+Space)"` item to system tray context menu.
2. In `electron/preload.ts`:
   - Import `ipcRenderer` and expose `voxreadDesktop.screenReader` with `onClipboardCaptured` and `removeClipboardListener`.

### Phase 2: Data Model & React Hook
1. In `src/types.ts`:
   - Add `'screen-capture'` to `DocumentItem.format`.
   - Declare `ScreenReaderBridge` and `VoxReadDesktopBridge` window interfaces.
2. In `src/hooks/useScreenReaderClipboard.ts`:
   - Listen to `window.voxreadDesktop?.screenReader?.onClipboardCaptured`.
   - Parse text using `parseNovelText(text, 'Nội dung từ màn hình')`.
   - Assemble `DocumentItem` and dispatch to `onNewScreenCapture`.
   - Clean up listener on unmount.

### Phase 3: Application Integration & Reactive Autoplay
1. In `src/App.tsx`:
   - Integrate `useScreenReaderClipboard`.
   - Introduce `pendingAutoPlay` state.
   - When new screen capture arrives: `setCurrentDocument(doc)`, `setCurrentChapterIndex(0)`, `setPendingAutoPlay(true)`.
   - In sentence sync `useEffect`: if `pendingAutoPlay && currentSentences.length > 0`, call `play(0)` and reset `pendingAutoPlay` to `false`.
   - Add state and modal dialog/toast explaining the 3-step screen reader guide in Vietnamese.
2. In `src/components/ControlBar.tsx`:
   - Add `onOpenScreenReaderGuide` prop and button with `ScanText` icon.

### Phase 4: Automated Testing & Verification
1. Author `tests/unit/screenReaderClipboard.test.ts`:
   - Mock `window.voxreadDesktop` to simulate incoming clipboard text.
   - Test document structure generation with format `'screen-capture'`.
   - Verify unsubscription on unmount.
2. Execute verification suite:
   - `npm test`
   - `npx tsc --noEmit`
   - `npx eslint .`
