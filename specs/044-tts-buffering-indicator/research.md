# Phase 0 Research: TTS Generation Buffering Visual Indicator

**Feature**: `044-tts-buffering-indicator`  
**Date**: 2026-09-06

## 1. Problem Analysis: UI Disconnect During Voice Synthesis Latency

### UX Bottleneck
In `src/hooks/useTTS.ts`, calling `play()` sets `isPlaying = true` immediately. In `rvc-local` mode:
1. The speech synthesis pipeline must contact the local backend (`/speak`), which synthesizes audio via Edge-TTS and applies RVC model inference on the audio frames.
2. This process typically takes between 0.5s to 3.0s depending on sentence length and hardware.
3. Throughout this generation window, `ControlBar` displays the static "Pause" icon (`<Pause />`), which represents an actively playing audio stream.
4. Because no sound is heard yet, users believe the application is frozen or unresponsive, leading them to click the button again, pausing or restarting the request.

---

## 2. Technical Decisions

### Decision 1: Dedicated Ephemeral Presentation State (`isBuffering`)
Add a dedicated boolean state in `useTTS`:
```typescript
const [isBuffering, setIsBuffering] = useState<boolean>(false);
```

#### Lifecycle Rules:
- **Set True**: In `speakSentence` for the `rvc-local` provider, call `setIsBuffering(true)` right before resolving `audioBlobUrl` (checking `prefetchCacheRef`, `inFlightFetchesRef`, or calling `fetchRVCSpeech`).
- **Set False (Try/Finally)**: Wrap the resolution, stale check, and `audio.src` configuration inside `try ... finally { setIsBuffering(false); }`.
  - When fetch succeeds and `audio.src` is assigned, `finally` runs and clears `isBuffering`.
  - If fetch fails, aborts, or an early return is triggered by stale check, `finally` runs and clears `isBuffering`.
- **Teardown Safeguards**:
  - In `stop()`: `setIsBuffering(false)`.
  - In `pause()`: `setIsBuffering(false)`.

### Decision 2: Visual Representation in `ControlBar`
- **Icon**: Use `Loader2` from `lucide-react` with Tailwind `animate-spin text-black w-4 h-4`.
- **Tooltip & Accessibility**:
  ```tsx
  title={isBuffering ? 'Đang tạo giọng đọc...' : isPlaying && !isPaused ? 'Tạm dừng (Phím Space)' : 'Phát tiếp (Phím Space)'}
  aria-label={isBuffering ? 'Đang tạo giọng đọc...' : isPlaying && !isPaused ? 'Tạm dừng' : 'Phát tiếp'}
  ```
- **Button Styling**: Keep the prominent amber action styling so the button remains easily identifiable.

### Decision 3: Decoupled Architectural Boundary
- `isBuffering` is strictly an output for display and user feedback.
- Play/pause state machines, audio event dispatchers, generation tokens (`playTokenRef`), and prefetch caches do NOT depend on `isBuffering`.

---

## 3. Unit & Integration Testing Strategy

### Hook Test in `tests/hooks/useTTS.test.ts`
- Trigger `play(0)` with a delayed mock fetch promise.
- Assert `result.current.isBuffering === true`.
- Resolve the mock fetch promise.
- Assert `result.current.isBuffering === false` and `mainAudio.src` is assigned.
- Trigger delayed fetch, then call `stop()`.
- Assert `result.current.isBuffering === false`.
