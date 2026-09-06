# Tasks: TTS Generation Buffering Visual Indicator

**Feature**: 044-tts-buffering-indicator | **Branch**: `044-tts-buffering-indicator` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/044-tts-buffering-indicator/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/044-tts-buffering-indicator/plan.md)

---

## Phase 1: User Story 1 – Clear Visual Indicator While Generating Speech (Priority: P1) 🎯 MVP

**Goal**: Provide real-time buffering state from `useTTS` to `ControlBar` so users see a spinning loader while audio synthesis is in-flight.

**Independent Test**: Mount `useTTS`, initiate speech for an RVC sentence with a delayed fetch, verify `isBuffering === true` during fetch, and verify it transitions to `false` when `audio.src` is set.

### Implementation for User Story 1

- [X] T001 [P] [US1] Create unit test in `tests/hooks/useTTS.test.ts` verifying that `isBuffering` is `true` while fetch is in-flight and `false` after `audio.src` is configured
- [X] T002 [US1] In `src/hooks/useTTS.ts`, declare `const [isBuffering, setIsBuffering] = useState<boolean>(false);` and export `isBuffering` in the returned hook object
- [X] T003 [US1] In `speakSentence` (`rvc-local` branch) in `src/hooks/useTTS.ts`, set `setIsBuffering(true)` before fetch and wrap the fetch/stale check/audio assignment in a `try...finally { setIsBuffering(false); }` block
- [X] T004 [US1] In `src/App.tsx`, destructure `isBuffering` from `useTTS` and pass `isBuffering={isBuffering}` to `<ControlBar />`
- [X] T005 [US1] In `src/components/ControlBar.tsx`, add `isBuffering?: boolean` to `ControlBarProps` and render `Loader2` from `lucide-react` with `animate-spin` when `isBuffering === true`

**Checkpoint**: User Story 1 complete — `ControlBar` renders the spinning loader during synthesis latency.

---

## Phase 2: User Story 2 – Reliable Reset on Failure or Navigation (Priority: P1) 🎯 MVP

**Goal**: Ensure `isBuffering` is cleanly reset to `false` when fetch fails, navigation occurs, or user pauses/stops playback.

**Independent Test**: Trigger speech with failing fetch or invoke `stop()` mid-fetch, and verify `isBuffering` resets to `false`.

### Implementation for User Story 2

- [X] T006 [P] [US2] Add unit test in `tests/hooks/useTTS.test.ts` asserting `isBuffering` resets to `false` on fetch failure and `stop()`
- [X] T007 [US2] In `src/hooks/useTTS.ts`, invoke `setIsBuffering(false)` inside `stop()` and `pause()`

**Checkpoint**: User Story 2 complete — zero stuck buffering states across all failure and teardown paths.

---

## Phase 3: User Story 3 – Accessibility and Tooltip Precision (Priority: P2)

**Goal**: Update button accessible name and title to announce "Đang tạo giọng đọc..." while buffering.

**Independent Test**: Inspect button attributes in `ControlBar` when `isBuffering === true`.

### Implementation for User Story 3

- [X] T008 [US3] In `src/components/ControlBar.tsx`, set `title="Đang tạo giọng đọc..."` and `aria-label="Đang tạo giọng đọc..."` on `#tts-play-pause-btn` when `isBuffering === true`

**Checkpoint**: User Story 3 complete — accessible feedback accurately reflects synthesis status.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validate type safety, linter hygiene, and full test suite execution.

- [X] T009 Run `npm run typecheck` to ensure 0 TypeScript compilation errors
- [X] T010 Run `npm run lint` to ensure 0 ESLint errors and 0 warnings
- [X] T011 Run `npm test` to verify all test suites in the repository pass
- [X] T012 Run quickstart validation per `specs/044-tts-buffering-indicator/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Core state in `useTTS`, prop threading in `App.tsx`, visual display in `ControlBar.tsx`.
- **Phase 2 (US2)**: Teardown safeguards in `stop()`/`pause()` and failure tests.
- **Phase 3 (US3)**: Tooltip and accessibility refinements in `ControlBar.tsx`.
- **Phase 4 (Polish)**: Final verification once all implementation tasks are in place.

### User Story Dependencies

- **User Story 1 (P1)**: Foundation for buffering indicator.
- **User Story 2 (P1)**: Depends on `isBuffering` state from US1.
- **User Story 3 (P2)**: Builds upon `ControlBar` changes in US1.

### Parallel Opportunities

- Tests T001 and T006 in `tests/hooks/useTTS.test.ts` can be authored together.
- Verification commands (T009–T012) run sequentially during validation.

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Implement `isBuffering` in `src/hooks/useTTS.ts` with try/finally (T002, T003, T007).
2. Wire `isBuffering` in `src/App.tsx` (T004).
3. Update `src/components/ControlBar.tsx` with `Loader2` and tooltips (T005, T008).
4. Author unit tests in `tests/hooks/useTTS.test.ts` (T001, T006).
5. Run full test suite, lint, and typecheck (T009–T012).
