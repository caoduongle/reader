# Feature Specification: Automated One-Click Setup Scripts & Model Placeholder Cleanup

**Feature Branch**: `005-setup-scripts-cleanup`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "Nhiệm vụ: 1. Kiểm tra xem có script, CI, hay tài liệu nào đang tham chiếu cụ thể tới bun hay npm không. Mặc định GIỮ NPM và xoá bun.lock; 2. Rà soát README/script để đảm bảo mọi chỗ hướng dẫn cài đặt đều đồng nhất theo npm; 3. Mở và đọc nội dung DAT_FILE_MODEL_VAO_DAY.txt. Nếu là ghi chú, gộp vào README hoặc docs/ rồi xoá file gốc; 4. Viết 2 script cài đặt 1 lệnh: scripts/setup.sh (macOS/Linux) và scripts/setup.ps1 (Windows, PowerShell), echo rõ từng bước, dừng với exit code khác 0 khi lỗi; 5. Cập nhật mục 'Bắt đầu nhanh' trong README để trỏ tới các script này."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Click Automated Environment Setup (Priority: P1)

As a developer or new user onboarding to VoxRead on Windows, macOS, or Linux, I want to run a single automated setup script (`scripts/setup.ps1` on Windows or `scripts/setup.sh` on macOS/Linux), so that all JavaScript/Node.js dependencies and the Python virtual environment with backend requirements are installed automatically without manual multi-step command execution.

**Why this priority**: Manually installing npm dependencies, creating a Python virtual environment, locating the correct Python 3.10 interpreter, and running `pip install -r requirements.txt` across different directories is error-prone. Providing robust 1-click scripts with clear progress logs and strict error handling reduces onboarding friction to near zero.

**Independent Test**: Can be tested independently by running the setup script on a machine with Node.js and Python installed:
- On Windows: Run `powershell -ExecutionPolicy Bypass -File scripts/setup.ps1`.
- On macOS/Linux: Run `bash scripts/setup.sh`.
- Verify that both scripts print clear step-by-step banner logs, install `npm` dependencies, set up `python-backend/venv`, install `python-backend/requirements.txt`, and exit with return code `0`. Simulate a failure (e.g. invalid requirement) to confirm that the script halts immediately with a non-zero exit code.

**Acceptance Scenarios**:

1. **Given** a developer on Windows running `scripts/setup.ps1`, **When** the script executes, **Then** it validates the presence of Node.js, npm, and Python 3.10+, installs root npm packages, creates a virtual environment at `python-backend/venv`, installs packages from `python-backend/requirements.txt`, outputs progress at each phase, and exits with code 0.
2. **Given** a developer on macOS or Linux running `scripts/setup.sh`, **When** the script executes, **Then** it executes the equivalent Node.js and Python setup steps, logs each step, and exits with code 0.
3. **Given** any command fails during script execution (e.g., missing network connectivity, npm failure, or pip build failure), **When** an error occurs, **Then** the script aborts immediately with a non-zero exit code without swallowing the error or proceeding silently.

---

### User Story 2 - Removal of Placeholder Note (`DAT_FILE_MODEL_VAO_DAY.txt`) (Priority: P1)

As a maintainer keeping the repository clean and professional, I want obsolete root placeholder text files like `DAT_FILE_MODEL_VAO_DAY.txt` removed from the root directory, with its model instructions confirmed in `docs/rvc-voice-setup.md` and `README.md`, so that no stray placeholder files clutter the root tree.

**Why this priority**: The file `DAT_FILE_MODEL_VAO_DAY.txt` explicitly states in line 8: *"Xoa file .txt nay di cung duoc, no chi la placeholder de thu muc model/ khong bi rong"*. Its instructions are already completely integrated into `docs/rvc-voice-setup.md` and `README.md`. Keeping it creates unnecessary root clutter.

**Independent Test**: Can be tested by checking the file tree: verify that `DAT_FILE_MODEL_VAO_DAY.txt` is removed from git tracking and filesystem, while `docs/rvc-voice-setup.md` and `README.md` contain clear instructions directing users to place `.pth` and `.index` files in `python-backend/model/`.

**Acceptance Scenarios**:

1. **Given** the repository root directory, **When** listing files, **Then** `DAT_FILE_MODEL_VAO_DAY.txt` is absent.
2. **Given** a user setting up their custom voice model, **When** consulting `docs/rvc-voice-setup.md` or `README.md`, **Then** exact instructions explain where to place `.pth` and `.index` weights (`python-backend/model/`).

---

### User Story 3 - Streamlined Quickstart Documentation (Priority: P2)

As a user reading the root `README.md`, I want the "Bắt đầu nhanh" section to feature the one-click setup scripts as the primary installation method, so that I can set up the entire environment in a single command.

**Why this priority**: Presenting the 1-click scripts in `README.md` significantly simplifies onboarding for both technical and non-technical readers while maintaining consistency around `npm` as the sole package manager.

**Independent Test**: Can be tested by reading the Quickstart section in `README.md`: verify that it guides users directly to `.\scripts\setup.ps1` for Windows and `./scripts/setup.sh` for macOS/Linux, followed by `npm run dev` or `npm run electron:dev`.

**Acceptance Scenarios**:

1. **Given** a user reviewing the Quickstart section of `README.md`, **When** reading the setup instructions, **Then** they are presented with the one-click setup script command for their operating system.
2. **Given** all documentation and script references, **When** package manager commands appear, **Then** only `npm` is referenced with zero conflicting references to other tools.

---

### Edge Cases

- **Execution Policy on Windows PowerShell**: Users running PowerShell scripts may encounter the `Restricted` execution policy. The documentation and script header must clearly note `powershell -ExecutionPolicy Bypass -File scripts/setup.ps1`.
- **Python Version Detection**: If Python 3.10 is not aliased as `python3.10` on Windows, the PowerShell script should check `py -3.10`, `python`, and `python3`, verifying the version is compatible ($\ge 3.10$).
- **Idempotency**: Running `setup.ps1` or `setup.sh` multiple times on an already-configured environment must succeed without re-creating a broken virtual environment or failing.
- **Strict Error Trapping**:
  - In PowerShell: `$ErrorActionPreference = 'Stop'` and checking `$LASTEXITCODE` after external executables (`npm`, `pip`).
  - In Bash: `set -euo pipefail`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enforce `npm` as the sole canonical package manager across all repository scripts and documentation, confirming that `package-lock.json` is the only tracked lockfile.
- **FR-002**: System MUST remove `DAT_FILE_MODEL_VAO_DAY.txt` from the repository root, verifying its guidance is fully incorporated into `docs/rvc-voice-setup.md`.
- **FR-003**: System MUST create `scripts/setup.ps1` for Windows PowerShell, automating:
  - Node.js and npm prerequisite verification.
  - Python 3.10+ verification.
  - `npm install` execution in the root directory.
  - Creation of virtual environment in `python-backend/venv`.
  - Installation of dependencies from `python-backend/requirements.txt`.
- **FR-004**: System MUST create `scripts/setup.sh` for macOS/Linux Bash, automating the equivalent setup steps with POSIX compatibility.
- **FR-005**: Both setup scripts MUST output descriptive progress headers for each step and terminate immediately with a non-zero exit code upon any step failure.
- **FR-006**: System MUST update the "Bắt đầu nhanh" section in `README.md` to feature the one-click setup scripts.
- **FR-007**: System MUST NOT alter dependency versions in `package.json` or `python-backend/requirements.txt`.

---

### Non-Functional & Scope Constraints

- **NFR-001 (Portability & Robustness)**: Setup scripts MUST run out-of-the-box on standard Windows PowerShell 5.1/7+ and Unix Bash.
- **NFR-002 (Fail-Fast Behavior)**: Errors during setup MUST never be swallowed; failures must stop script execution immediately.
- **NFR-003 (Scope Boundary)**: No application logic in `src/`, `electron/`, or `python-backend/server.py` shall be altered.

---

### Key Entities

- **SetupScriptSuite**: Pair of platform-specific automation scripts (`scripts/setup.ps1`, `scripts/setup.sh`) managing system prerequisite validation and dependency installation.
- **EnvironmentPrerequisites**: Required host runtime dependencies (`Node.js >= 18`, `npm >= 9`, `Python >= 3.10`).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Exactly one lockfile (`package-lock.json`) is tracked by git in the repository.
- **SC-002**: Running `scripts/setup.ps1` on Windows completes all steps with exit code 0.
- **SC-003**: `DAT_FILE_MODEL_VAO_DAY.txt` is removed with zero residual broken links or references.
- **SC-004**: Root `README.md` Quickstart section references the one-click setup scripts.
- **SC-005**: Zero changes to application logic in `src/`, `electron/`, or `python-backend/`.

---

## Assumptions

- Target development machines have Node.js $\ge 18$ and Python $\ge 3.10$ installed and available in PATH.
- On Windows, users can run PowerShell scripts using `-ExecutionPolicy Bypass`.
- `python-backend/requirements.txt` contains all necessary Python dependencies.
