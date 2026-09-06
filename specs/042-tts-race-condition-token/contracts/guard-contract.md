# Interface Contract: TTS Execution Guard & Generation Token

**Feature**: `042-tts-race-condition-token`  
**Date**: 2026-09-06

## 1. Internal Hook State Contract

### Token Declaration
Declared in `src/hooks/useTTS.ts`:
```typescript
const playTokenRef = useRef<number>(0);
```

### Invalidation Triggers
- **Trigger 1**: Start of `speakSentence(index)`:
  ```typescript
  playTokenRef.current += 1;
  const myToken = playTokenRef.current;
  ```
- **Trigger 2**: Inside `stop()`:
  ```typescript
  playTokenRef.current += 1;
  ```

---

## 2. Stale Check Guard Contract

### Guard Locations in `speakSentence` (RVC Local branch)
1. **Pre-Configuration Guard** (Immediately after obtaining `audioBlobUrl`, before `audio.src = audioBlobUrl`):
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
2. **Pre-Playback Guard** (Immediately before `await audio.play()`):
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

### Operational Invariants
1. **No Autoplay on Pause**: If `isPausedRef.current === true`, audio will not be assigned to `audio.src` or played.
2. **Single Audio Source**: Only the invocation whose `myToken === playTokenRef.current` can write to `audioRef.current.src` and invoke `.play()`.
3. **Cache Transparency**: Cache entries in `prefetchCacheRef` are retained; aborting the player assignment does not discard the pre-fetched blob.
