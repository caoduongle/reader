# Research: Synchronous File Descriptor Redirection for Python Backend Spawn

**Feature**: 037-sync-log-fd-spawn | **Date**: 2026-09-06

## Research Task 1: Node.js stdio with Integer File Descriptors vs Streams

### Decision
Use `fs.openSync(logPath, 'w')` to obtain an integer file descriptor directly and pass it to `stdio: ['ignore', logFd, logFd]`.

### Rationale
- `fs.createWriteStream()` initializes asynchronously. The file descriptor property (`logStream.fd`) is `null` until the `'open'` event fires on a subsequent event-loop tick.
- When `child_process.spawn()` evaluates `stdio: ['ignore', logStream, logStream]`, it inspects `logStream.fd`. Since `fd` is `null`, Node.js throws `ERR_INVALID_ARG_VALUE`.
- Node.js `child_process.spawn` explicitly documents and supports positive integer file descriptors in the `stdio` array.
- `fs.openSync(logPath, 'w')` opens the file synchronously and returns a valid integer file descriptor immediately, guaranteeing it is available at the exact moment `spawn()` runs.

---

## Research Task 2: Handle Lifetime and Cleanup Strategy

### Decision
Close `logFd` in `pythonProcess.on('exit')` with `try / catch`:
```typescript
pythonProcess.on('exit', (code, signal) => {
  console.log(`Python process exited with code ${code}, signal ${signal}`);
  pythonProcess = null;
  try {
    fs.closeSync(logFd);
  } catch {
    // File descriptor may have already been closed by OS or runtime; ignore error
  }
});
```

### Rationale
- Keeps file handle management scoped to the lifecycle of the child process.
- The `try/catch` guard prevents unhandled exception crashes if the descriptor is already closed or invalidated upon process death.
