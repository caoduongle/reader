# Implementation Plan: Self-Contained Desktop Installer with Bundled Python Runtime & CI Workflow

**Branch**: `023-package-electron-venv` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/023-package-electron-venv/spec.md`

---

## Summary

Resolve Windows desktop packaging failures in VoxRead by ensuring the Python 3.10 virtual environment (`python-backend/venv`) is both properly bundled in `package.json` (`build.extraResources`) and automated inside `.github/workflows/build-electron.yml`. The workflow sets up Python 3.10, creates the local virtual environment, installs pre-compiled native wheels (`fairseq`), project dependencies, and lightweight CPU-only PyTorch binaries. A post-install step converts the venv into a relocatable standalone runtime by bundling base Python C runtime DLLs and standard library modules, guaranteeing that end users can run VoxRead without installing Python, Node.js, or C++ compilers. Finally, `README.md` is reorganized with a dual-track Quickstart separating end users from developers and clearly noting package size (~500MB–1.5GB).

---

## Technical Context

**Language/Version**: TypeScript 5.8 (Electron 44 Main/Preload), Python 3.10.x 64-bit, Node.js 22 LTS, GitHub Actions Workflow YAML  
**Primary Dependencies**: `electron-builder==26.15.3`, `actions/setup-python@v5`, `torch==2.x` (CPU), `torchaudio` (CPU), `fairseq==0.12.2`, `rvc-python==0.1.5`, `flask==3.x`, `edge-tts`  
**Storage**: Embedded desktop application resources directory (`process.resourcesPath/python-backend/venv`)  
**Testing**: Configuration schema verification, GitHub Actions workflow step validation, standalone Python import checks, background server spawn health checks (`http://127.0.0.1:8008/health`), end-to-end desktop launch verification  
**Target Platform**: Windows 10/11 64-bit (`x64`)  
**Project Type**: Desktop Application (Electron + React 19 Frontend + Bundled Python Flask/RVC Engine)  
**Performance Goals**: Voice server startup < 5 seconds upon desktop app launch; package size constrained to 500MB–1.5GB uncompressed (~400MB–600MB compressed installer)  
**Constraints**:
- Zero-prerequisite installation: No Python, Node.js, or MSVC Build Tools required on the end-user machine.
- CPU-only inference: Avoid multi-gigabyte CUDA bloat by sourcing wheels from `https://download.pytorch.org/whl/cpu`.
- Windows CMD runner execution (`shell: cmd`) on CI to bypass PowerShell script execution policy hurdles.
- Seamless compatibility with `getBackendPaths()` in `electron/main.ts`.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Library & Runtime Self-Containment | ✅ Passed | The application bundles its complete Python 3.10 runtime and dependencies into `process.resourcesPath/python-backend/venv`. |
| II. Fail-Fast Execution | ✅ Passed | CI workflow fails immediately if dependency installation, wheel installation, or electron packaging encounters errors. |
| III. Minimal Footprint & CPU Parity | ✅ Passed | PyTorch CPU wheels prevent multi-gigabyte CUDA bloat while enabling voice reading across all standard Windows x64 machines. |
| IV. Zero External Prerequisites | ✅ Passed | End users need only download and execute `VoxRead Setup.exe` without configuring environment variables or installing runtimes. |
| V. Dual-Track Documentation Clarity | ✅ Passed | `README.md` clearly separates non-technical user downloads from developer source builds, stating installer size upfront. |

---

## Project Structure

### Documentation (this feature)

```text
specs/023-package-electron-venv/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Technical research & architectural decisions
├── data-model.md        # Phase 1: Configuration models & lifecycle state machines
├── quickstart.md        # Phase 1: Testable verification procedures
├── contracts/           # Phase 1: Interface & CI workflow contracts
│   ├── packaging-contract.md
│   └── ci-workflow-contract.md
└── checklists/
    └── requirements.md  # Requirements quality checklist
```

### Source Code Changes

```text
reader/
├── package.json                         # [MODIFY] Add python-backend/venv to build.extraResources
├── .github/workflows/build-electron.yml # [MODIFY] Add Python 3.10 setup, venv creation, wheel & PyTorch CPU install
├── scripts/
│   └── bundle-venv.py                   # [NEW] Make Python venv standalone & relocatable for desktop bundling
└── README.md                            # [MODIFY] Restructure Quickstart into Cách 1 (User .exe) and Cách 2 (Developer)
```

---

## Phases & Deliverables

### Phase 1: Packaging Configuration (`package.json`)
- Edit `build.extraResources` in `package.json` to include:
  ```json
  {
    "from": "python-backend/venv",
    "to": "python-backend/venv"
  }
  ```
- Verify JSON validity and adherence to `contracts/packaging-contract.md`.

### Phase 2: Standalone Venv Relocation Utility (`scripts/bundle-venv.py`)
- Implement `scripts/bundle-venv.py`:
  - Locates base Python binaries from `sys.base_prefix`.
  - Replaces stub executables in `python-backend/venv/Scripts/` with real base `python.exe` and `pythonw.exe`.
  - Copies C runtime DLLs (`python310.dll`, `python3.dll`, `vcruntime140.dll`, `vcruntime140_1.dll`) into `python-backend/venv/Scripts/`.
  - Copies base `DLLs/` into `python-backend/venv/DLLs/`.
  - Copies base standard library modules (`Lib/` excluding `site-packages`) into `python-backend/venv/Lib/`.
  - Deletes `pyvenv.cfg` to enable landmark search relative to `Scripts/`.
- Test running standalone python imports locally.

### Phase 3: CI/CD Workflow (`.github/workflows/build-electron.yml`)
- Insert the required steps between `Build Web Assets (Vite)` and `Package Desktop Installer (Electron Builder)`:
  1. `actions/setup-python@v5` with `python-version: '3.10'`.
  2. `python -m venv python-backend/venv` with `shell: cmd`.
  3. Install vendored fairseq wheel with `shell: cmd`:
     `python-backend\venv\Scripts\pip.exe install python-backend\wheels\fairseq-0.12.2-cp310-cp310-win_amd64.whl`
  4. Install `requirements.txt` and PyTorch CPU with `shell: cmd`:
     `python-backend\venv\Scripts\pip.exe install -r python-backend\requirements.txt && python-backend\venv\Scripts\pip.exe install torch torchaudio --index-url https://download.pytorch.org/whl/cpu`
  5. Run `python scripts/bundle-venv.py` with `shell: cmd`.
- Verify workflow YAML syntax against `contracts/ci-workflow-contract.md`.

### Phase 4: Quickstart Documentation (`README.md`)
- Restructure Quickstart:
  - **Cách 1: Cài đặt đơn giản nhất (Dành cho người dùng)**: Link to GitHub Releases / Actions download; note that no Node/Python is required; disclose installer size (~500MB–1.5GB) due to embedded PyTorch.
  - **Cách 2: Dành cho nhà phát triển (Build từ mã nguồn)**: Group `scripts/setup.ps1`, `scripts/setup.sh`, `npm run dev`, `npm run electron:dev`, `npm run electron:build`.

### Phase 5: Verification & Release Tagging
- Execute validation scenarios from `quickstart.md`.
- Commit changes and tag release (e.g., `v1.0.1`).
- Verify CI triggers and builds successfully.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Adding `scripts/bundle-venv.py` to CI pipeline | Python venv on Windows creates stubs pointing to `home` in `pyvenv.cfg`. On clean machines, `No Python at...` occurs. | Standard `python -m venv` without copying stdlib/DLLs fails on user machines lacking Python in the exact CI toolcache path. |
