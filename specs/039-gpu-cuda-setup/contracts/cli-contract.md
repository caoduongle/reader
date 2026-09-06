# CLI Contract: Setup Scripts & Runtime Diagnostic Messages

**Feature**: 039-gpu-cuda-setup | **Date**: 2026-09-06

## 1. Setup Script GPU Detection (`scripts/setup.ps1` & `scripts/setup.sh`)

### Inputs
- Execution of `nvidia-smi` in host environment.

### Outputs
- When `nvidia-smi` exits 0 (NVIDIA GPU present and driver operational):
  - Action: Invokes `pip install torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118`
  - Stdout:
    - Step message: `Dang kiem tra phan cung GPU NVIDIA...`
    - In-progress message: `Phat hien GPU NVIDIA! Dang tu dong cai dat PyTorch ho tro CUDA (cu118)...`
    - Success message: `[OK] Phat hien GPU NVIDIA! Da tu dong cai dat PyTorch CUDA (cu118).`
  - Exit code: 0
- When `nvidia-smi` is not found or fails (CPU / non-NVIDIA):
  - Action: Retains CPU PyTorch from `requirements.txt`.
  - Stdout warning:
    ```text
    [CANH BAO] Khong phat hien GPU NVIDIA — tiep tuc dung PyTorch CPU. (Neu co GPU roi, xem huong dan tai docs/rvc-voice-setup.md)
    ```
  - Exit code: 0 (graceful continuation, no error exit)

---

## 2. Server Startup Runtime Warning (`python-backend/server.py`)

### Inputs
- Evaluated `DEVICE` string (`"cuda:0"`, `"cpu:0"`, etc.)

### Outputs
- When `DEVICE == "cpu:0"`:
  ```text
  [VoxRead][Canh bao] Dang chay tren CPU! Toc do suy luan RVC se cham hon nhieu so voi GPU NVIDIA (15-25s/cau vs 1-3s/cau).
  [VoxRead][Goi y] Neu may co GPU NVIDIA, cai ban PyTorch CUDA bang lenh:
         pip uninstall torch torchaudio -y
         pip install torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118
  ```
- When `DEVICE == "cuda:0"`:
  - No warnings printed.
