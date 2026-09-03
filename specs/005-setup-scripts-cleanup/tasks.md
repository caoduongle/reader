# Tasks: Automated One-Click Setup Scripts & Model Placeholder Cleanup

**Feature**: `005-setup-scripts-cleanup`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Target Structure Initialization

**Purpose**: Initialize directory structure for automation scripts.

- [X] T001 Initialize directory `scripts/` in the repository root for automation scripts in `scripts/`.

---

## Phase 2: User Story 2 — Removal of Placeholder Note (`DAT_FILE_MODEL_VAO_DAY.txt`) (Priority: P1)

**Goal**: Eradicate obsolete placeholder note from the repository root, confirming instructions are safely preserved in `docs/rvc-voice-setup.md`.

**Independent Test**: Verify `DAT_FILE_MODEL_VAO_DAY.txt` is absent from git tracking and filesystem, while model placement guidance remains intact in `docs/rvc-voice-setup.md`.

### Implementation for User Story 2

- [X] T002 [US2] Remove obsolete placeholder file `DAT_FILE_MODEL_VAO_DAY.txt` from repository root via git, confirming model placement instructions are preserved in `docs/rvc-voice-setup.md`.

**Checkpoint**: Repository root is free of obsolete placeholder text files.

---

## Phase 3: User Story 1 — One-Click Automated Environment Setup (Priority: P1) 🎯 MVP

**Goal**: Deliver platform-native, 1-click setup scripts for Windows and macOS/Linux with strict error handling, step banners, and zero silent failures.

**Independent Test**: Execute `scripts/setup.ps1` on Windows and validate syntax of `scripts/setup.sh` on Unix: verify prerequisite checks (Node $\ge 18$, Python $\ge 3.10$), `npm install`, and Python venv creation with `requirements.txt`.

### Implementation for User Story 1

- [X] T003 [US1] Create automated Windows PowerShell setup script with prerequisite checks, npm install, Python venv creation, requirements installation, and strict `$LASTEXITCODE` validation in `scripts/setup.ps1`.
- [X] T004 [US1] Create automated POSIX Bash setup script with prerequisite checks, npm install, Python venv creation, requirements installation, and `set -euo pipefail` in `scripts/setup.sh`.

**Checkpoint**: Automated 1-click setup scripts ready for both Windows and Unix environments.

---

## Phase 4: User Story 3 — Streamlined Quickstart Documentation (Priority: P2)

**Goal**: Align `README.md` Quickstart section with the 1-click setup scripts and ensure uniform `npm` package manager references.

**Independent Test**: Read the "Bắt đầu nhanh" section of `README.md` to verify it directs users to `.\scripts\setup.ps1` and `./scripts/setup.sh`.

### Implementation for User Story 3

- [X] T005 [US3] Update "Bắt đầu nhanh" section in `README.md` to guide users directly to `scripts/setup.ps1` (Windows) and `scripts/setup.sh` (macOS/Linux) in `README.md`.

**Checkpoint**: Documentation offers a frictionless, script-driven onboarding flow.

---

## Phase 5: Polish & Cross-Cutting Verification

**Purpose**: Execute verification workflows and ensure zero unintended side-effects.

- [X] T006 Execute and verify `scripts/setup.ps1` in PowerShell, confirming exit code 0 and successful environment setup.
- [X] T007 Validate `scripts/setup.sh` syntax via `bash -n scripts/setup.sh`.
- [X] T008 Verify repository hygiene: confirm single lockfile (`package-lock.json`), removal of placeholder file, and zero source code modifications in `src/`, `electron/`, and `python-backend/server.py`.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup (T001)
       │
       ▼
Phase 2: Cleanup (T002)
       │
       ▼
Phase 3: User Story 1 - Setup Scripts (T003 - T004) 🎯 MVP
       │
       ▼
Phase 4: User Story 3 - Quickstart Docs (T005)
       │
       ▼
Phase 5: Polish & Verification (T006 - T008)
```

### Parallel Opportunities

- `T003` (`scripts/setup.ps1`) and `T004` (`scripts/setup.sh`) target different files and can be authored in parallel.
- `T006`, `T007`, and `T008` verification tasks can execute in parallel.

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Initialize `scripts/` directory.
2. Complete Phase 2: Remove `DAT_FILE_MODEL_VAO_DAY.txt`.
3. Complete Phase 3: Implement `scripts/setup.ps1` and `scripts/setup.sh`.
4. Complete Phase 4: Update `README.md`.
5. Complete Phase 5: Verify setup execution and confirm 0 code changes.

---

## Notes

- Every task strictly satisfies the checklist schema: `- [ ] [TaskID] [P?] [Story?] Description with file path`.
- Strictly no edits to application source code in `src/`, `electron/`, or `python-backend/server.py`.
- Fail-fast error propagation: scripts must exit with non-zero exit code on any step failure.
