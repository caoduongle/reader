# Data Model: Automatic NVIDIA GPU Detection, CUDA PyTorch Setup & Runtime Warnings

**Feature**: 039-gpu-cuda-setup | **Date**: 2026-09-06

## Entities

### HardwarePlatform

Represents the physical host hardware capabilities evaluated during environment setup and server initialization.

- **Attributes**:
  - `has_nvidia_smi`: `boolean` — `true` if `nvidia-smi` is found in PATH and exits with code 0.
  - `gpu_device_name`: `string | null` — Human-readable name of the GPU (e.g., `NVIDIA GeForce RTX 2050`) if detected.
  - `cuda_driver_version`: `string | null` — Driver version reported by `nvidia-smi`.
- **Transitions**:
  - `NotChecked` → `Detected` (when `nvidia-smi` exits 0)
  - `NotChecked` → `AbsentOrFailed` (when `nvidia-smi` not found or non-zero exit)

---

### PyTorchEnvironment

Represents the Python PyTorch and TorchAudio package installation state inside `python-backend/venv`.

- **Attributes**:
  - `version`: `string` — Package version string (e.g., `2.1.1+cu118` or `2.1.1`).
  - `cuda_available`: `boolean` — Value of `torch.cuda.is_available()`.
  - `device_string`: `string` — Execution target device string (`cuda:0` or `cpu:0`).
- **Validation Rules**:
  - If `cuda_available` is `true`, `device_string` defaults to `cuda:0` unless overridden by `VOXREAD_DEVICE`.
  - If `device_string == "cpu:0"`, runtime warning is triggered via `print_device_warning()`.

---

### SetupPolicy

Represents the installation decision matrix inside `scripts/setup.ps1` and `scripts/setup.sh`.

- **States**:
  - `GPU_FOUND`: Run `pip install torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118`.
  - `GPU_NOT_FOUND`: Log informational message; retain default CPU PyTorch installed via `requirements.txt`.
