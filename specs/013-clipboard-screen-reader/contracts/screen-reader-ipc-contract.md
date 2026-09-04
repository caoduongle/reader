# IPC Contract: Screen Reader Clipboard Bridge

**Feature**: `013-clipboard-screen-reader`  
**Date**: 2026-09-04  
**Channel**: `screen-reader:clipboard-captured`  

---

## 1. IPC Channel Specification

| Property | Definition |
|---|---|
| Channel Name | `screen-reader:clipboard-captured` |
| Direction | Electron Main Process `webContents.send` ➔ Renderer Process `ipcRenderer.on` |
| Timing | Emitted when user presses `CommandOrControl+Shift+Space` and clipboard has new non-empty text |
| Payload Type | `string` |
| Deduplication | Handled in Main process prior to IPC emission |

---

## 2. Preload ContextBridge API

The preload script (`electron/preload.ts`) exposes the following methods under `window.voxreadDesktop.screenReader`:

```typescript
export interface ScreenReaderBridge {
  /**
   * Subscribes to captured clipboard text from the main process.
   * @param callback Function invoked with captured text.
   * @returns Unsubscribe cleanup function to unregister the specific listener.
   */
  onClipboardCaptured: (callback: (text: string) => void) => () => void;

  /**
   * Removes all registered listeners for the screen-reader:clipboard-captured channel.
   */
  removeClipboardListener: () => void;
}
```

### Implementation Details in Preload

```typescript
screenReader: {
  onClipboardCaptured: (callback: (text: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string) => {
      callback(text);
    };
    ipcRenderer.on('screen-reader:clipboard-captured', handler);
    return () => {
      ipcRenderer.removeListener('screen-reader:clipboard-captured', handler);
    };
  },
  removeClipboardListener: () => {
    ipcRenderer.removeAllListeners('screen-reader:clipboard-captured');
  },
}
```

---

## 3. Web Environment Compatibility & Error Boundary

When running in standard browsers (outside Electron), `window.voxreadDesktop` is `undefined`.
- Consumers MUST use optional chaining:
  ```typescript
  const unsubscribe = window.voxreadDesktop?.screenReader?.onClipboardCaptured?.(text => {
    // handle text
  });
  return () => {
    unsubscribe?.();
  };
  ```
- No runtime exceptions shall be thrown on web clients.
