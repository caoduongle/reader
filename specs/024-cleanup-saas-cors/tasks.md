# Tasks: Repository Cleanup, SaaS Decommissioning & Python CORS Hardening

**Feature**: `024-cleanup-saas-cors`  
**Input**: Feature specification from `specs/024-cleanup-saas-cors/spec.md` and design artifacts  
**Status**: Ready for Implementation  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline measurement and environment verification

- [X] T001 Record baseline test counts across Vitest (`npm test`: 121 tests, 25 files) and PyTest (`pytest python-backend/tests -v`: 5 tests)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core integrity check of active routes and repository boundaries before making deletions

- [X] T002 Verify active routes in `server.js` (`/api/generate`, `/api/fetch-url`, `/api/ocr`) and confirm `lib/ssrfGuard.js`, `electron/`, and Python backend boundaries are intact

**Checkpoint**: Foundation ready — Phase 0 execution can begin

---

## Phase 3: User Story 1 - Secure Local Speech Synthesis CORS Preflight (Priority: P1) 🎯 MVP (Phase 0)

**Goal**: Enforce origin whitelisting on Python backend CORS preflight (OPTIONS) requests, eliminating wildcard `*` leakage.

**Independent Test**: Send OPTIONS requests to `http://127.0.0.1:8008/speak` with whitelisted origin (returns 204 with echoed origin), malicious origin (returns 204 with no CORS header), and no origin (returns 204 with no CORS header).

### Implementation for User Story 1 (Phase 0)

- [X] T003 [US1] Remove hardcoded `Access-Control-Allow-Origin = "*"` and manual preflight headers from `/speak` route in `python-backend/server.py`
- [X] T004 [US1] Remove `if "Access-Control-Allow-Origin" not in resp.headers:` guard from `_add_cors_headers` in `python-backend/server.py`
- [X] T005 [US1] Replace preflight test with 3 discrete tests (authorized origin, unauthorized origin, no origin) in `python-backend/tests/test_server.py`
- [X] T006 [US1] Execute Phase 0 review gate via `pytest python-backend/tests -v` and confirm 100% pass rate before proceeding to Phase 1

**Checkpoint**: Phase 0 complete and verified — Python CORS security is hardened.

---

## Phase 4: User Story 2 - Decommission Unused SaaS Layer & Crash-Prone Startup Guards (Priority: P2) (Phase 1)

**Goal**: Remove all unused SaaS code, unblock active routes from `requireAuth`, remove startup crash guards, delete dead files and dependencies, and refactor security tests.

**Independent Test**: `server.js` boots with `NODE_ENV=production` without `JWT_SECRET`; `/api/generate`, `/api/fetch-url`, `/api/ocr` respond to local calls without 401 Unauthorized; full test and build suites pass.

### Implementation for User Story 2 (Phase 1)

- [X] T007 [US2] Remove `validateStartupEnv()` definition and invocation from `server.js`
- [X] T008 [US2] Remove `requireAuth` middleware from `/api/generate`, `/api/fetch-url`, and `/api/ocr` in `server.js`
- [X] T009 [US2] Remove imports and mounts for `/api/auth`, `/api/documents`, `/api/admin`, `enforceHttps`, and `cookieParser()` in `server.js`
- [X] T010 [P] [US2] Remove `authRateLimiter` from `server/middleware/rateLimiter.js` while retaining `globalRateLimiter` and `aiRateLimiter`
- [X] T011 [P] [US2] Remove document and auth schemas from `server/validators/apiSchemas.js` and `server/middleware/validate.js` while retaining `generateSchema`, `fetchUrlSchema`, and `ocrSchema`
- [X] T012 [US2] Execute repository-wide grep safety audit to verify zero residual imports for the 14 decommissioned SaaS files/directories
- [X] T013 [US2] Delete the 14 verified obsolete SaaS files and directories (`server/routes/*`, `server/middleware/{auth,botProtection,enforceHttps}.js`, `server/lib/{supabaseAdmin,cookies,crypto}.js`, `server/db/index.js`, `server/services/passwordService.js`, `supabase/`, `src/components/{AuthGuard,AdminGuard}.tsx`, `src/lib/supabaseClient.ts`)
- [X] T014 [US2] Remove `argon2`, `jsonwebtoken`, and `cookie-parser` from `package.json` and execute `npm ci`
- [X] T015 [US2] Remove obsolete SaaS environment variables (`JWT_SECRET`, Supabase, Turnstile) from `.env.example`
- [X] T016 [US2] Delete 10 purely SaaS test suites in `tests/security/` (`adminGuard.test.ts`, `authHardening.test.ts`, `authHeaders.test.ts`, `clientSecrets.test.ts`, `clientSecretsScan.test.ts`, `idorProtection.test.ts`, `rlsIsolation.test.ts`, `rlsTenantIsolation.test.ts`, `sqlInjection.test.ts`, `setup.ts`)
- [X] T017 [US2] Refactor shared security test files (`corsCookies.test.ts`, `debugMode.test.ts`, `webHeaders.test.ts`, `injectionUpload.test.ts`, `inputUpload.test.ts`, `rateLimiter.test.ts`) to prune auth cases while preserving active defenses
- [X] T018 [US2] Execute Phase 1 review gate: run `npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build`, `npm run build:electron`, `pytest python-backend/tests -v`, and report before/after test counts before proceeding to Phase 2

**Checkpoint**: Phase 1 complete and verified — SaaS layer is eliminated and all 3 active routes are intact and operational.

---

## Phase 5: User Story 3 - Synchronize Documentation & Security Architecture Truth (Priority: P3) (Phase 2)

**Goal**: Harmonize documentation and specifications with actual local single-user architecture.

**Independent Test**: `docs/security.md` describes Helmet, origin whitelist, SSRF, and rate limiters with zero mention of JWT/Supabase; `README.md` has no legacy server references; historical specs contain clear amendment notes.

### Implementation for User Story 3 (Phase 2)

- [X] T019 [P] [US3] Rewrite `docs/security.md` to document true local single-user defenses (Helmet CSP, CORS whitelist, SSRF guard, rate limiters, input validation)
- [X] T020 [P] [US3] Update `README.md` to remove legacy mentions of `local-voice-server/`
- [X] T021 [US3] Append historical decommissioning amendment notes to `specs/020-production-seo-hardening/spec.md` and `specs/021-appsec-audit-hardening/spec.md`
- [X] T022 [US3] Execute Phase 2 review gate: verify documentation link integrity and confirm test suites pass

**Checkpoint**: Phase 2 complete and verified — documentation accurately reflects the codebase.

---

## Phase 6: Polish & Verification

**Purpose**: Execute end-to-end verification and stage commits

- [X] T023 Execute complete validation suite in `specs/024-cleanup-saas-cors/quickstart.md`
- [X] T024 Stage and commit all cleanups and tests to git repository

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on T001 — verifies baseline boundaries.
- **User Story 1 / Phase 0 (Phase 3)**: Depends on Phase 2 — strictly gated by T006 before Phase 1 begins.
- **User Story 2 / Phase 1 (Phase 4)**: Depends on T006 completion — strictly gated by T018 before Phase 2 begins.
- **User Story 3 / Phase 2 (Phase 5)**: Depends on T018 completion.
- **Polish (Phase 6)**: Depends on completion of all user stories.

### Parallel Opportunities

- Within Phase 4: `T010` (rateLimiter.js) and `T011` (apiSchemas.js) can run in parallel.
- Within Phase 5: `T019` (docs/security.md) and `T020` (README.md) can run in parallel.

---

## Implementation Strategy

### Sequential Phased Delivery
1. **Phase 0**: Execute T001–T006 → PyTest verification → Review Gate.
2. **Phase 1**: Execute T007–T018 → Vitest + Build + PyTest verification → Review Gate (report before/after test counts).
3. **Phase 2**: Execute T019–T022 → Documentation review → Final Verification (T023–T024).
