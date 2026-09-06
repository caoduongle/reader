# Phase 0 Research: TTS Latency Diagnostics (Unbuffered Python Spawn & Client Audio Playback Timing)

**Feature**: `040-tts-latency-diagnostics`  
**Date**: 2026-09-06

## 1. Unbuffered Python Stdout/Stderr Redirection

### Problem
When `electron/main.ts` spawns the Python backend (`server.py`) with `stdio: ['ignore', logFd, logFd]`, standard output and error are redirected to a regular file descriptor rather than an interactive terminal (TTY). By default in CPython, standard streams switch from line-buffered mode to full block-buffering (typically 4KB to 8KB buffer size). As a result:
- `print()` calls inside `server.py`, including `[VoxRead][Timing]` and `[VoxRead][Debug]` statements, stay buffered in Python's runtime I/O buffer.
- `server.log` appears empty or stale while requests are actively executing, preventing real-time latency inspection.

### Decision
Set environment variable `PYTHONUNBUFFERED=1` in the `env` option passed to `child_process.spawn()` in `electron/main.ts`:
```ts
pythonProcess = spawn(pythonExe, [serverScript], {
  cwd: baseDir,
  detached: false,
  stdio: ['ignore', logFd, logFd],
  env: { ...process.env, PYTHONUNBUFFERED: '1' },
});
```

### Rationale
- Setting `PYTHONUNBUFFERED=1` forces standard streams (stdout and stderr) to be completely unbuffered at the C runtime level.
- Every `print()` in `server.py` immediately flushes to `logFd` and is written directly to disk in `python-backend/server.log`.
- Spreading `process.env` ensures critical system paths (like `PATH`, `SYSTEMROOT`, `CUDA_PATH`, `VIRTUAL_ENV`) remain intact for Python and its C-extensions (PyTorch, Fairseq).

### Alternatives Evaluated
1. **Pass `-u` command-line argument**: `spawn(pythonExe, ['-u', serverScript], ...)`.
   - *Rejected*: While functional for direct Python invocations, setting `PYTHONUNBUFFERED=1` in the environment also covers any child processes spawned by Python scripts and matches Python standard conventions.
2. **Manually call `flush=True` on every print or `sys.stdout.flush()` in Python**:
   - *Rejected*: Fragile and prone to missing logs emitted by dependencies (Uvicorn, FastAPI, PyTorch, Edge-TTS).

---

## 2. Client-Side Audio Playback Timing Pipeline

### Problem
Users report periodic ~30s freezes when reading sentences with RVC TTS. Currently, it is impossible to determine whether the delay happens:
1. In upstream Edge-TTS generation (network latency / Microsoft service throttling),
2. In RVC model inference on GPU/CPU,
3. In local HTTP transport between client and server, or
4. In browser audio element loading, decoding, or audio device output buffering.

### Decision
Introduce high-resolution performance timestamps in `src/hooks/useTTS.ts` (`speakSentence`):
- `clientT0 = performance.now()`: Captured at the very beginning of the RVC audio resolution flow (before checking `prefetchCacheRef` or calling `fetchRVCSpeech`).
- `clientT1 = performance.now()`: Captured immediately after `audioBlobUrl` is acquired, right before `audio.src = audioBlobUrl`.
- `clientT2 = performance.now()`: Captured inside `audio.onplaying`.

Log format:
```ts
console.log(
  `[VoxRead][ClientTiming] Cho fetch/cache: ${(clientT1 - clientT0).toFixed(0)}ms | ` +
  `Cho audio bat dau phat sau khi gan src: ${(clientT2 - clientT1).toFixed(0)}ms`
);
```

Preserve existing handlers:
```ts
const prevOnPlaying = audio.onplaying;
audio.onplaying = (ev: Event) => {
  if (typeof prevOnPlaying === 'function') {
    prevOnPlaying.call(audio, ev);
  }
  const clientT2 = performance.now();
  console.log(
    `[VoxRead][ClientTiming] Cho fetch/cache: ${(clientT1 - clientT0).toFixed(0)}ms | ` +
    `Cho audio bat dau phat sau khi gan src: ${(clientT2 - clientT1).toFixed(0)}ms`
  );
};
```

### Rationale
- `performance.now()` provides monotonic, high-precision timing unaffected by system clock adjustments.
- `onplaying` represents the exact event when the media player begins playing after having been paused or delayed for data, which directly measures browser decoding and audio hardware startup latency.
- Chaining `prevOnPlaying` guarantees safe composition with future or existing listeners.

---

## 3. Latency Diagnostic Correlation Matrix

When a user encounters a stall or 30s freeze, cross-referencing `python-backend/server.log` and DevTools Console yields definitive conclusions:

| Symptom / Observation | `server.log` ([VoxRead][Timing]) | DevTools Console ([VoxRead][ClientTiming]) | Root Cause Diagnosis |
| :--- | :--- | :--- | :--- |
| **Case A** | `Edge-TTS: ~30s \| RVC: ~0.5s` | `Cho fetch/cache: ~30500ms \| Cho audio...: <100ms` | Microsoft Edge-TTS network congestion or rate-limiting |
| **Case B** | `Edge-TTS: ~0.8s \| RVC: ~29s` | `Cho fetch/cache: ~29800ms \| Cho audio...: <100ms` | RVC model GPU fallback to slow CPU or heavy model compute |
| **Case C** | `Edge-TTS: ~0.5s \| RVC: ~0.5s` | `Cho fetch/cache: ~30000ms \| Cho audio...: <100ms` | Local HTTP socket queueing, deadlock, or connection hang |
| **Case D** | `Edge-TTS: ~0.5s \| RVC: ~0.5s` | `Cho fetch/cache: <50ms (cached) \| Cho audio...: ~30000ms` | Chromium audio element decoding stall or OS audio driver lock |
