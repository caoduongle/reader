# Tasks: Client-Side Timeout for RVC Speech Synthesis

**Branch**: `047-rvc-speech-timeout` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/047-rvc-speech-timeout/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/047-rvc-speech-timeout/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review test fixtures and establish baseline requirements for timer testing

- [x] T001 Review mock fetch timing and fake timer utilities in `tests/hooks/useTTS.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define timeout constant before implementing story-specific logic

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Define `RVC_FETCH_TIMEOUT_MS = 20000` constant in `src/hooks/useTTS.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Self-Terminating Hanging Speech Requests (Priority: P1) 🎯 MVP

**Goal**: Automatically abort speech synthesis requests that hang for more than 20,000ms and return `null` cleanly without freezing the client.

**Independent Test**: Mock `/speak` fetch to return an unresolved promise, advance time by 20,000ms using `vi.useFakeTimers()`, assert `activeController.signal.aborted === true` and `fetchRVCSpeech` resolves to `null`.

### Tests for User Story 1 🧪
- [x] T003 [US1] Add unit test using fake timers verifying 20,000ms timeout aborts hanging speech fetch and returns `null` in `tests/hooks/useTTS.test.ts`

### Implementation for User Story 1
- [x] T004 [US1] Implement 20,000ms timeout abort schedule and clean `null` return on timeout abort in `src/hooks/useTTS.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Unified Controller Support & Timer Leak Prevention (Priority: P1) 🎯 MVP

**Goal**: Reuse caller-provided `AbortController` (or generate internal one if omitted) and guarantee `clearTimeout` cleanup in all resolution and error paths.

**Independent Test**: Verify caller controller receives abort signal upon timeout, and verify timer does not trigger post-completion on requests that resolve or fail in <20s.

### Tests for User Story 2 🧪
- [x] T005 [US2] Add unit test verifying caller-provided `AbortController` is reused without creating duplicate controllers in `tests/hooks/useTTS.test.ts`
- [x] T006 [US2] Add unit test verifying `clearTimeout` is called when fetch completes before 20s in `tests/hooks/useTTS.test.ts`

### Implementation for User Story 2
- [x] T007 [US2] Implement single-controller reuse and `try ... finally { clearTimeout(timeoutId); }` in `fetchRVCSpeech` in `src/hooks/useTTS.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Health Probe Isolation (Priority: P2)

**Goal**: Ensure `/health` probe timeout in `checkRVCServerHealth` remains strictly 2,500ms without modification.

**Independent Test**: Verify `checkRVCServerHealth` timeout constant/value is preserved at 2,500ms.

### Tests for User Story 3 🧪
- [x] T008 [US3] Add unit test verifying `checkRVCServerHealth` retains its 2,500ms timeout in `tests/hooks/useTTS.test.ts`

### Implementation for User Story 3
- [x] T009 [US3] Verify `checkRVCServerHealth` 2,500ms timeout remains unchanged in `src/hooks/useTTS.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression testing across prefetch, active speech, and full static analysis

- [x] T010 Verify zero caller regressions in `prefetchUpcoming` and `speakSentence` in `src/hooks/useTTS.ts`
- [x] T011 Run full test suite, type checking, and linting (`npm test`, `npm run typecheck`, `npm run lint`) per `specs/047-rvc-speech-timeout/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion - Delivers MVP hanging fetch self-termination
- **User Story 2 (Phase 4)**: Depends on Foundational completion - Delivers controller reuse and timer cleanup
- **User Story 3 (Phase 5)**: Depends on Foundational completion - Verifies health probe isolation
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 3 (P3)**: Can run independently to ensure non-interference

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (Define 20s constant)
3. Complete Phase 3: User Story 1 (Timeout abortion on hanging fetch)
4. Complete Phase 4: User Story 2 (Controller reuse + clearTimeout)
5. **VALIDATE**: Ensure hanging requests abort cleanly while normal requests clear timers

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Hanging fetch recovery working
3. Add User Story 2 -> Test independently -> Controller reuse and leak-free timers
4. Add User Story 3 -> Test independently -> Health probe isolation verified
5. Complete Polish -> Pass full test suite and linters
