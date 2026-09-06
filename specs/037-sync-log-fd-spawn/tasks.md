# Tasks: Synchronous File Descriptor Redirection for Python Backend Spawn

**Feature**: 037-sync-log-fd-spawn | **Branch**: `037-sync-log-fd-spawn` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/037-sync-log-fd-spawn/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/037-sync-log-fd-spawn/plan.md)

---

## Phase 1: User Story 1 – Reliable Synchronous File Redirection (Priority: P1) 🎯 MVP

**Goal**: Replace asynchronous `fs.createWriteStream` with synchronous `fs.openSync` to acquire an immediate integer file descriptor (`logFd`), preventing `ERR_INVALID_ARG_VALUE` when spawning the Python backend process.

**Independent Test**: Launch `npm run build:electron:main` and `npm run typecheck`, then launch `npm run electron:dev` and verify that the Python process spawns without `ERR_INVALID_ARG_VALUE` and logs write to `python-backend/server.log`.

### Implementation for User Story 1

- [X] T001 [US1] In `electron/main.ts` within `startPythonBackend()`, replace `const logStream = fs.createWriteStream(logPath, { flags: 'w' });` with `const logFd = fs.openSync(logPath, 'w');` and update the `spawn` configuration from `stdio: ['ignore', logStream, logStream]` to `stdio: ['ignore', logFd, logFd]`.

**Checkpoint**: User Story 1 complete — `spawn()` now receives a valid integer file descriptor and executes without `ERR_INVALID_ARG_VALUE`.

---

## Phase 2: User Story 2 – File Descriptor Leak Prevention on Process Exit (Priority: P2)

**Goal**: Close the opened file descriptor in the Python process exit listener to prevent handle leaks.

**Independent Test**: Verify that `pythonProcess.on('exit')` executes `fs.closeSync(logFd)` safely within `try/catch`.

### Implementation for User Story 2

- [X] T002 [US2] In `electron/main.ts` inside `pythonProcess.on('exit')`, add a `try/catch` block calling `fs.closeSync(logFd)` to release the descriptor when the child process terminates.

**Checkpoint**: User Story 2 complete — file descriptor is cleanly closed upon Python process termination.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Type safety, bundle build, and regression verification

- [X] T003 Run `npm run typecheck` and `npm run build:electron:main` to verify clean compilation and bundling of `electron/main.ts`
- [X] T004 Run full frontend test suite (`npm test`) to ensure zero regressions across the codebase

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Modifies `electron/main.ts` spawn setup
- **Phase 2 (US2)**: Follows US1 in `electron/main.ts` exit listener
- **Phase 3 (Polish & Verification)**: Validates after Phase 1 and 2

### User Story Dependencies

- **User Story 1 (P1)**: Independent core fix for `spawn()`
- **User Story 2 (P2)**: Depends on `logFd` created in US1

---

## Implementation Strategy

### Incremental Delivery

1. Implement T001 and T002 in `electron/main.ts`.
2. Run T003 (`npm run typecheck && npm run build:electron:main`).
3. Run T004 (`npm test`).
4. Mark all tasks complete.
