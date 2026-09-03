# Quickstart & Verification Guide: Vitest & Pytest

**Feature Branch**: `008-testing-vitest-pytest`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Running Frontend Tests (Vitest)

```bash
# Run all frontend tests once
npm test

# Run frontend tests in watch mode
npm run test:watch
```

**Expected output**:
```text
✓ tests/unit/textParser.test.ts (5 tests)
✓ tests/unit/serverProxy.test.ts (3 tests)
✓ tests/components/ErrorBoundary.test.tsx (2 tests)

Test Files  3 passed (3)
     Tests  10 passed (10)
```

---

## 2. Running Backend Tests (Pytest)

### Windows (PowerShell)
```powershell
# Using the existing virtual environment
python-backend\venv\Scripts\python.exe -m pytest python-backend\tests
```

### macOS / Linux (Bash)
```bash
python-backend/venv/bin/pytest python-backend/tests
```

**Expected output**:
```text
======================= test session starts =======================
collected 5 items

python-backend/tests/test_server.py .....                     [100%]

======================== 5 passed in 0.42s ========================
```
