# Implementation Plan: RVC Pipeline Error Transparency & Active Model UI Clarity

**Branch**: `031-rvc-infer-error-handling` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/031-rvc-infer-error-handling/spec.md`

---

## Summary

This plan replaces the library-level `rvc.infer_file(...)` call in `python-backend/server.py` with a dedicated `_run_rvc_inference(base_path, out_path)` function that invokes `rvc.vc.vc_single(...)` directly. This directly resolves a defect in `rvc-python==0.1.5` where internal pipeline failures return an error tuple `(msg, (None, None))` that crashes `scipy.io.wavfile.write()` with `'tuple' object has no attribute 'dtype'`. The custom helper intercepts any returned tuple and raises `RuntimeError(f"Lỗi pipeline RVC: {error_detail}")`, ensuring transparent and descriptive error reporting. Furthermore, tests in `python-backend/tests/test_server.py` are updated to mock `rvc.vc.vc_single` for both success (`np.ndarray`) and failure (`tuple`) conditions. Lastly, the active model badge in `src/components/SettingsModal.tsx` is updated from `"Đang nạp"` to `"Đang dùng"` for UI clarity.

---

## Technical Context

**Language/Version**: Python 3.10+ (Backend), TypeScript 5.x / React 18+ (Frontend)  
**Primary Dependencies**: Flask, `rvc-python==0.1.5`, `scipy`, `numpy`, `edge-tts` (Python); React, Lucide-React, TailwindCSS (Frontend)  
**Storage**: Ephemeral temporary WAV/MP3 files in `tempfile.mkdtemp` (auto-cleaned in `finally` block); RVC model weights in `python-backend/model/`  
**Testing**: `pytest` for Python backend (`python-backend/tests/test_server.py`), `vitest` / `@testing-library/react` for frontend  
**Target Platform**: Electron desktop application running on Windows  
**Project Type**: Desktop application (React/Vite Electron frontend + local Flask Python backend)  
**Performance Goals**: Sub-second pipeline overhead outside of neural vocoder synthesis; immediate response propagation on failure  
**Constraints**: Thread safety via `rvc_lock` to serialize concurrent requests; no regression to existing Edge-TTS or RVC functionality  
**Scale/Scope**: 2 modified source files (`python-backend/server.py`, `src/components/SettingsModal.tsx`), 1 modified test file (`python-backend/tests/test_server.py`)  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Library & Module Isolation**: All RVC handling is encapsulated within the server's synthesis routine.
- **Contract & Error Integrity**: Endpoints return structured JSON error payloads on failure and binary WAV streams on success.
- **Testability**: All error and success paths in `_run_rvc_inference` and `/speak` can be cleanly mocked and verified with pytest.
- **UI State Clarity**: UI badges must accurately represent actual application state.

*Status*: **PASSED** (All gates satisfied).

---

## Project Structure

### Documentation (this feature)

```text
specs/031-rvc-infer-error-handling/
├── checklists/
│   └── requirements.md    # Specification quality checklist
├── contracts/
│   └── api-endpoints.md   # POST /speak contract specification
├── data-model.md          # Entity definitions and state transitions
├── plan.md                # Implementation plan (this file)
├── quickstart.md          # Verification and execution guide
├── research.md            # Technical decisions and rationale
└── spec.md                # Feature specification
```

### Source Code (repository root)

```text
python-backend/
├── server.py              # Add scipy.io.wavfile import, implement _run_rvc_inference, update /speak
└── tests/
    └── test_server.py     # Update mock to rvc.vc.vc_single, add success and failure tests

src/
└── components/
    └── SettingsModal.tsx  # Update active model badge label from "Đang nạp" to "Đang dùng"
```

**Structure Decision**: Multi-runtime desktop app with React frontend in `src/` and local Python service in `python-backend/`.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Direct call to private/internal `rvc.vc.vc_single` | `rvc.infer_file` contains unhandled tuple return bug in `rvc-python==0.1.5` | Forking package or patching library at install time introduces unnecessary maintenance burden |
