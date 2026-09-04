# Technical Research & Architecture Decisions: Zero-Compiler Windows Setup via Vendored Fairseq Wheel

**Feature**: [spec.md](./spec.md) | **Directory**: `specs/022-vendor-fairseq-wheel`

---

## Phase 0: Technical Research & Key Decisions

### Decision 1: Target Fairseq Version & Binary Wheel Tagging

- **Decision**: Pre-compile and vendor `fairseq==0.12.2` specifically tagged as `fairseq-0.12.2-cp310-cp310-win_amd64.whl` located inside `python-backend/wheels/`.
- **Rationale**: 
  - `rvc-python==0.1.5` strictly requires `fairseq==0.12.2`.
  - PyPI does not distribute pre-compiled binary wheels for `fairseq` on Windows; it only supplies a `.tar.gz` source distribution that compiles C++ extensions (`fairseq.libbleu`) via MSVC 14.0+.
  - The VoxRead backend environment uses Python 3.10 64-bit on Windows. Compiling a wheel with wheel tags `cp310-cp310-win_amd64` ensures pip installs it instantaneously without invoking any compiler or build tools.
- **Alternatives Considered**:
  - *Dynamic runtime patching / replacing fairseq*: Would break the underlying RVC model inference pipeline inside `rvc-python`.
  - *Hosting the wheel on a remote GitHub Releases CDN*: Adds external network dependency during local installs and complicates air-gapped or offline Electron app bundling. Vendoring the wheel in-repo ensures 100% reproducibility.
  - *Universal wheel (`py3-none-any`)*: Fairseq contains native C/C++ Cython extensions (`libbleu.pyd`), making a universal wheel technically impossible.

---

### Decision 2: Sequential Wheel Pre-Installation in `setup.ps1`

- **Decision**: Update `scripts/setup.ps1` to inspect `python-backend/wheels/` for a matching `fairseq-*-cp{minor}-*-win_amd64.whl` prior to running `pip install -r requirements.txt`. If found, install it directly using `pip install <wheel-path>`.
- **Rationale**:
  - Installing the pre-compiled wheel first registers `fairseq==0.12.2` in the virtual environment's package registry.
  - When `pip install -r requirements.txt` subsequently runs and parses `rvc-python==0.1.5`, pip evaluates its dependency `fairseq==0.12.2`, detects that an exact match is already installed and satisfied, and skips fetching or building `fairseq` from PyPI.
  - Keeps the installation script clean, deterministic, and fail-fast.
- **Alternatives Considered**:
  - *Passing `--find-links python-backend/wheels` to pip install*: While functional, if pip attempts to check PyPI first or has network access, certain versions of pip may still prioritize downloading or building from source unless `--no-index` is used, which would block fetching other dependencies from PyPI. Pre-installing the local wheel avoids any ambiguity.
  - *Embedding the wheel path directly in `requirements.txt` (`./wheels/fairseq-...whl`)*: Relative paths in `requirements.txt` break cross-platform support when running `setup.sh` on Linux or macOS.

---

### Decision 3: Requirements File Configuration & Platform Neutrality

- **Decision**: Keep `requirements.txt` clean and cross-platform with explanatory comments indicating that on Windows, `fairseq` is satisfied by the pre-installed vendored wheel in `wheels/`.
- **Rationale**:
  - Preserving standard PyPI package names in `requirements.txt` allows POSIX systems (Linux / macOS) running `setup.sh` to install normally.
  - Explicit comments prevent developers or automated tools from accidentally attempting to re-add fairseq directly into `requirements.txt` in a way that conflicts with the local wheel.
- **Alternatives Considered**:
  - *Environment markers in `requirements.txt` (e.g. `fairseq @ file://...; sys_platform == 'win32'`)*: File URLs in requirements are notorious for path resolution inconsistencies across PowerShell, Git Bash, and relative working directories. Script-level detection in `setup.ps1` is significantly more robust.

---

### Decision 4: Fallback Diagnostic for Incompatible Python Versions

- **Decision**: In `scripts/setup.ps1`, detect the active Python minor version (e.g., 3.10, 3.11, 3.12). If no matching `fairseq-*-cp{minor}-*-win_amd64.whl` is present in `python-backend/wheels/`, display a prominent warning banner explaining:
  1. The pre-built wheel is tailored for Python 3.10.
  2. Installing for the current Python version requires either Microsoft Visual C++ Build Tools or rebuilding the wheel.
  3. Reference `python-backend/wheels/README.md` for instructions on how to compile a wheel for other Python versions.
- **Rationale**:
  - Prevents confusing compiler stack traces from leaving users stranded.
  - Provides clear instructions and self-service troubleshooting.
- **Alternatives Considered**:
  - *Hard-failing the setup script immediately*: Too rigid, as a developer on Python 3.11 who actually has Visual C++ Build Tools installed would be prevented from letting pip build fairseq normally. Warning and falling back to standard pip build is user-friendly.

---

### Decision 5: Cross-Platform Isolation (`scripts/setup.sh`)

- **Decision**: Leave `scripts/setup.sh` untouched regarding Windows wheel logic, adding only a brief comment clarifying that vendored Windows wheels do not apply to Linux/macOS.
- **Rationale**:
  - Linux and macOS developers typically have C toolchains available (`build-essential`, Xcode command line tools) or use different wheel tags (`linux_x86_64`, `macosx_arm64`).
  - Strict platform separation avoids unnecessary complexity and regression risks.
- **Alternatives Considered**:
  - *Vendoring Linux and macOS wheels as well*: Unnecessary repository bloat, as Linux/macOS users did not experience this blocking issue and wheels for many Linux distros can be platform-specific (manylinux).

---

### Decision 6: Git Hygiene & Repository Cleanliness

- **Decision**: Ensure `.gitignore` explicitly permits the specific vendored `.whl` files in `python-backend/wheels/` while ignoring build directories (`build/`, `*.egg-info/`, `dist/`) and virtual environments (`venv/`).
- **Rationale**:
  - Building wheels can produce temporary directories like `fairseq.egg-info` or `build/`. These must never pollute git history.
  - Ensures clean `git status` after wheel generation and testing.
