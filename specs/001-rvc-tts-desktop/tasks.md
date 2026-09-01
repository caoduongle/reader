# Tasks: Local RVC Voice Cloning Integration & Windows Desktop Packaging

**Feature**: `001-rvc-tts-desktop`  
**Input**: Feature specification from [`specs/001-rvc-tts-desktop/spec.md`](./spec.md) and plan from [`specs/001-rvc-tts-desktop/plan.md`](./plan.md)  
**Status**: Ready for Implementation

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project structure, backend files, and desktop build dependencies

- [X] T001 Create `python-backend/server.py` with Flask + Edge-TTS + RVC inference service in `python-backend/server.py`
- [X] T002 [P] Create `python-backend/requirements.txt` with backend package specifications in `python-backend/requirements.txt`
- [X] T003 [P] Update `.gitignore` to exclude `python-backend/venv/` and `python-backend/model/*.pth`, `python-backend/model/*.index` in `.gitignore`
- [X] T004 [P] Install desktop dependencies (`electron`, `electron-builder`, `concurrently`, `cross-env`) in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data models, types, and build scripts that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Extend `TTSSettings` interface with `ttsProvider: 'browser' | 'rvc-local'` and `rvcServerUrl: string` in `src/types.ts`
- [X] T006 Update `DEFAULT_SETTINGS` and `localStorage` parsing migration for new provider fields in `src/hooks/useTTS.ts`
- [X] T007 [P] Create TypeScript configuration for Electron main process in `electron/tsconfig.json`
- [X] T008 [P] Configure `build:electron`, `electron:dev`, `electron:build` scripts and `electron-builder` extraResources in `package.json`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Personalized Cloned Voice Reading (Priority: P1) 🎯 MVP

**Goal**: Users can select "Giọng của tôi (RVC local)", input server URL, test voice with a sample sentence, and read chapters with continuous playback and sentence highlighting.

**Independent Test**: Configure a running local RVC server at `http://localhost:8008`, select "Giọng của tôi" in Settings, test voice output, and start playback on any chapter. Verify audio plays and advances sentences in sequence.

### Implementation for User Story 1

- [X] T009 [US1] Create persistent `HTMLAudioElement` ref (`audioRef`) and wire event listeners (`onended`, `onerror`) in `src/hooks/useTTS.ts`
- [X] T010 [US1] Implement RVC voice synthesis request (`POST ${rvcServerUrl}/speak`) to obtain audio blob and create object URL in `src/hooks/useTTS.ts`
- [X] T011 [US1] Implement playback controls (`play`, `pause`, `resume`, `stop`, `jumpToSentence`) and rate adjustment (`audio.playbackRate`) for RVC in `src/hooks/useTTS.ts`
- [X] T012 [US1] Implement Vietnamese sample sentence preview (`testVoice`) for the RVC local provider in `src/hooks/useTTS.ts`
- [X] T013 [US1] Add provider segmented control ("Giọng máy" vs "Giọng của tôi") and `rvcServerUrl` input in `src/components/SettingsModal.tsx`
- [X] T014 [US1] Toggle browser voices list visibility (hide when RVC active) and connect "Test Voice" action in `src/components/SettingsModal.tsx`

**Checkpoint**: At this point, User Story 1 is fully functional and delivers an MVP reading experience with local RVC voice.

---

## Phase 4: User Story 2 - Voice Engine Health Monitoring & Recovery (Priority: P2)

**Goal**: Provide instant visual feedback for server connectivity (connected / unreachable / checking), show diagnostic warning banners, and allow smooth fallback to browser voices.

**Independent Test**: Stop the Python server and verify red status indicator and warning banner in Settings. Start the server and verify status switches to green. Verify fallback to browser voices works immediately with no reload.

### Implementation for User Story 2

- [X] T015 [US2] Implement asynchronous server health probe (`GET ${rvcServerUrl}/health`) and `rvcServerStatus` state in `src/hooks/useTTS.ts`
- [X] T016 [US2] Implement manual/reactive health re-check (`checkRVCServerHealth`) triggered on mount, URL edit, and modal open in `src/hooks/useTTS.ts`
- [X] T017 [US2] Add real-time connection status indicator badge (green/red/amber dot) and diagnostic warning banner for unreachable server in `src/components/SettingsModal.tsx`
- [X] T018 [US2] Add playback guard in `play` to prevent hanging on unreachable server and display actionable feedback in `src/hooks/useTTS.ts`

**Checkpoint**: At this point, User Stories 1 and 2 work reliably together with transparent connection diagnostics.

---

## Phase 5: User Story 3 - Latency-Minimized Audio Prefetching (Priority: P3)

**Goal**: While sentence $N$ is playing, prefetch sentence $N+1$ in the background into an in-memory cache ($\le 3$), enabling sentence-to-sentence transition in $< 200\text{ ms}$.

**Independent Test**: Play a chapter with multiple sentences. Observe the Network tab to confirm sentence $N+1$ is fetched while sentence $N$ plays, and verify transition between sentences occurs without audible gaps.

### Implementation for User Story 3

- [X] T019 [US3] Implement `cacheRef` sliding window cache (`Map<number, string>`) with capacity limit and `URL.revokeObjectURL` cleanup in `src/hooks/useTTS.ts`
- [X] T020 [US3] Implement background prefetch pipeline triggering asynchronous synthesis of sentence $N+1$ during sentence $N$ playback in `src/hooks/useTTS.ts`
- [X] T021 [US3] Implement prefetch cache hit check in `speakSentence` to play cached audio blobs immediately upon sentence transition in `src/hooks/useTTS.ts`
- [X] T022 [US3] Implement prefetch cache eviction and active request abortion on sentence jump, chapter change, or stop in `src/hooks/useTTS.ts`

**Checkpoint**: User Stories 1, 2, and 3 now provide a smooth, low-latency cloned voice reading experience.

---

## Phase 6: User Story 4 - Native Windows Application with Automatic Engine Management (Priority: P4)

**Goal**: Package the app as a Windows desktop executable via Electron that auto-spawns the background Python server, polls health, supports system tray minimization, and terminates cleanly on quit.

**Independent Test**: Launch the app via `npm run electron:dev` (and packaged `.exe`). Verify Python server starts automatically, closing window minimizes to system tray, and selecting "Thoát" cleanly terminates all background processes without zombies.

### Implementation for User Story 4

- [X] T023 [P] [US4] Create Electron context bridge script in `electron/preload.ts`
- [X] T024 [US4] Implement Python backend process spawn and path resolution (`python-backend/venv/Scripts/pythonw.exe`) in `electron/main.ts`
- [X] T025 [US4] Implement startup health poll loop (1s interval, max 60s) with error dialog fallback in `electron/main.ts`
- [X] T026 [US4] Implement BrowserWindow creation and dual-mode URL loading (dev localhost:3000 vs prod dist/index.html) in `electron/main.ts`
- [X] T027 [US4] Implement System Tray icon with context menu ("Mở VoxRead", "Thoát") and window close interception in `electron/main.ts`
- [X] T028 [US4] Implement Windows process tree clean termination (`taskkill /F /T /PID`) on application quit in `electron/main.ts`

**Checkpoint**: Standalone Windows desktop app operational without manual terminal interaction.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, linting, packaging, and final validations across all user stories

- [X] T029 [P] Run TypeScript type check across the entire project (`npm run lint` / `tsc --noEmit`)
- [X] T030 [P] Validate React client production build (`npm run build`) in `package.json`
- [X] T031 Validate Electron main process bundle generation (`npm run build:electron`) in `dist-electron/main.cjs`
- [X] T032 Execute end-to-end verification workflows documented in `specs/001-rvc-tts-desktop/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion (T005-T008)
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion
- **User Story 3 (Phase 5)**: Depends on User Story 1 completion
- **User Story 4 (Phase 6)**: Depends on Phase 1 & 2 completion; can run in parallel with frontend stories
- **Polish (Phase 7)**: Depends on all implementation phases being complete

### Parallel Opportunities

- **Phase 1**: Tasks T002, T003, T004 can run in parallel with T001
- **Phase 2**: Tasks T007, T008 can run in parallel with T005, T006
- **Phase 6 (Desktop)**: T023 can run in parallel with T024; Phase 6 can be developed in parallel with Phases 3-5
- **Phase 7**: Tasks T029, T030 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1).
3. Validate independent MVP reading in browser with running RVC server.

### Incremental Delivery
1. Add User Story 2: Connection health diagnostics and graceful alert banners.
2. Add User Story 3: Background audio prefetching for zero-latency transitions.
3. Add User Story 4: Electron desktop wrapping with automatic process management & system tray.
4. Run Phase 7 polish and packaging checks.
