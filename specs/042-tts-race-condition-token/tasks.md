# Tasks: TTS Generation Token & Race Condition Stale Check

**Feature**: 042-tts-race-condition-token | **Branch**: `042-tts-race-condition-token` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/042-tts-race-condition-token/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/042-tts-race-condition-token/plan.md)

---

## Phase 1: User Story 1 – Prevent Unintended Audio Playback When Paused (Priority: P1) 🎯 MVP

**Goal**: Invalidate pending audio playback when user clicks Pause during in-flight audio synthesis so that audio does not play upon fetch resolution.

**Independent Test**: Mount `useTTS`, invoke `speakSentence(0)` with a delayed mock fetch, call `pause()` while fetch is pending, resolve the fetch, and assert that `audio.play()` is NEVER invoked.

### Implementation for User Story 1

- [X] T001 [P] [US1] Create unit test in `tests/hooks/useTTS.test.ts` asserting that pausing during in-flight fetch prevents `audio.play()` on promise resolution
- [X] T002 [US1] Add `playTokenRef = useRef<number>(0)` at top of `useTTS` in `src/hooks/useTTS.ts`
- [X] T003 [US1] At start of `speakSentence` in `src/hooks/useTTS.ts`, increment `playTokenRef.current += 1` and capture local `const myToken = playTokenRef.current`
- [X] T004 [US1] In `speakSentence` (`rvc-local` branch) in `src/hooks/useTTS.ts`, expand the post-fetch stale check to verify `playTokenRef.current === myToken && isPlayingRef.current && !isPausedRef.current && currentIdxRef.current === index`

**Checkpoint**: User Story 1 test in `tests/hooks/useTTS.test.ts` passes — pause during fetch completely blocks audio playback.

---

## Phase 2: User Story 2 – Eliminate Audio Collisions When Navigating Sentences (Priority: P1) 🎯 MVP

**Goal**: Invalidate previous `speakSentence` executions when a new sentence is selected while an earlier fetch is in-flight, preventing audio collisions and overwriting.

**Independent Test**: Mount `useTTS`, invoke `speakSentence(0)` with a delayed mock fetch, trigger `speakSentence(1)` before fetch 0 resolves, then resolve fetch 0 and verify sentence 0 audio is discarded and only sentence 1 audio is assigned and played.

### Implementation for User Story 2

- [X] T005 [P] [US2] Create unit test in `tests/hooks/useTTS.test.ts` asserting that jumping to another sentence invalidates in-flight fetch and discards stale audio
- [X] T006 [US2] In `speakSentence` (`rvc-local` branch) in `src/hooks/useTTS.ts`, insert guard check immediately before `await audio.play()` verifying `playTokenRef.current === myToken && isPlayingRef.current && !isPausedRef.current && currentIdxRef.current === index`

**Checkpoint**: User Story 2 test in `tests/hooks/useTTS.test.ts` passes — sentence jumps cleanly supersede pending audio requests.

---

## Phase 3: User Story 3 – Immediate Invalidation on Stop Action (Priority: P2)

**Goal**: Invalidate any in-flight synthesis when user stops playback.

**Independent Test**: Mount `useTTS`, invoke `speakSentence(0)` with delayed fetch, call `stop()`, resolve fetch, and verify audio does not play.

### Implementation for User Story 3

- [X] T007 [US3] In `stop()` in `src/hooks/useTTS.ts`, increment `playTokenRef.current += 1` to invalidate pending synthesis promises
- [X] T008 [US3] Add unit test in `tests/hooks/useTTS.test.ts` verifying `stop()` invalidates pending speech requests

**Checkpoint**: User Story 3 complete — full stop tears down and invalidates all background promises.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validate type safety, linter hygiene, and full test suite execution.

- [X] T009 Run `npm run typecheck` to ensure 0 TypeScript compilation errors
- [X] T010 Run `npm run lint` to ensure 0 ESLint errors and 0 warnings
- [X] T011 Run `npm test` to verify all test suites in the project pass
- [X] T012 Run quickstart validation per `specs/042-tts-race-condition-token/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Foundational token introduction & pause protection.
- **Phase 2 (US2)**: Builds upon `playTokenRef` from US1, adds pre-play guard and jump tests.
- **Phase 3 (US3)**: Invalidation on `stop()` and stop test.
- **Phase 4 (Polish)**: Runs verification once all implementation tasks are in place.

### User Story Dependencies

- **User Story 1 (P1)**: Independent.
- **User Story 2 (P1)**: Depends on `playTokenRef` and `myToken` from US1.
- **User Story 3 (P2)**: Depends on `playTokenRef` from US1.

### Parallel Opportunities

- Unit tests T001, T005, and T008 in `tests/hooks/useTTS.test.ts` can be authored together.
- T009, T010, and T011 can run in sequence or parallel during verification.

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Author test harness in `tests/hooks/useTTS.test.ts` (T001, T005).
2. Implement token tracker and guards in `src/hooks/useTTS.ts` (T002, T003, T004, T006).
3. Validate tests pass.
4. Implement `stop()` invalidation (T007, T008).
5. Run full test suite and linters (T009, T010, T011, T012).
