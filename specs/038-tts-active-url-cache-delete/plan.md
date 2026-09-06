# Implementation Plan: Immediate Eviction of Active Sentence URL from Prefetch Cache

**Branch**: `038-tts-active-url-cache-delete` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/038-tts-active-url-cache-delete/spec.md)

**Input**: Feature specification from `/specs/038-tts-active-url-cache-delete/spec.md`

## Summary

In `src/hooks/useTTS.ts`, sentence audio URLs retrieved from `prefetchCacheRef` (or awaited via `inFlightFetchesRef`) remain in `prefetchCacheRef.current` during playback. If a user subsequently pauses, jumps, seeks, or reaches chapter completion, `clearPrefetchCache()` executes and calls `URL.revokeObjectURL()` on all cached entries. This revokes the active URL while the HTML5 `Audio` element is still decoding or streaming audio data, triggering `MEDIA_ERR_NETWORK`, `MEDIA_ERR_DECODE`, or Chromium's `FFmpegDemuxer: data source error`.

This plan evicts the sentence index immediately from `prefetchCacheRef.current` when retrieved in `speakSentence`, decoupling active audio from standby cache cleanup.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18

**Primary Dependencies**: React hooks (`useCallback`, `useRef`), Web Audio APIs (`HTMLAudioElement`, `URL`)

**Storage**: In-memory React ref `prefetchCacheRef` (`Map<number, CacheEntry>`)

**Testing**: `npm run typecheck`, `npm test`

**Target Platform**: Electron desktop / Chromium renderer

**Project Type**: React custom hook (`useTTS`)

**Performance Goals**: Instant Map deletion (< 0.01ms), zero UI jank, eliminates playback crashes

**Constraints**:
- Must remove `index` from `prefetchCacheRef.current` in both cache hit and in-flight await branches
- Must not disrupt upcoming prefetch (`prefetchUpcoming`) or eviction of older sentences (`evictOldCache`)

**Scale/Scope**: 1 file modified (`src/hooks/useTTS.ts`), ~10 lines modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an empty template. No active gates or constraints are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/038-tts-active-url-cache-delete/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
└── hooks/
    └── useTTS.ts        # speakSentence function (lines ~503-515)
```

**Structure Decision**: Targeted modification to `speakSentence` in `src/hooks/useTTS.ts`.
