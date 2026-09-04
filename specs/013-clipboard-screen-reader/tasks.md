# Tasks: Desktop Clipboard Screen Reader ("Đọc màn hình từ Clipboard")

**Feature**: `013-clipboard-screen-reader`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-04  

---

## Phase 1: Setup & Foundational (Blocking Prerequisites)

**Purpose**: Declare core data types, IPC interfaces, and preload bridges required by all user stories.

- [X] T001 Update `src/types.ts` to extend `DocumentItem.format` with `'screen-capture'`, declare `ScreenReaderBridge` interface, and add global `window.voxreadDesktop` type definition.
- [X] T002 Update `electron/preload.ts` to import `ipcRenderer` and expose `voxreadDesktop.screenReader` namespace (`onClipboardCaptured` and `removeClipboardListener`) via `contextBridge`.

---

## Phase 2: User Story 1 — Global Shortcut & Direct Clipboard Audio Playback (Priority: P1) 🎯 MVP

**Goal**: Enable users to highlight and copy text anywhere in the OS, press `CommandOrControl+Shift+Space` to restore/focus VoxRead, parse the clipboard text into chapters/sentences, and automatically begin audio playback from sentence 0 without manual clicks.

**Independent Test**: Copy a text snippet from Notepad (`Ctrl+C`), minimize VoxRead, press `Ctrl+Shift+Space`, and verify VoxRead restores, loads document titled "Nội dung từ màn hình", and begins speaking sentence 0 immediately.

### Implementation for User Story 1

- [X] T003 [US1] Implement clipboard reading via `clipboard.readText()`, deduplication with module-level `lastCapturedClipboardText`, empty/whitespace check, window restore/focus, and IPC dispatch `'screen-reader:clipboard-captured'` in `electron/main.ts`.
- [X] T004 [US1] Implement custom hook `useScreenReaderClipboard` in `src/hooks/useScreenReaderClipboard.ts` to subscribe to IPC events with optional chaining, parse text with `parseNovelText(text, 'Nội dung từ màn hình')`, construct `DocumentItem` with format `'screen-capture'`, and invoke `onNewScreenCapture` callback.
- [X] T005 [US1] Integrate `useScreenReaderClipboard` and reactive state `pendingAutoPlay` in `src/App.tsx`: upon new screen capture, update document and chapter index to 0, then trigger `play(0)` from `useTTS` inside the sentence synchronization `useEffect` once `currentSentences` is loaded.

**Checkpoint**: User Story 1 is fully functional and independently testable as an MVP slice.

---

## Phase 3: User Story 2 — UI Guidance & Discovery via ControlBar and System Tray (Priority: P2)

**Goal**: Provide discoverability and clear instructional guidance for the clipboard screen reader in the floating ControlBar and the system tray context menu.

**Independent Test**: Click the screen reader button in `ControlBar` or the tray menu item and verify a friendly Vietnamese instructional message appears: "Bôi đen văn bản ở bất kỳ đâu, nhấn Ctrl+C, rồi bấm Ctrl+Shift+Space để đọc".

### Implementation for User Story 2

- [X] T006 [P] [US2] Add `"🖥️ Đọc màn hình (Ctrl+Shift+Space)"` item to the system tray context menu in `electron/main.ts` displaying the instructional dialog on click.
- [X] T007 [P] [US2] Add screen reader button with `ScanText` icon to `src/components/ControlBar.tsx` and wire `onOpenScreenReaderGuide` prop.
- [X] T008 [US2] Implement screen reader guidance dialog/banner in `src/App.tsx` connected to `onOpenScreenReaderGuide` from `ControlBar`.

**Checkpoint**: Users can discover the screen reader workflow directly from the reader UI and system tray.

---

## Phase 4: User Story 3 — Conflict Handling and Safe Lifecycle Teardown (Priority: P3)

**Goal**: Handle global shortcut registration conflicts safely without crashing and unregister all system shortcuts cleanly upon application termination.

**Independent Test**: Verify non-blocking warning when shortcut registration fails; verify `globalShortcut.unregisterAll()` fires on `will-quit`.

### Implementation for User Story 3

- [X] T009 [US3] Wrap `globalShortcut.register('CommandOrControl+Shift+Space')` in `electron/main.ts` with error handling that invokes `showPrerequisiteWarning()` in Vietnamese if registration returns `false`, allowing normal app launch.
- [X] T010 [US3] Register `app.on('will-quit')` in `electron/main.ts` to call `globalShortcut.unregisterAll()` cleanly on application termination (kept separate from `before-quit`).

**Checkpoint**: Global shortcut management is crash-proof and adheres to OS lifecycle hygiene.

---

## Phase 5: Automated Testing & Gate Enforcement

**Purpose**: Author automated tests and verify all quality gates pass cleanly.

- [X] T011 [P] Create unit test suite `tests/unit/screenReaderClipboard.test.ts` testing `useScreenReaderClipboard` hook with mocked `window.voxreadDesktop`, document construction, format `'screen-capture'`, and listener unsubscription.
- [X] T012 Run full test suite with `npm test` and verify 100% test pass.
- [X] T013 Run `npx tsc --noEmit` and `npx eslint .` to verify zero TypeScript compiler errors and zero lint violations.

---

## Dependencies & Execution Order

```
Phase 1: Types & Preload Bridge (T001 - T002)
       │
       ▼
Phase 2: User Story 1 — Clipboard Pipeline & Autoplay (T003 - T005) 🎯 MVP
       │
       ├────────────────────────────────┐
       ▼                                ▼
Phase 3: UI Guidance (T006 - T008)   Phase 4: Conflict & Lifecycle (T009 - T010)
       │                                │
       └────────────────┬───────────────┘
                        ▼
Phase 5: Automated Testing & Quality Gates (T011 - T013)
```

---

## Parallel Opportunities

- **T006 and T007**: System tray menu update in `electron/main.ts` and ControlBar button in `src/components/ControlBar.tsx` can be developed in parallel.
- **T011**: Test suite creation in `tests/unit/screenReaderClipboard.test.ts` can be prepared in parallel with UI implementation.

---

## Implementation Strategy

### MVP First (Phases 1 & 2)
1. Complete Phase 1: Types and Preload bridge.
2. Complete Phase 2: Main process shortcut handler, hook, and App.tsx autoplay.
3. Validate MVP: Copy text, press `Ctrl+Shift+Space`, confirm speech starts.

### Incremental Delivery (Phases 3, 4 & 5)
1. Add Phase 3: ControlBar button and Tray menu guide.
2. Add Phase 4: Shortcut collision handling and `will-quit` teardown.
3. Add Phase 5: Vitest unit tests and execute all quality gates (`npm test`, `tsc`, `eslint`).
