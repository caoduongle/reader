# Quickstart & Verification Guide: Documentation & System Structure

**Feature Branch**: `004-architecture-docs-rewrite`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Documentation Verification Workflows

### Verification 1: Mermaid Syntax Validation
Confirm that the Mermaid diagram in `README.md` is valid and renderable on GitHub:

1. Open `README.md` in a GitHub markdown previewer or local editor with Mermaid preview support.
2. Verify that the graph renders without red syntax error boxes.
3. Confirm nodes for User, VoxRead (React/Electron), Web Speech API, RVC Local Server, and Gemini API are cleanly arranged.

---

### Verification 2: Lossless Content Check (`docs/rvc-voice-setup.md`)
Confirm that zero instructions from the legacy RVC tutorial were lost:

1. Confirm `docs/rvc-voice-setup.md` exists.
2. Check for the presence of key sections:
   - "Phần A — Train giọng nói trên Google Colab"
   - "Adobe Podcast Enhance Speech" / "resemble-enhance"
   - "Applio – No UI" and "Applio – Full WebUI"
   - "Phần B — Cài & chạy server.py trên máy"
   - "Phần C — Kết nối giọng đọc"
3. Verify that the link in `README.md` (`docs/rvc-voice-setup.md`) navigates directly to this file.

---

### Verification 3: Directory Table Completeness
Verify that all current top-level directories in the workspace are described:

1. Compare `README.md` table against `ls -d */`:
   - `src/`, `electron/`, `python-backend/`, `public/`, `specs/`, `docs/`, `model/`, `dist/`, `dist-electron/`, `release/`.
2. Confirm each directory has exactly one concise line explaining its purpose.

---

### Verification 4: Zero Code Logic Modifications Constraint
Verify that no application code was touched during this task:

```bash
git status --porcelain
```
- **Expected**: Only `README.md`, `docs/rvc-voice-setup.md`, and `specs/004-architecture-docs-rewrite/*` are modified or created.
- Zero changes to `src/`, `electron/`, or `python-backend/`.

---

## 2. Onboarding Track Run Validation

### Test Track A (App Reader & Developer)
```bash
npm install
npm run dev
# Browser opens http://localhost:3000 with interactive reader view
```

### Test Track B (Local RVC Server)
```bash
cd python-backend
python server.py
# Server listens at http://127.0.0.1:8008, GET /health returns {"ok": true}
```
