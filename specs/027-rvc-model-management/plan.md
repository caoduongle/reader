# Implementation Plan: RVC Voice Model Management & One-Click Import

**Branch**: `027-rvc-model-management` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/027-rvc-model-management/spec.md`

---

## Summary

This feature resolves the setup friction for local RVC voice cloning by providing dynamic model directory creation on backend startup, clear health reporting distinguishing offline vs missing model states, native one-click model import via Electron IPC, hot-reloading in the Python server without process restarts, and a persistent "Quản lý model giọng đọc" management card in Settings.

---

## Technical Context

**Language/Version**: Python 3.10+ (Backend), TypeScript 5.x / React 18 / Electron 31 (Frontend & Desktop)  
**Primary Dependencies**: Flask, rvc-python, edge-tts (Python); TailwindCSS, Lucide-react (React UI); Electron (IPC, dialog, shell)  
**Storage**: Local filesystem directory (`python-backend/model/`) for `.pth` model weights and `.index` feature indexes  
**Testing**: pytest (Python backend unit & integration tests), vitest + React Testing Library (Frontend unit & hook tests)  
**Target Platform**: Windows 10/11 64-bit Desktop Application (Electron), cross-platform compatible  
**Project Type**: Desktop application with local Python microservice backend  
**Performance Goals**: Model import & status reload within <3 seconds; health check latency <50ms locally  
**Constraints**: Offline-first capability; non-blocking asynchronous file operations; graceful non-Electron browser fallback  
**Scale/Scope**: Single local user; supports managing multiple voice model weights on local disk  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle 1 (Library-First / Modularity)**: PASS. The Python server encapsulates model loading in reusable helper functions (`discover_model_paths`, `reload_model`). Electron IPC is isolated in separate handler channels.
- **Principle 2 (Clean Interface Protocol)**: PASS. Strict JSON schemas across HTTP REST endpoints (`/health`, `/model/list`, `/model/reload`, `/model/create-folder`) and typed Electron IPC bridge (`window.voxreadDesktop.models`).
- **Principle 3 (Test-First & Regression Prevention)**: PASS. All health transitions and API contracts have dedicated test coverage in `python-backend/tests/test_server.py` and `tests/hooks/useVoiceServerStatus.test.ts`.
- **Principle 4 (Observability & Structured Feedback)**: PASS. Explicit structured error payloads (`reason: "model_missing"`, `model_dir`, `model_loaded`) replacing ambiguous connection errors.
- **Principle 5 (Simplicity & YAGNI)**: PASS. Avoids heavy external file watchers; leverages on-demand reload endpoint and native Electron dialog copy.

---

## Project Structure

### Documentation (this feature)

```text
specs/027-rvc-model-management/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 research and technical decisions
├── data-model.md        # Phase 1 data entities and status types
├── contracts/           # Phase 1 API and IPC contracts
│   ├── api-endpoints.md # HTTP REST contracts for /health, /model/*
│   └── electron-ipc.md  # Electron IPC channels for model import/management
├── quickstart.md        # Phase 1 validation scenarios
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
python-backend/
├── server.py                        # Backend Flask server: directory auto-creation, /health diagnostics, /model endpoints
└── tests/
    └── test_server.py               # Unit and contract tests for backend endpoints

electron/
├── main.ts                          # IPC handlers: models:import, models:open-folder, models:get-dir
└── preload.ts                       # contextBridge exposure of window.voxreadDesktop.models

src/
├── components/
│   └── SettingsModal.tsx            # UI: "+ Thêm model" button in error banner & permanent "Quản lý model" card
├── hooks/
│   ├── useVoiceServerStatus.ts      # 4-state connection status polling ('checking', 'connected', 'model_missing', 'unreachable')
│   └── useTTS.ts                    # Synchronized health check and error messaging
└── types/ (or vite-env.d.ts)        # TypeScript interface definitions for window.voxreadDesktop.models

tests/
└── hooks/
    └── useVoiceServerStatus.test.ts # Frontend unit tests for status state machine
```

**Structure Decision**: Multi-tier desktop app layout modifying Python backend service, Electron desktop main process & preload scripts, and React frontend settings components.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | All additions reuse existing Flask, Electron IPC, and React hook patterns | N/A |
