# Feature Specification: Automatic NVIDIA GPU Detection, CUDA PyTorch Setup & Runtime Warnings

**Feature Branch**: `039-gpu-cuda-setup`  
**Created**: 2026-09-06  
**Status**: Draft  
**Input**: Three-layer improvement for NVIDIA GPU and CUDA PyTorch setup:
- Layer 1 (README): Add an `[!IMPORTANT]` alert box immediately following the setup scripts section in `README.md` explaining CUDA PyTorch setup for NVIDIA GPU owners.
- Layer 2 (Runtime Warning): In `python-backend/server.py`, when running on CPU (`DEVICE == "cpu:0"`), print a visible warning and exact pip commands to install CUDA PyTorch.
- Layer 3 (Setup Automation): In `scripts/setup.ps1` and `scripts/setup.sh`, after `pip install -r requirements.txt`, automatically check for NVIDIA GPU via `nvidia-smi`. If detected, install CUDA-enabled PyTorch (`cu118`); if not detected, log informational message and proceed with CPU PyTorch gracefully.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Automated CUDA PyTorch Setup for NVIDIA GPU Systems (Priority: P1) 🎯 MVP

As a developer or user running VoxRead setup on a machine with an NVIDIA GPU, I want the automated setup script (`setup.ps1` on Windows, `setup.sh` on Linux) to automatically detect my GPU and install CUDA-accelerated PyTorch without manual intervention, so that RVC voice inference runs at high speed (1–3 seconds per sentence) out of the box.

**Why this priority**: Without CUDA PyTorch, inference falls back to CPU (15–25 seconds per sentence), which makes local voice playback unusable for real-time reading. Automating the detection and installation eliminates human error and complex manual steps.

**Independent Test**:
1. Remove or start with a clean virtual environment (`python-backend/venv`).
2. Run `powershell -ExecutionPolicy Bypass -File scripts/setup.ps1` (or `./scripts/setup.sh` on Linux) on a machine with an NVIDIA GPU and driver installed.
3. Observe console output indicating NVIDIA GPU detection and automated CUDA PyTorch installation.
4. Run `python-backend/venv/Scripts/python.exe -c "import torch; print(torch.cuda.is_available())"`.
5. Verify it outputs `True`.

**Acceptance Scenarios**:
1. **Given** an NVIDIA GPU is present and `nvidia-smi` returns exit code 0, **When** setup script reaches step 4 after installing `requirements.txt`, **Then** it automatically installs `torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118` and outputs a green success message.
2. **Given** no NVIDIA GPU is present (or `nvidia-smi` fails/is missing), **When** setup script reaches the GPU check step, **Then** it displays an informational warning that CPU PyTorch is retained and links to documentation, exiting successfully with code 0.

---

### User Story 2 – Runtime Diagnosis & Diagnostic Guidance for CPU Inference (Priority: P2)

As a user or developer launching the VoxRead backend, if the backend initializes on CPU (`DEVICE == "cpu:0"`), I want immediate, conspicuous warnings in `server.log` and the terminal explaining that CPU inference will be significantly slower and providing copy-paste commands to upgrade to CUDA PyTorch, so that performance issues are immediately self-diagnosable.

**Why this priority**: When users encounter slow TTS latency, they often do not realize their PyTorch installation lacks CUDA support. Surfacing this in `server.log` right at startup ensures swift troubleshooting.

**Independent Test**:
1. Force device to CPU (or run in an environment where `torch.cuda.is_available()` is False).
2. Start `python-backend/server.py`.
3. Inspect standard output / `server.log`.
4. Verify the warning message contains the latency comparison (15–25s vs 1–3s) and the exact `pip` reinstall commands.

**Acceptance Scenarios**:
1. **Given** `DEVICE == "cpu:0"`, **When** `server.py` executes device detection, **Then** it prints a warning header `[VoxRead][Canh bao] Dang chay tren CPU!...` and `[VoxRead][Goi y]...` with the exact pip install commands.
2. **Given** `DEVICE == "cuda:0"`, **When** `server.py` executes device detection, **Then** it only prints `[VoxRead] Dang dung thiet bi: cuda:0` without CPU warnings.

---

### User Story 3 – Clear Documentation in README (Priority: P3)

As a developer reading `README.md` to set up the project manually or review requirements, I want to see a prominent `[!IMPORTANT]` alert box right below the setup script commands in Step 1, so that I am immediately aware of the CUDA requirements before running into inference latency issues.

**Why this priority**: Readme is the first entry point for any developer cloning the repository; placing the warning right below the 1-click command ensures immediate visibility.

**Independent Test**:
1. Open `README.md`.
2. Inspect the section immediately following Step 1 ("Bước 1 — Thiết lập môi trường tự động 1 lệnh").
3. Verify that a `> [!IMPORTANT]` block is present, describing NVIDIA GPU setup commands and linking to `docs/rvc-voice-setup.md#b2-cài-pytorch-đúng-bản-cho-máy-bạn`.

**Acceptance Scenarios**:
1. **Given** a user views `README.md`, **When** reading Step 1 under developer setup, **Then** they see the `> [!IMPORTANT]` alert box detailing the CUDA setup commands and link to `docs/rvc-voice-setup.md`.

---

### Edge Cases

- **NVIDIA GPU exists but driver or `nvidia-smi` is not installed/broken**: The command check fails gracefully without crashing the setup script, printing a warning and retaining the CPU version.
- **`VOXREAD_DEVICE` environment variable override**: If a user explicitly sets `VOXREAD_DEVICE=cpu:0`, the warning should still print to inform the user that CPU mode is active.
- **Offline setup / PyTorch wheel repository unreachable**: If `pip install` of CUDA wheels fails due to network issues, the script warns the user with actionable instructions without deleting the existing working CPU venv.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `README.md` MUST include a `> [!IMPORTANT]` callout box immediately after the setup commands in Step 1 detailing manual CUDA installation commands and linking to `docs/rvc-voice-setup.md#b2-cài-pytorch-đúng-bản-cho-máy-bạn`.
- **FR-002**: `python-backend/server.py` MUST check if `DEVICE == "cpu:0"` immediately after logging `[VoxRead] Dang dung thiet bi: ...` and print a multi-line warning with guidance and pip commands.
- **FR-003**: `scripts/setup.ps1` MUST check for NVIDIA GPU presence using `nvidia-smi` after installing `requirements.txt`.
- **FR-004**: If `nvidia-smi` succeeds in `scripts/setup.ps1`, it MUST run `& $VenvPip install torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118` and log a green success message.
- **FR-005**: If `nvidia-smi` is absent or fails in `scripts/setup.ps1`, it MUST output an informational yellow warning and leave the CPU installation intact.
- **FR-006**: `scripts/setup.sh` MUST implement the identical GPU detection and CUDA PyTorch installation logic for Linux environments using `command -v nvidia-smi`.
- **FR-007**: All existing Python tests in `python-backend/tests/` and frontend test suites MUST continue to pass without regression.

---

### Key Entities

- **HardwarePlatform**:
  - `has_nvidia_gpu`: Boolean indicating presence of NVIDIA hardware via `nvidia-smi`.
  - `device_target`: Target PyTorch backend (`cuda:0` vs `cpu:0`).
- **SetupProfile**:
  - `torch_package`: Package specification (`torch==2.1.1+cu118`, `torchaudio==2.1.1+cu118`).
  - `index_url`: `https://download.pytorch.org/whl/cu118`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a machine with an NVIDIA GPU, running `setup.ps1` or `setup.sh` results in `torch.cuda.is_available() == True` without requiring any manual pip commands.
- **SC-002**: On CPU-only environments, `server.py` logs explicit warnings and pip instructions in `server.log` within 500ms of startup.
- **SC-003**: Setup script exit code remains 0 on both GPU and non-GPU systems.
- **SC-004**: 100% of existing backend tests pass.

---

## Assumptions

- Users with NVIDIA GPUs have installed an NVIDIA display driver compatible with CUDA 11.8 or newer.
- PyTorch 2.1.1 with CUDA 11.8 remains the recommended, stable version for `rvc-python` and `fairseq`.

