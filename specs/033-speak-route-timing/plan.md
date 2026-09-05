# Implementation Plan: /speak Route Latency Timing

**Branch**: `033-speak-route-timing` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/033-speak-route-timing/spec.md`

---

## Summary

This plan introduces step-by-step latency timing telemetry into the `/speak` route in `python-backend/server.py`. By capturing timestamps before and after Edge-TTS base audio generation and RVC neural voice conversion, the server outputs diagnostic timings (`[VoxRead][Timing] Edge-TTS: {t1-t0:.2f}s | RVC inference: {t2-t1:.2f}s | Text length: {len(text)} ky tu`) to the terminal. This provides immediate visibility into whether Edge-TTS or RVC inference accounts for the bulk of processing duration, enabling targeted performance optimizations without modifying external interfaces or existing synthesis contracts.

---

## Technical Context

**Language/Version**: Python 3.10+ (Backend)  
**Primary Dependencies**: `time` (Python standard library), Flask, `edge-tts`, `rvc-python`  
**Storage**: N/A (in-memory timestamps)  
**Testing**: `pytest` (`python-backend/tests/test_server.py`) with stdout capturing (`capsys`)  
**Target Platform**: Electron desktop application running on Windows  
**Project Type**: Desktop application backend service  
**Performance Goals**: Timing instrumentation overhead < 0.1ms  
**Constraints**: Zero regression to response headers, HTTP codes, or binary audio byte streams  
**Scale/Scope**: 1 modified source file (`python-backend/server.py`), 1 modified test file (`python-backend/tests/test_server.py`)  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Library & Module Isolation**: Uses standard library `time` with zero additional package dependencies.
- **Contract & Error Integrity**: Purely observational logging; response payloads, status codes, and exception boundaries are unchanged.
- **Testability**: Diagnostic output can be verified deterministically via pytest `capsys`.

*Status*: **PASSED** (All gates satisfied).

---

## Project Structure

### Documentation (this feature)

```text
specs/033-speak-route-timing/
├── checklists/
│   └── requirements.md       # Specification quality checklist
├── contracts/
│   └── logging-telemetry.md  # Console telemetry format contract
├── data-model.md             # In-memory timing data points
├── plan.md                   # Implementation plan (this file)
├── quickstart.md             # Verification and test instructions
├── research.md               # Technical decisions and rationale
└── spec.md                   # Feature specification
```

### Source Code (repository root)

```text
python-backend/
├── server.py                 # Add import time; record t0, t1, t2; print timing telemetry
└── tests/
    └── test_server.py        # Add test asserting [VoxRead][Timing] log output via capsys
```

**Structure Decision**: Single-file timing enhancement in Python backend server.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A |
