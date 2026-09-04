@echo off
REM ==============================================================================
REM Git Secret Purge Utility for VoxRead (AppSec Hardening FR-002)
REM Uses git-filter-repo (Python-based official Git tool) to eliminate committed
REM secrets, environment files, and credentials from repository commit history.
REM ==============================================================================

echo [VoxRead AppSec] Starting Git Secret Purge verification...

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git executable not found in PATH.
    exit /b 1
)

python -c "import git_filter_repo" >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] git-filter-repo not found. Installing via pip...
    pip install git-filter-repo
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install git-filter-repo. Please install manually: pip install git-filter-repo
        exit /b 1
    )
)

echo [WARNING] git-filter-repo will rewrite Git history!
echo Ensure all uncommitted changes are stashed or committed, and a backup clone exists.
echo.

set /p CONFIRM="Are you sure you want to purge .env and secret files from Git history? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Operation cancelled by user.
    exit /b 0
)

echo [INFO] Running git-filter-repo to purge .env, .env.*, *.pem, *.key...
git filter-repo --invert-paths --path .env --path-glob *.env.* --path-glob *.pem --path-glob *.key --path-glob *.cert --path credentials.json --force

if %errorlevel% equ 0 (
    echo [SUCCESS] Git secrets successfully purged from repository commit history!
    echo To push the rewritten history to your remote:
    echo    git push origin --force --all
    echo    git push origin --force --tags
) else (
    echo [ERROR] git-filter-repo encountered an error during history rewrite.
    exit /b %errorlevel%
)
