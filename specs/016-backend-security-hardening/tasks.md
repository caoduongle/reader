# Tasks: Backend & Database Security Hardening ("20 Tiêu chuẩn An toàn Bảo mật")

**Feature**: `016-backend-security-hardening`  
**Spec**: [specs/016-backend-security-hardening/spec.md](file:///e:/reader/specs/016-backend-security-hardening/spec.md)  
**Plan**: [specs/016-backend-security-hardening/plan.md](file:///e:/reader/specs/016-backend-security-hardening/plan.md)  
**Target Date**: 2026-09-04  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependency installation, security overrides, repository secret hygiene, and environment configuration.

- [x] T001 Configure security dependencies (`helmet`, `express-rate-limit`, `zod`, `argon2`, `sanitize-html`, `file-type`, `jsonwebtoken`, `cookie-parser`) and `qs` overrides in `package.json`
- [x] T002 [P] Configure strict secret ignore rules (`.env*`, `*.pem`, `*.key`, `credentials.json`) in `.gitignore`
- [x] T003 [P] Create environment variable specification template and security guidance in `.env.example`
- [x] T004 [P] Create repository secret cleanup automation script using `git-filter-repo` in `scripts/purge-git-secrets.bat`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core security infrastructure, database client, cryptography, and middleware utilities required before implementing any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Implement global error handling and trimmed response middleware (no stack traces in prod) in `server/middleware/errorHandler.js`
- [x] T006 [P] Implement production HTTPS redirection middleware in `server/middleware/enforceHttps.js`
- [x] T007 [P] Implement parameterized PostgreSQL connection pool wrapper in `server/db/index.js`
- [x] T008 [P] Implement AES-256-GCM authenticated encryption/decryption helper in `server/lib/crypto.js`
- [x] T009 [P] Implement secure session cookie configuration helper (`HttpOnly`, `Secure`, `SameSite`) in `server/lib/cookies.js`

**Checkpoint**: Foundation ready — User story implementation can now proceed.

---

## Phase 3: User Story 1 - API Protection, Server Authentication & Header Hardening (Priority: P1) 🎯 MVP

**Goal**: Enforce server-side JWT authentication, rate limiting, and HTTP security headers (`helmet`) on backend proxy routes (`/api/generate`, `/api/fetch-url`, `/api/ocr`).

**Independent Test**:
1. `POST /api/generate` without token returns HTTP 401 Unauthorized.
2. Sending >30 requests within 1 minute from the same IP returns HTTP 429 Too Many Requests.
3. `curl -I http://127.0.0.1:3001/health` confirms `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, and `HSTS`.

### Tests for User Story 1 🧪
- [x] T010 [P] [US1] Create integration test for server-side auth rejection (401) and security headers in `tests/security/authHeaders.test.ts`
- [x] T011 [P] [US1] Create integration test for API rate limiting thresholds (30 req/min) in `tests/security/rateLimiter.test.ts`

### Implementation for User Story 1
- [x] T012 [US1] Implement server-side JWT authentication middleware in `server/middleware/auth.js`
- [x] T013 [US1] Implement multi-tier rate limiting middleware (auth, AI, global) in `server/middleware/rateLimiter.js`
- [x] T014 [US1] Configure Helmet security headers (CSP, HSTS, X-Frame-Options, noSniff) in `server.js`
- [x] T015 [US1] Integrate auth middleware, rate limiters, and response trimmers into proxy routes in `server.js`
- [x] T016 [US1] Harden Python backend CORS, origin whitelist, and error trimming in `python-backend/server.py`

**Checkpoint**: User Story 1 complete — API gateway is fully authenticated, rate limited, and protected with defensive headers (MVP Achieved).

---

## Phase 4: User Story 2 - Database Row-Level Security, IDOR Defense & Safe Parameterization (Priority: P1)

**Goal**: Ensure complete tenant data isolation, prevent IDOR vulnerabilities, block field tampering via database triggers, and enforce parameterized SQL queries.

**Independent Test**:
1. User B querying or modifying User A's document returns 0 rows / 404.
2. Modifying restricted fields (`role`, `is_admin`) in `user_profiles` triggers database exception.
3. SQL injection strings in query parameters are treated strictly as literal data.

### Tests for User Story 2 🧪
- [x] T017 [P] [US2] Create multi-tenant isolation and IDOR test script in `tests/security/rlsIsolation.test.ts`

### Implementation for User Story 2
- [x] T018 [P] [US2] Create SQL migration script enabling RLS on all tables with `auth.uid() = user_id` policies in `supabase/migrations/20260904_security_hardening.sql`
- [x] T019 [US2] Implement database trigger blocking tampering of `role` and `is_admin` fields in `supabase/migrations/20260904_security_hardening.sql`
- [x] T020 [US2] Implement document CRUD endpoints enforcing ownership check (`WHERE id = $1 AND user_id = $2`) in `server/routes/documents.js`
- [x] T021 [US2] Isolate public Supabase client from server-side admin client in `src/lib/supabaseClient.ts` and `server/lib/supabaseAdmin.js`

**Checkpoint**: User Stories 1 AND 2 complete — APIs and database are protected against cross-tenant data leaks and unauthorized mutations.

---

## Phase 5: User Story 3 - Input Validation, Content Escaping & Upload Restrictions (Priority: P2)

**Goal**: Validate all backend request payloads with strict Zod schemas, sanitize scraped and user-provided HTML against XSS, verify file magic bytes, and integrate bot protection.

**Independent Test**:
1. Empty or malformed payload to `/api/generate` or `/api/fetch-url` returns HTTP 400 with detailed schema issues.
2. Web articles containing `<script>` or `onload=` event handlers are sanitized before returning.
3. Uploading executable files disguised as `.png` or files >15MB is rejected with HTTP 400.
4. Populating honeypot field `_hp_website` rejects request immediately with HTTP 400.

### Tests for User Story 3 🧪
- [x] T022 [P] [US3] Create unit tests for Zod validation, XSS sanitization, and magic bytes verification in `tests/security/inputUpload.test.ts`

### Implementation for User Story 3
- [x] T023 [P] [US3] Define strict Zod validation schemas for all endpoints in `server/validators/apiSchemas.js`
- [x] T024 [US3] Implement request validation middleware `validateBody` in `server/middleware/validate.js`
- [x] T025 [US3] Implement HTML content sanitization utility using `sanitize-html` in `server/lib/sanitizer.js`
- [x] T026 [US3] Implement file upload guard with magic bytes detection, 15MB limit, and UUID renaming in `server/middleware/uploadGuard.js`
- [x] T027 [US3] Implement Cloudflare Turnstile token validation and honeypot bot defense in `server/middleware/botProtection.js`
- [x] T028 [US3] Wire validation, sanitization, and upload guards into Express endpoints in `server.js`

**Checkpoint**: User Stories 1, 2, and 3 complete — Complete input validation, XSS defense, upload safety, and bot protection active.

---

## Phase 6: User Story 4 - Authentication Hardening, Password Hashing & Secret Hygiene (Priority: P2)

**Goal**: Hash passwords using memory-hard Argon2id, protect session cookies with `HttpOnly`/`Secure`/`SameSite`, and patch dependency vulnerabilities.

**Independent Test**:
1. Generated password hashes match Argon2id signature (`$argon2id$`) and withstand brute-force attacks.
2. Session cookies contain `HttpOnly`, `Secure`, and `SameSite=Lax`.
3. `npm audit` reports 0 vulnerabilities.

### Tests for User Story 4 🧪
- [x] T029 [P] [US4] Create unit tests for Argon2id password hashing and session cookie verification in `tests/security/authHardening.test.ts`

### Implementation for User Story 4
- [x] T030 [P] [US4] Implement Argon2id password hashing and verification service in `server/services/passwordService.js`
- [x] T031 [US4] Implement authentication routes (login, register, logout) with secure cookie issuance in `server/routes/auth.js`
- [x] T032 [US4] Apply `overrides` in `package.json` to patch moderate `qs` vulnerabilities and verify via `npm audit`
- [x] T033 [US4] Configure automated dependency security scanning workflow in `.github/workflows/security-audit.yml`

**Checkpoint**: All 4 user stories complete — Full end-to-end security hardening achieved across all 20 standards.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting audit, security documentation, and quickstart end-to-end validation.

- [x] T034 [P] Document security architecture, middleware, and key rotation procedures in `docs/security.md`
- [x] T035 Execute end-to-end validation scenarios defined in `specs/016-backend-security-hardening/quickstart.md`
- [x] T036 Run comprehensive test suite (`npm run test`) and lint check (`npm run lint`) to ensure zero regressions

---

## Dependencies & Execution Order

### Phase Dependencies

```mermaid
flowchart TD
  P1[Phase 1: Setup] --> P2[Phase 2: Foundational]
  P2 --> P3[Phase 3: US1 - API Protection & Headers (MVP)]
  P2 --> P4[Phase 4: US2 - Database RLS & IDOR]
  P3 --> P5[Phase 5: US3 - Input Validation & Uploads]
  P4 --> P5
  P2 --> P6[Phase 6: US4 - Auth Hardening & Secrets]
  P3 --> P7[Phase 7: Polish & Quickstart Validation]
  P4 --> P7
  P5 --> P7
  P6 --> P7
```

- **Setup (Phase 1)**: Completed.
- **Foundational (Phase 2)**: Completed.
- **User Story 1 (Phase 3 - MVP)**: Completed.
- **User Story 2 (Phase 4)**: Completed.
- **User Story 3 (Phase 5)**: Completed.
- **User Story 4 (Phase 6)**: Completed.
- **Polish (Phase 7)**: Completed.

---

## Parallel Opportunities

- **Phase 1 (Setup)**: T002, T003, T004 executed in parallel.
- **Phase 2 (Foundational)**: T006, T007, T008, T009 executed concurrently across different files.
- **Phase 3 (User Story 1)**: Tests T010, T011 executed in parallel before implementation.
- **Phase 4 (User Story 2)**: T017 (Test) and T018 (Migration DDL) executed in parallel.
- **Phase 5 (User Story 3)**: T022 (Test) and T023 (Zod schemas) executed in parallel.
- **Phase 6 (User Story 4)**: T029 (Test) and T030 (Argon2id service) executed in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (T001 - T004).
2. Complete Phase 2: Foundational (T005 - T009).
3. Complete Phase 3: User Story 1 (T010 - T016).
4. **STOP & VALIDATE**: Run `curl` checks on `/api/generate` (401 without auth, 429 when rate-limited) and inspect Helmet headers (`X-Content-Type-Options: nosniff`).

### Incremental Delivery
1. Deliver US1 (API Gateway & Headers Hardening) $\rightarrow$ MVP [COMPLETED].
2. Deliver US2 (Database RLS & IDOR Lock) $\rightarrow$ Complete tenant isolation [COMPLETED].
3. Deliver US3 (Zod Validation, Sanitization & Upload Guard) $\rightarrow$ XSS, DoS, and File safety [COMPLETED].
4. Deliver US4 (Argon2id, Session Cookies & Secret Hygiene) $\rightarrow$ Credential & repo security [COMPLETED].
5. Deliver Polish & Quickstart $\rightarrow$ Production-ready release [COMPLETED].
