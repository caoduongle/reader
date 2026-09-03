# Setup Scripts Contract & CLI Specifications

**Feature**: `005-setup-scripts-cleanup`  
**Date**: 2026-09-03  

---

## 1. CLI Contract for `scripts/setup.ps1` (Windows)

- **Invocation**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
  ```
  Or if already in an open PowerShell prompt:
  ```powershell
  .\scripts\setup.ps1
  ```
- **Exit Codes**:
  - `0`: All prerequisites validated, npm packages installed, Python venv created, and pip packages installed.
  - `1` or `>0`: Missing prerequisite or command error.
- **Output Requirements**:
  - Clear banners: `[1/4] Kiểm tra môi trường...`, `[2/4] Cài đặt Node.js dependencies...`, `[3/4] Cấu hình Python backend venv...`, `[4/4] Cài đặt Python requirements...`.
  - Final green success banner with quickstart commands.

---

## 2. CLI Contract for `scripts/setup.sh` (macOS / Linux)

- **Invocation**:
  ```bash
  chmod +x scripts/setup.sh
  ./scripts/setup.sh
  ```
- **Exit Codes**:
  - `0`: Success across all phases.
  - `1` or `>0`: Immediate abort on failure.
- **Output Requirements**:
  - Colored ANSI progress output.
  - Informative error on missing tools (`node`, `npm`, `python3`).

---

## 3. Package Management Single-Lockfile Policy

- Only `package-lock.json` may exist in the repository root.
- All setup scripts MUST run `npm install`.
- `bun.lock` and `bun.lockb` MUST remain ignored in `.gitignore`.
