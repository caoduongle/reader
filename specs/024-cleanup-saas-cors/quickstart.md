# Quickstart & Verification Guide: Repository Cleanup, SaaS Decommissioning & Python CORS Hardening

**Feature**: `024-cleanup-saas-cors`  
**Date**: 2026-09-05  
**Status**: Active  

---

## Overview

This guide provides testable verification procedures across all 3 phases to ensure Python CORS is hardened, the SaaS layer is cleanly removed without collateral damage to active routes, and documentation is updated.

---

## Phase 0 Verification: Python CORS Preflight

Run the updated PyTest suite targeting the CORS preflight tests:

```cmd
python-backend\venv\Scripts\pytest.exe python-backend/tests -v
```

**Expected Outcome**:
- `test_speak_options_preflight_authorized_origin`: Status 204, `Access-Control-Allow-Origin: http://localhost:3000`, `POST` in methods.
- `test_speak_options_preflight_unauthorized_origin`: Status 204, `Access-Control-Allow-Origin` is `None`.
- `test_speak_options_preflight_no_origin`: Status 204, `Access-Control-Allow-Origin` is `None`.
- All tests pass (100%).

---

## Phase 1 Verification: Express Server Cleanup & Route Testing

### Test 1: Production Startup Without JWT_SECRET
Start `server.js` with `NODE_ENV=production` and confirm it boots without throwing:

```powershell
$env:NODE_ENV = "production"
$env:JWT_SECRET = ""
node -e "import('./server.js').then(() => { console.log('PASS: server.js booted successfully without JWT_SECRET in production'); process.exit(0); }).catch(e => { console.error('FAIL:', e); process.exit(1); })"
```
**Expected Outcome**: Logs `PASS: server.js booted successfully without JWT_SECRET in production` and exits with code 0.

### Test 2: Verify Active Proxy Endpoints Without Auth
Verify `/api/generate`, `/api/fetch-url`, and `/api/ocr` do NOT return 401 Unauthorized:

```powershell
# Start server in background on port 3001, then probe /api/generate with empty prompt
$res = Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/generate" -Method Post -Body '{"prompt":""}' -ContentType "application/json" -SkipHttpErrorCheck -StatusCodeVariable "code"
# Expected response is 400 Bad Request (input validation failure), NOT 401 Unauthorized
```

### Test 3: Verify Decommissioned Endpoints Return 404
```powershell
# Requesting /api/auth/me should return 404 Not Found
# Requesting /api/documents should return 404 Not Found
# Requesting /api/admin should return 404 Not Found
```

### Test 4: Full Codebase Quality Gate
Run all lint, typecheck, build, and test suites:

```powershell
npm test
npx tsc --noEmit
npx eslint .
npm run build
npm run build:electron
python-backend\venv\Scripts\pytest.exe python-backend/tests -v
```
**Expected Outcome**: All commands exit with code 0.

---

## Phase 2 Verification: Documentation & Spec Amendments

1. Read `docs/security.md`: Ensure zero references to JWT, Supabase, RLS, or Argon2.
2. Read `README.md`: Ensure `local-voice-server/` references are removed.
3. Read `specs/020-production-seo-hardening/spec.md` and `specs/021-appsec-audit-hardening/spec.md`: Verify historical note is present at the end.
