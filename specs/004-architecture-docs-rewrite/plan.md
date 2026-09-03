# Implementation Plan: Architecture Documentation Rewrite & RVC Guide Extraction

**Branch**: `004-architecture-docs-rewrite` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/004-architecture-docs-rewrite/spec.md`  

---

## Summary

Restructure the repository's documentation to accurately reflect the modern **VoxRead** application:
1. **Extract RVC Training Guide**: Move the legacy 254-line Vietnamese Google Colab & RVC training tutorial from root `README.md` to [`docs/rvc-voice-setup.md`](../../docs/rvc-voice-setup.md), preserving 100% of original text, formatting, and technical details without cuts or translation.
2. **Rewrite Root `README.md`**: Create a modern, welcoming project overview featuring:
   - Visual GitHub-compatible Mermaid architecture diagram showing user flows, UI clients, TTS engines, and audio delivery.
   - Comprehensive directory mapping table explaining every top-level folder in 1 concise line.
   - Dual-track "Bắt đầu nhanh" (Quickstart) separated for (a) Application users/developers and (b) RVC voice cloning users.
   - Transparent architecture analysis of `python-backend/server.py` vs root `server.py` vs `local-voice-server/` with code citations and clear historical context.
3. **Preserve Code Integrity**: Strictly limit changes to documentation; zero modifications to application logic in `src/`, `electron/`, or `python-backend/`.

---

## Technical Context

**Language/Format**: GitHub Flavored Markdown, Mermaid.js  
**Target Documents**:
- `README.md` (root project overview & portal)
- `docs/rvc-voice-setup.md` (deep RVC training & configuration guide)
**Primary Dependencies**: None (Pure documentation refactoring)  
**Testing & Verification**: Mermaid syntax validation, markdown link checking, quickstart track verification, `git status` check confirming 0 source code modifications  
**Constraints**:
- Lossless extraction: zero details or Colab links removed from the original RVC text
- GitHub-compatible Mermaid syntax: strictly use `flowchart TD` with quoted node labels
- Strict scope constraint: no code logic modifications allowed

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Documentation Accuracy & Transparency | ✅ Passed | Accurately describes VoxRead React/Electron app and clarifies historical server relationships. |
| II. Lossless Content Migration | ✅ Passed | 100% of original Vietnamese RVC setup text moved to `docs/rvc-voice-setup.md` intact. |
| III. GitHub Renderer Compatibility | ✅ Passed | Mermaid syntax strictly follows GitHub-compliant syntax rules without raw HTML. |
| IV. Zero Source Code Regression | ✅ Passed | Strictly restricted to documentation; 0 code files in `src/`, `electron/`, or `python-backend/` edited. |

---

## Project Structure

### Documentation (this feature)

```text
specs/004-architecture-docs-rewrite/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Technical research and server analysis
├── data-model.md        # Document schemas and directory models
├── quickstart.md        # Verification workflows
├── contracts/           # Structural schemas
│   └── doc-contracts.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Layout

```text
reader/
├── README.md               # [MODIFY] Rewrite with VoxRead overview, Mermaid diagram, directory table, dual quickstart
├── docs/
│   └── rvc-voice-setup.md  # [NEW] Complete 100% original Vietnamese RVC setup & Colab guide
├── src/                    # [UNCHANGED] React frontend source code
├── electron/               # [UNCHANGED] Electron desktop main process
├── python-backend/         # [UNCHANGED] Canonical Python Flask RVC microservice
├── specs/                  # [UNCHANGED / ADDED] Spec-Kit specifications
└── package.json            # [UNCHANGED] Dependencies and scripts
```

---

## Phases & Deliverables

### Phase 1: Extract RVC Setup Guide to `docs/rvc-voice-setup.md`
1. Create `docs/` directory.
2. Transfer the entire original Vietnamese RVC guide from root `README.md` to `docs/rvc-voice-setup.md`.
3. Verify that 100% of the text (Google Colab links, Applio settings, resemble-enhance script, server parameters) is preserved with exact fidelity.

### Phase 2: Write New Root `README.md`
1. Draft project introduction: VoxRead as an intelligent e-reader with offline capabilities and personalized voice cloning.
2. Embed GitHub-compatible Mermaid architecture diagram (`flowchart TD`) showing:
   - User interaction $\rightarrow$ Client shells (React web, Electron desktop, legacy extension).
   - Client shells $\rightarrow$ TTS engines (Web Speech API, local RVC Flask microservice, Gemini TTS API).
   - Local RVC pipeline (Edge-TTS base $\rightarrow$ RVC PyTorch transformation).
   - Output presentation (synchronized audio stream + sentence highlighting).
3. Construct the directory mapping table with 1 concise line per folder.
4. Structure the "Bắt đầu nhanh" section into:
   - **Nhóm 1**: Chạy ứng dụng đọc sách (Node.js, `npm install`, `npm run dev`, `npm run electron:dev`).
   - **Nhóm 2**: Cài đặt giọng đọc RVC riêng (Python venv, model weights, `python server.py`, link to `docs/rvc-voice-setup.md`).
5. Include the architectural analysis and historical clarification section for `python-backend/server.py` vs root `server.py` vs `local-voice-server/`.

### Phase 3: Verification & Polish
1. Validate Mermaid diagram rendering.
2. Test relative markdown links between `README.md` and `docs/rvc-voice-setup.md`.
3. Verify that `git status` confirms zero code modifications in `src/`, `electron/`, or `python-backend/`.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**
