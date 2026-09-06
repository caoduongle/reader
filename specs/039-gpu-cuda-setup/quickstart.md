# Quickstart: Automatic NVIDIA GPU Detection, CUDA PyTorch Setup & Runtime Warnings

**Feature**: 039-gpu-cuda-setup | **Date**: 2026-09-06

This guide provides runnable scenarios to validate each of the three layers of the feature.

---

## Validation Scenario 1: Layer 1 – README Documentation Verification

1. Open `README.md`.
2. Find the section immediately below:
   ```markdown
   - **macOS / Linux (Bash)**:
     ```bash
     chmod +x scripts/setup.sh
     ./scripts/setup.sh
     ```
   ```
3. Verify that the `> [!IMPORTANT]` block exists, containing:
   - Warning about CPU vs GPU inference latency (15–25s vs 1–3s).
   - The pip commands to install CUDA PyTorch.
   - Link to `docs/rvc-voice-setup.md#b2-cài-pytorch-đúng-bản-cho-máy-bạn`.

---

## Validation Scenario 2: Layer 2 – Runtime Warning in Server

1. Run unit test in `python-backend`:
   ```powershell
   cd python-backend
   & .\venv\Scripts\pytest.exe tests/test_server.py -k "test_print_device_warning" -v
   ```
   **Expected**: Test passes, confirming that `print_device_warning("cpu:0")` outputs `[VoxRead][Canh bao]` and `[VoxRead][Goi y]`, while `print_device_warning("cuda:0")` outputs nothing.
2. Direct invocation test:
   ```powershell
   python-backend\venv\Scripts\python.exe -c "import os; os.environ['VOXREAD_DEVICE'] = 'cpu:0'; import server"
   ```
   **Expected**: Output displays:
   ```text
   [VoxRead] Dang dung thiet bi: cpu:0
   [VoxRead][Canh bao] Dang chay tren CPU! Toc do suy luan RVC se cham hon nhieu so voi GPU NVIDIA (15-25s/cau vs 1-3s/cau).
   [VoxRead][Goi y] Neu may co GPU NVIDIA, cai ban PyTorch CUDA bang lenh:
          pip uninstall torch torchaudio -y
          pip install torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118
   ```

---

## Validation Scenario 3: Layer 3 – Setup Script GPU Detection

1. Run `scripts/setup.ps1` on an NVIDIA GPU machine:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
   ```
   **Expected**:
   - Console logs `Dang kiem tra phan cung GPU NVIDIA...`.
   - On NVIDIA GPU system, logs: `Phat hien GPU NVIDIA! Dang tu dong cai dat PyTorch ho tro CUDA (cu118)...` followed by `[OK] Phat hien GPU NVIDIA! Da tu dong cai dat PyTorch CUDA (cu118).`.
   - Running verification check:
     ```powershell
     python-backend\venv\Scripts\python.exe -c "import torch; print(torch.cuda.is_available())"
     ```
     Returns `True`.
