# Data Model & State Architecture: Desktop Clipboard Screen Reader

**Feature**: `013-clipboard-screen-reader`  
**Date**: 2026-09-04  

---

## 1. Entities & Type Extensions

### 1.1 Document Format Extension (`src/types.ts`)

```typescript
export interface DocumentItem {
  id: string;
  title: string;
  author?: string;
  format: 'txt' | 'pdf' | 'epub' | 'pasted' | 'sample' | 'url' | 'screen-capture'; // Added 'screen-capture'
  chapters: Chapter[];
  createdAt: number;
  lastRead: {
    chapterIndex: number;
    sentenceIndex: number;
    progressPercentage: number;
    updatedAt: number;
  };
  totalWords: number;
  totalSentences: number;
}
```

### 1.2 Desktop Bridge Types (`src/types.ts` or window declaration)

```typescript
export interface ScreenReaderBridge {
  onClipboardCaptured: (callback: (text: string) => void) => () => void;
  removeClipboardListener: () => void;
}

export interface VoxReadDesktopBridge {
  isDesktop: boolean;
  platform: NodeJS.Platform;
  screenReader?: ScreenReaderBridge;
}

declare global {
  interface Window {
    voxreadDesktop?: VoxReadDesktopBridge;
  }
}
```

---

## 2. Component State Transitions

### 2.1 Reactive State Flow Diagram

```text
[External App]
      │
      ├─ User highlights text + Ctrl+C
      │  (Text placed into OS Clipboard)
      │
      └─ User presses Ctrl+Shift+Space (Global Accelerator)
            │
            ▼
[Electron Main Process (electron/main.ts)]
      │
      ├─ Read text via `clipboard.readText()`
      ├─ Validate: !text.trim() or text.trim() === lastCapturedClipboardText?
      │     └─ YES: Return silently (Debounce / Ignore)
      │     └─ NO:  Proceed
      ├─ Update: lastCapturedClipboardText = text.trim()
      ├─ Restore & Show Window: mainWindow.restore(); mainWindow.show(); mainWindow.focus();
      └─ IPC Dispatch: mainWindow.webContents.send('screen-reader:clipboard-captured', text)
            │
            ▼
[Renderer Preload Bridge (electron/preload.ts)]
      │
      └─ contextBridge forwarder invokes registered listener
            │
            ▼
[React Hook: useScreenReaderClipboard]
      │
      ├─ Receives text
      ├─ Calls parseNovelText(text, 'Nội dung từ màn hình')
      ├─ Computes totalWords and totalSentences
      ├─ Assembles DocumentItem (format: 'screen-capture')
      └─ Emits onNewScreenCapture(doc)
            │
            ▼
[App.tsx State Updates]
      │
      ├─ setCurrentDocument(doc)
      ├─ setCurrentChapterIndex(0)
      └─ setPendingAutoPlay(true)
            │
            ▼
[React Render Cycle: State Reconciliation]
      │
      ├─ currentChapter re-evaluated for chapter 0
      ├─ currentSentences re-computed via useMemo
      └─ Reactive synchronization useEffect triggers:
            ├─ Condition: pendingAutoPlay === true && currentSentences.length > 0
            ├─ Action 1: play(0)
            └─ Action 2: setPendingAutoPlay(false)
            │
            ▼
[TTS Engine (useTTS)]
      Audio synthesized & spoken; UI highlights Sentence 0
```

---

## 3. Data Validation & Rules

| Field / Attribute | Validation Rule | Action on Failure |
|---|---|---|
| Clipboard Content | Must be non-empty and not solely whitespace | Silently exit shortcut handler; do not focus window or dispatch IPC |
| Deduplication Key | `rawText.trim() !== lastCapturedClipboardText` | Silently exit shortcut handler; preserve current audio state |
| Document Title | Default: `'Nội dung từ màn hình'` | Fallback to `'Nội dung từ màn hình'` if unsupplied |
| Document Format | Must be `'screen-capture'` | Enforced by TypeScript union |
| Autoplay Guard | `currentSentences.length > 0` | Wait for React memoization; reset `pendingAutoPlay` once invoked |
