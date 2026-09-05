# Feature Specification: Persistent Python Backend Output Log File

**Feature Branch**: `035-python-backend-server-log`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: File: `electron/main.ts`, hàm `startPythonBackend()`. Vấn đề: `pythonProcess = spawn(pythonExe, [serverScript], { stdio: 'ignore' })` khiến toàn bộ output (`print()`) của `server.py` bị bỏ qua hoàn toàn khi Electron tự spawn nó. Không có cách nào xem log `server.py` khi chạy qua Electron. Yêu cầu: Ghi output của `server.py` ra file log cố định (`python-backend/server.log`) với cờ `'w'` để xem được bất cứ lúc nào bằng Notepad/VSCode mà không phụ thuộc vào terminal.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Persistent Backend Diagnostics Log File (Priority: P1) 🎯 MVP

As a developer or user running VoxRead via Electron (in development or packaged mode), I want the standard output and standard error from the Python backend process (`server.py`) to be continuously redirected into a dedicated log file (`python-backend/server.log`), so that I can inspect initialization messages, latency timing telemetry (`[VoxRead][Timing]`), WAV debug output (`[VoxRead][Debug]`), and runtime tracebacks at any time using a text editor (Notepad, VS Code), without depending on which terminal launched the application.

**Why this priority**: When Electron launches the Python backend with `stdio: 'ignore'`, all stdout and stderr streams are discarded immediately. This makes debugging runtime failures, performance bottlenecks, and audio synthesis errors impossible during normal Electron execution.

**Independent Test**:
1. Launch the VoxRead Electron application (e.g. via `npm run electron:dev`).
2. Trigger TTS voice playback or request `/health`.
3. Open `python-backend/server.log` with any text editor.
4. Verify that the log contains startup messages, RVC model initialization logs, timing telemetry (`[VoxRead][Timing]`), and WAV debug telemetry (`[VoxRead][Debug]`).
5. Restart the application and verify that `server.log` is refreshed with the latest session's logs.

**Acceptance Scenarios**:
1. **Given** Electron starts the Python backend, **When** `startPythonBackend()` spawns `pythonProcess`, **Then** stdout and stderr are piped into `python-backend/server.log` using write flag `'w'`.
2. **Given** `server.py` prints output (e.g., startup info, model ready message, or timing statistics), **When** the developer checks `python-backend/server.log`, **Then** the output is present in the file.
3. **Given** `server.py` encounters an unhandled exception or prints an error traceback to stderr, **When** the developer opens `python-backend/server.log`, **Then** the traceback is recorded in the file.
4. **Given** the application is restarted, **When** a new session begins, **Then** the previous log file is overwritten (`flags: 'w'`) so the file always represents the most recent application run.

---

### User Story 2 – Log Location Visibility in Electron Console (Priority: P2)

As a developer monitoring the Electron main process, I want Electron to log the exact filesystem path of `server.log` to `console.log` immediately after spawning the Python process, so that I can easily identify and navigate to the log file location across development and packaged environments.

**Why this priority**: In development, `baseDir` resides in the project workspace, while in production/packaged builds it resides in `process.resourcesPath`. Emitting the resolved path eliminates ambiguity about where logs are being stored.

**Independent Test**:
1. Launch Electron with terminal output visible.
2. Verify that a message matching `[VoxRead] Log server Python duoc ghi tai: <path>` is printed to the terminal console.
3. Confirm that `<path>` points to the valid `server.log` file in the Python backend directory.

**Acceptance Scenarios**:
1. **Given** `pythonProcess` is spawned successfully, **When** the spawn completes, **Then** Electron prints `[VoxRead] Log server Python duoc ghi tai: ${logPath}` to `console.log`.

---

### Edge Cases

- **File lock on Windows**: When `server.log` is opened by external readers (Notepad, VS Code) in read-only mode, the write stream should continue flushing without crashing the Electron process.
- **Python executable missing**: If `pythonExe` or `serverScript` does not exist, `startPythonBackend()` exits early with a warning dialog before creating the write stream, preventing empty or orphan log files.
- **App shutdown / process termination**: When the application quits or `pythonProcess` exits, the file stream is cleanly closed by the operating system / Node.js runtime.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `electron/main.ts` MUST ensure the standard Node.js `fs` module is imported.
- **FR-002**: In `startPythonBackend()`, immediately before calling `spawn(...)`, the application MUST construct `logPath = path.join(baseDir, 'server.log')`.
- **FR-003**: The application MUST create a write stream `logStream = fs.createWriteStream(logPath, { flags: 'w' })` configured to overwrite the file on each startup.
- **FR-004**: The `spawn(pythonExe, [serverScript], ...)` call MUST configure `stdio` as `['ignore', logStream, logStream]` to ignore stdin and redirect both stdout and stderr into `logStream`.
- **FR-005**: Immediately after spawning `pythonProcess`, the application MUST log `[VoxRead] Log server Python duoc ghi tai: ${logPath}` to `console.log`.
- **FR-006**: Existing process error handling (`pythonProcess.on('error')`), exit handling (`pythonProcess.on('exit')`), and health-check polling loops in `startPythonBackend()` MUST remain intact and functional.

---

### Key Entities

- **PythonBackendLog**:
  - `logPath`: Absolute path to `server.log` within `baseDir` (`python-backend/server.log`).
  - `logStream`: Writable file stream created with flag `'w'`.
  - `stdioConfig`: `['ignore', logStream, logStream]`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Python backend stdout and stderr output during an Electron session is captured in `server.log`.
- **SC-002**: 100% of app launches overwrite `server.log` afresh, ensuring no unbounded file growth across sessions.
- **SC-003**: The exact resolved log file path is printed to the console on every successful backend spawn.
- **SC-004**: Zero regression to Python backend startup, health check polling, or frontend TTS functionality.
- **SC-005**: TypeScript type checking (`npm run typecheck`) passes with zero errors.

---

## Assumptions

- `baseDir` directory exists and is writable by the current user when running the app.
- Overwriting logs (`flags: 'w'`) per run is the desired behavior to prevent stale logs and avoid excessive disk usage.
