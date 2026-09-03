# Tasks: Gemini API Key Security Audit, Server-Side Proxy & SECURITY.md

**Feature**: `006-security-gemini-proxy`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Prerequisite Verification

**Purpose**: Verify repository hygiene and history for environment variables.

- [X] T001 Verify and document git history with `git log -p` and confirm `.gitignore` blocks real `.env` files while preserving `.env.example` in `.gitignore`.

---

## Phase 2: User Story 2 — Server-Side Proxy Safeguard for Gemini API (Priority: P1) 🎯 MVP

**Goal**: Establish a secure Node.js/Express server proxy for Gemini API calls to isolate credentials from client bundles.

**Independent Test**: Start proxy via `node server.js` on `127.0.0.1:3001`: verify `/health` returns status JSON and `/api/generate` handles requests safely without exposing API keys to client bundles.

### Implementation for User Story 2

- [X] T002 [US2] Implement Express proxy server in `server.js` using `express`, `dotenv`, and `@google/genai`, binding strictly to `127.0.0.1:3001` with `/health` and `/api/generate` endpoints in `server.js`.
- [X] T003 [US2] Configure development API proxy in `vite.config.ts` to route `/api` requests to `http://127.0.0.1:3001` and add `"proxy": "node server.js"` script to `package.json`.

**Checkpoint**: Server proxy safeguards Gemini API calls and provides secure `/api/generate` routing.

---

## Phase 3: User Story 3 — Authoritative Security Policy Document (`SECURITY.md`) (Priority: P2)

**Goal**: Provide clear security guidelines on local microservice binding, key handling, and vulnerability reporting.

**Independent Test**: Inspect `SECURITY.md` at repository root: verify presence of localhost binding rules, credential rotation instructions, and vulnerability disclosure methods.

### Implementation for User Story 3

- [X] T004 [US3] Create root `SECURITY.md` defining local server loopback binding policies (`127.0.0.1`), `GEMINI_API_KEY` handling/rotation instructions, and vulnerability reporting procedures in `SECURITY.md`.

**Checkpoint**: Official security policy established at repository root.

---

## Phase 4: Polish & Cross-Cutting Verification

**Purpose**: Verify proxy endpoints and ensure zero regressions to existing document reader features.

- [X] T005 Test Express proxy `/health` and `/api/generate` endpoints on `127.0.0.1:3001`, verifying missing key error handling.
- [X] T006 Run `npm run lint` (`tsc --noEmit`) to confirm 0 TypeScript errors and verify existing reading functionality (`browser` and `rvc-local` TTS) has zero regressions.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup & Audit Verification (T001)
       │
       ▼
Phase 2: User Story 2 - Express Proxy (T002 - T003) 🎯 MVP
       │
       ▼
Phase 3: User Story 3 - SECURITY.md (T004)
       │
       ▼
Phase 4: Polish & Verification (T005 - T006)
```

### Parallel Opportunities

- `T002` (`server.js`) and `T004` (`SECURITY.md`) target separate files and can be authored concurrently.
- `T005` and `T006` verification tasks can execute in parallel.

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Verify `.gitignore` and git history.
2. Complete Phase 2: Implement `server.js` proxy and configure `vite.config.ts`.
3. Complete Phase 3: Author `SECURITY.md`.
4. Complete Phase 4: Verify proxy behavior and test reading flow non-regression.

---

## Notes

- Every task strictly satisfies the checklist schema: `- [ ] [TaskID] [P?] [Story?] Description with file path`.
- Strictly no hardcoding or printing of live API keys in logs or files.
- All local HTTP servers must bind strictly to `127.0.0.1` (loopback).
