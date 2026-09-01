# Implementation Plan: Local RVC Voice Cloning Integration & Windows Desktop Packaging

**Branch**: `001-rvc-tts-desktop` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-rvc-tts-desktop/spec.md`

---

## Summary

Integrate a local neural voice cloning (RVC) provider alongside the existing browser-based Web Speech synthesis engine in VoxRead, with continuous sentence-by-sentence audio playback and predictive background prefetching to eliminate inter-sentence latency. Furthermore, encapsulate the web application into a standalone Windows desktop executable (`.exe`) via Electron, featuring automated background Python server lifecycle management and system tray minimization.

---

## Technical Context

**Language/Version**: TypeScript 5.8 (Client & Electron), Python 3.10 (Local RVC Server), React 19, Node.js $\ge 18$  
**Primary Dependencies**:
- Frontend: React 19, Lucide React, Tailwind CSS v4, Motion
- Desktop Host: Electron $\ge 34$, `electron-builder`, `esbuild`
- Backend: Flask, `edge-tts`, `rvc-python==0.1.5`, PyTorch / CUDA (user-installed)
**Storage**: Client `localStorage` for `TTSSettings`; in-memory sliding window cache for audio blobs; filesystem for RVC model weights  
**Testing**: Manual & automated smoke tests (`quickstart.md`), TypeScript compilation check (`tsc --noEmit`), Vite build validation  
**Target Platform**: Windows 10/11 x64 (Desktop application & Modern Chromium Browsers)  
**Project Type**: React Web Application + Electron Desktop Shell + Local Python microservice  
**Performance Goals**: Sentence transition latency $< 200\text{ ms}$ on prefetch cache hits; server health detection $< 3\text{ seconds}$  
**Constraints**: Do NOT bundle heavy Python `venv` or `model` weights ($> 3\text{ GB}$) into installer; keep installer light (~$80-120\text{ MB}$); guarantee $0$ orphaned background processes on exit  
**Scale/Scope**: Single local reader user session, 1-3 sentences audio cache buffer, zero regressions to existing document reader features  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| Non-breaking changes to existing voice engine | ✅ Passed | Default provider is `'browser'`, retaining 100% of existing `speechSynthesis` capabilities. |
| Interface encapsulation | ✅ Passed | `useTTS` external API surface is preserved identically; downstream components (`ReaderContent`, `ControlBar`, `MascotWidget`) require 0 breaking modifications. |
| Packaging hygiene | ✅ Passed | Heavy model files and Python runtime are kept decoupled from git and installer distribution. |
| Resource lifecycle safety | ✅ Passed | Audio object URLs revoked after playback; Windows `taskkill` ensures background Python processes terminate on exit. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-rvc-tts-desktop/
├── plan.md              # Implementation Plan
├── research.md          # Technical research and rationale
├── data-model.md        # Schemas and state lifecycles
├── quickstart.md        # End-to-end verification workflows
├── contracts/           # Interface contracts
│   ├── rvc-server-api.yaml
│   ├── tts-hook-interface.ts
│   └── electron-ipc-contract.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Layout

```text
reader/
├── electron/
│   ├── main.ts             # Electron main process (spawn, poll health, tray, window)
│   ├── preload.ts          # Electron context bridge
│   └── tsconfig.json       # Electron TS configuration
├── python-backend/
│   ├── server.py           # Local Flask + Edge-TTS + RVC synthesis server (port 8008)
│   ├── requirements.txt    # Python dependencies
│   ├── model/              # User-supplied *.pth and *.index files (.gitignored)
│   └── venv/               # User-supplied Python 3.10 virtual environment (.gitignored)
├── src/
│   ├── types.ts            # Extended TTSSettings (ttsProvider, rvcServerUrl)
│   ├── hooks/
│   │   └── useTTS.ts       # Multi-provider playback, prefetch cache, health check
│   └── components/
│       └── SettingsModal.tsx # Provider selector, status badge, test voice, URL config
├── dist/                   # Client build artifacts
├── dist-electron/          # Electron main/preload build artifacts
└── package.json            # Scripts: dev, electron:dev, electron:build
```

---

## Phases & Deliverables

### Phase 1: Type Definitions & Backend Setup
1. Update [`src/types.ts`](file:///e:/reader/src/types.ts):
   - Add `ttsProvider: 'browser' | 'rvc-local'` to `TTSSettings`.
   - Add `rvcServerUrl: string` to `TTSSettings`.
2. Setup `python-backend/`:
   - Copy `server.py` and `requirements.txt` from specification into `python-backend/`.
   - Update `.gitignore` to ignore `python-backend/venv/` and `python-backend/model/*.pth`, `python-backend/model/*.index`.

### Phase 2: React Audio Engine & Hook Refactoring (`useTTS.ts`)
1. Implement `audioRef` maintaining a persistent `HTMLAudioElement`.
2. Implement prefetching pipeline (`cacheRef: Map<number, string>`):
   - While sentence $N$ plays, asynchronously fetch audio for $N+1$.
   - Maintain cache limit $\le 3$ sentences and invoke `URL.revokeObjectURL` on eviction.
3. Branch `speakSentence`:
   - `'browser'`: existing `window.speechSynthesis` flow.
   - `'rvc-local'`: fetch WAV from `${rvcServerUrl}/speak`, load into audio element, handle `onended`, `onerror`, apply `settings.rate` to `audio.playbackRate`.
4. Implement playback controls: `pause`, `resume`, `stop`, `testVoice`.
5. Implement server health verification (`rvcServerStatus`: `'unknown' | 'checking' | 'connected' | 'unreachable'`).

### Phase 3: Settings Modal UI Enhancements (`SettingsModal.tsx`)
1. Add provider segmented control ("Giọng máy (mặc định)" vs "Giọng của tôi (RVC local)").
2. When "Giọng của tôi" is active:
   - Hide browser voice list and voice search.
   - Show `rvcServerUrl` input with default `http://localhost:8008`.
   - Render connection status indicator dot and status label.
   - Show warning alert banner when unreachable.
   - Wire "Test Voice" button to sample Vietnamese sentence via RVC server.

### Phase 4: Electron Desktop Integration & Packaging
1. Install Electron development dependencies: `electron`, `electron-builder`, `concurrently`, `cross-env`.
2. Implement `electron/main.ts`:
   - Python spawn logic checking `python-backend/venv/Scripts/pythonw.exe`.
   - Health polling (1s interval, max 60s).
   - Window creation and loading (port 3000 in dev, `dist/index.html` in prod).
   - Window close interception $\rightarrow$ minimize to system tray.
   - System tray menu with "Mở VoxRead" and "Thoát".
   - Process tree termination on Windows via `taskkill /F /T /PID`.
3. Implement `electron/preload.ts` and `electron/tsconfig.json`.
4. Configure `package.json` scripts:
   - `"build:electron"`: `esbuild electron/main.ts --bundle --platform=node --outfile=dist-electron/main.cjs --external:electron`
   - `"electron:dev"`: run Vite + Electron concurrently.
   - `"electron:build"`: compile React + compile Electron + run `electron-builder`.
5. Configure `electron-builder` options with `extraResources` for `python-backend/server.py` and `requirements.txt`.

### Phase 5: Verification & End-to-End Testing
1. Execute tests per [`quickstart.md`](./quickstart.md).
2. Validate UI responsiveness, prefetch cache hit rate, and graceful fallback behavior.
3. Validate clean process termination in Windows Task Manager.

---

## Complexity Tracking

*No constitution violations or unjustified architectural complexities detected.*
