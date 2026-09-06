# Phase 0 Research: Accurate Audio Resume via Loaded Audio Index Reference

**Feature**: `043-tts-loaded-audio-index`  
**Date**: 2026-09-06

## 1. Problem: Replay of Finished Sentence During In-Flight Speech Synthesis

### Bug Manifestation
Users report a bug where they must click Play twice or hear the previous sentence repeat when playing or resuming speech:
1. Sentence $N-1$ finishes playing. The reusable `HTMLAudioElement` (`audioRef.current`) retains the audio blob URL of sentence $N-1$ with `audio.ended === true`.
2. Playback advances to sentence $N$, calling `speakSentence(N)`.
3. `speakSentence(N)` begins fetching the audio blob asynchronously (`await fetchRVCSpeech(...)`).
4. While the fetch is pending, the user clicks Play or Resume.
5. `resume()` checks `if (audioRef.current && audioRef.current.src)`. Because `audio.src` is still populated with sentence $N-1$'s blob, it calls `audioRef.current.play()`.
6. Under the W3C HTMLMediaElement standard, invoking `.play()` on an audio element whose playback has ended resets `currentTime` to `0` and starts playing from the beginning.
7. Consequently, sentence $N-1$ unexpectedly plays again from the start. A few moments later, when sentence $N$'s fetch finishes, the audio either gets overwritten or collides, forcing the user to pause and click play again.

---

## 2. Technical Decisions

### Decision 1: Explicit Tracked Index Reference (`loadedAudioIndexRef`)
Rather than attempting to infer what audio is currently in the player using generic DOM properties (`src`, `paused`, `ended`), track the exact sentence index currently assigned to `audioRef.current.src`:
```typescript
const loadedAudioIndexRef = useRef<number | null>(null);
```

#### Lifecycle Rules:
- **Set on Load**: `loadedAudioIndexRef.current = index;` immediately prior to assigning `audio.src = audioBlobUrl;` in `speakSentence`.
- **Reset on Error**: `loadedAudioIndexRef.current = null;` inside `audio.onerror`.
- **Reset on Stop**: `loadedAudioIndexRef.current = null;` inside `stop()`.

### Decision 2: Strict In-Place Resume Conditions in `play()` and `resume()`
In `play(index)`:
```typescript
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
```

In `resume()`:
```typescript
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
}
```

### Rationale
- **Disambiguates Audio Ownership**: When sentence $N$ is fetching, `loadedAudioIndexRef.current` is either $N-1$ or `null`. Since `loadedAudioIndexRef.current !== targetIndex` (or `!== currentIdxRef.current`), the in-place resume condition fails.
- **Guarantees No Replay of Ended Audio**: Even if the index matched, `!audio.ended` explicitly guards against replay of finished media.
- **Explicit Fallback**: When in-place resume is not valid, `speakSentence` is triggered cleanly, letting the generation ticket (`playTokenRef`) and cache logic manage the fetch safely.
- **Zero Impact on Other Components**:
  - `playTokenRef` and stale check logic remain unchanged.
  - Cache mechanisms remain unchanged.
  - Browser provider (`speechSynthesis`) remains unchanged.

---

## 3. Unit Testing Strategy

### Scenario in `tests/hooks/useTTS.test.ts`
1. Sentence 0 completes (`onended` fires, `mainAudio.ended = true`).
2. Trigger `play(1)` with a controlled, deferred fetch promise for sentence 1.
3. While sentence 1 is still in-flight, invoke `play(1)` or `resume()`.
4. Verify that `mainAudio.play()` is NOT called on sentence 0.
5. Resolve sentence 1's fetch promise.
6. Verify that `mainAudio.play()` is called for sentence 1 and `loadedAudioIndexRef` reflects index 1.
