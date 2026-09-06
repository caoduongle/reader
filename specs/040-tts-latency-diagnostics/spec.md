# Feature Specification: TTS Latency Diagnostics (Unbuffered Python Spawn & Client Audio Playback Timing)

**Feature Branch**: `040-tts-latency-diagnostics`

**Created**: 2026-09-06

**Status**: Ready for Review

**Input**: User description: "TASK 1 — Backend: bat buoc dat PYTHONUNBUFFERED=1 khi spawn Python tu Electron. File: electron/main.ts, ham startPythonBackend() (doan spawn(pythonExe, [serverScript], {...})). Vấn đề: print() cua server.py bi buffer khi stdout duoc redirect ra file (khong phai tty), khien cac dong log [VoxRead][Timing] va [VoxRead][Debug] da them truoc do khong bao gio xuat hien trong server.log, du request van chay binh thuong. Thay spawn(...) bang spawn(..., env: { ...process.env, PYTHONUNBUFFERED: '1' }). TASK 2 — Frontend: do thoi gian tu luc gui request toi luc audio THAT SU bat dau phat. File: src/hooks/useTTS.ts, ham speakSentence (doan sau khi co audioBlobUrl, truoc khi phat). Them do thoi gian bao quat toan bo pipeline phia client, in ra console.log de doi chieu voi [VoxRead][Timing] ben server: clientT0 truoc khi lay audioBlobUrl tu cache/fetch, clientT1 sau khi co blob va gan audio.src, clientT2 trong audio.onplaying ghi log [VoxRead][ClientTiming]. Neu audio da co onplaying/onplay handler khac, gop log vao chung, khong ghi de mat handler cu."

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Real-time Backend Log Flushing for Latency Telemetry (Priority: P1) 🎯 MVP

As a developer or user diagnosing TTS performance issues in VoxRead, I want all server log statements (`[VoxRead][Timing]`, `[VoxRead][Debug]`, and framework logs) to be immediately written to `python-backend/server.log` without buffering, so that I can inspect the exact execution duration of Edge-TTS synthesis and RVC model inference in real time during playback.

**Why this priority**: Without `PYTHONUNBUFFERED=1`, Python buffers stdout writes when redirected to a non-TTY file descriptor (`logFd`). Because of this block-buffering, diagnostic logs remain stuck in memory buffers and never appear in `server.log` while diagnosing audio stalls or freeze events.

**Independent Test**:
1. Launch VoxRead (`npm run electron:dev`).
2. Play an RVC voice sentence.
3. Open `python-backend/server.log` immediately while playing.
4. Verify that log entries including `[VoxRead][Timing] Edge-TTS: ... | RVC inference: ...` appear immediately for each processed request without waiting for the buffer to fill or the process to terminate.

**Acceptance Scenarios**:
1. **Given** Electron spawns the Python backend process in `startPythonBackend()`, **When** `spawn` is called, **Then** the process environment includes `PYTHONUNBUFFERED: '1'` merged with `process.env`.
2. **Given** `server.py` executes a `print()` or logging statement targeting stdout or stderr, **When** the message is emitted, **Then** it is immediately flushed and written to `server.log` without block-buffering delay.

---

### User Story 2 – Client-Side End-to-End Latency Diagnostics (Priority: P1)

As a developer or user debugging audio playback delays (e.g. 30-second freezes), I want the client app to measure and log the precise breakdown of time spent waiting for audio fetching/cache resolution and time elapsed before the audio element actually begins playing, so that I can correlate client and server timings to isolate the exact cause of any delay.

**Why this priority**: When a 30-second freeze occurs, knowing only that the frontend is waiting is insufficient. Differentiating between cache/network retrieval time (`clientT1 - clientT0`) and audio decoding/device buffer initialization time (`clientT2 - clientT1`) allows precise localization of whether the stall occurs in Edge-TTS generation, RVC GPU inference, HTTP transport, or browser audio playback.

**Independent Test**:
1. Open DevTools Console in VoxRead (F12 or Electron menu).
2. Start playing sentences using `rvc-local` voice provider.
3. Observe console output for each spoken sentence.
4. Verify that `[VoxRead][ClientTiming] Cho fetch/cache: <X>ms | Cho audio bat dau phat sau khi gan src: <Y>ms` is logged when the audio actually begins emitting sound (`onplaying`).

**Acceptance Scenarios**:
1. **Given** `speakSentence` is triggered for an RVC sentence, **When** resolving the audio blob URL (from cache, in-flight request, or on-demand fetch), **Then** `clientT0` records the start time and `clientT1` records the moment `audioBlobUrl` is acquired.
2. **Given** `audio.src` is set to `audioBlobUrl`, **When** the HTMLAudioElement triggers `onplaying`, **Then** `clientT2` records the timestamp and logs `[VoxRead][ClientTiming]` displaying both elapsed intervals in milliseconds.
3. **Given** `audio` already has an existing `onplaying` or `onplay` event handler, **When** attaching the timing diagnostic listener, **Then** the existing callback logic is preserved and executed alongside the diagnostic logging.

---

### User Story 3 – End-to-End Bottleneck Isolation & Verification (Priority: P2)

As a developer investigating user-reported freeze incidents, I want to cross-reference `python-backend/server.log` and DevTools console logs side-by-side for a reproduced freeze incident, so that I can conclusively classify the bottleneck into one of the four categories: Edge-TTS upstream, RVC model inference, local network/IPC, or client browser audio decoding.

**Why this priority**: Enables rapid resolution of user issues by providing conclusive diagnostic evidence for performance tuning.

**Independent Test**:
1. Trigger continuous reading in VoxRead until a noticeable latency or freeze occurs.
2. Extract the timestamped lines from `python-backend/server.log` (`[VoxRead][Timing]`).
3. Extract the corresponding lines from the DevTools console (`[VoxRead][ClientTiming]`).
4. Validate that comparing both outputs clearly reveals which component consumed the excess latency.

**Acceptance Scenarios**:
1. **Given** a 30s delay caused by network/Edge-TTS, **Then** `server.log` indicates Edge-TTS duration ~30s and client `Cho fetch/cache` reflects ~30s.
2. **Given** a 30s delay caused by RVC inference, **Then** `server.log` indicates RVC inference duration ~30s and client `Cho fetch/cache` reflects ~30s.
3. **Given** a 30s delay caused by browser audio decoding or device contention, **Then** `server.log` shows fast completion (<2s), client `Cho fetch/cache` is fast (<2s), but `Cho audio bat dau phat sau khi gan src` reflects ~30s.

---

### Edge Cases

- **Playback aborted or sentence skipped before playing**: If the user skips or pauses before `audio.onplaying` fires, the pending `onplaying` listener should not trigger duplicate logs for stale sentences or cause unhandled exceptions.
- **Cache Hit vs Cache Miss**: If the audio is already cached in `prefetchCacheRef`, `clientT1 - clientT0` will be negligible (<5ms), clearly distinguishing preloaded playback from on-demand network fetches.
- **Audio Error during loading**: If `audio.onerror` fires before `onplaying`, the error handler logs the failure and no invalid `onplaying` timing is falsely emitted.
- **Preservation of existing handlers**: Any preexisting `onplaying` / `onplay` listener on `audioRef.current` must be safely chained or composed so no functionality is lost.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `electron/main.ts` inside `startPythonBackend()`, the `spawn` options for `pythonExe` MUST include `env: { ...process.env, PYTHONUNBUFFERED: '1' }`.
- **FR-002**: Standard output and standard error from `server.py` MUST be written immediately to `python-backend/server.log` without block-buffering delays.
- **FR-003**: In `src/hooks/useTTS.ts` inside `speakSentence()` for the RVC provider flow:
  - Record start time `clientT0 = performance.now()` before fetching or checking cache for the active sentence audio.
  - Record completion time `clientT1 = performance.now()` immediately after obtaining `audioBlobUrl`.
  - Assign `audio.src = audioBlobUrl`.
  - Attach an `audio.onplaying` listener (preserving any existing handler) that records `clientT2 = performance.now()` and logs:
    ```
    [VoxRead][ClientTiming] Cho fetch/cache: ${(clientT1 - clientT0).toFixed(0)}ms | Cho audio bat dau phat sau khi gan src: ${(clientT2 - clientT1).toFixed(0)}ms
    ```
- **FR-004**: In `src/hooks/useTTS.ts`, if `audio` already has an assigned `onplaying` or `onplay` handler, the diagnostic logging MUST wrap/compose with the existing handler without overwriting or dropping it.
- **FR-005**: All TypeScript files MUST pass typechecking (`npm run typecheck`) and the Electron main process build (`npm run build:electron:main`).

### Key Entities

- **ProcessEnvironment**:
  - `PYTHONUNBUFFERED`: Set to string `'1'` to disable standard stream buffering in Python runtime.
  - `envConfig`: Merged `{ ...process.env, PYTHONUNBUFFERED: '1' }` passed to `child_process.spawn`.

- **ClientTimingTelemetry**:
  - `clientT0`: Timestamp (`DOMHighResTimeStamp` via `performance.now()`) marking the start of audio retrieval.
  - `clientT1`: Timestamp marking retrieval of `audioBlobUrl` and assignment of `audio.src`.
  - `clientT2`: Timestamp when `audio.onplaying` fires indicating the audio hardware/context is actively emitting sound.
  - `fetchCacheDuration`: `(clientT1 - clientT0).toFixed(0)` in milliseconds.
  - `playbackStartDuration`: `(clientT2 - clientT1).toFixed(0)` in milliseconds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `[VoxRead][Timing]` log lines in `python-backend/server.log` appear immediately after each `/speak` request completes, with zero block-buffering latency.
- **SC-002**: 100% of successfully started RVC audio sentences emit a `[VoxRead][ClientTiming]` log line in the browser/DevTools console upon reaching the `playing` state.
- **SC-003**: In case of audio playback stall or freeze, comparing `server.log` and client console log provides definitive numerical evidence pinpointing whether the stall occurred during Edge-TTS, RVC inference, network transfer, or audio element decoding/startup.
- **SC-004**: No existing audio playback callbacks or event handlers are disrupted or replaced.
- **SC-005**: Full codebase passes `npm run typecheck` with 0 type errors.

## Assumptions

- The host system runs Python 3.10+ where `PYTHONUNBUFFERED=1` disables standard stream buffering.
- `performance.now()` is available in the browser/Chromium environment with sub-millisecond precision.
- Existing environment variables in `process.env` (e.g. `PATH`, `CUDA_PATH`, `VIRTUAL_ENV`) are preserved when passing `env: { ...process.env, PYTHONUNBUFFERED: '1' }`.
