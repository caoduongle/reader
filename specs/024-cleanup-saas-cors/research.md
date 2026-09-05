# Technical Research & Architectural Decisions: Repository Cleanup, SaaS Decommissioning & Python CORS Hardening

**Feature**: `024-cleanup-saas-cors`  
**Date**: 2026-09-05  
**Status**: Completed  

---

## 1. Python Flask CORS Preflight Normalization

### Context & Problem
In `python-backend/server.py`, the `/speak` endpoint handled OPTIONS requests by manually constructing a 204 response and hardcoding:
```python
resp.headers["Access-Control-Allow-Origin"] = "*"
resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
```
Furthermore, the global `@app.after_request` hook (`_add_cors_headers`) checked:
```python
if "Access-Control-Allow-Origin" not in resp.headers:
    # Whitelist logic here...
```
Because the preflight branch in `/speak` already set `Access-Control-Allow-Origin`, `_add_cors_headers` was bypassed during OPTIONS requests, returning a wildcard `*` to any origin instead of enforcing the configured whitelist (`http://localhost:3000`, `http://127.0.0.1:3000`, `null`, `chrome-extension://*`).

### Decision
1. In `/speak`, remove manual header manipulation and return pure `Response(status=204)`.
2. In `_add_cors_headers`, remove the `if "Access-Control-Allow-Origin" not in resp.headers:` guard so that every response passes through the whitelist validator.
3. In `python-backend/tests/test_server.py`, replace `test_speak_options_preflight_returns_cors_headers` with 3 discrete tests verifying authorized origins, untrusted origins, and missing Origin headers.

### Rationale
- Flask's `@app.after_request` executes on all responses (including 204 No Content).
- Centralizes CORS policy in a single hook, eliminating code duplication and potential wildcard leakage.
- Disallows unauthorized external origins (`https://trang-la.evil`) from receiving CORS approval.

---

## 2. Express Server De-SaaSification & Startup Crash Prevention

### Context & Problem
VoxRead is an offline-capable, single-user desktop/web application. There is no user authentication, account management, or cloud database in the user interface.
However, `server.js` imported and mounted `/api/auth`, `/api/documents`, and `/api/admin`, enforced `requireAuth` on local features (`/api/generate`, `/api/fetch-url`, `/api/ocr`), and ran `validateStartupEnv()`:
```javascript
export function validateStartupEnv() {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('[Security Critical] JWT_SECRET must be at least 32 characters in production.');
    }
  }
}
```
If an end user runs the application in production without configuring a 32-character `JWT_SECRET`, the server crashes immediately upon launch. Furthermore, legitimate frontend requests to `/api/generate`, `/api/fetch-url`, and `/api/ocr` were rejected with 401 Unauthorized in production because the frontend never generates or stores JWT tokens.

### Decision
1. Remove `validateStartupEnv()` and its invocation from `server.js`.
2. Remove `requireAuth` from `/api/generate`, `/api/fetch-url`, and `/api/ocr`.
3. Remove imports and mount points for `authRouter`, `documentRouter`, and `adminRouter`.
4. Remove `enforceHttps` (server binds to `127.0.0.1:3001` on loopback; HTTPS redirect is inapplicable).
5. Remove `cookieParser()` (no active route reads `req.cookies`).
6. Retain all active protections: `helmet()`, CORS origin whitelist (`ALLOWED_ORIGINS`), JSON 15MB limit, `/api` `globalRateLimiter`, `aiRateLimiter`, SSRF guard, magic bytes image verification, and `errorHandler`.

### Rationale
- Eliminates production crashes and unblocks the 3 genuine application features.
- Keeps defensive security (Helmet headers, rate limiting, SSRF guard, input validation) fully active without phantom authentication overhead.

---

## 3. Dependency & File Decommissioning Audit

### Context & Problem
Dead and uncalled SaaS modules in `server/`, `supabase/`, and `src/` add codebase bloat, increase maintenance cost, and introduce heavy native dependencies like `argon2`.

### Decision
1. Delete 14 obsolete files/directories:
   - `server/routes/auth.js`, `server/routes/documents.js`, `server/routes/admin.js`
   - `server/middleware/auth.js`, `server/middleware/botProtection.js`, `server/middleware/enforceHttps.js`
   - `server/lib/supabaseAdmin.js`, `server/lib/cookies.js`, `server/lib/crypto.js`
   - `server/db/index.js`, `server/services/passwordService.js`
   - `supabase/` (entire directory)
   - `src/components/AuthGuard.tsx`, `src/components/AdminGuard.tsx`, `src/lib/supabaseClient.ts`
2. Remove unused npm dependencies from `package.json`:
   - `argon2` (native C++ binary)
   - `jsonwebtoken`
   - `cookie-parser`
   - Retain `express-rate-limit` (required by `rateLimiter.js`).
3. Clean `.env.example` of all JWT, Supabase, and Turnstile secrets.

### Safety Verification
Before deleting each file, a repository-wide grep confirms zero residual imports in `src/`, `electron/`, or `server.js`.

---

## 4. Test Suite Refactoring & Preservation Strategy

### Context & Problem
Existing security test suites in `tests/security/` mix pure SaaS tests (e.g. Argon2 password hashing, Supabase RLS isolation, JWT header tampering) with valid security tests (e.g. Helmet security headers, magic bytes verification, XSS sanitization, rate limiting). Deleting all security tests blindly would degrade test coverage on active defenses.

### Decision
1. Delete 10 purely SaaS test files:
   `adminGuard.test.ts`, `authHardening.test.ts`, `authHeaders.test.ts`, `clientSecrets.test.ts`, `clientSecretsScan.test.ts`, `idorProtection.test.ts`, `rlsIsolation.test.ts`, `rlsTenantIsolation.test.ts`, `sqlInjection.test.ts`, `setup.ts`.
2. Refactor and retain 6 shared security test files:
   - `corsCookies.test.ts`: Remove cookie tests; retain CORS whitelist tests and rate limiter middleware checks.
   - `debugMode.test.ts`: Retain production error masking and Vite drop console checks.
   - `webHeaders.test.ts`: Remove `enforceHttps` tests; retain Helmet HTTP security header tests.
   - `injectionUpload.test.ts`: Remove `query` SQL tests; retain magic bytes file upload tests.
   - `inputUpload.test.ts`: Remove `updateDocumentSchema` tests; retain `generateSchema`, `fetchUrlSchema`, and XSS sanitization tests.
   - `rateLimiter.test.ts`: Remove `authRateLimiter` test; retain `globalRateLimiter` and `aiRateLimiter` tests.
   - `xssDefense.test.ts`: Retain untouched (tests content sanitization and HTML escaping).

### Rationale
Ensures the test suite remains robust and validates every active defense while eliminating false failures from deleted routes.
