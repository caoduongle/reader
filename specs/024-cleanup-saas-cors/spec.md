# Feature Specification: Repository Cleanup, SaaS Decommissioning & Python CORS Hardening

**Feature Branch**: `024-cleanup-saas-cors`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "Thực hiện dọn dẹp repo VoxRead theo 3 phase, review/test sau MỖI phase trước khi sang phase tiếp theo. Đây là việc XÓA code đang được import/mount thật trong server.js, không phải xóa code chết đơn thuần — phải cẩn trọng, không được để 3 route thật (/api/generate, /api/fetch-url, /api/ocr) ngừng hoạt động..."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Local Speech Synthesis CORS Preflight (Priority: P1) 🎯 MVP

As a developer or local reader user, I want the Python backend `/speak` route to strictly respect the origin whitelist for CORS preflight (OPTIONS) requests rather than returning wildcard `*`, so that untrusted web origins cannot execute unauthorized cross-origin preflight requests against my local synthesis server.

**Why this priority**: Wildcard `Access-Control-Allow-Origin: *` in `/speak` preflight bypasses the intended origin whitelist configured in `_add_cors_headers` (`http://localhost:3000`, `http://127.0.0.1:3000`, `null`, `chrome-extension://*`), exposing a local cross-origin security loophole.

**Independent Test**:
1. Send an `OPTIONS` request to `http://127.0.0.1:8008/speak` with `Origin: http://localhost:3000`. Verify response status is 204 with `Access-Control-Allow-Origin: http://localhost:3000` and `POST` in allowed methods.
2. Send an `OPTIONS` request to `http://127.0.0.1:8008/speak` with `Origin: https://trang-la.evil`. Verify response status is 204 and `Access-Control-Allow-Origin` header is absent (`None`).
3. Send an `OPTIONS` request without an `Origin` header. Verify response status is 204 and `Access-Control-Allow-Origin` header is absent (`None`).
4. Execute `pytest python-backend/tests -v` and confirm all tests pass.

**Acceptance Scenarios**:
1. **Given** an OPTIONS preflight request from an authorized origin (`http://localhost:3000`), **When** handled by `/speak`, **Then** it returns status 204 with `Access-Control-Allow-Origin` echoing the authorized origin and `Access-Control-Allow-Methods` containing `POST, OPTIONS`.
2. **Given** an OPTIONS preflight request from an unauthorized external origin (`https://trang-la.evil`), **When** handled by `/speak`, **Then** it returns status 204 without any `Access-Control-Allow-Origin` header.
3. **Given** an OPTIONS preflight request without an Origin header, **When** handled by `/speak`, **Then** it returns status 204 without any `Access-Control-Allow-Origin` header.

---

### User Story 2 - Decommission Unused SaaS Layer & Crash-Prone Startup Guards (Priority: P2)

As an end user and developer running VoxRead as a local, single-user desktop/web application, I want the Express proxy server (`server.js`) to completely remove unused multi-tenant SaaS components (auth routes, document persistence, admin dashboard, Supabase database, and crash-prone production JWT checks), while preserving all security controls and functionality on the 3 active local routes (`/api/generate`, `/api/fetch-url`, `/api/ocr`), so that the application never crashes in production due to missing cloud SaaS environment variables and remains lean, secure, and maintainable.

**Why this priority**: VoxRead has no user accounts, login UI, or database in its actual reader interface. However, `server.js` previously imported and mounted `/api/auth`, `/api/documents`, and `/api/admin`, enforced `requireAuth` on local features (blocking offline use), and ran `validateStartupEnv()` which crashed the server in production if `JWT_SECRET` was absent.

**Independent Test**:
1. Start `server.js` with `NODE_ENV=production` and zero Supabase or JWT environment variables configured.
2. Verify that the server boots successfully on `127.0.0.1:3001` without throwing configuration errors.
3. Verify that `/api/generate`, `/api/fetch-url`, `/api/ocr`, and `/health` respond correctly to authorized local requests without demanding authentication tokens.
4. Verify that requests to `/api/auth/*`, `/api/documents/*`, and `/api/admin/*` return 404 Not Found.
5. Run `npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build`, `npm run build:electron` to verify all builds and tests pass cleanly.

**Acceptance Scenarios**:
1. **Given** `server.js` running in production mode, **When** initialized without `JWT_SECRET`, **Then** it starts without crashing.
2. **Given** a local request from the reader frontend to `/api/generate`, `/api/fetch-url`, or `/api/ocr`, **When** received by the proxy, **Then** it is processed through rate limiting, input validation, and sanitization without returning a 401 Unauthorized error.
3. **Given** the codebase after removing SaaS modules, **When** audited for unused dependencies (`argon2`, `jsonwebtoken`, `cookie-parser`), **Then** `npm ci` installs cleanly and `npm run build:electron` bundles without missing module errors.
4. **Given** test suites in `tests/security/`, **When** obsolete SaaS test files are removed and shared test files updated, **Then** `npm test` executes and passes all remaining valid test cases.

---

### User Story 3 - Synchronize Documentation & Security Architecture Truth (Priority: P3)

As a contributor or security auditor reading the project documentation, I want `docs/security.md` and `README.md` to accurately describe the true local application security posture (Helmet headers, origin whitelist, SSRF guard, global rate limiting, input validation) rather than outdated SaaS claims (JWT, RLS, Supabase, Argon2), so that documentation matches reality with zero misleading claims.

**Why this priority**: Retaining documentation about nonexistent SaaS infrastructure causes confusion for maintainers and reviewers.

**Independent Test**:
1. Review `docs/security.md` and confirm it strictly documents the active security architecture for local single-user operations.
2. Review `README.md` and confirm nonexistent paths (e.g. `local-voice-server/`) are removed or updated.
3. Review historical specifications (`specs/020-...`, `specs/021-...`) and confirm an amendment note clarifies the decommissioning of unused server-side SaaS routes.

**Acceptance Scenarios**:
1. **Given** `docs/security.md`, **When** read by a developer, **Then** it describes Helmet CSP, origin whitelisting, SSRF protection on `/api/fetch-url`, rate limiting, and OCR payload validation without mentioning JWT, Supabase, or Argon2.
2. **Given** `README.md`, **When** read, **Then** references to legacy directories (`local-voice-server/`) are removed.

---

### Edge Cases

- **What if an unexpected file in `src/` actually imports a decommissioned component?**  
  *Execution rule: Before deleting each file, a repository-wide grep is performed. If an unexpected reference in `src/` is found, deletion immediately halts and is reported for review.*
- **What if `enforceHttps` or `cookieParser` is needed by one of the 3 active routes?**  
  *Analysis confirmed: None of `/api/generate`, `/api/fetch-url`, `/api/ocr`, or `/health` use cookies (`req.cookies`). The server binds strictly to `127.0.0.1`, so HTTP-to-HTTPS redirect is not applicable. Both middlewares can be safely removed.*
- **What if `express-rate-limit` is accidentally uninstalled?**  
  *`express-rate-limit` MUST NOT be uninstalled because `globalRateLimiter` and `aiRateLimiter` in `server/middleware/rateLimiter.js` protect the 3 active routes.*

---

## Requirements *(mandatory)*

### Functional Requirements

#### Phase 0: Python Backend CORS Hardening
- **FR-001 (Python OPTIONS Cleanup)**: In `python-backend/server.py` `/speak` route, the manual header assignments in `if request.method == "OPTIONS":` MUST be removed, returning only `Response(status=204)`.
- **FR-002 (Unified CORS Hook)**: In `python-backend/server.py` `_add_cors_headers()`, the condition `if "Access-Control-Allow-Origin" not in resp.headers:` MUST be removed so that `_add_cors_headers` consistently handles CORS for all routes and methods.
- **FR-003 (Python Preflight Tests)**: `python-backend/tests/test_server.py` MUST replace `test_speak_options_preflight_returns_cors_headers` with 3 discrete tests:
  1. Authorized origin (`http://localhost:3000`) -> status 204, `Access-Control-Allow-Origin: http://localhost:3000`, `POST` in allowed methods.
  2. Unauthorized origin (`https://trang-la.evil`) -> status 204, no `Access-Control-Allow-Origin` header.
  3. No origin header -> status 204, no `Access-Control-Allow-Origin` header.
- **FR-004 (Phase 0 Test Gate)**: `pytest python-backend/tests -v` MUST pass with 100% success before proceeding to Phase 1.

#### Phase 1: SaaS Layer Removal & Route Preservation
- **FR-005 (Remove Startup Crash Guard)**: `server.js` MUST remove `validateStartupEnv()` and its top-level invocation, preventing crashes when `JWT_SECRET` is not set in production.
- **FR-006 (Remove SaaS Routers & Auth Middleware)**: `server.js` MUST remove imports and mount points for `/api/auth`, `/api/documents`, and `/api/admin`, and remove `requireAuth` from `/api/generate`, `/api/fetch-url`, and `/api/ocr`.
- **FR-007 (Remove Inapplicable Middleware)**: `server.js` MUST remove `enforceHttps` and `cookieParser()` after verifying no remaining routes depend on them.
- **FR-008 (Preserve Active Proxy Features)**: `server.js` MUST retain Helmet headers, origin whitelist CORS middleware, JSON 15MB limit, `/api` global rate limiting, the 3 core routes (`/api/generate`, `/api/fetch-url`, `/api/ocr`), `/health`, and `errorHandler`.
- **FR-009 (Clean Shared Middleware & Schemas)**: `server/middleware/rateLimiter.js` MUST remove `authRateLimiter` while retaining `globalRateLimiter` and `aiRateLimiter`. `server/validators/apiSchemas.js` and `server/middleware/validate.js` MUST remove auth/document schemas while preserving `generateSchema`, `fetchUrlSchema`, and `ocrSchema`.
- **FR-010 (File Deletion with Safety Audit)**: The 14 identified obsolete files/directories MUST be deleted only after grepping the codebase (excluding historical specs) to verify zero remaining imports:
  - `server/routes/auth.js`, `server/routes/documents.js`, `server/routes/admin.js`
  - `server/middleware/auth.js`, `server/middleware/botProtection.js`, `server/middleware/enforceHttps.js`
  - `server/lib/supabaseAdmin.js`, `server/lib/cookies.js`, `server/lib/crypto.js`
  - `server/db/index.js`, `server/services/passwordService.js`
  - `supabase/` (entire directory)
  - `src/components/AuthGuard.tsx`, `src/components/AdminGuard.tsx`, `src/lib/supabaseClient.ts`
- **FR-011 (Prune Dependencies)**: `package.json` MUST remove `argon2`, `jsonwebtoken`, and `cookie-parser`. `express-rate-limit` MUST be retained. `npm ci` MUST run successfully.
- **FR-012 (Clean Environment Manifest)**: `.env.example` MUST remove all JWT, encryption, Supabase, and Turnstile variables, retaining only `NODE_ENV`, `PROXY_PORT`, `HOST`, `GEMINI_API_KEY`, and `APP_URL`.
- **FR-013 (Prune Obsolete Tests & Retain Shared Security Tests)**: Obsolete SaaS test files MUST be removed (`adminGuard.test.ts`, `authHardening.test.ts`, `authHeaders.test.ts`, `clientSecrets.test.ts`, `clientSecretsScan.test.ts`, `idorProtection.test.ts`, `rlsIsolation.test.ts`, `rlsTenantIsolation.test.ts`, `sqlInjection.test.ts`, `tests/security/setup.ts`). Shared test files (`corsCookies.test.ts`, `debugMode.test.ts`, `webHeaders.test.ts`, `injectionUpload.test.ts`, `inputUpload.test.ts`, `rateLimiter.test.ts`) MUST be audited to remove auth-dependent cases while preserving valid tests (Helmet headers, upload validation, rate limiting).
- **FR-014 (Phase 1 Test Gate)**: `npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build`, `npm run build:electron`, and `pytest python-backend/tests -v` MUST all pass before proceeding to Phase 2.

#### Phase 2: Documentation Harmonization
- **FR-015 (Security Doc Realignment)**: `docs/security.md` MUST be rewritten to reflect the true local single-user architecture, removing all references to JWT, RLS, Supabase, and Argon2.
- **FR-016 (README Cleanup)**: `README.md` MUST update or remove legacy references to `local-voice-server/`.
- **FR-017 (Historical Spec Amendment Note)**: A historical note MUST be appended to `specs/020-production-seo-hardening/spec.md` and `specs/021-appsec-audit-hardening/spec.md` clarifying that unused server-side SaaS components were subsequently decommissioned.

---

### Key Entities

- **Python Voice Server (`python-backend/server.py`)**: Local Flask service providing Edge-TTS and RVC voice cloning.
- **Express Proxy Server (`server.js`)**: Local Node.js service providing Gemini AI proxy, web content extraction with SSRF protection, and vision OCR.
- **Security Configuration (`docs/security.md`)**: Architecture specification detailing active defenses for the local application.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Python backend CORS preflight requests from untrusted origins or with no origin header receive a 204 response without an `Access-Control-Allow-Origin` header.
- **SC-002**: 100% of the 3 active local routes (`/api/generate`, `/api/fetch-url`, `/api/ocr`) remain fully operational without requiring authentication tokens or database connections.
- **SC-003**: Starting `server.js` in production mode (`NODE_ENV=production`) without `JWT_SECRET` succeeds with exit code 0 and zero startup crashes.
- **SC-004**: 14 obsolete SaaS files/directories and 3 unused npm dependencies (`argon2`, `jsonwebtoken`, `cookie-parser`) are removed, reducing repository size and dependency attack surface.
- **SC-005**: All validation suites (`npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build`, `npm run build:electron`, `pytest python-backend/tests -v`) pass with 0 errors.

---

## Assumptions

- VoxRead is an offline-capable, single-user local application and does not require multi-tenant authentication, cloud user databases, or session cookies.
- Local voice generation (`/speak`) and proxy features (`/api/generate`, `/api/fetch-url`, `/api/ocr`) operate entirely on local loopback (`127.0.0.1`).
- Historical specifications (`specs/020`, `specs/021`) remain preserved as immutable historical records with optional non-destructive amendment notes.
