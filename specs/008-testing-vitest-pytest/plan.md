# Implementation Plan: Automated Testing Suite with Vitest & Pytest

**Branch**: `008-testing-vitest-pytest` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/008-testing-vitest-pytest/spec.md`  

---

## Summary

Establish a complete, dual-engine automated testing framework for VoxRead:
1. **Frontend Testing Setup (Vitest + RTL)**: Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom`. Create `vitest.config.ts` and `tests/setup.ts`.
2. **Frontend Unit & Component Tests**: Implement high-value unit tests covering `splitIntoSentences`, `parseNovelText`, Gemini proxy endpoints (`server.js`), and React `ErrorBoundary`.
3. **Backend Testing Setup (Pytest)**: Create `python-backend/requirements-dev.txt` with `pytest`. Install `pytest` in `python-backend/venv`.
4. **Backend API Tests**: Implement unit and endpoint contract tests in `python-backend/tests/test_server.py` covering `/health`, `/speak` input validation (empty and whitespace text), preflight CORS headers, and mock synthesis.
5. **Documentation & Backlog**: Add `"test": "vitest run"` script to `package.json`. Update `README.md` with explicit commands for running both test suites. Document an itemized backlog of untested modules for future coverage.

---

## Technical Context

**Language/Format**: TypeScript / React (TSX), Python 3.10, JSON, Markdown  
**Target Files**:
- `package.json` [MODIFY] (Add test devDependencies and scripts)
- `vitest.config.ts` [NEW] (Vitest configuration with jsdom)
- `tests/setup.ts` [NEW] (Testing Library setup)
- `tests/unit/textParser.test.ts` [NEW] (Sentence & novel parsing unit tests)
- `tests/unit/serverProxy.test.ts` [NEW] (Express proxy unit tests)
- `tests/components/ErrorBoundary.test.tsx` [NEW] (React component test)
- `python-backend/requirements-dev.txt` [NEW] (Dev dependencies for Python)
- `python-backend/tests/test_server.py` [NEW] (Pytest unit tests for Flask server)
- `README.md` [MODIFY] (Add testing section for frontend and backend)
**Primary Dependencies**: `vitest`, `@testing-library/react`, `jsdom`, `pytest`  
**Testing & Verification**: `npm test`, `pytest python-backend/`, `npm run typecheck`, `npm run lint`, `npm run build`  
**Constraints**:
- Strictly zero fake tests: all tests must meaningfully assert output and fail on logic alteration
- Offline execution: tests must not require internet access, Google API keys, or GPU hardware

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Dual-Stack Testing | ✅ Passed | Frontend tests use Vitest + RTL; backend tests use Pytest + Flask test client. |
| II. True Assertions | ✅ Passed | Tests assert boundary conditions and specific error payloads; no trivial assertions. |
| III. Offline Hermeticity | ✅ Passed | Native and cloud APIs (TTS, Gemini, PyTorch GPU) are mocked or isolated. |
| IV. Build & Type Integrity | ✅ Passed | `typecheck`, `lint`, and `build` continue to pass without regression. |

---

## Project Structure

### Documentation (this feature)

```text
specs/008-testing-vitest-pytest/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Technical research on Vitest & Pytest
├── data-model.md        # Test suite architecture & test matrix
├── quickstart.md        # Commands to execute test suites
├── contracts/           # Contracts & invariants
│   └── test-suite-contracts.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── package.json                   # [MODIFY] Add test scripts & vitest dependencies
├── vitest.config.ts               # [NEW] Vitest configuration
├── README.md                      # [MODIFY] Add test running instructions
├── tests/                         # [NEW] Frontend test suite
│   ├── setup.ts                   # Jest-DOM setup
│   ├── unit/
│   │   ├── textParser.test.ts     # Parsing & sentence segmentation tests
│   │   └── serverProxy.test.ts    # Express proxy API tests
│   └── components/
│       └── ErrorBoundary.test.tsx # Component error boundary test
└── python-backend/
    ├── requirements-dev.txt       # [NEW] Python dev requirements (pytest)
    └── tests/                     # [NEW] Backend test suite
        └── test_server.py         # Pytest endpoint contract tests
```

---

## Phases & Deliverables

### Phase 1: Test Infrastructure Setup
1. Install Vitest and React Testing Library devDependencies in `package.json`.
2. Configure `vitest.config.ts` and `tests/setup.ts`.
3. Create `python-backend/requirements-dev.txt` and install `pytest`.
4. Update `package.json` scripts (`"test": "vitest run"`, `"test:watch": "vitest"`).

### Phase 2: Frontend Unit & Component Tests
1. Author `tests/unit/textParser.test.ts` (5 tests for sentence segmentation and chapter parsing).
2. Author `tests/unit/serverProxy.test.ts` (3 tests for Gemini proxy validation and health).
3. Author `tests/components/ErrorBoundary.test.tsx` (2 tests for error boundary fallback).

### Phase 3: Backend Unit & Endpoint Tests
1. Author `python-backend/tests/test_server.py` (5 tests for `/health`, `/speak` input validation, and CORS headers).

### Phase 4: Documentation & Backlog
1. Update `README.md` with instructions for running tests.
2. Compile backlog of untested modules for PR description.

### Phase 5: Verification & Gate Enforcement
1. Execute `npm test` and verify 100% pass.
2. Execute `pytest` and verify 100% pass.
3. Verify `npm run typecheck`, `npm run lint`, and `npm run build` pass cleanly.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**
