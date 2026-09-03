# Data Model & Architecture Specification: Setup Automation & Environment

**Feature Branch**: `005-setup-scripts-cleanup`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. Setup Automation Architecture

The setup process automates the preparation of two isolated runtime layers from the repository root:

```
                  [User executes scripts/setup.ps1 or scripts/setup.sh]
                                           │
                                           ▼
                    ┌─────────────────────────────────────────────┐
                    │ Phase 1: Host Prerequisite Validation       │
                    │ - Node.js >= 18.0.0                         │
                    │ - npm >= 9.0.0                              │
                    │ - Python >= 3.10.0                          │
                    └──────────────────────┬──────────────────────┘
                                           │ (Fail-fast if missing)
                                           ▼
                    ┌─────────────────────────────────────────────┐
                    │ Phase 2: Frontend & Electron Dependencies   │
                    │ - Execute: npm install                      │
                    │ - Verify exit code == 0                     │
                    └──────────────────────┬──────────────────────┘
                                           │
                                           ▼
                    ┌─────────────────────────────────────────────┐
                    │ Phase 3: Python Backend Microservice        │
                    │ - Target: python-backend/venv               │
                    │ - Create venv if absent                     │
                    │ - Install python-backend/requirements.txt   │
                    │ - Verify exit code == 0                     │
                    └──────────────────────┬──────────────────────┘
                                           │
                                           ▼
                    [Output: Environment ready for web, desktop & RVC]
```

---

## 2. Core Entities & State Models

### 2.1 Setup Execution Context (`SetupExecutionContext`)

```typescript
export interface SetupExecutionContext {
  osPlatform: 'windows' | 'darwin' | 'linux';
  scriptPath: string;
  projectRoot: string;
  nodeVersion: string;
  npmVersion: string;
  pythonExecutable: string;
  pythonVersion: string;
  pythonBackendDir: string;
  venvPath: string;
  requirementsPath: string;
}
```

### 2.2 Setup Step Status (`SetupStep`)

```typescript
export interface SetupStep {
  id: number;
  name: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  exitCode: number;
  errorMessage?: string;
}
```

**Step Sequence:**
1. `Step 1`: Validate Node.js & npm prerequisites.
2. `Step 2`: Validate Python 3.10+ prerequisite.
3. `Step 3`: Install Node.js dependencies (`npm install`).
4. `Step 4`: Initialize Python virtual environment (`python-backend/venv`).
5. `Step 5`: Install Python requirements (`python-backend/requirements.txt`).
6. `Step 6`: Print environment summary and launch instructions.

---

### 2.3 Error Trapping Contract

- Any step failure immediately halts script execution.
- In PowerShell:
  `$ErrorActionPreference = 'Stop'` + `$LASTEXITCODE` validation.
- In Bash:
  `set -euo pipefail` (exit on error, unset variables treated as errors, pipeline failure propagation).
- Exit Code: Propagate non-zero exit code of failed sub-command (or `1` on generic error).
