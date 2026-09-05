# Implementation Plan: PyTorch >= 2.6 weights_only Compatibility for RVC Pipeline

**Branch**: `032-pytorch-weights-only-compat` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/032-pytorch-weights-only-compat/spec.md`

---

## Summary

This plan introduces an in-process monkeypatch to `torch.load` in `python-backend/server.py` to restore backward compatibility with PyTorch >= 2.6 for the `rvc-python` / `fairseq` ecosystem. PyTorch 2.6 changed the default `weights_only` argument from `False` to `True`, causing legacy checkpoints (`hubert_base.pt`, `rmvpe.pt`) containing custom pickled classes (e.g. `fairseq.data.dictionary.Dictionary`) to fail with `UnpicklingError`. By wrapping `torch.load` immediately after `import torch` and before `from rvc_python.infer import RVCInference` with `kwargs.setdefault("weights_only", False)`, legacy checkpoints load transparently while explicit caller settings are strictly preserved. Furthermore, unit tests are added in `python-backend/tests/test_server.py` to assert correct parameter forwarding and non-regression across all existing endpoints.

---

## Technical Context

**Language/Version**: Python 3.10+ (Backend)  
**Primary Dependencies**: `torch` (>= 2.6 compatible), `fairseq`, `rvc-python==0.1.5`, Flask, `scipy`  
**Storage**: Ephemeral temporary WAV/MP3 files in `tempfile.mkdtemp`; RVC weights in `python-backend/model/`  
**Testing**: `pytest` for Python backend (`python-backend/tests/test_server.py`)  
**Target Platform**: Electron desktop application running on Windows  
**Project Type**: Desktop application (React frontend + local Python voice server backend)  
**Performance Goals**: Negligible latency overhead (< 1 microsecond parameter inspection per `torch.load` call)  
**Constraints**: 
- In-memory monkeypatch only; zero modifications to `site-packages/` or external virtualenv files.
- Patch must execute before `rvc_python.infer.RVCInference` is imported and before the initial `reload_model()` call.
- Must preserve explicit `weights_only=True` or `weights_only=False` calls.  
**Scale/Scope**: 1 modified source file (`python-backend/server.py`), 1 modified test file (`python-backend/tests/test_server.py`)  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Library & Module Isolation**: The patch is strictly scoped to the running server process without altering package directories.
- **Contract & Error Integrity**: Explicit parameters are respected (`setdefault`); exceptions continue to propagate naturally.
- **Testability**: The monkeypatch behavior can be deterministically tested with unit tests mocking or invoking `torch.load`.
- **Zero Ecosystem Side Effects**: Global Python system libraries remain untouched.

*Status*: **PASSED** (All gates satisfied).

---

## Project Structure

### Documentation (this feature)

```text
specs/032-pytorch-weights-only-compat/
├── checklists/
│   └── requirements.md    # Specification quality checklist
├── contracts/
│   └── runtime-patch.md   # torch.load runtime wrapper interface contract
├── data-model.md          # Parameter transformation and checkpoint assets
├── plan.md                # Implementation plan (this file)
├── quickstart.md          # Verification and execution guide
├── research.md            # Technical decisions and rationale
└── spec.md                # Feature specification
```

### Source Code (repository root)

```text
python-backend/
├── server.py              # Add torch.load monkeypatch immediately after import torch
└── tests/
    └── test_server.py     # Add unit tests verifying monkeypatch behavior and parameter handling
```

**Structure Decision**: Python backend service in `python-backend/` supporting the local VoxRead desktop audio pipeline.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| In-memory monkeypatch of `torch.load` | `fairseq` is frozen/unmaintained since 2022 and calls `torch.load()` without `weights_only=False` | Patching files inside `site-packages/fairseq` is fragile, non-reproducible, and easily lost upon reinstall |
