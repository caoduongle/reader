# Implementation Plan: Persistent Python Backend Output Log File

**Branch**: `035-python-backend-server-log` | **Date**: 2026-09-05 | **Spec**: [spec.md](file:///e:/reader/specs/035-python-backend-server-log/spec.md)

**Input**: Feature specification from `/specs/035-python-backend-server-log/spec.md`

## Summary

When Electron launches the Python backend via `child_process.spawn` in `electron/main.ts`, it currently specifies `stdio: 'ignore'`, which silently discards all stdout and stderr streams (including `[VoxRead][Timing]` latency measurements, `[VoxRead][Debug]` WAV metadata, model loading status, and Python tracebacks).

This plan redirects `stdout` and `stderr` of the spawned Python process to `python-backend/server.log` using a Node.js writable file stream configured with overwrite flag `'w'`. It also logs the resolved log path to `console.log` upon spawning.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (Electron 34+)

**Primary Dependencies**: `electron`, Node.js built-ins (`fs`, `path`, `child_process`)

**Storage**: Local file `python-backend/server.log` (overwritten on each app launch)

**Testing**: `npm run typecheck` (TypeScript validation), Vitest test suite (`npm test`)

**Target Platform**: Windows (primary desktop target), macOS, Linux

**Project Type**: Electron Desktop Application (Main Process)

**Performance Goals**: Negligible I/O overhead (buffered file write stream via OS)

**Constraints**:
- `stdio` array must keep `stdin` ignored: `['ignore', logStream, logStream]`
- Overwrite flag `'w'` ensures fresh logs per session without unbounded disk usage
- Must not alter health check polling or error/exit listener logic

**Scale/Scope**: 1 file modified (`electron/main.ts`), ~5-10 lines of code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an empty template. No active gates or constraints are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/035-python-backend-server-log/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
electron/
└── main.ts              # Electron main process (startPythonBackend function)

python-backend/
└── server.log           # Generated runtime log file (gitignored or transient)
```

**Structure Decision**: A single targeted edit in `electron/main.ts` inside `startPythonBackend()`.
