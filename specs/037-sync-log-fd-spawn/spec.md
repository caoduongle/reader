# Feature Specification: Synchronous File Descriptor Redirection for Python Backend Spawn

**Feature Branch**: `037-sync-log-fd-spawn`  
**Created**: 2026-09-06  
**Status**: Draft  
**Input**: File: `electron/main.ts`, hàm `startPythonBackend()` (dòng 104-123). Vấn đề: `fs.createWriteStream()` mở file bất đồng bộ, nên `logStream.fd` vẫn là `null` tại thời điểm `spawn()` được gọi ngay sau đó, khiến Node.js ném lỗi `ERR_INVALID_ARG_VALUE` vì stdio yêu cầu Stream truyền vào phải có file descriptor (`fd`) hợp lệ. Yêu cầu: Sử dụng `fs.openSync(logPath, 'w')` để thu được một integer file descriptor (`logFd`) đồng bộ ngay lập tức và truyền `['ignore', logFd, logFd]` vào `stdio`. Trong listener `pythonProcess.on('exit')`, đóng `logFd` bằng `fs.closeSync(logFd)` trong khối `try/catch` để tránh rò rỉ file handle.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Reliable Synchronous File Redirection Without ERR_INVALID_ARG_VALUE (Priority: P1) 🎯 MVP

As an Electron desktop application developer or user, when `startPythonBackend()` runs, I want `spawn()` to succeed without throwing `ERR_INVALID_ARG_VALUE`, so that the Python backend process starts cleanly and redirects all stdout/stderr streams into `python-backend/server.log`.

**Why this priority**: Because `fs.createWriteStream()` opens the file asynchronously, passing `logStream` to `spawn()` crashes Electron process spawning with `ERR_INVALID_ARG_VALUE`. Using a synchronous file descriptor (`fs.openSync`) resolves this runtime crash immediately.

**Independent Test**:
1. Run `npm run electron:dev`.
2. Observe Electron startup in terminal: no `ERR_INVALID_ARG_VALUE` error occurs.
3. Verify that `[VoxRead] Log server Python duoc ghi tai: <path>` is printed.
4. Verify that `python-backend/server.log` exists and contains logs from `server.py` (e.g. device detection, model readiness, port binding).

**Acceptance Scenarios**:
1. **Given** `startPythonBackend()` executes, **When** `logFd = fs.openSync(logPath, 'w')` is called, **Then** Node.js synchronously opens `server.log` and returns a valid integer file descriptor.
2. **Given** a valid `logFd`, **When** `spawn(pythonExe, [serverScript], { stdio: ['ignore', logFd, logFd] })` is executed, **Then** `spawn` succeeds without throwing `ERR_INVALID_ARG_VALUE`.
3. **Given** `server.py` writes to stdout or stderr, **Then** the content is flushed directly into `server.log`.

---

### User Story 2 – File Descriptor Leak Prevention on Process Exit (Priority: P2)

As a system or developer running VoxRead over multiple sessions or restarts, I want the opened file descriptor (`logFd`) to be closed when `pythonProcess` exits, so that operating system file handles are not leaked.

**Why this priority**: Leaving file descriptors open after process exit can exhaust OS handles or lock files unnecessarily on Windows.

**Independent Test**:
1. Start and quit the application, or simulate Python process exit.
2. Confirm `pythonProcess.on('exit')` executes `fs.closeSync(logFd)` safely without throwing unhandled exceptions.

**Acceptance Scenarios**:
1. **Given** `pythonProcess` exits, **When** the `'exit'` callback runs, **Then** `fs.closeSync(logFd)` is attempted inside a `try/catch` block.
2. **Given** the OS has already reclaimed the handle, **When** `fs.closeSync` throws, **Then** the error is silently caught without crashing the application.

---

### Edge Cases

- **File already open/locked**: `fs.openSync(logPath, 'w')` will overwrite the file. If locked by another running instance, the single-instance lock (`gotTheLock`) prevents duplicate Electron instances from running.
- **Python exit before Electron exit**: `logFd` is closed cleanly in `pythonProcess.on('exit')`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `electron/main.ts` inside `startPythonBackend()`, replace `fs.createWriteStream` with synchronous file opening: `const logFd = fs.openSync(logPath, 'w')`.
- **FR-002**: Update the `spawn` configuration `stdio` property to pass the integer file descriptor: `stdio: ['ignore', logFd, logFd]`.
- **FR-003**: In `pythonProcess.on('exit')`, add a `try/catch` block that calls `fs.closeSync(logFd)` to release the descriptor when the child process terminates.
- **FR-004**: Preserve the console announcement: `console.log(\`[VoxRead] Log server Python duoc ghi tai: ${logPath}\`)`.
- **FR-005**: The application MUST build cleanly with `npm run build:electron:main` and pass TypeScript validation with `npm run typecheck`.

---

### Key Entities

- **LogFileDescriptor**:
  - `logPath`: String path to `python-backend/server.log`.
  - `logFd`: Non-null integer file descriptor obtained synchronously via `fs.openSync(logPath, 'w')`.
  - `stdioConfig`: `['ignore', logFd, logFd]`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero occurrences of `ERR_INVALID_ARG_VALUE` when spawning the Python backend.
- **SC-002**: 100% of stdout and stderr from `server.py` is written to `python-backend/server.log`.
- **SC-003**: File descriptor is safely closed on Python process exit with zero uncaught exceptions.
- **SC-004**: `npm run typecheck` and `npm test` pass with 100% success.

---

## Assumptions

- `fs.openSync` with mode `'w'` truncates existing file contents as intended.
- Integer file descriptors are natively supported in the `stdio` array by Node.js `child_process.spawn`.
