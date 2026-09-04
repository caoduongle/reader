# Feature Specification: Zero-Compiler Windows Setup via Vendored Fairseq Wheel

**Feature Branch**: `022-vendor-fairseq-wheel`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Loại bỏ vĩnh viễn yêu cầu 'phải có Visual C++ Build Tools' cho bất kỳ ai cài lại repo này trên Windows, bằng cách build sẵn 1 lần file wheel (.whl) của fairseq, vendor (đóng gói kèm) trong repo, và sửa script cài đặt để ưu tiên dùng wheel có sẵn thay vì để pip tự build từ source."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zero-Compiler Setup on Windows 64-bit (Priority: P1) 🎯 MVP

As a developer or user installing VoxRead on a Windows 64-bit machine, I want the automated setup process to install all Python dependencies—specifically fairseq and its C++ extensions—from a pre-compiled binary package without requiring Microsoft Visual C++ Build Tools, so that I can set up and run the application quickly without large compiler installations or build errors.

**Why this priority**: Building fairseq on Windows requires Visual C++ 14.0+ Build Tools to compile native C++ extensions (`libbleu`). This poses a major barrier to developers, Electron packagers, and general users without C++ development tools. Vendoring a pre-compiled wheel eliminates this friction completely.

**Independent Test**:
1. In an environment without Visual C++ Build Tools (or a clean Windows sandbox).
2. Remove any pre-existing virtual environment (`python-backend/venv`).
3. Run `powershell -ExecutionPolicy Bypass -File scripts/setup.ps1`.
4. Verify that installation completes successfully without invoking any C++ compiler or raising missing toolchain errors.
5. Verify that `python-backend/server.py` starts and `rvc_python.infer` imports cleanly.

**Acceptance Scenarios**:
1. **Given** a clean Windows 64-bit environment with Python 3.10 and no C++ build tools, **When** the user executes `setup.ps1`, **Then** the script detects the compatible pre-built fairseq wheel in `python-backend/wheels/` and installs it into the virtual environment before installing general requirements.
2. **Given** the installation of dependencies from `requirements.txt`, **When** the package manager resolves packages, **Then** it does NOT attempt to fetch fairseq from PyPI or trigger a native build from source.
3. **Given** a newly initialized virtual environment, **When** the backend server is launched via `python server.py`, **Then** the service starts successfully and the inference module (`rvc_python.infer`) is fully operational.

---

### User Story 2 - Python Version Guard & Rebuild Guidance (Priority: P2)

As a developer running an unsupported Python minor version or architecture on Windows (e.g., Python 3.11, 3.12, or 32-bit), I want the setup script to provide immediate, actionable diagnostic messages and instructions on how to rebuild or supply a compatible wheel, so that I understand why the pre-compiled binary cannot be used and how to proceed.

**Why this priority**: CPython binary extension wheels are strictly ABI-bound to specific Python minor versions (e.g. `cp310-cp310-win_amd64`). When an incompatible runtime is used, pip cannot use the cp310 wheel, and the setup script must clearly explain the situation and guide the user rather than failing cryptically.

**Independent Test**:
1. Execute the setup script using an alternate Python version where no matching wheel exists in `python-backend/wheels/`.
2. Verify that the setup script outputs a prominent warning regarding the version mismatch.
3. Verify that the script points to `python-backend/wheels/README.md` and provides instructions for installing Visual C++ Build Tools if building from source is required.

**Acceptance Scenarios**:
1. **Given** a Windows environment with an active Python version lacking a matching wheel in `python-backend/wheels/`, **When** `setup.ps1` runs, **Then** it displays an explicit warning indicating that no pre-compiled binary is present for that Python minor version.
2. **Given** a wheel version mismatch, **When** the warning is shown, **Then** it provides clear guidance on installing Visual C++ Build Tools and references the wheel rebuild instructions in `wheels/README.md`.

---

### User Story 3 - Preserved POSIX / Non-Windows Environment Parity (Priority: P3)

As a Linux or macOS developer, I want the POSIX setup script (`scripts/setup.sh`) to maintain standard package installation flows without applying Windows binary wheel logic, so that cross-platform support remains clean and uncompromised.

**Why this priority**: Linux and macOS have their own toolchains and binary packaging mechanisms. Attempting to install Windows wheels on POSIX systems would fail, so `scripts/setup.sh` must remain dedicated to standard POSIX workflows.

**Independent Test**:
1. Execute `scripts/setup.sh` on Linux or macOS.
2. Verify that dependency resolution runs standard pip installation without searching for or attempting to install `win_amd64` wheels.
3. Verify that backend dependencies install cleanly and server functionality is intact.

**Acceptance Scenarios**:
1. **Given** a Linux or macOS system, **When** `scripts/setup.sh` is executed, **Then** it follows the standard pip installation path and does not execute Windows wheel lookup or installation.
2. **Given** the setup script codebase, **When** reviewed by developers, **Then** comments in `scripts/setup.sh` explain the platform distinction clearly.

---

### Edge Cases

- **What happens if a user on Windows has Python 3.11 or 3.12 installed instead of 3.10?**
  *The setup script pattern-matches `fairseq-*-cp{minor}-*-win_amd64.whl`. If no match exists, it prints a clear diagnostic explaining that Python 3.10 has a pre-built wheel, whereas other versions require Visual C++ Build Tools or a rebuilt wheel.*
- **What happens if `pip install -r requirements.txt` attempts to resolve `rvc-python` dependencies and fetch fairseq from PyPI?**
  *The pre-installation of the vendored wheel satisfies the requirement, and requirements configuration prevents pip from overriding or recompiling fairseq from source.*
- **What happens if temporary build files (`build/`, `*.egg-info`, `dist/`) or virtual environments are generated during wheel preparation?**
  *Repository hygiene rules and `.gitignore` ensure that only the final `.whl` in `python-backend/wheels/` and associated scripts/documentation are tracked by git.*

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Vendored Binary Wheel)**: The repository MUST supply a pre-built fairseq binary wheel in `python-backend/wheels/` targeting Python 3.10 on 64-bit Windows (`cp310-cp310-win_amd64`).
- **FR-002 (Automated Wheel Detection in Setup)**: The Windows setup script (`scripts/setup.ps1`) MUST automatically detect matching vendored wheels in `python-backend/wheels/` based on the active Python minor version and architecture.
- **FR-003 (Pre-Installation of Vendored Wheel)**: When a matching wheel is found, `scripts/setup.ps1` MUST install the wheel into the virtual environment prior to processing `requirements.txt`.
- **FR-004 (PyPI Re-compilation Prevention)**: Configuration in `python-backend/requirements.txt` and the setup workflow MUST ensure that running dependency installation does not cause pip to fetch and compile fairseq from PyPI.
- **FR-005 (Diagnostic Fallback Warning)**: If no matching wheel is found for the active Python version on Windows, `scripts/setup.ps1` MUST warn the user clearly with download links for Microsoft Visual C++ Build Tools and references to rebuild documentation.
- **FR-006 (POSIX Isolation)**: The POSIX setup script (`scripts/setup.sh`) MUST NOT execute Windows wheel logic and MUST retain standard installation mechanisms while documenting platform differences.
- **FR-007 (Wheel Rebuilding Documentation)**: The repository MUST include documentation in `python-backend/wheels/README.md` and the root `README.md` explaining why the wheel is vendored, its compatibility matrix, and step-by-step instructions for rebuilding the wheel if Python versions change.
- **FR-008 (Repository Hygiene)**: Build artifacts (including `build/`, `*.egg-info`, and virtual environments) MUST NOT be committed to git; only the target `.whl` file, script modifications, and documentation MUST be tracked.
- **FR-009 (Zero-Compiler Verification)**: A complete setup run from a fresh environment on a machine without Visual C++ Build Tools MUST succeed with zero compilation steps for fairseq.
- **FR-010 (Voice Inference Readiness)**: Following setup completion, launching `server.py` MUST successfully import `rvc_python.infer` and execute without missing dependency errors.

---

### Key Entities

- **Vendored Wheel Artifact**: A compiled Python distribution file (`.whl`) containing the fairseq package and pre-compiled native extensions for Windows x64 and Python 3.10.
- **Dependency Specification (`requirements.txt`)**: Configuration defining the application's Python dependencies, formatted to prevent unintended PyPI source builds of native extensions.
- **Setup Automation Script (`setup.ps1`)**: The PowerShell installer responsible for virtual environment initialization, wheel detection, sequential dependency installation, and diagnostic reporting.
- **Maintenance Guide (`wheels/README.md`)**: Developer-facing documentation describing wheel generation commands, tag conventions, and update workflows.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New users on Windows 64-bit with Python 3.10 can complete the entire backend setup via `setup.ps1` without installing Microsoft Visual C++ Build Tools.
- **SC-002**: Automated setup time on Windows for Python backend dependencies is reduced by at least 70% compared to source compilation (eliminating the multi-minute `running build_ext` phase).
- **SC-003**: 100% of setup runs on a clean Windows virtual environment result in a functional backend server capable of importing `rvc_python.infer`.
- **SC-004**: Zero temporary compiler artifacts, cache directories, or virtual environment files are committed to the git repository (`git status` remains clean).
- **SC-005**: 100% of developers attempting to run setup with an incompatible Python version receive an immediate diagnostic warning explaining the mismatch within the first 5 seconds of the dependency step.

---

## Assumptions

- Target development and runtime environment for Windows desktop is 64-bit architecture (`win_amd64`) running Python 3.10.x.
- Users changing Python minor versions (e.g. upgrading to Python 3.11 or 3.12) are responsible for rebuilding the wheel or installing Visual C++ Build Tools as guided by the documentation.
- Linux and macOS environments have their own native package management and toolchains, so vendored Windows wheels are not needed or utilized on those platforms.
- Git LFS is not required as a single compiled wheel for fairseq is typically around a few megabytes, well within standard Git file size thresholds.
