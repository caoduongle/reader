# Implementation Plan: Gemini API Key Security Audit, Server-Side Proxy & SECURITY.md

**Branch**: `006-security-gemini-proxy` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/006-security-gemini-proxy/spec.md`  

---

## Summary

Execute a comprehensive security hardening and audit for Gemini credentials, establish a server-side Express proxy, and draft an authoritative project security policy:
1. **Audit & Secret Verification**: Document all references to `GEMINI_API_KEY`, `process.env`, `import.meta.env`, and `@google/genai`. Confirm `.gitignore` blocks `.env*` and `git log -p` confirms zero leaked credentials in git history.
2. **Implement Server-Side Proxy (`server.js`)**: Create a lightweight, secure Express server that loads `GEMINI_API_KEY` from `.env` via `dotenv` and `@google/genai`, binding strictly to `127.0.0.1:3001` with endpoints for `/health` and `/api/generate`.
3. **Configure Development Proxy**: Configure `vite.config.ts` to proxy `/api` requests to `127.0.0.1:3001` so client code uses clean relative endpoints without exposing credentials.
4. **Author `SECURITY.md`**: Define local server binding rules (`127.0.0.1`), key handling and rotation procedures, and vulnerability reporting protocols.
5. **Verify No Regressions**: Ensure existing document reader and TTS engines (`browser` and `rvc-local`) remain 100% operational.

---

## Technical Context

**Language/Format**: TypeScript / JavaScript (Node.js, Express, ES modules), Markdown  
**Target Files**:
- `server.js` [NEW] (Express proxy server for Gemini API)
- `vite.config.ts` [MODIFY] (Add `/api` proxy rule to `127.0.0.1:3001`)
- `package.json` [MODIFY] (Add `"proxy"` script)
- `SECURITY.md` [NEW] (Root security policy document)
**Primary Dependencies**: `express`, `dotenv`, `@google/genai` (all already present in `package.json`)  
**Testing & Verification**: Proxy endpoint curl validation, AST parsing, `npm run lint` (`tsc --noEmit`), git history audit  
**Constraints**:
- Strictly zero client bundle leakage of secrets
- All local HTTP servers must bind exclusively to `127.0.0.1` (loopback)
- No modification of existing reading functionality in `src/hooks/useTTS.ts`

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Secret Isolation & Hygiene | ✅ Passed | Keys kept strictly on server/Node side; `.env*` excluded by `.gitignore`. |
| II. Loopback Security | ✅ Passed | Servers strictly bound to `127.0.0.1`, mitigating local network exposure. |
| III. Zero Client Bundle Leakage | ✅ Passed | No `VITE_` secret prefixes; client communicates via relative proxy endpoints. |
| IV. Behavioral Non-Regression | ✅ Passed | Existing Web Speech and RVC TTS reader capabilities preserved without alterations. |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-security-gemini-proxy/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Technical research & credential audit inventory
├── data-model.md        # Proxy schemas and security boundary rules
├── quickstart.md        # Verification workflows
├── contracts/           # API contracts
│   └── proxy-contracts.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── server.js            # [NEW] Express server proxy running on 127.0.0.1:3001
├── vite.config.ts       # [MODIFY] Configure dev proxy for /api -> 127.0.0.1:3001
├── package.json         # [MODIFY] Add "proxy": "node server.js" script
├── SECURITY.md          # [NEW] Root security policy & guidelines
└── src/                 # [UNCHANGED] Preserve 100% existing reader hooks & UI
```

---

## Phases & Deliverables

### Phase 1: Security Audit & History Verification
1. Catalog all env references and library imports with line numbers.
2. Confirm `.gitignore` blocks real `.env` files.
3. Validate `git log -p` confirms zero committed secrets.

### Phase 2: Express Gemini Proxy Implementation
1. Create `server.js` using `express`, `dotenv`, and `@google/genai`.
2. Implement `GET /health` and `POST /api/generate` with informative error handling.
3. Add `"proxy": "node server.js"` to `package.json` scripts.
4. Update `vite.config.ts` to proxy `/api` requests to `http://127.0.0.1:3001`.

### Phase 3: Author `SECURITY.md`
1. Draft root `SECURITY.md` covering:
   - Localhost binding (`127.0.0.1:8008` and `127.0.0.1:3001`).
   - `GEMINI_API_KEY` handling, `.env` rules, and rotation instructions.
   - Vulnerability reporting procedures.

### Phase 4: Verification & Regression Check
1. Test proxy `/health` and `/api/generate` endpoints.
2. Run `npm run lint` (`tsc --noEmit`) to verify 0 type errors.
3. Verify client static assets contain zero secrets.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**
