# Tasks: Accurate Audio Resume via Loaded Audio Index Reference

**Feature**: 043-tts-loaded-audio-index | **Branch**: `043-tts-loaded-audio-index` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/043-tts-loaded-audio-index/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/043-tts-loaded-audio-index/plan.md)

---

## Phase 1: User Story 1 – Prevent Accidental Replay of Previous Sentence (Priority: P1) 🎯 MVP

**Goal**: Prevent replaying sentence N-1 when user triggers Play or Resume while sentence N is in-flight by tracking the actual loaded audio index and verifying it before in-place playback.

**Independent Test**: Complete sentence 0 (`ended = true`), start fetching sentence 1, call `play(1)` or `resume()` mid-fetch, and verify sentence 0 is NOT replayed and sentence 1 plays once upon fetch completion.

### Implementation for User Story 1

- [X] T001 [P] [US1] Create unit test in `tests/hooks/useTTS.test.ts` verifying that invoking `play()` or `resume()` while sentence N is fetching does not replay ended sentence N-1
- [X] T002 [US1] Declare `const loadedAudioIndexRef = useRef<number | null>(null);` near state refs in `src/hooks/useTTS.ts`
- [X] T003 [US1] In `speakSentence` in `src/hooks/useTTS.ts`, assign `loadedAudioIndexRef.current = index` immediately before `audio.src = audioBlobUrl`
- [X] T004 [US1] In `play()` in `src/hooks/useTTS.ts`, update the `rvc-local` branch to permit in-place resume only when `loadedAudioIndexRef.current === targetIndex && audio.paused && !audio.ended`
- [X] T005 [US1] In `resume()` in `src/hooks/useTTS.ts`, update the `rvc-local` branch to permit in-place resume only when `loadedAudioIndexRef.current === currentIdxRef.current && audio.paused && !audio.ended`; otherwise call `speakSentence(currentIdxRef.current)`

**Checkpoint**: User Story 1 test in `tests/hooks/useTTS.test.ts` passes — no previous sentence replay occurs during in-flight fetches.

---

## Phase 2: User Story 2 – Reliable In-Place Resume When Paused Mid-Sentence (Priority: P1) 🎯 MVP

**Goal**: Ensure pausing mid-sentence and resuming continues playback directly in-place without triggering a new network fetch.

**Independent Test**: Pause during active audio playback of sentence N, call `resume()`, and verify `audio.play()` is called directly without a new fetch call.

### Implementation for User Story 2

- [X] T006 [P] [US2] Add unit test in `tests/hooks/useTTS.test.ts` asserting that pausing mid-playback and calling `resume()` triggers in-place audio playback without re-fetching

**Checkpoint**: User Story 2 test in `tests/hooks/useTTS.test.ts` passes — mid-sentence pause/resume works with zero latency.

---

## Phase 3: User Story 3 – Loaded Audio Index Lifecycle Teardown (Priority: P2)

**Goal**: Clear `loadedAudioIndexRef` on `stop()` and `audio.onerror` so stale indices are never retained.

**Independent Test**: Verify `loadedAudioIndexRef.current` resets to `null` when `stop()` is invoked or an error occurs.

### Implementation for User Story 3

- [X] T007 [US3] In `stop()` in `src/hooks/useTTS.ts`, set `loadedAudioIndexRef.current = null`
- [X] T008 [US3] In `audio.onerror` in `src/hooks/useTTS.ts`, set `loadedAudioIndexRef.current = null`
- [X] T009 [US3] Add unit test in `tests/hooks/useTTS.test.ts` verifying `loadedAudioIndexRef` resets on `stop()`

**Checkpoint**: User Story 3 complete — audio index reference cleanly lifecycle-managed.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Execute full verification workflow per feature documentation.

- [X] T010 Run `npm run typecheck` to ensure 0 TypeScript compilation errors
- [X] T011 Run `npm run lint` to ensure 0 ESLint errors and 0 warnings
- [X] T012 Run `npm test` to verify all test suites in the repository pass
- [X] T013 Run quickstart validation per `specs/043-tts-loaded-audio-index/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Core ref introduction, setter in `speakSentence`, and guard updates in `play()`/`resume()`.
- **Phase 2 (US2)**: Builds upon Phase 1, asserts in-place resume succeeds when conditions match.
- **Phase 3 (US3)**: Teardown logic in `stop()` and `audio.onerror`.
- **Phase 4 (Polish)**: Final validation verifying all suites and linters pass.

### User Story Dependencies

- **User Story 1 (P1)**: Independent foundation.
- **User Story 2 (P1)**: Depends on Phase 1 (T002–T005).
- **User Story 3 (P2)**: Depends on Phase 1 (T002).

### Parallel Opportunities

- Tests T001, T006, and T009 in `tests/hooks/useTTS.test.ts` can be authored together.
- Linters and test runners (T010, T011, T012) run during validation.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Introduce `loadedAudioIndexRef` in `src/hooks/useTTS.ts` (T002, T003).
2. Refine in-place resume guards in `play()` and `resume()` (T004, T005).
3. Author replay prevention unit test in `tests/hooks/useTTS.test.ts` (T001).
4. Add in-place resume and teardown tests (T006, T009).
5. Update `stop()` and `audio.onerror` (T007, T008).
6. Run full test suite, lint, and typecheck (T010, T011, T012, T013).
