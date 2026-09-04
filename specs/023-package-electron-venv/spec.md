# Feature Specification: Self-Contained Desktop Installer with Bundled Python Runtime & CI Workflow

**Feature Branch**: `023-package-electron-venv`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Bối cảnh: repo VoxRead tại thư mục hiện tại có 2 vấn đề đóng gói khiến bản cài đặt .exe (kể cả tự build) không hoạt động: (1) package.json extraResources thiếu bundle python-backend/venv, (2) .github/workflows/build-electron.yml không setup Python nên venv không tồn tại khi build trên CI. Việc cần làm: 1. Sửa package.json: thêm { 'from': 'python-backend/venv', 'to': 'python-backend/venv' } vào mảng 'build.extraResources'. 2. Sửa .github/workflows/build-electron.yml: sau bước 'Build Web Assets (Vite)' và trước bước 'Package Desktop Installer', thêm các step: Set up Python 3.10 (actions/setup-python@v5), Tạo venv: python -m venv python-backend/venv, Cài fairseq từ python-backend/wheels/fairseq-0.12.2-cp310-cp310-win_amd64.whl bằng venv pip, Cài phần còn lại: pip install -r python-backend/requirements.txt, rồi pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu, dùng shell: cmd cho các step gọi file .exe trong venv\Scripts. 3. Sửa README.md mục Quickstart: thêm 'Cách 1: Cài đặt đơn giản nhất' tải file .exe từ Actions/Releases và ghi chú bản cài đặt nặng (500MB-1.5GB) vì bundle PyTorch; chuyển phần build nguồn thành 'Cách 2: dành cho nhà phát triển'. 4. Commit và tạo git tag mới (vd v1.0.1) để kích hoạt CI build thử và xác nhận artifact .exe mở lên không còn lỗi không kết nối được server giọng đọc."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Standalone Zero-Prerequisite Desktop App Installation (Priority: P1) 🎯 MVP

As an end user downloading VoxRead on Windows, I want to install and launch the desktop application via a single `.exe` installer without having Python, Node.js, or any development compilers installed on my computer, so that the application opens immediately and the voice reading server starts successfully without presenting a "Không kết nối được server giọng đọc" error.

**Why this priority**: Ordinary users reading books or listening to audio do not have Python 3.10, Node.js, or C++ compilers installed. If the packaged Electron binary lacks the pre-configured Python virtual environment, the background inference service fails to spawn, breaking core TTS functionality on first launch.

**Independent Test**:
1. Build or download the packaged Windows installer (`VoxRead Setup.exe`).
2. Run the installer on a clean Windows machine (or sandbox) with zero Python installations in `%PATH%`.
3. Open VoxRead.
4. Verify that the desktop app loads and connects to the background voice service without popup alerts or status banners indicating "Không kết nối được server giọng đọc".

**Acceptance Scenarios**:
1. **Given** a packaged desktop installation on Windows, **When** the application launches, **Then** Electron's main process resolves `python-backend/venv/Scripts/python.exe` (or `pythonw.exe`) directly from `process.resourcesPath/python-backend/venv` and spawns `server.py`.
2. **Given** an end-user system with no global Python runtime, **When** navigating to reading mode, **Then** the application communicates with `http://127.0.0.1:8008` successfully.
3. **Given** the packaging configuration in `package.json`, **When** `electron-builder` packages the app, **Then** the entire `python-backend/venv` directory is bundled into the distribution resources directory alongside `server.py` and `requirements.txt`.

---

### User Story 2 - Automated CI/CD Desktop Packaging Pipeline (Priority: P2)

As a release engineer and maintainer, I want the GitHub Actions workflow (`build-electron.yml`) to automatically initialize a dedicated Python 3.10 virtual environment, install pre-compiled native wheels (`fairseq`), project dependencies, and lightweight CPU PyTorch binaries before running `electron-builder`, so that every tagged release or manual workflow dispatch yields a fully functional, self-contained `.exe` installer artifact.

**Why this priority**: The previous CI pipeline only prepared Node.js and Vite web assets, leaving `python-backend/venv` non-existent on the CI runner. As a result, CI builds could never produce working desktop binaries with an embedded Python engine.

**Independent Test**:
1. Trigger `.github/workflows/build-electron.yml` via GitHub tag (e.g. `v1.0.1`) or manual workflow dispatch.
2. Verify that the pipeline sets up Python 3.10, creates `python-backend/venv`, installs the vendored `fairseq` wheel, dependencies from `requirements.txt`, and PyTorch CPU from the PyTorch index.
3. Verify that `electron:build` bundles the virtual environment without errors.
4. Verify that the generated `.exe` artifact is uploaded to the workflow run.

**Acceptance Scenarios**:
1. **Given** a `push` of a release tag (e.g., `v*.*.*`) or `workflow_dispatch`, **When** the `build-windows` job executes on `windows-latest`, **Then** it configures Python 3.10 via `actions/setup-python@v5`.
2. **Given** the Python setup step, **When** creating the virtual environment, **Then** it executes `python -m venv python-backend/venv` using `shell: cmd`.
3. **Given** the virtual environment, **When** installing fairseq, **Then** it invokes the venv's pip (`python-backend\venv\Scripts\pip.exe`) targeting the local vendored wheel (`python-backend/wheels/fairseq-0.12.2-cp310-cp310-win_amd64.whl`).
4. **Given** general dependency installation, **When** installing PyTorch and torchaudio, **Then** it fetches CPU-optimized wheels from `https://download.pytorch.org/whl/cpu` to avoid multi-gigabyte CUDA bloat while retaining broad compatibility.

---

### User Story 3 - Transparent Dual-Track Quickstart Documentation (Priority: P3)

As a prospective user or developer browsing the repository `README.md`, I want clear, dual-track quickstart instructions distinguishing between "Method 1: Simple Installation (For End Users)" and "Method 2: For Developers (Building from Source)", including upfront disclosure of the installer file size (~500MB–1.5GB), so that I know exactly how to acquire or build the app based on my technical needs.

**Why this priority**: Users who just want to use VoxRead should not be overwhelmed with Node.js and Python setup instructions. Conversely, users downloading the standalone installer must be informed about its size due to embedded PyTorch.

**Independent Test**:
1. Read the Quickstart section of `README.md`.
2. Verify that Method 1 provides clear steps for downloading and installing the pre-built `.exe` from GitHub Releases / Actions.
3. Verify that Method 2 provides clean instructions for source code development.
4. Verify that the file size footnote (~500MB–1.5GB) is prominently noted.

**Acceptance Scenarios**:
1. **Given** the root `README.md`, **When** a user reads the Quickstart section, **Then** "Cách 1: Cài đặt đơn giản nhất (Dành cho người dùng thông thường)" is listed first with links to Releases/Actions.
2. **Given** the description of Method 1, **When** reviewed, **Then** it explicitly notes that the installer bundles PyTorch, resulting in an application footprint between 500MB and 1.5GB.
3. **Given** developer setup instructions, **When** reviewed, **Then** they are clearly organized under "Cách 2: Dành cho nhà phát triển (Build từ mã nguồn)".

---

### Edge Cases

- **What happens if a user runs the packaged `.exe` on a computer without NVIDIA GPU or CUDA?**
  *PyTorch CPU binaries installed from `https://download.pytorch.org/whl/cpu` execute voice inference on CPU reliably across any standard x64 Windows machine without requiring CUDA hardware or drivers.*
- **What happens if GitHub Actions runner executes virtualenv scripts using PowerShell vs CMD?**
  *Windows CMD (`shell: cmd`) directly invokes `python-backend\venv\Scripts\pip.exe` using relative path syntax without activation script execution policy hurdles.*
- **What happens if the release workflow is triggered manually without creating a git tag?**
  *The workflow supports `workflow_dispatch`, allowing ad-hoc packaging and artifact verification before publishing a formal git tag.*

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (ExtraResources Venv Bundling)**: `package.json` MUST configure `build.extraResources` to include `{ "from": "python-backend/venv", "to": "python-backend/venv" }`, ensuring the complete virtual environment is embedded into the desktop distribution.
- **FR-002 (CI Python 3.10 Setup)**: The GitHub Actions desktop build workflow (`.github/workflows/build-electron.yml`) MUST set up Python 3.10 on the `windows-latest` runner using `actions/setup-python@v5`.
- **FR-003 (CI Virtualenv Initialization)**: The CI workflow MUST create a dedicated local virtual environment at `python-backend/venv` prior to running electron-builder.
- **FR-004 (CI Vendored Wheel Installation)**: The CI workflow MUST install `python-backend/wheels/fairseq-0.12.2-cp310-cp310-win_amd64.whl` directly using the virtualenv's pip executable (`python-backend\venv\Scripts\pip.exe`).
- **FR-005 (CI Requirements & PyTorch CPU Installation)**: The CI workflow MUST install dependencies from `python-backend/requirements.txt` and install `torch` and `torchaudio` with `--index-url https://download.pytorch.org/whl/cpu` using the virtualenv's pip.
- **FR-006 (CI Windows Shell Specification)**: Steps in `.github/workflows/build-electron.yml` that invoke virtual environment executables on Windows MUST specify `shell: cmd`.
- **FR-007 (Quickstart Dual-Track Restructuring)**: `README.md` MUST structure installation instructions into "Cách 1: Cài đặt đơn giản nhất (Dành cho người dùng)" and "Cách 2: Dành cho nhà phát triển (Chạy từ mã nguồn)".
- **FR-008 (Distribution Size Transparency)**: `README.md` MUST explicitly disclose that the packaged installer size ranges from 500MB to 1.5GB due to embedded PyTorch neural network libraries.
- **FR-009 (Release Tag Triggering)**: The repository MUST support triggering automated desktop packaging by creating and pushing semver release tags (e.g. `v1.0.1`).
- **FR-010 (Zero Connection Error Guarantee)**: The bundled desktop application MUST launch `server.py` using the embedded Python runtime so that the voice reader server starts cleanly without "Không kết nối được server giọng đọc" alerts.

---

### Key Entities

- **Bundled Virtual Environment (`python-backend/venv`)**: A complete, self-contained Python 3.10 environment containing `python.exe`, `pythonw.exe`, site-packages (`fairseq`, `rvc-python`, `torch`, `torchaudio`, `flask`, `edge-tts`), copied into the Electron resources folder.
- **Packaging Manifest (`package.json`)**: Configuration declaring electron-builder packaging rules, executable targets, and resource inclusions.
- **Desktop Build Workflow (`.github/workflows/build-electron.yml`)**: CI definition automating dependency acquisition, venv compilation, electron packaging, and artifact generation on GitHub runners.
- **Quickstart Guide (`README.md`)**: Documentation directing users to either pre-built binaries or developer source setup.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of end users downloading the `.exe` installer can launch and use VoxRead without installing Python, Node.js, or Microsoft Visual C++ Build Tools on their operating system.
- **SC-002**: The packaged Electron application starts the embedded Python voice server within 5 seconds of application launch.
- **SC-003**: The `.github/workflows/build-electron.yml` workflow completes with status SUCCESS on `windows-latest` runners when triggered by release tags or manual dispatch.
- **SC-004**: Packaged desktop installer artifacts (`VoxRead Setup.exe`) are generated and uploaded to GitHub Actions artifacts or releases for every build run.

---

## Assumptions

- The target architecture for the desktop distribution is Windows 64-bit (`x64`).
- PyTorch CPU builds (`https://download.pytorch.org/whl/cpu`) are used for the bundled installer to maintain maximum portability and keep download sizes manageable compared to multi-gigabyte CUDA wheels. Users wishing to utilize NVIDIA GPU acceleration can configure local virtual environments following developer instructions.
- GitHub Actions runner `windows-latest` provides sufficient disk space and network bandwidth to create and bundle the virtual environment.
- Git release tags follow the standard format `v*.*.*` (e.g., `v1.0.1`).
