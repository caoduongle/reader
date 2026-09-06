# Phase 0 Research: TTS Generation Token & Race Condition Stale Check

**Feature**: `042-tts-race-condition-token`  
**Date**: 2026-09-06

## 1. Root Cause Analysis of TTS Race Conditions

### The Stale Check Gap
In `src/hooks/useTTS.ts`, `speakSentence` handles audio synthesis for the `rvc-local` provider:
```typescript
const clientT0 = performance.now();
let audioBlobUrl: string | null = null;
...
audioBlobUrl = await fetchRVCSpeech(textToSpeak, settingsRef.current.rvcServerUrl, controller);
...
// Current Stale check:
if (!isPlayingRef.current || currentIdxRef.current !== index) {
  return;
}
```

This check is vulnerable to two distinct race conditions:
1. **Pause Ignored During Fetch**:
   When a user clicks Pause while audio generation is pending, `pause()` sets `isPaused = true` and `isPausedRef.current = true`, but leaves `isPlayingRef.current = true` (because the reading session is paused, not stopped). Consequently, `!isPlayingRef.current` evaluates to `false`. When the fetch promise resolves, the code proceeds directly to `audio.src = audioBlobUrl` and `await audio.play()`. As a result, sound begins playing immediately even though the user paused.
2. **Concurrent Overwriting and Audio Collisions**:
   If a user navigates to another sentence or jumps rapidly (or re-triggers speech for the same index), a new invocation of `speakSentence` starts. If the earlier fetch finishes after or concurrently with the new one, both promises attempt to mutate `audioRef.current` and call `audio.play()`, causing auditory stutter, distorted audio, or the wrong sentence being vocalized.

---

## 2. Technical Decisions

### Decision 1: Monotonic Generation Counter (`playTokenRef`)
- **Structure**: `const playTokenRef = useRef<number>(0);` placed alongside the existing state refs at the top of `useTTS`.
- **Token Capture**:
  ```typescript
  playTokenRef.current += 1;
  const myToken = playTokenRef.current;
  ```
  Executed at the very top of `speakSentence` prior to checking `provider` or sentence bounds.
- **Invalidation in `stop()`**:
  ```typescript
  playTokenRef.current += 1;
  ```
  Incrementing `playTokenRef.current` inside `stop()` immediately invalidates any awaiting asynchronous operations.

### Decision 2: Comprehensive 4-Part Stale Check
In `speakSentence` (`rvc-local` provider branch):
- Immediately after obtaining `audioBlobUrl`:
  ```typescript
  if (
    playTokenRef.current !== myToken ||
    !isPlayingRef.current ||
    isPausedRef.current ||
    currentIdxRef.current !== index
  ) {
    return;
  }
  ```
- Immediately before `await audio.play()`:
  ```typescript
  if (
    playTokenRef.current !== myToken ||
    !isPlayingRef.current ||
    isPausedRef.current ||
    currentIdxRef.current !== index
  ) {
    return;
  }
  ```

### Rationale
- **Zero Overhead**: Integer comparison is instantaneous and synchronous.
- **Comprehensive Coverage**:
  - `playTokenRef.current !== myToken` prevents older invocations of `speakSentence` from executing if a newer one was started.
  - `!isPlayingRef.current` protects against playback having been stopped.
  - `isPausedRef.current` prevents unpausing/autoplay when fetch completes while paused.
  - `currentIdxRef.current !== index` ensures the UI index cursor matches the sentence being spoken.
- **Strict Boundary Preservation**:
  - `play()`, `pause()`, `resume()`, `jumpToSentence()` retain their current contract.
  - Prefetch caching (`prefetchCacheRef`) and deduplication (`inFlightFetchesRef`) remain intact, ensuring downloaded blobs are preserved for future use.

---

## 3. Unit Testing Strategy

### Test Environment (`tests/hooks/useTTS.test.ts`)
- **Harness**: Vitest + `@testing-library/react` `renderHook` + `act`.
- **Mocks**:
  - `HTMLAudioElement` mock tracking `play()`, `pause()`, `src`, and listeners.
  - `URL.createObjectURL` mock returning synthetic blob URLs.
  - `vi.stubGlobal('fetch', ...)` simulating controlled latency via deferred Promises.
- **Coverage**:
  1. `speakSentence` called -> user pauses while fetch pending -> fetch resolves -> verify `audio.play` was NEVER called.
  2. `speakSentence(0)` called -> user jumps to sentence 1 while fetch 0 pending -> fetch 0 resolves -> verify sentence 0 audio was NOT assigned and NOT played.
