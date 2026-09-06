# Implementation Plan: Automatic NVIDIA GPU Detection, CUDA PyTorch Setup & Runtime Warnings

**Branch**: `039-gpu-cuda-setup` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/039-gpu-cuda-setup/spec.md)

**Input**: Feature specification from `/specs/039-gpu-cuda-setup/spec.md`

## Summary

VoxRead's local RVC voice inference is computationally demanding. On CPU, inference takes 15–25 seconds per sentence, whereas an NVIDIA GPU runs it in 1–3 seconds. Previously, default setup scripts and documentation did not proactively automate or prominently guide the user toward CUDA PyTorch installation, resulting in users unintentionally running on slow CPU inference.

This feature delivers a comprehensive 3-layer solution:
1. **Layer 1 (Documentation)**: Prominent `> [!IMPORTANT]` alert box right below Step 1 in `README.md` with explicit CUDA pip commands and deep-link to setup guide.
2. **Layer 2 (Runtime Warning)**: When `server.py` starts with `DEVICE == "cpu:0"`, it logs explicit warnings and exact pip upgrade commands to console and `server.log`.
3. **Layer 3 (Setup Automation)**: `scripts/setup.ps1` and `scripts/setup.sh` automatically detect NVIDIA GPUs via `nvidia-smi` and install CUDA PyTorch (`torch==2.1.1+cu118 torchaudio==2.1.1+cu118`) automatically.

## Technical Context

**Language/Version**: Python 3.10+, PowerShell 5.1/7+, Bash (macOS/Linux), Markdown

**Primary Dependencies**: `torch==2.1.1+cu118`, `torchaudio==2.1.1+cu118`, `nvidia-smi` CLI tool

**Storage**: Local virtual environment (`python-backend/venv`)

**Testing**: `pytest tests/test_server.py`, manual script invocation tests

**Target Platform**: Windows 10/11 (PowerShell), Linux / macOS (Bash), Electron desktop backend

**Project Type**: Automation scripts, server startup diagnostics, developer documentation

**Performance Goals**: Automatically configure GPU environments for 1–3s inference latency without user friction

**Constraints**:
- Must not fail or crash setup scripts if `nvidia-smi` is absent or non-zero exit code (CPU fallback)
- Must not break existing PyTorch functionality or imports
- Server runtime warning must be tested via unit tests with `capsys`

**Scale/Scope**: 4 files modified (`README.md`, `python-backend/server.py`, `scripts/setup.ps1`, `scripts/setup.sh`), 1 test file updated (`python-backend/tests/test_server.py`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an empty template. No active gates or constraints are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/039-gpu-cuda-setup/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
README.md                     # Step 1 developer setup alert box
python-backend/
├── server.py                 # print_device_warning function and startup call
└── tests/
    └── test_server.py        # Unit tests for print_device_warning
scripts/
├── setup.ps1                 # Step 4 NVIDIA GPU detection and pip install CUDA
└── setup.sh                  # Step 4 NVIDIA GPU detection and pip install CUDA
```

**Structure Decision**: Direct modification to the four existing components and verification through pytest.

