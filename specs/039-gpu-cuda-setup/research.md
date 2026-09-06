# Research: Automatic NVIDIA GPU Detection, CUDA PyTorch Setup & Runtime Warnings

**Feature**: 039-gpu-cuda-setup | **Date**: 2026-09-06

## Research Task 1: Cross-Platform NVIDIA GPU Detection in Setup Scripts

### Decision
Use `nvidia-smi` to test for available NVIDIA drivers and active GPUs in both PowerShell (`setup.ps1`) and Bash (`setup.sh`).

### Rationale
- `nvidia-smi` is installed automatically with NVIDIA display drivers on both Windows (`C:\Windows\System32\nvidia-smi.exe` or on PATH) and Linux (`/usr/bin/nvidia-smi`).
- Checking `Get-Command nvidia-smi` in PowerShell and verifying exit code 0 when executing `nvidia-smi` guarantees that:
  1. NVIDIA hardware exists.
  2. The kernel/display driver is properly loaded and communicating with the GPU.
- On Linux, `command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1` achieves the exact same guarantee.
- If `nvidia-smi` is missing or fails (e.g. Intel/AMD GPU, CPU-only VM, or headless environment without GPU), the script cleanly catches the exception or checks exit code and falls back to CPU PyTorch without exiting with an error.

### Alternatives Considered
- `Get-CimInstance Win32_VideoController`: Windows-only, only queries WMI/PnP, does not verify whether NVIDIA drivers or CUDA runtime are working properly.
- `torch.cuda.is_available()` inside setup: Before installing CUDA PyTorch, torch in `requirements.txt` is CPU-only, so `torch.cuda.is_available()` would always return `False`.

---

## Research Task 2: CUDA PyTorch Package & Index URL

### Decision
Install `torch==2.1.1+cu118` and `torchaudio==2.1.1+cu118` with `--index-url https://download.pytorch.org/whl/cu118`.

### Rationale
- `rvc-python` and `fairseq` (as configured and patched in VoxRead) are pinned and tested specifically against PyTorch 2.1.1 and CUDA 11.8 (`cu118`).
- PyTorch 2.1.1+cu118 runs seamlessly on CUDA compute capabilities from Pascal (GTX 10-series) through Turing (RTX 20-series), Ampere (RTX 30-series), and Ada Lovelace (RTX 40-series).
- Passing `--index-url https://download.pytorch.org/whl/cu118` directly to pip replaces the CPU wheels with the CUDA-enabled binary wheels.

---

## Research Task 3: Runtime Warning Function Architecture in `server.py`

### Decision
Extract the CPU warning logic into a dedicated helper function `print_device_warning(device: str) -> None` in `server.py` and invoke it directly after `DEVICE = detect_device()`.

### Rationale
- Allows unit testing with `capsys` in `tests/test_server.py` to assert that:
  1. For `device == "cpu:0"`, both `[VoxRead][Canh bao]` and `[VoxRead][Goi y]` messages are printed.
  2. For `device == "cuda:0"`, no warnings are emitted.
- Keeps `server.py` top-level initialization clean and maintainable.
- Ensures all warnings appear in `server.log` because Electron redirects stdout/stderr synchronously to `server.log`.

---

## Research Task 4: Documentation Clarity in README

### Decision
Place a GitHub alert `> [!IMPORTANT]` block directly following the step 1 command blocks in `README.md`.

### Rationale
- When developers clone the repo and run `setup.ps1`, this is the first instructions section they read.
- Even with automatic detection, explaining why GPU is desirable (1–3s vs 15–25s) and providing manual commands gives transparency and autonomy to users encountering edge cases or specialized environments.
