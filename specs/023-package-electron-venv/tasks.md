# Tasks: Self-Contained Desktop Installer with Bundled Python Runtime & CI Workflow

**Feature**: `023-package-electron-venv`  
**Input**: Feature specification from `specs/023-package-electron-venv/spec.md` and design artifacts  
**Status**: Ready for Implementation  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and preparation of standalone packaging utility

- [X] T001 Verify repository cleanliness and check presence of vendored wheel in `python-backend/wheels/fairseq-0.12.2-cp310-cp310-win_amd64.whl`
- [X] T002 [P] Create standalone runtime relocation utility script in `scripts/bundle-venv.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verify utility script logic before integrating with packaging configurations

- [X] T003 Validate standalone venv generation and landmark search logic using `scripts/bundle-venv.py`

**Checkpoint**: Core relocation utility validated — user story implementation can begin

---

## Phase 3: User Story 1 - Standalone Zero-Prerequisite Desktop App Installation (Priority: P1) 🎯 MVP

**Goal**: Enable packaged desktop application to bundle `python-backend/venv` and resolve Python binaries without external dependencies.

**Independent Test**: Packaged distribution resources directory contains `python-backend/venv/Scripts/pythonw.exe` and `server.py` launches cleanly without "Không kết nối được server giọng đọc" dialogs.

### Implementation for User Story 1

- [X] T004 [US1] Add `{ "from": "python-backend/venv", "to": "python-backend/venv" }` to `build.extraResources` in `package.json`
- [X] T005 [US1] Validate `package.json` resource mappings against `specs/023-package-electron-venv/contracts/packaging-contract.md`
- [X] T006 [US1] Verify backend executable resolution compatibility with `getBackendPaths()` in `electron/main.ts`

**Checkpoint**: User Story 1 configuration complete — Electron builder is configured to bundle the virtual environment.

---

## Phase 4: User Story 2 - Automated CI/CD Desktop Packaging Pipeline (Priority: P2)

**Goal**: Automate virtual environment creation, wheel installation, PyTorch CPU installation, and standalone bundling in GitHub Actions.

**Independent Test**: GitHub Actions workflow `.github/workflows/build-electron.yml` successfully creates `python-backend/venv`, populates dependencies, runs `electron:build`, and uploads `voxread-windows-installer` artifact.

### Implementation for User Story 2

- [X] T007 [US2] Add Python 3.10 setup step (`actions/setup-python@v5`) in `.github/workflows/build-electron.yml`
- [X] T008 [US2] Add virtual environment creation step (`python -m venv python-backend/venv`) with `shell: cmd` in `.github/workflows/build-electron.yml`
- [X] T009 [US2] Add vendored fairseq wheel installation step via venv pip with `shell: cmd` in `.github/workflows/build-electron.yml`
- [X] T010 [US2] Add dependencies installation step (`requirements.txt` and PyTorch CPU) with `shell: cmd` in `.github/workflows/build-electron.yml`
- [X] T011 [US2] Add standalone relocation step (`python scripts/bundle-venv.py`) with `shell: cmd` in `.github/workflows/build-electron.yml`
- [X] T012 [US2] Validate complete workflow YAML structure against `specs/023-package-electron-venv/contracts/ci-workflow-contract.md`

**Checkpoint**: User Stories 1 and 2 complete — CI pipeline is fully wired to generate working installers.

---

## Phase 5: User Story 3 - Transparent Dual-Track Quickstart Documentation (Priority: P3)

**Goal**: Provide clear installation instructions distinguishing end-user binary downloads from developer source builds, noting package size upfront.

**Independent Test**: `README.md` Quickstart displays "Cách 1: Cài đặt đơn giản nhất (Dành cho người dùng)" first with download instructions and size notice, followed by "Cách 2: Dành cho nhà phát triển (Build từ mã nguồn)".

### Implementation for User Story 3

- [X] T013 [P] [US3] Add "Cách 1: Cài đặt đơn giản nhất (Dành cho người dùng)" with download instructions and 500MB–1.5GB size notice in `README.md`
- [X] T014 [US3] Reorganize existing source setup commands (`setup.ps1`, `setup.sh`, `npm run dev`) under "Cách 2: Dành cho nhà phát triển (Build từ mã nguồn)" in `README.md`
- [X] T015 [US3] Validate markdown formatting and verify all links in `README.md`

**Checkpoint**: Documentation clearly guides both end users and developers.

---

## Phase 6: Polish, Verification & Release Tagging

**Purpose**: Execute end-to-end verification, stage commits, and trigger release build.

- [X] T016 Execute all test scenarios in `specs/023-package-electron-venv/quickstart.md`
- [X] T017 Stage and commit all modified files to git repository
- [X] T018 Create semver release tag `v1.0.1` and push commit/tag to trigger CI packaging workflow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on T002 completion — validates `scripts/bundle-venv.py`.
- **User Story 1 (Phase 3)**: Depends on Phase 2.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs `package.json` extraResources configured and `bundle-venv.py` ready).
- **User Story 3 (Phase 5)**: Can run in parallel with or after Phase 3/4.
- **Polish & Release (Phase 6)**: Depends on completion of all user stories (US1, US2, US3).

### Parallel Opportunities

- `T002` (bundle-venv.py) can be created in parallel with `T001`.
- `T013` (README user track) can be drafted in parallel with `T004`.
- Within User Story 2, tasks `T007`–`T011` edit `.github/workflows/build-electron.yml` sequentially to maintain atomic consistency.

---

## Implementation Strategy

### MVP First (User Story 1 & 2)
1. Complete Setup and Foundational (`scripts/bundle-venv.py`).
2. Complete US1 (`package.json` `extraResources`).
3. Complete US2 (`.github/workflows/build-electron.yml`).
4. Complete US3 (`README.md` Quickstart reorganization).
5. Run verification suite (`quickstart.md`).
6. Tag release `v1.0.1` and push to trigger CI build.
