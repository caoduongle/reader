# Implementation Plan: Repository Cleanup, SaaS Decommissioning & Python CORS Hardening

**Branch**: `024-cleanup-saas-cors` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/024-cleanup-saas-cors/spec.md`

---

## Summary

Execute a clean, phased decommissioning of the unused SaaS layer (authentication, documents, admin, Supabase, JWT) from VoxRead, eliminate the startup crash guard in `server.js` that threatened production usage, and fix the CORS preflight wildcard loophole in the Python voice synthesis backend (`python-backend/server.py`). The work is divided into 3 strictly sequenced phases with test gates after each phase:
- **Phase 0**: Fix Python CORS preflight logic to enforce origin whitelisting across all methods; verify via 3 new PyTest cases.
- **Phase 1**: Remove startup crash guards, detach `requireAuth` from active routes, delete 14 obsolete SaaS files/directories (after safety grep), prune unused npm dependencies (`argon2`, `jsonwebtoken`, `cookie-parser`), refactor security tests, and verify all build and test suites pass.
- **Phase 2**: Realign `docs/security.md` with true local single-user defenses, clean `README.md`, and append non-destructive historical notes to older specs.

---

## Technical Context

**Language/Version**: JavaScript (ESM, Node.js 18+ / 22 LTS), TypeScript 5.8 (React 19 Frontend & Electron Main/Preload), Python 3.10.x  
**Primary Dependencies**: `express==4.x`, `helmet==8.x`, `express-rate-limit==8.x`, `zod==4.x`, `@google/genai`, `@mozilla/readability`, `jsdom`, `flask==3.x`, `edge-tts`, `rvc-python==0.1.5`  
**Pruned Dependencies**: `argon2`, `jsonwebtoken`, `cookie-parser`  
**Target Platform**: Windows 10/11 x64 (Desktop Electron & Web App on 127.0.0.1)  
**Project Type**: Single-user local application with Express proxy & Python voice synthesis microservice  
**Performance & Security Goals**: Zero startup crashes without SaaS credentials; 100% CORS origin whitelisting on local services; zero leakage of internal database or auth errors; 100% test pass rate across Vitest and PyTest suites  
**Constraints**:
- Absolute preservation of the 3 active proxy routes (`/api/generate`, `/api/fetch-url`, `/api/ocr`) and `/health`.
- No modification to `electron/`, `lib/ssrfGuard.js`, or any file in `python-backend/` outside `server.py` and `tests/test_server.py`.
- Strict pre-deletion verification (repository-wide grep) before deleting any file.
- Gated phase progression: PyTest passes before Phase 1; all test and build suites pass before Phase 2.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Fail-Safe Local Operation | ✅ Passed | Removing `validateStartupEnv()` and `requireAuth` guarantees local reading functions without cloud credentials. |
| II. Strict Origin Whitelisting | ✅ Passed | Hardcoded `*` in Python preflight is eliminated, enforcing the authorized origin whitelist everywhere. |
| III. Defensive Security Preservation | ✅ Passed | Helmet headers, rate limiting, SSRF guard, magic bytes image verification, and XSS sanitization are 100% retained. |
| IV. Zero Orphaned Dependencies | ✅ Passed | Prunes unneeded native compilation packages (`argon2`) and unused crypto/cookie modules while keeping rate limiters. |
| V. Documentation Integrity & Historical Preservation | ✅ Passed | Rewrites active security documentation to describe truth; preserves past specs (`020`, `021`) as historical records with amendment notes. |

---

## Project Structure

### Documentation (this feature)

```text
specs/024-cleanup-saas-cors/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Technical research & architectural decisions
├── data-model.md        # Phase 1: Endpoint models & state machine
├── quickstart.md        # Phase 1: Testable verification procedures
├── contracts/           # Phase 1: Service contracts
│   ├── python-cors-contract.md
│   └── proxy-endpoints-contract.md
└── checklists/
    └── requirements.md  # Requirements quality checklist
```

### Source Code Touchpoints

```text
reader/
├── python-backend/
│   ├── server.py                                    # [MODIFY] Remove preflight CORS hardcode & hook guard
│   └── tests/test_server.py                         # [MODIFY] Replace preflight test with 3 discrete tests
├── server.js                                        # [MODIFY] Remove validateStartupEnv, requireAuth, SaaS routers, enforceHttps, cookieParser
├── server/
│   ├── middleware/
│   │   ├── rateLimiter.js                           # [MODIFY] Remove authRateLimiter; keep global/ai limiters
│   │   ├── validate.js                              # [MODIFY] Clean schemas
│   │   ├── auth.js                                  # [DELETE]
│   │   ├── botProtection.js                         # [DELETE]
│   │   └── enforceHttps.js                          # [DELETE]
│   ├── validators/
│   │   └── apiSchemas.js                            # [MODIFY] Remove auth/document schemas
│   ├── routes/
│   │   ├── auth.js                                  # [DELETE]
│   │   ├── documents.js                             # [DELETE]
│   │   └── admin.js                                 # [DELETE]
│   ├── lib/
│   │   ├── supabaseAdmin.js                         # [DELETE]
│   │   ├── cookies.js                               # [DELETE]
│   │   └── crypto.js                                # [DELETE]
│   ├── db/
│   │   └── index.js                                 # [DELETE]
│   └── services/
│       └── passwordService.js                       # [DELETE]
├── supabase/                                        # [DELETE directory]
├── src/
│   ├── components/
│   │   ├── AuthGuard.tsx                            # [DELETE]
│   │   └── AdminGuard.tsx                           # [DELETE]
│   └── lib/
│       └── supabaseClient.ts                        # [DELETE]
├── package.json                                     # [MODIFY] Remove argon2, jsonwebtoken, cookie-parser
├── .env.example                                     # [MODIFY] Remove SaaS keys
├── tests/security/
│   ├── adminGuard.test.ts                           # [DELETE]
│   ├── authHardening.test.ts                        # [DELETE]
│   ├── authHeaders.test.ts                          # [DELETE]
│   ├── clientSecrets.test.ts                        # [DELETE]
│   ├── clientSecretsScan.test.ts                    # [DELETE]
│   ├── idorProtection.test.ts                       # [DELETE]
│   ├── rlsIsolation.test.ts                         # [DELETE]
│   ├── rlsTenantIsolation.test.ts                   # [DELETE]
│   ├── sqlInjection.test.ts                         # [DELETE]
│   ├── setup.ts                                     # [DELETE]
│   ├── corsCookies.test.ts                          # [MODIFY] Remove cookie tests
│   ├── webHeaders.test.ts                           # [MODIFY] Remove enforceHttps tests
│   ├── injectionUpload.test.ts                      # [MODIFY] Remove SQL tests
│   ├── inputUpload.test.ts                          # [MODIFY] Remove updateDocumentSchema tests
│   └── rateLimiter.test.ts                          # [MODIFY] Remove authRateLimiter test
├── docs/security.md                                 # [MODIFY] Rewrite to reflect true local security model
└── README.md                                        # [MODIFY] Clean legacy local-voice-server mentions
```

---

## Phases & Deliverables

### Phase 0: Python Backend CORS Hardening
1. Edit `python-backend/server.py`:
   - In `/speak` route OPTIONS branch, remove 3 manual header lines; keep only `return Response(status=204)`.
   - In `_add_cors_headers()`, remove `if "Access-Control-Allow-Origin" not in resp.headers:`.
2. Edit `python-backend/tests/test_server.py`:
   - Replace `test_speak_options_preflight_returns_cors_headers` with:
     - Authorized origin (`http://localhost:3000`) test.
     - Unauthorized origin (`https://trang-la.evil`) test.
     - Missing origin header test.
3. **Phase 0 Review/Test Gate**: Run `pytest python-backend/tests -v`. Confirm all 3 preflight tests and existing tests pass (100%).

### Phase 1: SaaS Layer Removal & Active Route Verification
1. **Edit `server.js`**:
   - Delete `validateStartupEnv()` and call.
   - Remove imports for `requireAuth`, `authRouter`, `documentRouter`, `adminRouter`, `enforceHttps`, `cookieParser`.
   - Remove `app.use(enforceHttps)` and `app.use(cookieParser())`.
   - Remove mounts `/api/auth`, `/api/documents`, `/api/admin`.
   - Remove `requireAuth` from `/api/generate`, `/api/fetch-url`, `/api/ocr`.
2. **Edit shared middleware & schemas**:
   - In `server/middleware/rateLimiter.js`: remove `authRateLimiter`.
   - In `server/validators/apiSchemas.js`: remove auth/document schemas.
3. **Audit and delete 14 obsolete files/directories**:
   - Grep repository before deleting each file to verify zero remaining imports.
   - Delete routes, middleware, libs, db, services, `supabase/`, guards, client.
4. **Prune `package.json` & `.env.example`**:
   - Remove `argon2`, `jsonwebtoken`, `cookie-parser` from `package.json`.
   - Run `npm ci`.
   - Clean `.env.example`.
5. **Clean tests**:
   - Delete 10 purely SaaS test files.
   - Clean 5 shared test files (`corsCookies.test.ts`, `webHeaders.test.ts`, `injectionUpload.test.ts`, `inputUpload.test.ts`, `rateLimiter.test.ts`).
6. **Phase 1 Review/Test Gate**:
   - Run `npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build`, `npm run build:electron`, `pytest python-backend/tests -v`.
   - Report before/after test counts.

### Phase 2: Documentation Harmonization
1. Rewrite `docs/security.md` to reflect true local architecture.
2. Clean `README.md` legacy references.
3. Append historical amendment notes to `specs/020-production-seo-hardening/spec.md` and `specs/021-appsec-audit-hardening/spec.md`.

---

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Complete removal of `requireAuth` | VoxRead has zero user authentication in its UI; keeping `requireAuth` broke production offline usage. | Keeping mock auth in production adds artificial complexity and failure points to local routes. |
| Retaining shared security tests | Active defenses (Helmet, SSRF, Magic bytes, Rate limiting) must remain validated. | Deleting all security test files would drop coverage on active defenses. |
