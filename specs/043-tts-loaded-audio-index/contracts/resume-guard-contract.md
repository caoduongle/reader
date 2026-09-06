# Interface Contract: Loaded Audio Index & Resume Guards

**Feature**: `043-tts-loaded-audio-index`  
**Date**: 2026-09-06

## 1. State Invariant Contract

### Variable Definition
```typescript
const loadedAudioIndexRef = useRef<number | null>(null);
```

### Invariant
At any point in time:
- `loadedAudioIndexRef.current === k` if and only if `audioRef.current.src` was assigned the audio blob generated for sentence `k`.
- `loadedAudioIndexRef.current === null` when no valid audio is loaded, when playback is stopped via `stop()`, or when an audio error occurs.

---

## 2. In-Place Resume Predicate Contract

### `play(index)` Signature & Behavior
```typescript
const play = useCallback(
  (index?: number) => {
    const targetIndex = typeof index === 'number' ? index : currentSentenceIndex;
    setIsPlaying(true);
    setIsPaused(false);

    if (settingsRef.current.ttsProvider === 'rvc-local') {
      const audio = audioRef.current;
      if (
        audio &&
        loadedAudioIndexRef.current === targetIndex &&
        audio.paused &&
        !audio.ended
      ) {
        audio
          .play()
          .then(() => {
            prefetchUpcoming(targetIndex);
          })
          .catch(() => {
            speakSentence(targetIndex);
          });
        return;
      }
    }

    speakSentence(targetIndex);
  },
  [currentSentenceIndex, speakSentence, prefetchUpcoming]
);
```

### `resume()` Signature & Behavior
```typescript
const resume = useCallback(() => {
  if (settingsRef.current.ttsProvider === 'rvc-local') {
    const audio = audioRef.current;
    if (
      audio &&
      loadedAudioIndexRef.current === currentIdxRef.current &&
      audio.paused &&
      !audio.ended
    ) {
      audio
        .play()
        .then(() => {
          setIsPaused(false);
          setIsPlaying(true);
          prefetchUpcoming(currentIdxRef.current);
        })
        .catch(() => {
          speakSentence(currentIdxRef.current);
        });
    } else {
      speakSentence(currentIdxRef.current);
    }
  } else {
    // Web Speech API flow (unchanged)
  }
}, [speakSentence, prefetchUpcoming, startKeepAlive]);
```
