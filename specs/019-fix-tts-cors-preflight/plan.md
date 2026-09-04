# Implementation Plan: TTS CORS Preflight Support for /speak

**Branch**: `019-fix-tts-cors-preflight` | **Date**: 2026-09-04 | **Spec**: [specs/019-fix-tts-cors-preflight/spec.md](file:///e:/reader/specs/019-fix-tts-cors-preflight/spec.md)

**Input**: Feature specification from `/specs/019-fix-tts-cors-preflight/spec.md`

---

## Summary

This plan resolves the failing test `test_speak_options_preflight_returns_cors_headers` in `python-backend/tests/test_server.py`. The `/speak` endpoint currently returns HTTP 204 for `OPTIONS` requests but omits `Access-Control-Allow-*` headers when no `Origin` header is provided by the client. We will modify `python-backend/server.py` to ensure `OPTIONS /speak` unconditionally returns HTTP 204 with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, and `Access-Control-Allow-Headers: Content-Type, Authorization`, while preserving security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`) and existing `POST /speak` and `GET /health` behavior.

---

## Technical Context

**Language/Version**: Python 3.10  
**Primary Dependencies**: Flask 3.x, edge-tts, rvc-python, pytest 9.x  
**Storage**: Temporary file system (`tempfile.mkdtemp`) for transient WAV/MP3 conversion  
**Testing**: `pytest python-backend/tests -v` via `python-backend/venv/Scripts/pytest.exe`  
**Target Platform**: Local Windows/Linux service listening on `http://localhost:8008`  
**Project Type**: Python Flask microservice backend  
**Performance Goals**: Sub-5ms preflight response time (no disk I/O, no locks for OPTIONS)  
**Constraints**:
- Must NOT modify `python-backend/tests/test_server.py` (test code is the immutable acceptance contract)
- Must NOT break existing security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`)
- Must NOT alter `POST /speak` input validation or audio synthesis pipeline

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Assessment | Status |
|:---|:---|:---|
| **I. Library-First & Modularity** | Standard HTTP CORS preflight headers implemented cleanly within existing Flask endpoint routing. | **PASS** |
| **II. CLI & Operational Interfaces** | Verifiable directly via pytest CLI runner and standard HTTP tools (`curl`, `Invoke-WebRequest`). | **PASS** |
| **III. Test-First (TDD)** | Acceptance test already exists in `python-backend/tests/test_server.py` and establishes the exact failing assertion. | **PASS** |
| **IV. Integration Testing** | Full test suite `python-backend/tests/` exercises health, error validation, options preflight, and mocked synthesis. | **PASS** |
| **V. Simplicity & YAGNI** | Surgical modification confined strictly to `python-backend/server.py` with zero unnecessary libraries or complex routing layers. | **PASS** |

*Constitution Gate Result*: **ALL CHECKS PASSED**.

---

## Project Structure

### Documentation (this feature)

```text
specs/019-fix-tts-cors-preflight/
├── spec.md              # Feature specification
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output: Problem analysis & technical decisions
├── data-model.md        # Phase 1 output: Entity models & lifecycle
├── quickstart.md        # Phase 1 output: Test run & verification instructions
├── contracts/
│   └── cors-contracts.md # Phase 1 output: HTTP contract specifications
└── checklists/
    └── requirements.md  # Requirements quality checklist
```

### Source Code (repository root)

```text
python-backend/
├── server.py            # Target of modification: speak() OPTIONS handling and _add_cors_headers()
└── tests/
    └── test_server.py   # Existing regression suite containing failing test
```

---

## Architecture & Configuration Mapping

| Component | Target File | Location | Modification | Verification |
|:---|:---|:---|:---|:---|
| **Preflight Response Handler** | `python-backend/server.py` | `speak()` (lines 92-94) | Return `Response(status=204)` with explicit CORS headers (`Origin: *`, `Methods: POST, OPTIONS`, `Headers: Content-Type, Authorization`) | `test_speak_options_preflight_returns_cors_headers` |
| **CORS After-Request Hook** | `python-backend/server.py` | `_add_cors_headers()` (lines 132-143) | Guard `Access-Control-Allow-Origin` so pre-populated headers are preserved, and guarantee security headers `nosniff` and `DENY` | All 5 tests pass in `test_server.py` |

---

## Complexity Tracking

> **Constitution Check**: All gates passed. Zero unneeded complexity introduced.
