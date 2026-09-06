# Tasks: Abort In-Flight Background TTS Prefetch

**Feature**: 045-abort-in-flight-prefetch | **Branch**: `045-abort-in-flight-prefetch` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/045-abort-in-flight-prefetch/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/045-abort-in-flight-prefetch/plan.md)

---

## Phase 1: User Story 1 – Immediately Abort In-Flight Background Prefetches on Invalidation (Priority: P1) 🎯 MVP

**Goal**: Store `AbortController` with each in-flight prefetch promise in `useTTS` and abort all in-flight requests immediately when playback is stopped or sentences jump, freeing backend inference resources.

**Independent Test**: Initiate speech for sentence 0 with a pending prefetch for sentence 1; invoke `stop()` or `jumpToSentence(5)` and assert that sentence 1's `controller.abort()` was called.

### Implementation for User Story 1

- [X] T001 [P] [US1] Create unit test in `tests/hooks/useTTS.test.ts` asserting that an in-flight background prefetch has its `AbortController.abort()` called when `stop()` or `jumpToSentence()` is invoked
- [X] T002 [US1] In `src/hooks/useTTS.ts`, define `InFlightPrefetchEntry` interface with `{ promise: Promise<string | null>; controller: AbortController }` and update `inFlightFetchesRef` type
- [X] T003 [US1] In `src/hooks/useTTS.ts` inside `prefetchUpcoming`, instantiate `const controller = new AbortController();` and immediately register `{ promise: fetchPromise, controller }` into `inFlightFetchesRef.current`
- [X] T004 [US1] In `src/hooks/useTTS.ts` inside `clearPrefetchCache`, iterate through `inFlightFetchesRef.current` and call `entry.controller.abort()` within `try...catch` before clearing `inFlightFetchesRef.current` and `prefetchCacheRef.current`

**Checkpoint**: User Story 1 complete — in-flight prefetch requests are immediately cancelled on `stop()` and `jumpToSentence()`.

---

## Phase 2: User Story 2 – Smooth Reuse of In-Flight Prefetches on Sequential Playback (Priority: P1) 🎯 MVP

**Goal**: Ensure `speakSentence` seamlessly awaits the `.promise` of an active in-flight prefetch without launching duplicate network fetches when sequential playback arrives at that sentence.

**Independent Test**: Advance to sentence 1 while its background prefetch is in-flight; verify `speakSentence(1)` awaits `inFlightFetchesRef.current.get(1)!.promise` and plays upon resolution.

### Implementation for User Story 2

- [X] T005 [P] [US2] Create unit test in `tests/hooks/useTTS.test.ts` asserting that `speakSentence(N)` awaits `inFlightFetchesRef.current.get(N)!.promise` and plays when resolved
- [X] T006 [US2] In `src/hooks/useTTS.ts` inside `speakSentence` (lines 515–525), update `inFlightFetchesRef.current.get(index)` to read `.promise` (`await inFlightFetchesRef.current.get(index)!.promise`)

**Checkpoint**: User Story 2 complete — sequential playback transitions smoothly when encountering in-flight prefetch entries.

---

## Phase 3: User Story 3 – Resilient Teardown and Exception Isolation (Priority: P2)

**Goal**: Guarantee that abort errors in individual controllers do not disrupt batch teardown and in-flight maps are always deleted upon settlement.

**Independent Test**: Mock an in-flight entry with throwing `abort()`, call `clearPrefetchCache()`, verify remaining entries are aborted and maps are cleared without uncaught errors.

### Implementation for User Story 3

- [X] T007 [P] [US3] Add unit test in `tests/hooks/useTTS.test.ts` verifying robust abort execution when `controller.abort()` throws during `clearPrefetchCache()`
- [X] T008 [US3] In `src/hooks/useTTS.ts` inside `prefetchUpcoming`, ensure `inFlightFetchesRef.current.delete(targetIdx)` is invoked regardless of fetch resolution or rejection

**Checkpoint**: User Story 3 complete — teardown is resilient against abort exceptions and memory leaks.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validate type safety, linter hygiene, and full test suite execution.

- [X] T009 Run `npm run typecheck` to ensure 0 TypeScript compilation errors
- [X] T010 Run `npm run lint` to ensure 0 ESLint errors and 0 warnings
- [X] T011 Run `npm test` to verify all test suites in the repository pass
- [X] T012 Run quickstart validation per `specs/045-abort-in-flight-prefetch/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Core typing in `inFlightFetchesRef`, immediate controller registration, abort loop in `clearPrefetchCache`.
- **Phase 2 (US2)**: Updates `speakSentence` to await `entry.promise`. Depends on US1 typing.
- **Phase 3 (US3)**: Robustness, exception isolation, and settlement cleanup verification.
- **Phase 4 (Polish)**: Final verification once all implementation tasks are in place.

### User Story Dependencies

- **User Story 1 (P1)**: Foundation for in-flight prefetch cancellation.
- **User Story 2 (P1)**: Builds upon `InFlightPrefetchEntry` from US1.
- **User Story 3 (P2)**: Builds upon `clearPrefetchCache` abort logic from US1.

### Parallel Opportunities

- Unit tests T001, T005, and T007 can be authored together in `tests/hooks/useTTS.test.ts`.
- Verification tasks T009–T012 execute sequentially during the polish phase.

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Define `InFlightPrefetchEntry` and update `inFlightFetchesRef` type (T002).
2. Wire immediate controller storage in `prefetchUpcoming` (T003).
3. Implement abort loop in `clearPrefetchCache` (T004).
4. Update `speakSentence` in-flight promise access (T006).
5. Verify settlement cleanup and exception handling (T008).
6. Author and run unit tests in `tests/hooks/useTTS.test.ts` (T001, T005, T007).
7. Run full test suite, lint, and typecheck (T009–T012).
