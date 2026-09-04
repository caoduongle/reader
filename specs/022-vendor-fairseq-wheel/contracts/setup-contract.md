# Interface Contract: Windows Setup & Vendored Wheel Detection

**Feature**: [spec.md](../spec.md) | **Directory**: `specs/022-vendor-fairseq-wheel/contracts`

---

## 1. PowerShell Setup Script Contract (`scripts/setup.ps1`)

### Invocation
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

### Preconditions
- Windows x64 host operating system.
- Node.js >= 18.0.0 installed and accessible on `$PATH`.
- Python >= 3.10 installed and accessible on `$PATH` (Python 3.10 recommended for wheel compatibility).

### Sequential Execution Flow
1. **Node & npm check**: Verifies node/npm versions; runs `npm install`.
2. **Python runtime check**: Identifies Python binary and extracts `$major` and `$minor` version components.
3. **Virtualenv initialization**: Creates `python-backend/venv` if not already present.
4. **Vendored wheel detection & installation**:
   - Computes expected pattern: `Join-Path $BackendDir "wheels\fairseq-*-cp$minor-*-win_amd64.whl"`.
   - Resolves matching file using `Get-ChildItem`.
   - **Case A (Matching wheel found)**:
     - Output: `Write-Success "Phat hien pre-built wheel cho fairseq (Python 3.$minor): <wheel_filename>"`
     - Executes: `& $VenvPip install $matchingWheel.FullName`
     - Status: Continues directly to general requirements without compilation.
   - **Case B (No matching wheel found)**:
     - Output: `Write-Host "[CANH BAO] Khong tim thay pre-built wheel fairseq cho Python 3.$minor win_amd64..." -ForegroundColor Yellow`
     - Output: `Write-Host "Neu gap loi build C++ ('Microsoft Visual C++ 14.0 is required'), ban can cai dat Visual C++ Build Tools tai: https://visualstudio.microsoft.com/visual-cpp-build-tools/ hoac xem huong dan build wheel tai python-backend/wheels/README.md"`
     - Continues to general requirements (pip will attempt source build).
5. **General requirements installation**:
   - Executes: `& $VenvPip install -r $RequirementsFile`
   - Verifies `$LASTEXITCODE -eq 0`.

### Exit Codes
- `0`: Setup completed successfully, virtual environment ready.
- `1`: Prerequisite check failed or pip installation failed.

---

## 2. Vendored Wheel Packaging Contract (`python-backend/wheels/`)

### File Naming Convention
```text
fairseq-{version}-cp{py_minor}-cp{py_minor}-win_amd64.whl
```
*Example for Python 3.10*:
```text
fairseq-0.12.2-cp310-cp310-win_amd64.whl
```

### Contents Contract
The wheel zip archive must contain:
- `fairseq/` package folder.
- Pre-compiled C++ extension binary: `fairseq/libbleu*.pyd`.
- `fairseq-0.12.2.dist-info/` containing metadata and entry points.

---

## 3. Server Startup Readiness Contract (`python-backend/server.py`)

### Invocation
```bash
python-backend\venv\Scripts\python.exe python-backend\server.py
```

### Health & Readiness Check
```python
import fairseq
import rvc_python.infer
```
- Must execute with return code 0.
- No `ModuleNotFoundError` or `DLL load failed` exceptions.
