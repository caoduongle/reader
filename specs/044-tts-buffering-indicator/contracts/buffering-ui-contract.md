# Interface Contract: Buffering State & ControlBar Rendering

**Feature**: `044-tts-buffering-indicator`  
**Date**: 2026-09-06

## 1. `useTTS` Return Contract

Exported hook API:
```typescript
export function useTTS(...): {
  ...
  isBuffering: boolean;
}
```

### Invariants:
1. `isBuffering` is `true` only while RVC voice synthesis is actively resolving or downloading an audio blob.
2. `isBuffering` is guaranteed to return to `false` when:
   - `audio.src` is set and audio is ready to play.
   - Fetch fails or aborts.
   - User navigates or pauses triggering stale check return.
   - User invokes `stop()` or `pause()`.

---

## 2. `ControlBar` Component Contract

### Props Definition
```typescript
export interface ControlBarProps {
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering?: boolean;
  ...
}
```

### Rendering Behavior
```tsx
<button
  id="tts-play-pause-btn"
  type="button"
  onClick={onTogglePlay}
  title={
    isBuffering
      ? 'Đang tạo giọng đọc...'
      : isPlaying && !isPaused
        ? 'Tạm dừng (Phím Space)'
        : 'Phát tiếp (Phím Space)'
  }
  aria-label={
    isBuffering
      ? 'Đang tạo giọng đọc...'
      : isPlaying && !isPaused
        ? 'Tạm dừng'
        : 'Phát tiếp'
  }
  className="..."
>
  {isBuffering ? (
    <Loader2 className="w-4 h-4 animate-spin text-black" />
  ) : isPlaying && !isPaused ? (
    <Pause className="w-4 h-4 fill-black text-black" />
  ) : (
    <Play className="w-4 h-4 fill-black text-black ml-0.5" />
  )}
</button>
```
