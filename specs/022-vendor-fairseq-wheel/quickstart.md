# Quickstart & Verification Guide: Zero-Compiler Windows Setup

**Feature**: [spec.md](./spec.md) | **Directory**: `specs/022-vendor-fairseq-wheel`

---

## Prerequisites

- Operating System: Windows 10/11 64-bit (`win_amd64`)
- Node.js >= 18.x
- Python 3.10.x 64-bit (matching the vendored wheel `cp310-cp310-win_amd64.whl`)
- Git

---

## Scenario 1: Clean Zero-Compiler Windows Setup (MVP)

This scenario proves that VoxRead installs cleanly from a fresh virtual environment without requiring Visual C++ Build Tools.

### Steps:

1. **Clean prior virtual environment**:
   ```powershell
   Remove-Item -Recurse -Force python-backend\venv -ErrorAction SilentlyContinue
   ```

2. **Execute setup script**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
   ```

3. **Verify Setup Log Output**:
   - Confirm log displays:
     ```text
     Tim thay pre-built wheel cho fairseq (Python 3.10): fairseq-0.12.2-cp310-cp310-win_amd64.whl
     Dang cai dat pre-built wheel...
     ```
   - Confirm log DOES NOT show `running build_ext` or `Microsoft Visual C++ 14.0 is required`.
   - Confirm final message:
     ```text
     THIET LAP HOAN TAT THANH CONG! HE THONG DA SAN SANG SU DUNG.
     ```

4. **Verify Voice Inference Backend Functionality**:
   ```powershell
   python-backend\venv\Scripts\python.exe -c "import fairseq; import rvc_python.infer; print('RVC & Fairseq OK')"
   ```
   **Expected Output**: `RVC & Fairseq OK` (Exit code 0).

5. **Verify Server Starts**:
   ```powershell
   python-backend\venv\Scripts\python.exe python-backend\server.py
   ```
   **Expected Output**: Flask server listening on port 5001.

---

## Scenario 2: Python Version Mismatch Diagnostic Fallback

This scenario tests the diagnostic warning behavior when an incompatible Python version is encountered.

### Steps:

1. Run the check command simulating or using an alternate Python version (e.g. Python 3.11/3.12 without a matching wheel).
2. **Expected Output**:
   - Script outputs:
     ```text
     [CANH BAO] Khong tim thay pre-built wheel fairseq cho Python 3.x win_amd64.
     Neu gap loi build C++ ('Microsoft Visual C++ 14.0 is required'), ban can cai dat Visual C++ Build Tools tai:
     https://visualstudio.microsoft.com/visual-cpp-build-tools/
     Hoac xem huong dan build wheel tai: python-backend/wheels/README.md
     ```

---

## Scenario 3: Git Repository Cleanliness & Hygiene Check

This scenario confirms that temporary build artifacts or virtual environments are never committed to version control.

### Steps:

1. Inspect git status:
   ```bash
   git status
   ```
2. **Expected Output**:
   - Only `python-backend/wheels/fairseq-0.12.2-cp310-cp310-win_amd64.whl`, modified scripts, and documentation files are listed.
   - Zero temporary directories (`build/`, `*.egg-info`, `dist/`, or `venv/`) appear in untracked files.
