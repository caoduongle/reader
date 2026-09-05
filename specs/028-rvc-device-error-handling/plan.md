# Implementation Plan: RVC Device Auto-Detection & Speech Error Visibility

**Branch**: `028-rvc-device-error-handling` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/028-rvc-device-error-handling/spec.md`

---

## Summary

This feature resolves three critical issues in VoxRead's local RVC voice cloning pipeline:
1. Replaces hardcoded `cuda:0` with dynamic PyTorch GPU/CPU detection (`torch.cuda.is_available()`) to prevent silent startup/init failures on non-CUDA machines, logging the detected device to stdout and supporting `VOXREAD_DEVICE` overrides.
2. Fixes frontend health polling in `useVoiceServerStatus` and `useTTS` by strictly validating `model_loaded` from `/health`, introducing the `'no-model'` / `'model_missing'` status, and rendering an amber warning banner in `SettingsModal` with detailed diagnostics instead of a false "ready" status.
3. Un-swallows `/speak` 503/500 errors in `fetchRVCSpeech`, `testVoice`, and `speakSentence` by parsing response JSON, surfacing `serverErrorMessage` in `SettingsModal` upon test voice failure, and displaying a toast in `App.tsx` during active reading dropouts.

---

## Technical Context

**Language/Version**: Python 3.10+ (Backend), TypeScript 5.x / React 18 / Electron 31 (Frontend & Desktop)  
**Primary Dependencies**: Flask, rvc-python, torch, edge-tts (Python); TailwindCSS, Lucide-react (React UI)  
**Storage**: Local filesystem directory (`python-backend/model/`)  
**Testing**: pytest (Python backend unit & endpoint tests), vitest + React Testing Library (Frontend unit & hook tests)  
**Target Platform**: Windows 10/11 64-bit Desktop Application (Electron), cross-platform compatible  
**Project Type**: Desktop application with local Python microservice backend  
**Performance Goals**: Startup device detection <10ms; error message parsing & UI notification <500ms on failure  
**Constraints**: Offline-first capability; non-blocking speech synthesis; backwards compatibility for status types  
**Scale/Scope**: Single local user; handles speech synthesis error reporting across all reading flows  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle 1 (Library-First / Modularity)**: PASS. PyTorch device detection and error reporting are contained within `python-backend/server.py`. Frontend hooks maintain clean separation of concerns.
- **Principle 2 (Clean Interface Protocol)**: PASS. HTTP REST error schemas use structured JSON (`{"error": "..."}`) and typed status unions (`RVCServerStatus`).
- **Principle 3 (Test-First & Regression Prevention)**: PASS. All new device fallback scenarios and error response states will be tested in `python-backend/tests/test_server.py` and `tests/hooks/useVoiceServerStatus.test.ts`.
- **Principle 4 (Observability & Structured Feedback)**: PASS. Replaces silent failures and discarded exceptions with explicit terminal logging, error response payloads, modal warning banners, and toast notifications.
- **Principle 5 (Simplicity & YAGNI)**: PASS. Directly leverages PyTorch's native `cuda.is_available()`, standard HTTP JSON error bodies, and existing toast infrastructure.

---

## Project Structure

### Documentation (this feature)

```text
specs/028-rvc-device-error-handling/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 technical research & decisions
├── data-model.md        # Phase 1 data entities and status types
├── contracts/           # Phase 1 API and UI contracts
│   ├── api-endpoints.md # HTTP contracts for /health and /speak
│   └── ui-contracts.md  # UI banners and toast contracts
├── quickstart.md        # Phase 1 validation scenarios
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
python-backend/
├── server.py                        # Backend: dynamic device detection, startup log, last_init_error, /health & /speak error JSON
└── tests/
    └── test_server.py               # Unit and contract tests for device detection & error response schemas

src/
├── types.ts                         # RVCServerStatus extended with 'no-model'
├── hooks/
    ├── useVoiceServerStatus.ts      # Health check strictly verifying data.model_loaded, returning errorMessage
    └── useTTS.ts                    # Un-swallowing /speak errors, populating serverErrorMessage
├── components/
│   └── SettingsModal.tsx            # Destructuring serverErrorMessage, amber banner for 'no-model' / 'model_missing'
└── App.tsx                          # Toast notification on mid-reading /speak failures

tests/
└── hooks/
    └── useVoiceServerStatus.test.ts # Vitest coverage for 'no-model' and model_loaded validation
```

**Structure Decision**: Direct enhancements across the Python Flask service, React TTS hooks, Settings modal, and root App container without adding new external architectural layers.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | All additions enhance existing endpoints, types, and hooks cleanly | N/A |
