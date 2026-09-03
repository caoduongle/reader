# ==============================================================================
# VoxRead - Windows One-Click Setup Script (PowerShell)
# ==============================================================================
# Thiet lap moi truong toan dien cho VoxRead:
# 1. Kiem tra moi truong Node.js (>= 18), npm, va Python (>= 3.10)
# 2. Cai dat cac goi JavaScript o thu muc goc (npm install)
# 3. Tao moi truong ao Python (venv) tai python-backend/venv
# 4. Cai dat cac thu vien phu thuoc Python (pip install -r requirements.txt)
# ==============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Item -Path $PSScriptRoot).Parent.FullName
Set-Location -Path $ProjectRoot

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host ">>> $Message" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host ""
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

Write-Host "====================================================================" -ForegroundColor Magenta
Write-Host "       VOXREAD - BAT DAU THIET LAP MOI TRUONG TU DONG (WINDOWS)      " -ForegroundColor Magenta
Write-Host "====================================================================" -ForegroundColor Magenta
Write-Host "Thu muc du an: $ProjectRoot" -ForegroundColor Gray

# ------------------------------------------------------------------------------
# Buoc 1: Kiem tra Node.js & npm
# ------------------------------------------------------------------------------
Write-Step "Buoc 1/4: Kiem tra Node.js va npm..."

try {
    $nodeVersionRaw = & node -v 2>$null
    if (-not $nodeVersionRaw) {
        Write-Fail "Khong tim thay Node.js. Vui long cai dat Node.js >= 18 tu https://nodejs.org/"
    }
    $nodeVersion = $nodeVersionRaw.Trim().TrimStart('v')
    $majorNode = [int]($nodeVersion.Split('.')[0])
    if ($majorNode -lt 18) {
        Write-Fail "Yeu cau Node.js phien ban >= 18. Phien ban hien tai: $nodeVersionRaw"
    }
    Write-Success "Node.js hop le: $nodeVersionRaw"
}
catch {
    Write-Fail "Loi khi kiem tra Node.js: $_"
}

try {
    $npmVersionRaw = & npm -v 2>$null
    if (-not $npmVersionRaw) {
        Write-Fail "Khong tim thay npm. Vui long kiem tra lai cai dat Node.js."
    }
    Write-Success "npm hop le: v$npmVersionRaw"
}
catch {
    Write-Fail "Loi khi kiem tra npm: $_"
}

# ------------------------------------------------------------------------------
# Buoc 2: Kiem tra Python >= 3.10
# ------------------------------------------------------------------------------
Write-Step "Buoc 2/4: Kiem tra Python >= 3.10..."

$PythonCmd = $null
$PythonArgsPrefix = @()

$candidates = @(
    @{ Cmd = "py"; Args = @("-3.10") },
    @{ Cmd = "python3.10"; Args = @() },
    @{ Cmd = "python"; Args = @() },
    @{ Cmd = "py"; Args = @() }
)

$pyCheckCode = 'import sys; print(sys.version_info[0], sys.version_info[1], sys.version_info[2])'

foreach ($c in $candidates) {
    try {
        $testOutput = & $c.Cmd @($c.Args) -c $pyCheckCode 2>$null
        if ($LASTEXITCODE -eq 0 -and $testOutput) {
            $versionParts = $testOutput.Trim().Split(' ')
            $major = [int]$versionParts[0]
            $minor = [int]$versionParts[1]
            if ($major -eq 3 -and $minor -ge 10) {
                $PythonCmd = $c.Cmd
                $PythonArgsPrefix = $c.Args
                $argStr = $PythonArgsPrefix -join ' '
                $verStr = "$major.$minor"
                Write-Success "Tim thay Python tuong thich: $PythonCmd $argStr (Phien ban $verStr)"
                break
            }
        }
    }
    catch {
        # Thu ung vien tiep theo
    }
}

if (-not $PythonCmd) {
    Write-Fail "Khong tim thay Python >= 3.10 tren may tinh. Vui long cai dat Python 3.10 tu https://python.org/"
}

# ------------------------------------------------------------------------------
# Buoc 3: Cai dat Node.js dependencies
# ------------------------------------------------------------------------------
Write-Step "Buoc 3/4: Cai dat JavaScript dependencies qua npm..."

& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Fail "npm install that bai voi ma loi $LASTEXITCODE. Vui long kiem tra lai ket noi mang hoac package.json."
}
Write-Success "Cai dat npm dependencies thanh cong!"

# ------------------------------------------------------------------------------
# Buoc 4: Thiet lap Python Backend Virtualenv & Dependencies
# ------------------------------------------------------------------------------
Write-Step "Buoc 4/4: Thiet lap Python backend (virtualenv & requirements)..."

$BackendDir = Join-Path $ProjectRoot "python-backend"
$VenvDir = Join-Path $BackendDir "venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip = Join-Path $VenvDir "Scripts\pip.exe"
$RequirementsFile = Join-Path $BackendDir "requirements.txt"

if (-not (Test-Path $BackendDir)) {
    Write-Fail "Khong tim thay thu muc python-backend tai $BackendDir"
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "Dang tao moi truong ao Python tai $VenvDir..." -ForegroundColor Yellow
    & $PythonCmd @($PythonArgsPrefix) -m venv $VenvDir
    if ($LASTEXITCODE -ne 0 -or (-not (Test-Path $VenvPython))) {
        Write-Fail "Khong the tao virtualenv tai $VenvDir. Ma loi: $LASTEXITCODE"
    }
    Write-Success "Da tao virtualenv thanh cong tai $VenvDir"
}
else {
    Write-Success "Virtualenv da ton tai san tai $VenvDir"
}

if (Test-Path $RequirementsFile) {
    Write-Host "Dang kiem tra va cai dat packages tu requirements.txt..." -ForegroundColor Yellow
    & $VenvPython -m pip install "pip<24.1" --quiet
    & $VenvPip install -r $RequirementsFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[GOI Y] Neu gap loi build C++ ('Microsoft Visual C++ 14.0 is required' khi build fairseq)," -ForegroundColor Yellow
        Write-Host "ban can cai dat Visual C++ Build Tools tai: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
        Write-Host ""
        Write-Fail "Cai dat python packages that bai voi ma loi $LASTEXITCODE."
    }
    Write-Success "Cai dat thu vien Python thanh cong!"
}
else {
    Write-Host "[CANH BAO] Khong tim thay $RequirementsFile, bo qua buoc pip install." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# Hoan tat
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "THIET LAP HOAN TAT THANH CONG! HE THONG DA SAN SANG SU DUNG." -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ban co the khoi dong VoxRead bang mot trong cac lenh sau:" -ForegroundColor Cyan
Write-Host "  1. Chay ban Web (trinh duyet):" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Chay ban Desktop Windows (Electron):" -ForegroundColor White
Write-Host "     npm run electron:dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Chay server RVC backend thu cong (neu can test rieng):" -ForegroundColor White
Write-Host "     cd python-backend" -ForegroundColor Yellow
Write-Host "     venv\Scripts\activate" -ForegroundColor Yellow
Write-Host "     python server.py" -ForegroundColor Yellow
Write-Host ""
