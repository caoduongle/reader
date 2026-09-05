# Data Model: Persistent Python Backend Output Log File

**Feature**: 035-python-backend-server-log | **Date**: 2026-09-05

> This feature introduces no persistent database models. The entity below represents the file-based logging descriptor used during process lifetime.

---

## PythonBackendLog

Ephemeral runtime configuration and stream handles for Python background server output.

| Field | Type | Description |
|---|---|---|
| `logPath` | `string` | Absolute path to the log file (`path.join(baseDir, 'server.log')`) |
| `logStream` | `fs.WriteStream` | Write stream handle created with `{ flags: 'w' }` |
| `stdioConfig` | `['ignore', fs.WriteStream, fs.WriteStream]` | Three-element stdio tuple passed to `child_process.spawn` |

### Lifecycle & State Transitions

```text
Electron app.whenReady()
  │
  ▼
startPythonBackend() called
  │
  ├─> Determine baseDir via getBackendPaths()
  ├─> logPath = path.join(baseDir, 'server.log')
  ├─> logStream = fs.createWriteStream(logPath, { flags: 'w' })
  ├─> spawn(pythonExe, [serverScript], { stdio: ['ignore', logStream, logStream] })
  ├─> console.log(`[VoxRead] Log server Python duoc ghi tai: ${logPath}`)
  │
  ▼
Python process runs: stdout/stderr write directly to server.log
  │
  ▼
Application exit / Process termination
  └─> logStream closes; OS releases file handle
```
