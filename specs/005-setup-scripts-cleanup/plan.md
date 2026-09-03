# Implementation Plan: Automated One-Click Setup Scripts & Model Placeholder Cleanup

**Branch**: `005-setup-scripts-cleanup` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/005-setup-scripts-cleanup/spec.md`  

---

## Summary

Deliver a frictionless, 1-click automated environment setup workflow and complete repository hygiene:
1. **Enforce Single Lockfile Standard**: Confirm `npm` as the sole package manager; ensure `package-lock.json` is the only tracked lockfile and all instructions uniformly use `npm`.
2. **Remove Placeholder File**: Safely delete root `DAT_FILE_MODEL_VAO_DAY.txt`, confirming its model guidance is fully represented in `docs/rvc-voice-setup.md` and `README.md`.
3. **Automate Environment Setup (1-Click)**:
   - Create `scripts/setup.ps1` for Windows PowerShell.
   - Create `scripts/setup.sh` for macOS/Linux Bash.
   - Both scripts validate Node.js ($\ge 18$) and Python ($\ge 3.10$), execute `npm install`, initialize `python-backend/venv`, and install `python-backend/requirements.txt` with robust fail-fast error trapping.
4. **Streamline Quickstart Documentation**: Update `README.md` to point users directly to the new setup scripts.

---

## Technical Context

**Language/Format**: PowerShell 5.1/7+, POSIX Bash, Markdown  
**Target Files**:
- `scripts/setup.ps1` [NEW]
- `scripts/setup.sh` [NEW]
- `DAT_FILE_MODEL_VAO_DAY.txt` [DELETE]
- `README.md` [MODIFY]
**Primary Dependencies**: Node.js $\ge 18$, npm, Python $\ge 3.10$  
**Testing & Verification**: PowerShell script run verification, Bash syntax validation (`bash -n`), git lockfile check, README link and instruction review  
**Constraints**:
- Fail-fast error propagation: scripts must exit with non-zero exit code on any step failure
- Zero modification to dependency versions in `package.json` or `python-backend/requirements.txt`
- Zero modification to application source code in `src/`, `electron/`, or `python-backend/server.py`

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Single Lockfile Hygiene | ✅ Passed | Only `package-lock.json` is tracked; npm standardized across scripts. |
| II. Fail-Fast Execution | ✅ Passed | `$ErrorActionPreference = 'Stop'` and `set -euo pipefail` prevent silent errors. |
| III. Lossless Cleanup | ✅ Passed | Placeholder note content already exists in `docs/rvc-voice-setup.md`. |
| IV. Zero Source Code Regression | ✅ Passed | No changes to React components, Electron host, or Python backend logic. |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-setup-scripts-cleanup/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Technical research & script architecture
├── data-model.md        # Setup context and error models
├── quickstart.md        # Verification workflows
├── contracts/           # CLI specifications
│   └── setup-script-contracts.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── scripts/
│   ├── setup.ps1        # [NEW] Automated PowerShell setup script for Windows
│   └── setup.sh         # [NEW] Automated Bash setup script for macOS/Linux
├── DAT_FILE_MODEL_VAO_DAY.txt # [DELETE] Remove obsolete placeholder text file
├── README.md            # [MODIFY] Streamline Quickstart to reference setup scripts
└── package-lock.json    # [UNCHANGED] Retain as sole tracked lockfile
```

---

## Phases & Deliverables

### Phase 1: Cleanup & Lockfile Confirmation
1. Verify `package-lock.json` is the sole tracked lockfile.
2. Delete `DAT_FILE_MODEL_VAO_DAY.txt` via git.
3. Confirm model placement instructions in `docs/rvc-voice-setup.md` remain accurate and complete.

### Phase 2: Create Setup Scripts
1. Create `scripts/setup.ps1` with prerequisite checks, `npm install`, Python venv creation, pip requirements installation, and strict `$LASTEXITCODE` checks.
2. Create `scripts/setup.sh` with prerequisite checks, `npm install`, Python venv creation, pip requirements installation, and `set -euo pipefail`.

### Phase 3: Update README.md Quickstart
1. Update the "Bắt đầu nhanh" section in `README.md` to highlight the 1-click setup scripts for Windows and macOS/Linux.
2. Ensure all package manager references uniformly point to `npm`.

### Phase 4: Verification
1. Run `scripts/setup.ps1` to test the complete Windows setup.
2. Check `scripts/setup.sh` syntax via `bash -n`.
3. Confirm `git status` reflects only the intended additions and deletions.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**
