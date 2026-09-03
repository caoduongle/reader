# Quickstart & Verification Guide: Automated Setup & Cleanup

**Feature Branch**: `005-setup-scripts-cleanup`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Setup Script Verification

### Verification 1: Windows PowerShell Setup Script
Test the Windows setup script in a PowerShell terminal:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```
- **Check**:
  - Validates Node.js, npm, Python.
  - Installs npm packages without error.
  - Creates or verifies `python-backend/venv`.
  - Installs `python-backend/requirements.txt`.
  - Exits with exit code 0 (`$LASTEXITCODE -eq 0`).

---

### Verification 2: Unix Bash Setup Script
Check syntax and structure of `scripts/setup.sh`:

```bash
bash -n scripts/setup.sh
```
- **Check**:
  - Bash syntax check passes with 0 syntax errors.
  - Contains `set -euo pipefail`.
  - Echoes distinct steps and checks `python3` and `npm`.

---

### Verification 3: Removal of Placeholder File
```bash
git status --porcelain
```
- **Check**:
  - `DAT_FILE_MODEL_VAO_DAY.txt` is deleted (`D DAT_FILE_MODEL_VAO_DAY.txt`).
  - No broken links in `README.md` or `docs/rvc-voice-setup.md`.

---

### Verification 4: Single Lockfile Integrity
```bash
git ls-files "*lock*"
```
- **Check**:
  - Only `package-lock.json` is returned.
  - `bun.lock` is not tracked.

---

### Verification 5: README Quickstart Alignment
- Open `README.md` and check the "Bắt đầu nhanh" section:
  - References `.\scripts\setup.ps1` for Windows.
  - References `./scripts/setup.sh` for macOS/Linux.
  - Shows quickrun commands (`npm run dev` and `npm run electron:dev`).
