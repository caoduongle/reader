# Implementation Plan: Synchronous File Descriptor Redirection for Python Backend Spawn

**Branch**: `037-sync-log-fd-spawn` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/037-sync-log-fd-spawn/spec.md)

**Input**: Feature specification from `/specs/037-sync-log-fd-spawn/spec.md`

## Summary

In `electron/main.ts`, `fs.createWriteStream` was previously used to create a stream for `stdio: ['ignore', logStream, logStream]`. However, `createWriteStream` opens files asynchronously, leaving `logStream.fd === null` at the instant `child_process.spawn()` executes, which triggers `ERR_INVALID_ARG_VALUE`.

This plan replaces `fs.createWriteStream` with `fs.openSync(logPath, 'w')`, obtaining an immediate integer file descriptor (`logFd`). The file descriptor is passed directly into `stdio: ['ignore', logFd, logFd]`, and closed gracefully in `pythonProcess.on('exit')` using `fs.closeSync(logFd)` within a `try/catch` guard.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (Electron 34+)

**Primary Dependencies**: `electron`, Node.js built-ins (`fs`, `path`, `child_process`)

**Storage**: Local file `python-backend/server.log`

**Testing**: `npm run typecheck`, `npm run build:electron:main`, `npm test`

**Target Platform**: Windows, macOS, Linux

**Project Type**: Electron Desktop Application (Main Process)

**Performance Goals**: Instant synchronous file opening (< 1ms overhead)

**Constraints**:
- Must pass valid integer file descriptor to `stdio`
- Must safely release descriptor handle on exit via `try/catch` wrapped `fs.closeSync`
- Preserve existing process exit / health checking loops

**Scale/Scope**: 1 file modified (`electron/main.ts`), ~10 lines

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an empty template. No active gates or constraints are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/037-sync-log-fd-spawn/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
electron/
└── main.ts              # startPythonBackend function
python-backend/
└── server.log           # Runtime log output
```

**Structure Decision**: Targeted modification to `startPythonBackend()` in `electron/main.ts`.
