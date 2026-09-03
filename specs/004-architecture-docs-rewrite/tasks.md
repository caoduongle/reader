# Tasks: Architecture Documentation Rewrite & RVC Guide Extraction

**Feature**: `004-architecture-docs-rewrite`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Documentation Structure

**Purpose**: Initialize directory structure for extracted documentation.

- [X] T001 Initialize documentation directory `docs/` in the repository root for domain-specific guides in `docs/`.

---

## Phase 2: User Story 3 — Lossless Preservation of RVC Setup & Colab Guide (Priority: P1) 🎯 MVP Part 1

**Goal**: Extract the complete 254-line original Vietnamese RVC tutorial from `README.md` to `docs/rvc-voice-setup.md` with 100% fidelity before rewriting the root overview.

**Independent Test**: Verify that `docs/rvc-voice-setup.md` exists and contains all original sections (Phần A, Phần B, Phần C, Colab links, Applio settings, resemble-enhance code, parameters) without truncation or language changes.

### Implementation for User Story 3

- [X] T002 [US3] Extract complete verbatim original Vietnamese RVC training guide from root `README.md` into `docs/rvc-voice-setup.md`, preserving all Colab links, audio enhancement steps, and local server configurations.

**Checkpoint**: Original RVC guide safely preserved in `docs/rvc-voice-setup.md`.

---

## Phase 3: User Story 1 — System Architecture & Directory Mapping (Priority: P1) 🎯 MVP Part 2

**Goal**: Establish clear project identity, embed a valid GitHub Mermaid architecture diagram, and provide a 1-line-per-directory table in `README.md`.

**Independent Test**: View `README.md` in markdown preview: verify that the Mermaid diagram renders without errors, displaying user flows across React, Electron, Web Speech, and RVC, and verify that the directory table covers all repository folders.

### Implementation for User Story 1

- [X] T003 [US1] Author root `README.md` project introduction and GitHub-compatible Mermaid architecture diagram illustrating data flows across User, React/Electron Client, Chrome Extension, Web Speech API, Local RVC Server, and Gemini TTS in `README.md`.
- [X] T004 [US1] Add directory structure table in root `README.md` cataloging all active top-level folders (`src/`, `electron/`, `python-backend/`, `public/`, `specs/`, `docs/`, `model/`, `dist/`, `dist-electron/`, `release/`) with 1-line descriptions in `README.md`.

**Checkpoint**: Root `README.md` provides visual architecture and clear repository layout.

---

## Phase 4: User Story 2 — Dual-Track Quickstart Guide (Priority: P1)

**Goal**: Provide distinct, clean onboarding instructions for (a) reader app users/developers and (b) RVC voice cloning practitioners.

**Independent Test**: Verify that Track A commands (`npm install`, `npm run dev`) and Track B commands (Python venv, model setup) are clearly demarcated in `README.md`.

### Implementation for User Story 2

- [X] T005 [US2] Add dual-track "Bắt đầu nhanh" section in root `README.md` separating Track A (App Reader & Web/Electron Developer) from Track B (Local RVC Voice Setup), with a clear link to `docs/rvc-voice-setup.md` in `README.md`.

**Checkpoint**: New users have unambiguous onboarding paths for their specific goals.

---

## Phase 5: User Story 4 — Historical Server & Extension Clarification (Priority: P2)

**Goal**: Document the historical roles and technical distinctions between `python-backend/server.py`, root `server.py`, `local-voice-server/` (viXTTS), and `tts-extension/` with code citations and architectural rationale.

**Independent Test**: Review the Architecture Notes section in `README.md`: verify that Flask vs FastAPI, Edge-TTS+RVC vs viXTTS, ports, and extension bindings are explained accurately.

### Implementation for User Story 4

- [X] T006 [US4] Add technical architecture notes in root `README.md` detailing the relationship between `python-backend/server.py`, root `server.py`, `local-voice-server/`, and `tts-extension/` with code citations and historical context in `README.md`.

**Checkpoint**: Codebase history and server roles are transparently documented.

---

## Phase 6: Polish & Cross-Cutting Verification

**Purpose**: Validate visual rendering, link integrity, and ensure zero code regressions.

- [X] T007 Verify Mermaid diagram syntax and GitHub markdown rendering in `README.md`.
- [X] T008 Verify relative link navigation and content completeness between `README.md` and `docs/rvc-voice-setup.md`.
- [X] T009 Verify zero source code modifications in `src/`, `electron/`, and `python-backend/` via `git status --porcelain`.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup (T001)
       │
       ▼
Phase 2: User Story 3 - RVC Extraction (T002) 🎯 Crucial: Must extract before overwriting README
       │
       ▼
Phase 3: User Story 1 - Architecture & Directory Table (T003 - T004)
       │
       ▼
Phase 4: User Story 2 - Dual-Track Quickstart (T005)
       │
       ▼
Phase 5: User Story 4 - Server Clarifications (T006)
       │
       ▼
Phase 6: Polish & Verification (T007 - T009)
```

### Parallel Opportunities

- `T003`, `T004`, `T005`, and `T006` all contribute to sections of `README.md` and can be authored together in a unified, well-structured document.
- `T007`, `T008`, and `T009` verification tasks can execute in parallel.

---

## Implementation Strategy

### MVP First (Extraction + Core Architecture)

1. Complete Phase 1: Setup directory `docs/`.
2. Complete Phase 2: Extract `docs/rvc-voice-setup.md` $\rightarrow$ **Guarantee 0 loss of valuable RVC training data**.
3. Complete Phase 3: Write new root `README.md` with Mermaid diagram and directory table.
4. Complete Phase 4: Add dual-track quickstart.
5. Complete Phase 5: Add historical server analysis.
6. Complete Phase 6: Verify rendering, links, and confirm zero code changes.

---

## Notes

- Every task strictly satisfies the checklist schema: `- [ ] [TaskID] [P?] [Story?] Description with file path`.
- Strictly no edits to application source code in `src/`, `electron/`, or `python-backend/`.
- 100% of the Vietnamese text in the RVC guide must be preserved intact.
