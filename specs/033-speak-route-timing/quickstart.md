# Quickstart & Verification Guide: /speak Route Latency Timing

**Feature Branch**: `033-speak-route-timing`  
**Date**: 2026-09-05  

---

## Prerequisites

1. Python 3.10+ virtual environment at `python-backend/venv`.
2. Existing dependencies installed.

---

## Automated Verification

### Run Pytest Suite with stdout Capture
Execute the pytest suite to verify timing log generation during speech synthesis:
```powershell
.\python-backend\venv\Scripts\python.exe -m pytest python-backend/tests/test_server.py -k "timing or speak" -v
```
Expected:
- All `/speak` tests pass.
- Dedicated test verifying `[VoxRead][Timing]` log output passes.

---

## Manual Verification

### Start Voice Server and Test Synthesis
1. Start `server.py`:
   ```powershell
   cd python-backend
   .\venv\Scripts\python.exe server.py
   ```
2. In a separate terminal, trigger `/speak`:
   ```powershell
   curl -X POST http://127.0.0.1:8008/speak -H "Content-Type: application/json" -d "{\"text\": \"Thu nghiem do thoi gian\", \"language\": \"vi\"}" --output test.wav
   ```
3. Observe terminal output from `server.py`:
   Confirm presence of:
   ```text
   [VoxRead][Timing] Edge-TTS: <elapsed>s | RVC inference: <elapsed>s | Text length: 23 ky tu
   ```
