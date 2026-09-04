# CI/CD Workflow Contract: Desktop Application Packaging Pipeline

**Feature**: `023-package-electron-venv`  
**Date**: 2026-09-05  
**Status**: Active  

---

## 1. Trigger Specifications

Workflow file: `.github/workflows/build-electron.yml`

```yaml
on:
  workflow_dispatch:
  push:
    tags:
      - 'v*.*.*'
```

- **Tag Triggers**: Any git tag matching `v*.*.*` (e.g. `v1.0.0`, `v1.0.1`, `v1.1.0-beta`).
- **Manual Trigger**: Supports manual trigger via GitHub Actions UI / API (`workflow_dispatch`).

---

## 2. Runner & Environment Matrix

- **Runner**: `windows-latest`
- **Node.js**: Version 22 LTS
- **Python**: Version 3.10 via `actions/setup-python@v5`
- **Shell**: `cmd` for all commands that invoke executables located inside `python-backend\venv\Scripts\`.

---

## 3. Sequential Step Contract

The workflow steps MUST be executed in the following strict order:

| Step # | Step Title | Tool / Action | Shell | Description |
|:---:|---|---|:---:|---|
| 1 | Checkout repository | `actions/checkout@v4` | default | Clone repository source code with full workspace files. |
| 2 | Set up Node.js LTS | `actions/setup-node@v4` | default | Configure Node.js 22 and cache npm packages. |
| 3 | Install dependencies | `npm ci` | default | Deterministic installation of JavaScript dependencies from `package-lock.json`. |
| 4 | Build Web Assets (Vite) | `npm run build` | default | Compile React frontend into `dist/`. |
| 5 | Set up Python 3.10 | `actions/setup-python@v5` | default | Download and configure Python 3.10 runtime on runner. |
| 6 | Create Python virtual environment | `python -m venv python-backend/venv` | `cmd` | Create dedicated local venv at `python-backend/venv`. |
| 7 | Install fairseq from vendored wheel | `python-backend\venv\Scripts\pip.exe install python-backend\wheels\fairseq-0.12.2-cp310-cp310-win_amd64.whl` | `cmd` | Install pre-compiled native fairseq binary without C++ compilers. |
| 8 | Install backend dependencies & PyTorch CPU | `python-backend\venv\Scripts\pip.exe install -r python-backend\requirements.txt && python-backend\venv\Scripts\pip.exe install torch torchaudio --index-url https://download.pytorch.org/whl/cpu` | `cmd` | Install Flask, Edge-TTS, and lightweight CPU PyTorch wheels. |
| 9 | Make Python venv relocatable / standalone | `python scripts/bundle-venv.py` | `cmd` | Copy runtime DLLs and standard library into venv to guarantee portability. |
| 10 | Package Desktop Installer (Electron Builder) | `npm run electron:build` | default | Compile Electron scripts and bundle NSIS installer into `release/*.exe`. |
| 11 | Upload Windows Installer Artifact | `actions/upload-artifact@v4` | default | Upload `release/*.exe` artifact named `voxread-windows-installer`. |

---

## 4. Failure & Retry Semantics

- If any pip install step fails (e.g. wheel mismatch or network timeout), the job fails fast without packaging a broken installer.
- Artifact upload is executed only on successful packaging (`if-no-files-found: warn` / error).
