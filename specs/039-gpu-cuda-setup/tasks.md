# Tasks: Automatic NVIDIA GPU Detection, CUDA PyTorch Setup & Runtime Warnings

**Feature**: 039-gpu-cuda-setup | **Branch**: `039-gpu-cuda-setup` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/039-gpu-cuda-setup/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/039-gpu-cuda-setup/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify baseline environment and test execution

- [X] T001 Verify baseline Python backend tests pass using `pytest tests/test_server.py` in `python-backend/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm GPU detection tools and package identifiers

- [X] T002 Verify `nvidia-smi` presence and PyTorch package specifications in `specs/039-gpu-cuda-setup/research.md`

---

## Phase 3: User Story 1 – Automated CUDA PyTorch Setup for NVIDIA GPU Systems (Priority: P1) 🎯 MVP

**Goal**: Automatically detect NVIDIA GPU in setup scripts and install CUDA-accelerated PyTorch (`torch==2.1.1+cu118 torchaudio==2.1.1+cu118`) while cleanly falling back to CPU if no NVIDIA GPU is detected.

**Independent Test**: Run `setup.ps1` (or `setup.sh`) on a machine with an NVIDIA GPU and verify `torch.cuda.is_available() == True` in `python-backend/venv` without manual pip commands.

### Implementation for User Story 1

- [X] T003 [US1] Add NVIDIA GPU detection via `nvidia-smi` and automated CUDA PyTorch installation in `scripts/setup.ps1`
- [X] T004 [P] [US1] Add NVIDIA GPU detection via `nvidia-smi` and automated CUDA PyTorch installation in `scripts/setup.sh`

**Checkpoint**: At this point, running the setup script on any machine automatically chooses the optimal PyTorch flavor (CUDA for NVIDIA GPU, CPU otherwise).

---

## Phase 4: User Story 2 – Runtime Diagnosis & Diagnostic Guidance for CPU Inference (Priority: P2)

**Goal**: When `server.py` starts with `DEVICE == "cpu:0"`, log clear warnings and exact upgrade pip commands to the console and `server.log`.

**Independent Test**: Start `server.py` with `VOXREAD_DEVICE=cpu:0` and verify the warning header `[VoxRead][Canh bao]` and suggestion `[VoxRead][Goi y]` appear in console output.

### Tests for User Story 2

- [X] T005 [US2] Add unit test `test_print_device_warning` in `python-backend/tests/test_server.py` asserting CPU warning emissions and CUDA silence

### Implementation for User Story 2

- [X] T006 [US2] Implement `print_device_warning` helper function and call it after `DEVICE = detect_device()` in `python-backend/server.py`

**Checkpoint**: Users running on CPU receive immediate diagnosis and copy-paste remediation commands on startup.

---

## Phase 5: User Story 3 – Clear Documentation in README (Priority: P3)

**Goal**: Place a prominent `> [!IMPORTANT]` alert box immediately after Step 1 in `README.md` detailing CUDA PyTorch installation commands.

**Independent Test**: Review `README.md` and verify the `> [!IMPORTANT]` block is rendered with the exact pip commands and link to `docs/rvc-voice-setup.md#b2-cài-pytorch-đúng-bản-cho-máy-bạn`.

### Implementation for User Story 3

- [X] T007 [US3] Add `> [!IMPORTANT]` callout box for NVIDIA GPU users directly below Step 1 command blocks in `README.md`

**Checkpoint**: Documentation clearly alerts developers before or after running setup.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and regression testing

- [X] T008 Run full Python backend test suite via `pytest tests/test_server.py` in `python-backend/`
- [X] T009 Execute quickstart validation scenarios in `specs/039-gpu-cuda-setup/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — runs baseline checks
- **Foundational (Phase 2)**: Verifies prerequisites
- **User Story 1 (Phase 3)**: Implements setup script automation (`scripts/setup.ps1` & `scripts/setup.sh`)
- **User Story 2 (Phase 4)**: Implements runtime warning in `python-backend/server.py` & unit tests
- **User Story 3 (Phase 5)**: Updates documentation in `README.md`
- **Polish (Phase 6)**: Validates all test suites and end-to-end behavior

### Parallel Opportunities

- T003 (`scripts/setup.ps1`) and T004 (`scripts/setup.sh`) can be developed in parallel
- T007 (`README.md`) can be edited in parallel with backend code

---

## Implementation Strategy

### MVP First (User Story 1)
1. Complete T001 and T002.
2. Implement T003 in `scripts/setup.ps1` and T004 in `scripts/setup.sh`.
3. Validate automated detection on host GPU.

### Incremental Delivery
1. Add T005 test and T006 implementation in `python-backend/server.py`.
2. Add T007 in `README.md`.
3. Run T008 test suite and T009 quickstart validation.
