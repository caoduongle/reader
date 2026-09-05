# Quickstart & Verification Guide: PyTorch >= 2.6 weights_only Compatibility

**Feature Branch**: `032-pytorch-weights-only-compat`  
**Date**: 2026-09-05  

---

## Prerequisites

1. Python 3.10+ virtual environment in `python-backend/venv` with `pytest` installed.
2. Dependencies from `python-backend/requirements.txt` installed.

---

## Automated Verification

### 1. Run Python Backend Unit Tests
Execute the pytest suite to verify monkeypatch installation, parameter defaulting, and preservation of explicit flags:
```powershell
.\python-backend\venv\Scripts\python.exe -m pytest python-backend/tests/test_server.py -v
```
Expected:
- All unit tests pass with 0 failures.
- Tests verifying that `torch.load` defaults to `weights_only=False` pass.
- Tests verifying that explicit `weights_only=True` is preserved pass.

---

## Manual Verification

### 1. Start Local Voice Server
From the repository root or `python-backend` directory:
```powershell
cd python-backend
.\venv\Scripts\python.exe server.py
```
Check console logs:
- Server initializes model upon startup.
- `hubert_base.pt` loads without `_pickle.UnpicklingError: Weights only load failed`.

### 2. Verify Speech Synthesis / Voice Preview
1. Start the desktop application (`npm run dev`) or send a test request:
   ```powershell
   curl -X POST http://127.0.0.1:8008/speak -H "Content-Type: application/json" -d "{\"text\": \"Xin chao day la giong noi thu nghiem\", \"language\": \"vi\"}" --output test.wav
   ```
2. In the VoxRead UI, open Settings -> Voice Settings, select an RVC model and click **"Thử giọng"** (Voice Preview).
3. Confirm audio generates without unpickling errors.
