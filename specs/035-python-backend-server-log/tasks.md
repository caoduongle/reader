# Tasks: Persistent Python Backend Output Log File

**Feature**: 035-python-backend-server-log | **Branch**: `035-python-backend-server-log` | **Date**: 2026-09-05
**Spec**: [spec.md](file:///e:/reader/specs/035-python-backend-server-log/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/035-python-backend-server-log/plan.md)

---

## Phase 1: User Story 1 – Persistent Backend Diagnostics Log File (Priority: P1) 🎯 MVP

**Goal**: Redirect standard output and standard error from `pythonProcess` in `electron/main.ts` to `python-backend/server.log` using a writable file stream with overwrite flag `'w'`, ensuring that logs are preserved and accessible via Notepad/VSCode.

**Independent Test**: Run the application via Electron, perform TTS / health checks, and verify that `python-backend/server.log` is created and contains server startup, model loading, and telemetry logs.

### Implementation for User Story 1

- [X] T001 [US1] In `electron/main.ts` within `startPythonBackend()`, construct `logPath = path.join(baseDir, 'server.log')` and create write stream `logStream = fs.createWriteStream(logPath, { flags: 'w' })` right before calling `spawn(pythonExe, [serverScript], ...)`. Update the spawn configuration from `stdio: 'ignore'` to `stdio: ['ignore', logStream, logStream]`.

**Checkpoint**: User Story 1 complete — Python backend output is now redirected to `server.log`.

---

## Phase 2: User Story 2 – Log Location Visibility in Electron Console (Priority: P2)

**Goal**: Print the resolved absolute path of `server.log` to `console.log` immediately after spawning the Python process so that developers can quickly find the log file regardless of whether the app runs in dev or packaged mode.

**Independent Test**: Launch Electron and verify `[VoxRead] Log server Python duoc ghi tai: <path>` is emitted to the console.

### Implementation for User Story 2

- [X] T002 [US2] In `electron/main.ts` within `startPythonBackend()`, immediately after spawning `pythonProcess`, add `console.log(`[VoxRead] Log server Python duoc ghi tai: ${logPath}`)`.

**Checkpoint**: User Story 2 complete — log file path is surfaced in the Electron console.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Type safety and regression verification

- [X] T003 Run TypeScript type checking (`npm run typecheck`) to verify clean compilation of `electron/main.ts`
- [X] T004 Run full frontend test suite (`npm test`) to ensure zero regressions across the codebase

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Can start immediately in `electron/main.ts`
- **Phase 2 (US2)**: Can be applied directly along with US1 in `electron/main.ts`
- **Phase 3 (Polish)**: Runs after changes to `electron/main.ts`

### User Story Dependencies

- **User Story 1 (P1)**: Independent core stream redirection
- **User Story 2 (P2)**: Dependent on `logPath` defined in US1; both reside in `startPythonBackend()` in `electron/main.ts`

---

## Implementation Strategy

### Incremental Delivery

1. Implement T001 and T002 in `electron/main.ts`.
2. Execute T003 (`npm run typecheck`) to validate types.
3. Execute T004 (`npm test`) to ensure no regression.
4. Mark all tasks complete.
