# Quickstart: TTS CORS Preflight Verification Guide

**Feature**: `019-fix-tts-cors-preflight`  
**Date**: 2026-09-04  

---

## 1. Prerequisites

Ensure Python virtual environment is active or use the dedicated python executable:
```powershell
.\python-backend\venv\Scripts\python.exe --version
.\python-backend\venv\Scripts\pytest.exe --version
```

---

## 2. Automated Test Verification

### Scenario 1: Targeted CORS Preflight Test
Run the specific test verifying `OPTIONS /speak` preflight behavior:
```powershell
.\python-backend\venv\Scripts\pytest.exe python-backend/tests/test_server.py -k test_speak_options_preflight_returns_cors_headers -v
```
**Expected Outcome**:
```text
python-backend/tests/test_server.py::test_speak_options_preflight_returns_cors_headers PASSED [100%]
```

---

### Scenario 2: Full Backend Test Suite
Run the complete test suite across all endpoints:
```powershell
.\python-backend\venv\Scripts\pytest.exe python-backend/tests -v
```
**Expected Outcome**:
```text
python-backend/tests/test_server.py::test_health_endpoint_returns_ok PASSED [ 20%]
python-backend/tests/test_server.py::test_speak_endpoint_rejects_missing_text PASSED [ 40%]
python-backend/tests/test_server.py::test_speak_endpoint_rejects_whitespace_text PASSED [ 60%]
python-backend/tests/test_server.py::test_speak_options_preflight_returns_cors_headers PASSED [ 80%]
python-backend/tests/test_server.py::test_speak_valid_request_returns_audio_wav PASSED [100%]

============================== 5 passed in ... ==============================
```

---

## 3. Scope Isolation Verification

Verify that only `python-backend/server.py` was altered in application code:
```powershell
git diff python-backend/
```
Confirm no unexpected edits occurred in `python-backend/tests/`, `server/`, or `src/`.
