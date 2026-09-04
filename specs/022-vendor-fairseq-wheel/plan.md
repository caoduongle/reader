# Implementation Plan: Zero-Compiler Windows Setup via Vendored Fairseq Wheel

**Branch**: `022-vendor-fairseq-wheel` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/022-vendor-fairseq-wheel/spec.md`

---

## Summary

Eliminate the mandatory requirement for Microsoft Visual C++ Build Tools on Windows when installing VoxRead. This is accomplished by building once and vendoring a pre-compiled binary wheel for `fairseq==0.12.2` (`fairseq-0.12.2-cp310-cp310-win_amd64.whl`) in `python-backend/wheels/`, configuring `scripts/setup.ps1` to detect and install the wheel prior to general dependencies, updating `requirements.txt` and documentation, and preserving native cross-platform installation behaviors for POSIX environments (`scripts/setup.sh`).

---

## Technical Context

**Language/Version**: Python 3.10.x 64-bit, PowerShell 5.1/7+, POSIX Bash, Node.js >= 18  
**Primary Dependencies**: `fairseq==0.12.2`, `rvc-python==0.1.5`, `flask`, `edge-tts`  
**Storage**: Local binary packaging repository (`python-backend/wheels/`)  
**Testing**: End-to-end clean venv setup script verification (`setup.ps1`), inference module imports (`rvc_python.infer`), Flask server health check (`server.py`), git repository cleanliness audit  
**Target Platform**: Windows 10/11 x64 (primary consumer of vendored wheel); Linux / macOS (retaining native build flow)  
**Project Type**: Desktop app (Electron + React frontend + Python Flask/RVC backend)  
**Performance Goals**: Reduce Windows dependency setup time by >= 70% by eliminating the lengthy `running build_ext` C++ compilation step  
**Constraints**:
- Zero requirement for Visual C++ Build Tools on Windows 64-bit with Python 3.10
- Clean git status: never commit temporary build directories (`build/`, `*.egg-info`, `dist/`) or virtual environments (`venv/`)
- Strict backward compatibility with existing RVC voice models and Flask endpoints

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Library / Dependency Integrity | ✅ Passed | Fairseq wheel matches the exact pinned dependency (`0.12.2`) expected by `rvc-python==0.1.5`. |
| II. Fail-Fast Execution | ✅ Passed | `setup.ps1` and `setup.sh` strictly trap errors and exit with informative diagnostics. |
| III. Cross-Platform Parity | ✅ Passed | Windows wheel logic is encapsulated in `setup.ps1`; POSIX `setup.sh` remains clean and unaffected. |
| IV. Repository Hygiene & Zero Bloat | ✅ Passed | Only the compiled wheel (`.whl`) is vendored; intermediate build artifacts and virtualenvs are strictly ignored. |
| V. Complete Observability & Documentation | ✅ Passed | Prominent version mismatch diagnostics in scripts, detailed rebuild guide in `wheels/README.md`, updated root `README.md`. |

---

## Project Structure

### Documentation (this feature)

```text
specs/022-vendor-fairseq-wheel/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Phase 0: Technical research & architectural decisions
├── data-model.md        # Phase 1: Entity definitions & lifecycle state transitions
├── quickstart.md        # Phase 1: End-to-end verification workflows
├── contracts/           # Phase 1: Interface & CLI contracts
│   └── setup-contract.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── python-backend/
│   ├── wheels/
│   │   ├── fairseq-0.12.2-cp310-cp310-win_amd64.whl # [NEW] Pre-built binary wheel for Windows x64 Python 3.10
│   │   └── README.md                                # [NEW] Rebuild instructions for alternate Python versions
│   └── requirements.txt                             # [MODIFY] Document vendored fairseq resolution
├── scripts/
│   ├── setup.ps1                                    # [MODIFY] Detect & pre-install local wheel before pip requirements
│   └── setup.sh                                     # [MODIFY] Add documentation comment on POSIX isolation
└── README.md                                        # [MODIFY] Add installation note regarding vendored fairseq wheel
```

---

## Phases & Deliverables

### Phase 1: Build & Vendor Fairseq Wheel
1. Verify presence of `fairseq` in current environment or build wheel directly:
   - Run `pip install rvc-python==0.1.5` in working venv with MSVC tools to produce compiled fairseq package.
   - Run `pip wheel fairseq==0.12.2 -w python-backend/wheels/ --no-deps --no-build-isolation` (or retrieve from pip cache).
2. Confirm output wheel tag is `fairseq-0.12.2-cp310-cp310-win_amd64.whl`.
3. Clean up any other non-essential downloaded wheels or temporary build artifacts in `python-backend/wheels/`.

### Phase 2: Update Configuration & Scripts
1. Update `python-backend/requirements.txt`:
   - Add clear comments explaining that `fairseq` is satisfied on Windows via the vendored wheel in `wheels/`.
2. Update `scripts/setup.ps1`:
   - Inspect `python-backend/wheels/` for matching `fairseq-*-cp$minor-*-win_amd64.whl`.
   - If present, install the wheel directly via `pip install <wheel>` before running `pip install -r requirements.txt`.
   - If absent, print clear warning with link to Visual C++ Build Tools and `wheels/README.md`.
3. Update `scripts/setup.sh`:
   - Add comment clarifying that Windows wheel logic is deliberately excluded on Linux/macOS.

### Phase 3: Documentation
1. Create `python-backend/wheels/README.md`:
   - Explain why fairseq is vendored (Windows C++ libbleu compilation requirement).
   - Document compatibility (Python 3.10, Windows x64).
   - Provide step-by-step instructions for rebuilding the wheel if Python versions change.
2. Update root `README.md` (Installation section):
   - Note that fairseq is vendored in `wheels/` for zero-compiler Windows setup.

### Phase 4: End-to-End Verification & Git Hygiene
1. Remove `python-backend/venv`.
2. Run `powershell -ExecutionPolicy Bypass -File scripts/setup.ps1` from scratch.
3. Confirm wheel installs cleanly without compiler invocation.
4. Verify backend server launch (`python server.py`) and inference module import (`rvc_python.infer`).
5. Verify `git status` is clean (only intended `.whl`, scripts, and documentation files tracked).

---

## Complexity Tracking

*No constitutional violations; no complexity tracking required.*
