# Technical Research: Local RVC Voice Cloning Integration & Windows Desktop Packaging

**Feature**: `001-rvc-tts-desktop`  
**Date**: 2026-09-01  
**Status**: Completed

---

## 1. Audio Streaming & Sentence Prefetching Architecture in React

### Context
In VoxRead, text is segmented into `SentenceItem[]`. When using the built-in browser speech engine, synthesis and playback are managed synchronously by the browser's native `window.speechSynthesis`. When using the local RVC server, each sentence requires:
1. Sending text to `POST http://localhost:8008/speak`.
2. Server processing: Edge-TTS generates base MP3 $\rightarrow$ RVC PyTorch pipeline converts to WAV $\rightarrow$ WAV bytes returned.
3. Client playing the received WAV audio bytes.

Inference takes $0.5\text{s} - 2\text{s}$ per sentence depending on GPU/CPU. Without prefetching, there would be a noticeable and jarring $1\text{s} - 2\text{s}$ silence between consecutive sentences.

### Decision
- **Audio Element Management**: Maintain a single persistent `HTMLAudioElement` instance in a React `useRef` (`audioRef.current`). Reusing one element avoids memory leaks, Chromium audio context starvation, and ensures unified event listener binding (`onended`, `onerror`, `onplay`, `onpause`).
- **Sliding Window Prefetch Cache**:
  - Implement an in-memory cache `Map<number, string>` mapping `sentenceIndex` to `blobUrl` (`URL.createObjectURL(blob)`).
  - While sentence $N$ is actively playing, trigger an asynchronous background fetch for sentence $N+1$ (and optionally $N+2$, keeping cache size $\le 3$).
  - When sentence $N$ finishes playing (`audio.onended`), check if cache contains $N+1$. If present, immediately assign `audio.src = cache.get(N+1)` and call `audio.play()`. Transition latency drops to $< 50\text{ms}$.
  - Background synthesis then kicks off for $N+2$.
- **Cache Eviction & Garbage Collection**:
  - When sentences fall out of the sliding window ($< N$), revoke their object URLs via `URL.revokeObjectURL()` to prevent memory accumulation during long multi-thousand sentence reading sessions.
  - When the user jumps to a non-consecutive sentence or changes chapters, purge the entire prefetch cache and revoke all active blob URLs.
- **Speed (Rate) & Pitch Control**:
  - Apply reading speed directly to `audio.playbackRate = settings.rate` (HTML5 Audio naturally preserves pitch using Sonic/WSOLA algorithms in modern browsers).
  - Pitch adjustments are ignored/locked for RVC because the voice character is fixed by the model weights.

### Alternatives Considered
- *Web Audio API (`AudioContext` + `AudioBufferSourceNode`)*: Rejected because pitch-preserving time stretching (`playbackRate` without pitch change) requires complex custom DSP worklets in Web Audio, whereas HTML5 `<audio>` handles time-stretching natively and cleanly.
- *Multiple Concurrent `<audio>` tags*: Rejected due to high risk of audio overlapping, orphaned audio nodes, and complex lifecycle synchronization.

---

## 2. Windows Desktop Host & Process Lifecycle Management

### Context
The user needs VoxRead to run as a native Windows desktop app (`.exe`) without manually opening a PowerShell/CMD terminal to start `server.py`.
The server requires Python 3.10 + PyTorch + RVC model weights.

### Decision
- **Framework**: Electron (`electron` + `electron-builder`).
- **Process Orchestration in `electron/main.ts`**:
  - Locate Python executable: Check `python-backend/venv/Scripts/pythonw.exe` (using `pythonw.exe` prevents an annoying black terminal window from appearing).
  - Detect running environment: Support both development mode (`process.cwd()`) and packaged production mode (`process.resourcesPath`).
  - Spawn background process: Use `child_process.spawn` with `detached: false`.
  - Health Handshake: Asynchronously poll `GET http://localhost:8008/health` every 1 second (up to 60 attempts).
  - Error Gracefulness: If `pythonw.exe` does not exist or server fails to start, display an informational native dialog (`dialog.showMessageBox`) explaining how to set up the venv according to the documentation, but proceed to load the app window so that the user can still read books with browser voices.
- **Process Termination on Windows**:
  - On Windows, killing a parent process often leaves child Python worker threads (`torch` thread pools) running as orphan background tasks.
  - Decision: When quitting the app, execute Windows `taskkill /F /T /PID <pid>` to force-terminate the entire process tree reliably.
- **System Tray Behavior**:
  - Create a `Tray` icon with menu items: "Mở VoxRead" and "Thoát".
  - Intercept window `close` event: call `event.preventDefault()` and `window.hide()` to keep the window running in the tray.
  - Provide explicit "Thoát" action that unhooks the close listener, kills the Python backend, and invokes `app.quit()`.

### Alternatives Considered
- *Bundling PyInstaller exe inside Electron package*: Rejected because PyTorch + CUDA binaries exceed 3-4 GB and CUDA versions must match user GPU drivers. Keeping the backend separate as instructed maintains a lightweight installer and avoids driver incompatibility.
- *Tauri*: Rejected because the current project is already standard Node/TS/Vite with minimal overhead for adding Electron, and Electron's Node.js backend handles `child_process` and Windows `taskkill` seamlessly.

---

## 3. Build & Packaging Architecture

### Context
The project is built on Vite 6 + React 19 + TypeScript. We need to compile the Electron main process and package the Windows installer without interfering with Vite's web build.

### Decision
- **Main Process Compilation**: Use `esbuild` (already installed in `devDependencies` v0.25.0) to compile `electron/main.ts` and `electron/preload.ts` to `dist-electron/main.cjs` and `dist-electron/preload.cjs` with `platform: 'node'`.
- **NPM Scripts**:
  - `"build:electron"`: `esbuild electron/main.ts --bundle --platform=node --outfile=dist-electron/main.cjs --external:electron`
  - `"electron:dev"`: Concurrently run Vite dev server (`npm run dev`) and Electron (`cross-env NODE_ENV=development electron .`)
  - `"electron:build"`: Run `npm run build` (Vite client) + `npm run build:electron` + `electron-builder --win`
- **electron-builder Configuration**:
  - `directories.output`: `dist-app` or `release`
  - `files`: `dist/**/*`, `dist-electron/**/*`
  - `extraResources`: Copy `python-backend/server.py` and `python-backend/requirements.txt` into resources directory. Explicitly exclude `python-backend/venv` and `python-backend/model` to keep the installer lightweight (~80MB).

---

## 4. UI & Settings Integration

### Context
`SettingsModal.tsx` currently has a "Voice & Speed" tab that displays detected browser speech voices with language filters and search.

### Decision
- Add a segmented control at the top of the "Voice & Speed" tab:
  - Option 1: **"Giọng máy (mặc định)"** (`'browser'`)
  - Option 2: **"Giọng của tôi (RVC local)"** (`'rvc-local'`)
- When `'browser'` is selected:
  - Keep the existing voice selector, language filter chips, and search input intact.
- When `'rvc-local'` is selected:
  - Hide the browser voice list and search controls.
  - Display the Server URL input (default `http://localhost:8008`).
  - Display connection status indicator:
    - 🟢 **Đã kết nối** (`connected`)
    - 🔴 **Không thể kết nối** (`unreachable`): Show warning banner with reminder to check if the Python server is running.
    - 🟡 **Đang kiểm tra...** (`checking` / `unknown`)
  - Display a "Kiểm tra kết nối" (Ping) button and "Thử giọng" (Test Voice) button.
  - Disable or hide the "Pitch" slider with an informative hint ("Cao độ được cố định theo model giọng RVC").
