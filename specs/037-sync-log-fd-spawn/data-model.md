# Data Model: Synchronous File Descriptor Redirection for Python Backend Spawn

**Feature**: 037-sync-log-fd-spawn | **Date**: 2026-09-06

> This feature does not modify persistent application databases. The model below reflects the runtime lifecycle of the Python process file descriptor.

---

## LogFileDescriptor Lifecycle

| Entity / Property | Type | Description |
|---|---|---|
| `logPath` | `string` | Absolute filesystem path (`path.join(baseDir, 'server.log')`) |
| `logFd` | `number` | Integer file descriptor created via `fs.openSync(logPath, 'w')` |
| `stdio` | `['ignore', number, number]` | Process stdio configuration passed to `spawn()` |

### Lifecycle Flow

```text
1. startPythonBackend() enters try block
   │
   ├─► const logPath = path.join(baseDir, 'server.log')
   ├─► const logFd = fs.openSync(logPath, 'w')       [fd: integer > 0]
   │
   ├─► spawn(pythonExe, [serverScript], {
   │     stdio: ['ignore', logFd, logFd]              [Kernel attaches stdout/stderr to fd]
   │   })
   │
   ├─► console.log(`[VoxRead] Log server Python duoc ghi tai: ${logPath}`)
   │
   ▼
Python process writes to stdout/stderr ───────────► Flushed to server.log
   │
   ▼
pythonProcess exits
   │
   └─► pythonProcess.on('exit'):
         try { fs.closeSync(logFd); } catch {}       [Handle safely closed]
```
