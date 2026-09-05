# Research: Persistent Python Backend Output Log File

**Feature**: 035-python-backend-server-log | **Date**: 2026-09-05

## Research Task 1: Node.js child_process.spawn stdio with Stream objects

### Decision
Pass `logStream` (an instance of `fs.WriteStream`) directly into the `stdio` array:
```typescript
const logPath = path.join(baseDir, 'server.log');
const logStream = fs.createWriteStream(logPath, { flags: 'w' });

pythonProcess = spawn(pythonExe, [serverScript], {
  cwd: baseDir,
  detached: false,
  stdio: ['ignore', logStream, logStream],
});
```

### Rationale
- According to official Node.js documentation for `child_process.spawn(command[, args][, options])`, the `options.stdio` array accepts `Stream` objects pointing to files.
- The underlying file descriptor is shared directly with the spawned child process, meaning standard output and standard error from Python bypass Node.js process memory buffers and write directly to disk via OS handles.
- Zero CPU overhead in Electron.
- The flag `'w'` ensures the log file is truncated upon each application startup, fulfilling the requirement that the log represents the most recent run.

### Alternatives Considered
1. **Pipe and handle in Node (`stdio: ['ignore', 'pipe', 'pipe']`)**:
   - `pythonProcess.stdout.on('data', chunk => fs.appendFileSync(...))`
   - Rejected: Adds unnecessary Node event loop hops, potential buffering latency, and risk of backpressure if the process generates heavy logs. Passing `logStream` directly is standard practice and more efficient.
2. **Append mode (`flags: 'a'`)**:
   - Rejected: The user specifically requested flag `'w'` to see only the latest run's logs and avoid file size accumulation.

---

## Research Task 2: Git Tracking and File Sanitation

### Decision
Rely on existing `.gitignore` rule for `*.log`.

### Rationale
- Line 16 of `e:\reader\.gitignore` contains `*.log`.
- `python-backend/server.log` will automatically be ignored by Git. No changes to `.gitignore` are required.

---

## Research Task 3: Packaging & Environment Adaptability

### Decision
Use `baseDir` resolved from `getBackendPaths()`.

### Rationale
- In development: `path.join(app.getAppPath(), 'python-backend')` → `python-backend/server.log` in repo.
- In packaged app: `path.join(process.resourcesPath, 'python-backend')` → writable resources directory.
- Logging `[VoxRead] Log server Python duoc ghi tai: ${logPath}` via `console.log` immediately informs the developer/user of the exact file path regardless of packaging mode.
