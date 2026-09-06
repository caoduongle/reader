# Tasks: Transient Network Retry for RVC Speech Synthesis

**Branch**: `046-rvc-speech-retry` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/046-rvc-speech-retry/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/046-rvc-speech-retry/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review test fixtures and establish baseline requirements for transient retry testing

- [x] T001 Review test fixtures and mock setup in `tests/hooks/useTTS.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish retry parameter interface and constants before implementing story-specific logic

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Define retry parameter signature (`maxRetries: number = 1`) and constants in `src/hooks/useTTS.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Seamless Self-Healing on Transient Edge-TTS Upstream Failures (Priority: P1) 🎯 MVP

**Goal**: Automatically retry transient upstream HTTP 500 or transport network failures once after 400ms delay and continue playback seamlessly.

**Independent Test**: Mount `useTTS` with mocked `fetch` returning HTTP 500 on 1st call and HTTP 200 on 2nd call; verify hook calls fetch 2 times and plays synthesized audio without stopping.

### Tests for User Story 1 🧪
- [x] T003 [US1] Add unit test verifying transient HTTP 500 triggers retry after 400ms and succeeds on attempt 2 in `tests/hooks/useTTS.test.ts`

### Implementation for User Story 1
- [x] T004 [US1] Implement retryable error detection (HTTP 5xx excluding 503, network exceptions), 400ms backoff pause, warning logging, and recursive call in `src/hooks/useTTS.ts`
- [x] T005 [US1] Suppress `setServerErrorMessage` toast during in-flight retries in `src/hooks/useTTS.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Immediate Bailout on Non-Retryable Configuration & Abort States (Priority: P1) 🎯 MVP

**Goal**: Fail fast without retrying when errors are client configuration errors (HTTP 4xx), model not ready (HTTP 503), or aborted requests.

**Independent Test**: Mock `/speak` to return HTTP 400 or HTTP 503; verify fetch is called only once and error is surfaced immediately.

### Tests for User Story 2 🧪
- [x] T006 [US2] Add unit tests verifying HTTP 400 and HTTP 503 fail immediately with exactly 1 fetch call in `tests/hooks/useTTS.test.ts`
- [x] T007 [US2] Add unit test verifying aborted request during fetch or during 400ms delay does not trigger retry in `tests/hooks/useTTS.test.ts`

### Implementation for User Story 2
- [x] T008 [US2] Enforce non-retryable guards (HTTP 4xx, HTTP 503, AbortError, and post-delay abort signal checks) in `src/hooks/useTTS.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Bounded Retry Cap and Final Failure Reporting (Priority: P2)

**Goal**: Enforce maximum 1 retry (`maxRetries = 1`, total 2 HTTP calls per sentence); display error message and stop playback cleanly when retries are exhausted.

**Independent Test**: Mock `/speak` to return HTTP 500 continuously; verify exactly 2 fetch calls, `setServerErrorMessage` called, and `isPlaying` resets to `false`.

### Tests for User Story 3 🧪
- [x] T009 [US3] Add unit test verifying persistent HTTP 500 stops after exactly 2 fetch calls and surfaces server error in `tests/hooks/useTTS.test.ts`

### Implementation for User Story 3
- [x] T010 [US3] Enforce `maxRetries - 1` decrement and fallback error toast on exhausted retries in `src/hooks/useTTS.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation across prefetch, active speech, and full static analysis

- [x] T011 Verify zero caller regressions in `prefetchUpcoming` and `speakSentence` in `src/hooks/useTTS.ts`
- [x] T012 Run full test suite, type checking, and linting (`npm test`, `npm run typecheck`, `npm run lint`) per `specs/046-rvc-speech-retry/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion - Delivers MVP self-healing retry
- **User Story 2 (Phase 4)**: Depends on Foundational completion - Delivers non-retryable guards
- **User Story 3 (Phase 5)**: Depends on Foundational and User Story 1 completion - Delivers bounded retry cap
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independently testable guards
- **User Story 3 (P3)**: Builds on retry loop from US1 to test bounded termination

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Self-healing retry on transient 500)
4. Complete Phase 4: User Story 2 (Fast fail on 400/503/abort)
5. **VALIDATE**: Ensure transient errors recover while permanent errors fail fast

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Self-healing retry working
3. Add User Story 2 -> Test independently -> Guardrails active
4. Add User Story 3 -> Test independently -> Bounded retry verified
5. Complete Polish -> Pass full test suite and linters
