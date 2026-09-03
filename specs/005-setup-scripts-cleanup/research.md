# Research: Automated One-Click Setup Scripts & Model Placeholder Cleanup

**Feature**: `005-setup-scripts-cleanup`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## 1. Package Manager Analysis: `npm` vs `bun`

### Current State
- `package.json` defines all lifecycle scripts using `npm` (`npm run dev`, `npm run electron:dev`, `npm run electron:build`).
- `package-lock.json` is 316 kB and tracked in git.
- `bun.lock` was previously tracked but was removed and added to `.gitignore` in feature `003` to prevent multi-tool drift.
- Search for `bun` across CI, scripts, and workflows yielded 0 functional requirements or workspace dependencies.
- Electron tooling (`electron-builder`) has first-class, battle-tested compatibility with `npm`.

### Decision
Confirm and enforce `npm` as the project's sole package manager. Ensure all setup scripts and documentation invoke `npm install` and `npm run ...`.

---

## 2. Model Placeholder Cleanup: `DAT_FILE_MODEL_VAO_DAY.txt`

### Current State
`DAT_FILE_MODEL_VAO_DAY.txt` in the root directory contains:
```text
Copy 2 file ban tai tu Google Drive (thu muc ApplioExported/) sau khi train xong o Colab vao day:
  - <ten_model>.pth
  - <ten_model>.index
Sau do mo server.py, sua MODEL_PATH va INDEX_PATH cho khop dung ten file ban vua copy vao.
Xoa file .txt nay di cung duoc, no chi la placeholder de thu muc model/ khong bi rong.
```

### Analysis & Decision
1. The author explicitly noted in line 8: *"Xoa file .txt nay di cung duoc, no chi la placeholder..."*.
2. The directory `model/` already contains real weights (`Chess_25e_12750s.pth` and `Chess.index`), while `python-backend/model/` has `.gitkeep`.
3. Complete model placement instructions are already fully documented in `docs/rvc-voice-setup.md` (sections A4 and B3) and `README.md`.
4. Decision: Delete `DAT_FILE_MODEL_VAO_DAY.txt` via git to maintain repository hygiene.

---

## 3. Setup Script Design & Error Handling

### Windows: `scripts/setup.ps1`
- **Execution Policy**: Document running with `-ExecutionPolicy Bypass`.
- **Error Handling**: Set `$ErrorActionPreference = "Stop"`. For native external commands (`npm.cmd`, `pip.exe`), PowerShell does not automatically throw on non-zero exit codes. Therefore, wrap each external command with exit code checks:
  ```powershell
  & npm install
  if ($LASTEXITCODE -ne 0) {
      Write-Error "Lỗi khi chạy npm install (exit code: $LASTEXITCODE)"
      exit $LASTEXITCODE
  }
  ```
- **Python Resolution**:
  Check candidates in order:
  1. `py -3.10`
  2. `python`
  3. `python3`
  Verify the chosen interpreter reports version $\ge 3.10$.
- **Venv Creation**:
  Create `python-backend/venv` if it doesn't already exist.
  Execute pip install using the newly created venv's python:
  `& $venvPython -m pip install --upgrade pip`
  `& $venvPython -m pip install -r $requirementsPath`

### Unix: `scripts/setup.sh` (macOS / Linux)
- **Shell Flags**: `set -euo pipefail`.
- **Python Resolution**:
  Check `python3.10` or `python3` ($\ge 3.10$).
- **Venv Creation**:
  `python3 -m venv python-backend/venv`
  `python-backend/venv/bin/pip install --upgrade pip`
  `python-backend/venv/bin/pip install -r python-backend/requirements.txt`
- **Portability**: Use standard POSIX commands, ANSI color variables with tty detection.
