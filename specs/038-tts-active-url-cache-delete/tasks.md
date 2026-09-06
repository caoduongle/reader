# Tasks: Immediate Eviction of Active Sentence URL from Prefetch Cache

**Feature**: 038-tts-active-url-cache-delete | **Branch**: `038-tts-active-url-cache-delete` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/038-tts-active-url-cache-delete/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/038-tts-active-url-cache-delete/plan.md)

---

## Phase 1: User Story 1 – Reliable Audio Playback During Rapid Seeking and Stopping (Priority: P1) 🎯 MVP

**Goal**: Evict the sentence index immediately from `prefetchCacheRef.current` upon assigning or awaiting its URL in `speakSentence`, preventing `clearPrefetchCache()` from revoking the active audio blob URL while the audio element is reading or playing it.

**Independent Test**: Start TTS playback with local RVC voice in a long chapter, rapidly seek/jump across sentences and pause/resume repeatedly, and verify that playback transitions smoothly without `MEDIA_ERR_NETWORK`, `MEDIA_ERR_DECODE`, or `FFmpegDemuxer: data source error`.

### Implementation for User Story 1

- [X] T001 [US1] In `src/hooks/useTTS.ts` inside `speakSentence` (lines ~503-510), add `prefetchCacheRef.current.delete(index)` immediately after reading `prefetchCacheRef.current.get(index)!.blobUrl`, and also add `prefetchCacheRef.current.delete(index)` immediately after awaiting `inFlightFetchesRef.current.get(index)!`.

**Checkpoint**: User Story 1 complete — active sentence URLs are evicted from prefetch cache and protected against premature revocation.

---

## Phase 2: Polish & Cross-Cutting Concerns

**Purpose**: Type safety and regression verification

- [X] T002 Run TypeScript type checking (`npm run typecheck`) to verify zero type errors in `src/hooks/useTTS.ts`
- [X] T003 Run full frontend test suite (`npm test`) to ensure zero regressions across the codebase

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Modifies `src/hooks/useTTS.ts`
- **Phase 2 (Polish & Verification)**: Runs after Phase 1

### User Story Dependencies

- **User Story 1 (P1)**: Core cache eviction fix in `src/hooks/useTTS.ts`

---

## Implementation Strategy

### Incremental Delivery

1. Implement T001 in `src/hooks/useTTS.ts`.
2. Run T002 (`npm run typecheck`).
3. Run T003 (`npm test`).
4. Mark all tasks complete.
