# Research: Desktop Clipboard Screen Reader

**Feature**: `013-clipboard-screen-reader`  
**Date**: 2026-09-04  
**Author**: Antigravity  

---

## 1. Global Shortcut Architecture & Registration Lifecycle

### Decision
- Register global accelerator `'CommandOrControl+Shift+Space'` in `electron/main.ts` inside `app.whenReady()` immediately following `createWindow()` and `createSystemTray()`.
- Unregister all global shortcuts via `globalShortcut.unregisterAll()` inside `app.on('will-quit')`.
- Handle registration collisions gracefully without crashing: if `globalShortcut.register()` returns `false`, trigger `showPrerequisiteWarning()` with an informative Vietnamese dialog explaining that the shortcut is in use by another application.

### Rationale
- `CommandOrControl+Shift+Space` evaluates to `Ctrl+Shift+Space` on Windows and Linux, and `Cmd+Shift+Space` on macOS. This key combination does not clash with typical Windows OS reserved combinations (like `Win+Space` or `Ctrl+Alt+Del`) while remaining ergonomic for single-handed or two-handed triggering.
- `app.on('will-quit')` is the standard Electron lifecycle event for unregistering global shortcuts before window teardown, as recommended by Electron documentation. It must NOT be combined with `before-quit`, where child process tree termination (`taskkill`) takes place.
- Silent crashes or unhandled exceptions when a shortcut is occupied degrade user experience. Using `showPrerequisiteWarning()` alerts the user clearly while keeping VoxRead fully operational.

### Alternatives Considered
- *External hotkey libraries (e.g. `iokit`, `node-global-key-listener`)*: Rejected. Introduces native binary compilation burdens (`node-gyp`), packaging fragility, and violates the zero-new-dependencies constraint. Native Electron `globalShortcut` is built-in and rock-solid on Windows.
- *Local window accelerator (`Menu` or `before-input-event`)*: Rejected. Local accelerators only respond when the VoxRead window has OS focus. The primary user scenario requires capturing text from external applications (Word, PDF, browser) when VoxRead is in the background or minimized to the tray.

---

## 2. Clipboard Inspection & Deduplication Mechanism

### Decision
- Read text using native `clipboard.readText()`.
- Maintain a module-level variable in `electron/main.ts`:
  ```typescript
  let lastCapturedClipboardText = '';
  ```
- Upon shortcut invocation:
  ```typescript
  const rawText = clipboard.readText();
  const trimmed = rawText.trim();
  if (!trimmed || trimmed === lastCapturedClipboardText) {
    return; // Ignore silently
  }
  lastCapturedClipboardText = trimmed;
  ```
- Restore and focus `mainWindow`:
  ```typescript
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('screen-reader:clipboard-captured', trimmed);
  }
  ```

### Rationale
- Users frequently press shortcuts repeatedly out of habit. Without deduplication, pressing `Ctrl+Shift+Space` twice would re-parse the text, reset chapter index, and restart speech from sentence 0, disrupting the listening experience.
- Empty clipboard or non-text clipboard items (images, file paths without text) would produce blank chapters or parse errors; ignoring empty strings silently is clean and non-disruptive.
- Restoring from minimized and showing/focusing ensures that even if VoxRead was tucked away in the system tray, the reader interface immediately surfaces with synchronized visual sentence highlights.

### Alternatives Considered
- *Robotic auto-copy (`robotjs`, `@nut-tree/nut-js` sending Ctrl+C)*: Strictly rejected. Synthesizing keystrokes across diverse Windows applications (UWP, Win32, browser sandboxes) is notoriously flaky, triggers anti-cheat/antivirus heuristics, and requires native binaries. The user explicitly highlighting and pressing Ctrl+C is reliable and transparent.
- *Clipboard polling timer*: Rejected. Polling clipboard every N milliseconds wastes CPU cycles and invades user privacy by scanning unrequested clipboard updates. Event-driven reading only on shortcut press is zero-overhead and privacy-respecting.

---

## 3. Secure Preload & IPC Bridge (`contextBridge`)

### Decision
- Keep `contextIsolation: true` and `nodeIntegration: false`.
- In `electron/preload.ts`, import `ipcRenderer` and augment `window.voxreadDesktop`:
  ```typescript
  contextBridge.exposeInMainWorld('voxreadDesktop', {
    isDesktop: true,
    platform: process.platform,
    screenReader: {
      onClipboardCaptured: (callback: (text: string) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
        ipcRenderer.on('screen-reader:clipboard-captured', handler);
        return () => {
          ipcRenderer.removeListener('screen-reader:clipboard-captured', handler);
        };
      },
      removeClipboardListener: () => {
        ipcRenderer.removeAllListeners('screen-reader:clipboard-captured');
      },
    },
  });
  ```
- Returning the unsubscribe function from `onClipboardCaptured` allows React's `useEffect` cleanup to unregister the specific listener, preventing memory leaks on re-renders.

### Rationale
- Strict separation of Electron main capabilities from the React DOM renderer maintains security standards (spec 006, 012).
- Returning an unsubscribe callback aligns with idiomatic React event subscription patterns.

---

## 4. Document Construction & Reactive TTS Auto-Play in Renderer

### Decision
- Define custom hook `src/hooks/useScreenReaderClipboard.ts`:
  - Uses optional chaining: `window.voxreadDesktop?.screenReader?.onClipboardCaptured`.
  - When text is emitted, invokes `parseNovelText(text, 'Nội dung từ màn hình')`.
  - Calculates `totalWords` and `totalSentences`.
  - Constructs `DocumentItem` with `format: 'screen-capture'`.
  - Passes document to `onNewScreenCapture(newDoc)`.
- In `src/App.tsx`:
  - Add state: `const [pendingAutoPlay, setPendingAutoPlay] = useState<boolean>(false);`.
  - In `handleNewScreenCapture(doc)`:
    ```typescript
    setCurrentDocument(doc);
    setCurrentChapterIndex(0);
    setPendingAutoPlay(true);
    ```
  - In the reactive sentence synchronization `useEffect`:
    ```typescript
    useEffect(() => {
      if (pendingJumpSentence !== null && currentSentences.length > 0) {
        const target = Math.min(pendingJumpSentence, currentSentences.length - 1);
        jumpToSentence(target, false);
        setPendingJumpSentence(null);
      }
      if (pendingAutoPlay && currentSentences.length > 0) {
        play(0);
        setPendingAutoPlay(false);
      }
    }, [currentChapterIndex, currentSentences, pendingJumpSentence, pendingAutoPlay, jumpToSentence, play]);
    ```

### Rationale
- Reuses the existing reactive synchronization architecture. Because `currentSentences` is derived via `useMemo` from `currentDocument` and `currentChapterIndex`, calling `play(0)` synchronously in `handleNewScreenCapture` would run against the *previous* document's sentences.
- The `pendingAutoPlay` state pattern waits for React to finish memoizing `currentSentences` for the new document, then triggers `play(0)` reliably with zero arbitrary `setTimeout` delays.

---

## 5. UI Guidance in ControlBar & System Tray

### Decision
- Add a new button to `ControlBar.tsx`:
  - Icon: `ScanText` from `lucide-react`.
  - Position: Right action group (adjacent to TOC and Settings).
  - Tooltip: `"Đọc màn hình (Ctrl+Shift+Space)"`.
  - Action: Invokes `onOpenScreenReaderGuide()`.
- In `App.tsx`, `onOpenScreenReaderGuide` displays an instructional dialog or toast explaining the 3 steps:
  1. Bôi đen văn bản ở ứng dụng bất kỳ (Word, PDF, web...).
  2. Nhấn `Ctrl + C` để sao chép.
  3. Bấm `Ctrl + Shift + Space` để VoxRead tự động đọc ngay!
- In `electron/main.ts`, add a tray menu item:
  ```typescript
  {
    label: '🖥️ Đọc màn hình (Ctrl+Shift+Space)',
    click: () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
      dialog.showMessageBox({
        type: 'info',
        title: 'Tính năng Đọc màn hình VoxRead',
        message: 'Hướng dẫn Đọc màn hình từ Clipboard',
        detail: '1. Bôi đen văn bản ở ứng dụng bất kỳ (Word, PDF, trình duyệt...)\n2. Nhấn Ctrl+C để sao chép\n3. Bấm Ctrl+Shift+Space để VoxRead tự động đọc ngay.',
        buttons: ['Đã hiểu'],
      });
    },
  }
  ```

### Rationale
- Clicking a button with a mouse necessarily alters active OS focus away from the external app. Therefore, the UI button cannot know what text the user meant to read unless already copied. Making the button an interactive guide empowers users to master the global shortcut.
