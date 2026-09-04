# Packaging & Runtime Contract: Electron to Bundled Python Runtime

**Feature**: `023-package-electron-venv`  
**Date**: 2026-09-05  
**Status**: Active  

---

## 1. Resource Packaging Contract (`package.json`)

`package.json` MUST define `build.extraResources` containing at least the following mappings:

```json
"extraResources": [
  {
    "from": "python-backend/server.py",
    "to": "python-backend/server.py"
  },
  {
    "from": "python-backend/requirements.txt",
    "to": "python-backend/requirements.txt"
  },
  {
    "from": "python-backend/venv",
    "to": "python-backend/venv"
  }
]
```

### Invariants:
1. When `electron-builder` executes on Windows, the entire directory tree under `python-backend/venv` is mirrored directly into:
   `<InstallationPath>\resources\python-backend\venv\`
2. The executable binaries `pythonw.exe` and `python.exe` MUST reside at:
   `<InstallationPath>\resources\python-backend\venv\Scripts\pythonw.exe`
   `<InstallationPath>\resources\python-backend\venv\Scripts\python.exe`
3. The server entry script MUST reside at:
   `<InstallationPath>\resources\python-backend\server.py`

---

## 2. Process Spawn Contract (`electron/main.ts`)

`electron/main.ts` resolves paths using `getBackendPaths()`:

```typescript
function getBackendPaths() {
  const isPackaged = app.isPackaged;
  const baseDir = isPackaged
    ? path.join(process.resourcesPath, 'python-backend')
    : path.join(app.getAppPath(), 'python-backend');

  const pythonwCandidate = path.join(baseDir, 'venv', 'Scripts', 'pythonw.exe');
  const pythonCandidate = path.join(baseDir, 'venv', 'Scripts', 'python.exe');
  const serverScript = path.join(baseDir, 'server.py');

  let pythonExe = '';
  if (fs.existsSync(pythonwCandidate)) {
    pythonExe = pythonwCandidate;
  } else if (fs.existsSync(pythonCandidate)) {
    pythonExe = pythonCandidate;
  }

  return {
    baseDir,
    pythonExe,
    serverScript,
  };
}
```

### Execution Behavior:
- Priority executable: `pythonw.exe` (windowless process; prevents an unwanted black console window from flashing or remaining visible).
- Fallback executable: `python.exe`.
- Process invocation:
  ```typescript
  pythonProcess = spawn(pythonExe, [serverScript], {
    cwd: baseDir,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    stdio: 'ignore'
  });
  ```
- Health Check Probe:
  - URL: `http://127.0.0.1:8008/health`
  - Max Retries: 60 attempts (1 attempt per second).
  - Success criteria: HTTP 200 OK with `{ "status": "ok" }`.
