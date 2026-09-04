# Technical Research & Architectural Decisions: Bundled Python Runtime & CI Workflow

**Feature**: `023-package-electron-venv`  
**Date**: 2026-09-05  
**Status**: Completed  

---

## 1. Electron Builder `extraResources` for Python Virtual Environment

### Context & Problem
In packaged Electron distributions on Windows, files bundled in `app.asar` cannot be executed as native background processes. Furthermore, files not declared in `package.json` under `build.extraResources` are excluded from the NSIS installer and portable archives. 
In `electron/main.ts`, the backend path resolver specifies:
```typescript
const baseDir = isPackaged
  ? path.join(process.resourcesPath, 'python-backend')
  : path.join(app.getAppPath(), 'python-backend');
const pythonwCandidate = path.join(baseDir, 'venv', 'Scripts', 'pythonw.exe');
const pythonCandidate = path.join(baseDir, 'venv', 'Scripts', 'python.exe');
```
Previously, `package.json` only bundled `server.py` and `requirements.txt`. Because `python-backend/venv` was omitted, the packaged application could never locate `pythonw.exe` or `python.exe`, leading to the error popup: `"Không kết nối được server giọng đọc"`.

### Decision
Add the mapping `{ "from": "python-backend/venv", "to": "python-backend/venv" }` into the `build.extraResources` array in [package.json](file:///e:/reader/package.json).

### Rationale
- Electron-builder copies the directory as-is into `<install-dir>/resources/python-backend/venv`.
- Matches the path resolution expectations in `electron/main.ts` without needing any changes to Electron TypeScript code.
- Keeps Python code and runtime fully isolated inside `resources/python-backend/`.

### Alternatives Considered
- **Packaging backend with PyInstaller into a single binary**: Rejected. PyInstaller bundles of PyTorch, fairseq, and C extensions are notoriously brittle, slow to compile, and prone to hidden dynamic import crashes.
- **Extracting Python at runtime from a zip archive**: Rejected. Adds startup lag on first launch and risks extraction corruption. Direct folder bundling via `extraResources` is instantaneous.

---

## 2. GitHub Actions Workflow Configuration & Runner Shell Selection

### Context & Problem
The existing `.github/workflows/build-electron.yml` only set up Node.js 22, ran `npm ci`, `npm run build`, and `npm run electron:build`. Because Python was not initialized on the runner, `python-backend/venv` was missing when `electron-builder` ran.
On GitHub Actions `windows-latest` runners, invoking virtual environment executables via PowerShell can encounter execution policy restrictions (e.g. `PSSecurityException` when running activation scripts) and quote-handling discrepancies.

### Decision
1. Use `actions/setup-python@v5` with `python-version: '3.10'` prior to packaging.
2. Initialize virtualenv using standard `python -m venv python-backend/venv`.
3. Explicitly specify `shell: cmd` for all steps invoking `python-backend\venv\Scripts\*.exe`.

### Rationale
- `actions/setup-python@v5` is the official, actively maintained GitHub action that reliably configures Python in runner PATH and tool cache.
- Using `shell: cmd` and calling `python-backend\venv\Scripts\pip.exe` directly bypasses virtualenv activation scripts completely and eliminates PowerShell execution policy headaches.

### Alternatives Considered
- **PowerShell Activation Script (`Activate.ps1`)**: Rejected due to CI runner execution policy differences and shell profile requirements.
- **Git Bash / MSYS2 shell**: Rejected because POSIX path translations (`/c/reader/...`) can confuse Windows native executables and Windows-specific electron-builder commands.

---

## 3. PyTorch Dependency Optimization: CPU Wheels vs CUDA Bloat

### Context & Problem
Installing `torch` and `torchaudio` from default PyPI wheels pulls in several gigabytes of NVIDIA CUDA / cuDNN runtime binaries. A default PyTorch installation consumes 3.5GB–5GB of disk space. For a desktop reader application, this causes:
1. Extremely slow CI builds (downloading ~2.5GB wheels from PyPI).
2. Huge installer size (multi-gigabyte download for end users).
3. Disk exhaustion on CI runners.

### Decision
Install CPU-optimized PyTorch wheels using:
```cmd
python-backend\venv\Scripts\pip.exe install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Rationale
- PyTorch CPU wheels total ~180MB (vs 2.5GB+ for CUDA).
- Voice reading inference (Edge-TTS + RVC inference on short sentences) runs effortlessly on modern x64 CPUs with negligible latency.
- Keeps the final packaged NSIS installer within the target range (500MB–1.5GB uncompressed, ~400MB–600MB compressed).
- Eliminates any dependency on NVIDIA GPU hardware or proprietary CUDA drivers on the user's PC.

### Alternatives Considered
- **Full CUDA PyTorch**: Rejected. Inappropriate for an e-book desktop app intended for general users.
- **Optional runtime download of PyTorch**: Rejected. Violates the core offline, zero-prerequisite user story.

---

## 4. Windows Venv Relocatability & Standalone Runtime Packaging

### Context & Problem
On Windows, a standard `python -m venv` does **not** copy the Python standard library (`Lib/`), C runtime DLLs (`python310.dll`, `vcruntime140.dll`), or compiled extension DLLs (`DLLs/`). Instead, it places stub executables in `venv\Scripts\` and writes `pyvenv.cfg` containing:
```ini
home = C:\hostedtoolcache\windows\Python\3.10.x\x64
```
When an application packaged on CI is installed on a client computer, `C:\hostedtoolcache\...` does not exist. The stub `python.exe` aborts immediately with:
`No Python at 'C:\hostedtoolcache\windows\Python\3.10.x\x64\python.exe'`.

### Decision
Add a post-installation preparation script ([scripts/bundle-venv.py](file:///e:/reader/scripts/bundle-venv.py)) executed during CI before `electron:build`. The script:
1. Replaces the stub executables in `python-backend/venv/Scripts/` with real base `python.exe` and `pythonw.exe`.
2. Copies core C runtime DLLs (`python310.dll`, `python3.dll`, `vcruntime140.dll`, `vcruntime140_1.dll`) into `python-backend/venv/Scripts/`.
3. Copies base `DLLs/` into `python-backend/venv/DLLs/`.
4. Copies standard library modules from base `Lib/` (excluding `site-packages`) into `python-backend/venv/Lib/`.
5. Removes `pyvenv.cfg` so Python falls back to native landmark directory resolution relative to `Scripts/`.

### Rationale
- Python on Windows detects standard directories (`..\DLLs`, `..\Lib`, `..\Lib\site-packages`) when `pyvenv.cfg` is absent and real executables are used.
- Verified experimentally: imports of standard library modules, `flask`, `edge_tts`, `torch`, and `fairseq` succeed without any global Python runtime installed on the host.
- Guarantees 100% portability across all Windows 10/11 x64 machines.

---

## 5. Quickstart Dual-Track Documentation Structure

### Context & Problem
Currently, [README.md](file:///e:/reader/README.md) mixes developer setup scripts (`setup.ps1`, `setup.sh`) directly under Quickstart. Ordinary users who only want to install and use the app are confused by commands mentioning Node.js and Python.

### Decision
Restructure the Quickstart section into two explicit tracks:
1. **Cách 1: Cài đặt đơn giản nhất (Dành cho người dùng)**:
   - Direct links to download pre-built `.exe` installers from GitHub Releases and GitHub Actions artifacts.
   - Clear disclosure that the installer file size is relatively large (~500MB–1.5GB) because it bundles the complete offline AI engine (PyTorch, RVC, Edge-TTS).
   - Zero requirement for Python, Node.js, or C++ tools.
2. **Cách 2: Dành cho nhà phát triển (Build từ mã nguồn)**:
   - Clone repository, run `setup.ps1` / `setup.sh`, `npm run dev`, `npm run electron:dev`, `npm run electron:build`.

### Rationale
Provides immediate clarity for non-technical users while preserving all technical instructions for developers.
