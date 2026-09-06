# Interface Contract: Latency Diagnostics Telemetry

**Feature**: `040-tts-latency-diagnostics`  
**Date**: 2026-09-06

## 1. Backend Log Contract (`server.log`)

### Source
`python-backend/server.py` via standard output / standard error redirected to `server.log`.

### Protocol / Formatting
Lines emitted to `server.log` by the TTS pipeline MUST adhere to:
```text
[VoxRead][Timing] Edge-TTS: {edge_time_seconds:.2f}s | RVC inference: {rvc_time_seconds:.2f}s
```
Optional debug logs:
```text
[VoxRead][Debug] ...
```

### Buffering Guarantee
- Guaranteed unbuffered via `PYTHONUNBUFFERED=1` in `electron/main.ts`.
- Each log line appears in `server.log` synchronously as it is generated, without awaiting buffer flush or process exit.

---

## 2. Frontend Client Timing Contract (`console.log`)

### Source
`src/hooks/useTTS.ts` inside `speakSentence()` via `console.log`.

### Trigger
Fired when `audio.onplaying` is dispatched by HTMLAudioElement.

### Protocol / Formatting
```text
[VoxRead][ClientTiming] Cho fetch/cache: {fetchCacheMs}ms | Cho audio bat dau phat sau khi gan src: {playbackStartupMs}ms
```

- `{fetchCacheMs}`: Integer milliseconds calculated as `(clientT1 - clientT0).toFixed(0)`.
  - Measures total wait time for retrieval of the audio blob (near 0ms if cached; equal to network + backend processing time if fetched on demand).
- `{playbackStartupMs}`: Integer milliseconds calculated as `(clientT2 - clientT1).toFixed(0)`.
  - Measures browser audio decoding, audio pipeline scheduling, and hardware output commencement after `audio.src` assignment.

### Handler Preservation Contract
- Any preexisting handler attached to `audio.onplaying` MUST be invoked prior to or concurrently with the diagnostic logging:
```typescript
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

