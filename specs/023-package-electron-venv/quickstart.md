# Quickstart & Verification Guide: Bundled Python Runtime & CI Workflow

**Feature**: `023-package-electron-venv`  
**Date**: 2026-09-05  
**Status**: Active  

---

## Overview

This guide provides testable, executable verification procedures to validate that the Windows desktop application packaging configuration, GitHub Actions workflow, and Quickstart documentation meet all requirements defined in [spec.md](./spec.md).

---

## 1. Prerequisites

- Git repository cloned and on branch `023-package-electron-venv` (or `main`)
- Node.js >= 18 installed
- Python 3.10 x64 installed locally (or running on CI runner)
- PowerShell 5.1+ or Windows CMD

---

## 2. Validation Scenarios

### Scenario 1: Validate `package.json` Resource Inclusion
Verify that `package.json` includes `python-backend/venv` in `build.extraResources`.

```powershell
# PowerShell validation command
node -e "
const pkg = require('./package.json');
const resources = pkg.build && pkg.build.extraResources;
const hasVenv = resources && resources.some(r => r.from === 'python-backend/venv' && r.to === 'python-backend/venv');
if (hasVenv) {
  console.log('PASS: python-backend/venv is configured in extraResources');
  process.exit(0);
} else {
  console.error('FAIL: python-backend/venv is missing in extraResources');
  process.exit(1);
}
"
```
**Expected Outcome**: Exits with code 0 and logs `PASS: python-backend/venv is configured in extraResources`.

---

### Scenario 2: Validate GitHub Actions Workflow Configuration
Verify that `.github/workflows/build-electron.yml` declares the necessary Python setup, virtual environment, and dependency steps using `shell: cmd`.

```powershell
# PowerShell validation command
$content = Get-Content -Raw .github/workflows/build-electron.yml
$checks = @(
  "actions/setup-python@v5",
  "python-version: '3.10'",
  "python -m venv python-backend/venv",
  "fairseq-0.12.2-cp310-cp310-win_amd64.whl",
  "https://download.pytorch.org/whl/cpu",
  "shell: cmd"
)

$failed = $false
foreach ($check in $checks) {
  if ($content -notmatch [regex]::Escape($check)) {
    Write-Error "Missing required token in workflow: $check"
    $failed = $true
  }
}
if (-not $failed) {
  Write-Host "PASS: Workflow contains all required steps and shell specifications"
}
```
**Expected Outcome**: Exits with code 0 and logs `PASS: Workflow contains all required steps and shell specifications`.

---

### Scenario 3: Validate Standalone Venv Script (`scripts/bundle-venv.py`)
Verify that `scripts/bundle-venv.py` correctly populates DLLs and standard library modules and removes `pyvenv.cfg`.

```cmd
:: CMD execution command
python scripts\bundle-venv.py
```
**Expected Outcome**:
Logs `Python venv has been converted to a fully self-contained standalone distribution.`
Verifies that:
- `python-backend/venv/Scripts/pythonw.exe` exists
- `python-backend/venv/Scripts/python310.dll` exists
- `python-backend/venv/pyvenv.cfg` does NOT exist

---

### Scenario 4: Validate Background Server Launch from Venv
Verify that `python.exe` inside `python-backend/venv/Scripts/` can launch `server.py` and respond to `/health`.

```cmd
:: Start server in background
start /b python-backend\venv\Scripts\python.exe python-backend\server.py

:: Probe health check
curl -s http://127.0.0.1:8008/health
```
**Expected Outcome**:
Returns HTTP 200 with JSON:
`{"service":"VoxRead RVC & TTS Server","status":"ok"}`

---

### Scenario 5: Validate README Dual-Track Quickstart
Verify that `README.md` includes both user and developer tracks and notes the file size.

```powershell
$readme = Get-Content -Raw README.md
$hasTrack1 = $readme -match "Cách 1: Cài đặt đơn giản nhất"
$hasTrack2 = $readme -match "Cách 2: Dành cho nhà phát triển"
$hasSizeNotice = $readme -match "500MB" -or $readme -match "1.5GB"

if ($hasTrack1 -and $hasTrack2 -and $hasSizeNotice) {
  Write-Host "PASS: README is properly structured with dual-track quickstart and size notice"
} else {
  Write-Error "FAIL: README structure check failed"
}
```
**Expected Outcome**: Exits with code 0 and logs `PASS: README is properly structured with dual-track quickstart and size notice`.
