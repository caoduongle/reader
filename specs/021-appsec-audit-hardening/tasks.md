# Tasks: AppSec Core Hardening: Auth Ownership (IDOR Defense), Parameterized Queries (SQLi Defense) & Frontend Key Isolation with RLS Protection

**Feature**: `021-appsec-audit-hardening`  
**Spec**: [specs/021-appsec-audit-hardening/spec.md](spec.md)  
**Plan**: [specs/021-appsec-audit-hardening/plan.md](plan.md)  
**Target Date**: 2026-09-04  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish security test scaffolding and runtime environment verification.

- [x] T001 Create security verification test harness configuration in tests/security/setup.ts
- [x] T002 [P] Verify server environment variable validation in server.js (validateStartupEnv)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core security components required before user story integration can begin.

**⚠️ CRITICAL**: Must complete foundational auth extraction and query wrapper before story integration.

- [x] T003 Verify and harden JWT verification and req.user extraction in server/middleware/auth.js
- [x] T004 [P] Ensure query connection wrapper in server/db/index.js enforces parameterized arrays ($1, $2, ...) and rejects non-array params
- [x] T005 [P] Audit and harden Zod schemas in server/validators/apiSchemas.js to reject unexpected fields with .strict()

**Checkpoint**: Foundation ready — User story implementation can now begin.

---

## Phase 3: User Story 1 - Auth Flow & Strict Data Ownership (IDOR Defense) (Priority: P1) 🎯 MVP

**Goal**: Enforce strict server-side token identity and ownership verification on all document and user data routes (doc.userId === req.user.id / WHERE id = $1 AND user_id = $2), returning HTTP 404 on mismatch to prevent ID enumeration.

**Independent Test**:
1. Authenticate as User A and create a document (Doc A).
2. Authenticate as User B.
3. Send requests from User B attempting to read, update, or delete Doc A (GET/PATCH/DELETE /api/documents/:id).
4. Verify HTTP 404 is returned without leaking Doc A's contents or existence.

### Tests for User Story 1
- [x] T006 [P] [US1] Write automated IDOR penetration test in tests/security/idorProtection.test.ts

### Implementation for User Story 1
- [x] T007 [US1] Implement strict ownership verification for GET /api/documents/:id in server/routes/documents.js
- [x] T008 [US1] Implement strict ownership verification and immutability guard for PATCH /api/documents/:id in server/routes/documents.js
- [x] T009 [US1] Implement strict ownership verification for DELETE /api/documents/:id in server/routes/documents.js
- [x] T010 [US1] Verify tenant scoping for collection queries (GET /api/documents) in server/routes/documents.js

**Checkpoint**: User Story 1 complete — IDOR and Broken Access Control defenses operational (MVP Achieved).

---

## Phase 4: User Story 2 - Parameterized Queries & Input Validation (SQLi Defense) (Priority: P2)

**Goal**: Ensure 100% of database queries use parameterized placeholders ($1, $2, ...), with zero string interpolation or concatenation, and pre-query Zod type and length validation.

**Independent Test**:
1. Submit SQL tautologies (' OR '1'='1' --) and injection sequences into document titles and queries.
2. Verify inputs are treated purely as literal data without altering database query syntax.
3. Verify that database error handler suppresses SQL syntax and stack trace leakages in production.

### Tests for User Story 2
- [x] T011 [P] [US2] Write automated SQL injection penetration test suite in tests/security/sqlInjection.test.ts

### Implementation for User Story 2
- [x] T012 [US2] Audit server/db/index.js to guarantee prepared statement binding and logging sanitization
- [x] T013 [US2] Apply Zod input validation middleware across document and search endpoints in server/routes/documents.js
- [x] T014 [US2] Validate error handling in server/middleware/errorHandler.js to sanitize database errors and suppress SQL syntax leakages

**Checkpoint**: User Story 2 complete — Parameterized database queries and injection protections active.

---

## Phase 5: User Story 3 - Frontend Key Isolation & RLS Policy Hardening (Priority: P3)

**Goal**: Restrict frontend client strictly to public anonymous keys (VITE_SUPABASE_ANON_KEY), keep all secrets and connection strings in server-side .env, and enforce 100% RLS on PostgreSQL tables.

**Independent Test**:
1. Grep client assets and build bundle for secret keys (service_role, DATABASE_URL, JWT_SECRET) — confirm 0 matches.
2. Test direct database access using anonymous key to verify RLS blocks unauthorized rows.
3. Verify trigger blocks regular users from modifying role or is_admin.

### Tests for User Story 3
- [x] T015 [P] [US3] Write automated client secret scan test in tests/security/clientSecretsScan.test.ts
- [x] T016 [P] [US3] Write automated RLS policy tenant isolation test in tests/security/rlsTenantIsolation.test.ts

### Implementation for User Story 3
- [x] T017 [US3] Audit src/lib/supabaseClient.ts to ensure only VITE_SUPABASE_ANON_KEY is referenced and no admin/service-role credentials exist
- [x] T018 [US3] Verify database migration supabase/migrations/20260904_security_hardening.sql enforces RLS on all tables (user_profiles, documents, bookmarks, security_audit_logs) and the trigger protect_sensitive_profile_fields prevents privilege escalation
- [x] T019 [US3] Audit server configuration and .env.example to ensure secrets are isolated to server-side only

**Checkpoint**: User Story 3 complete — Frontend secrets isolated and RLS tenant boundaries locked.

---

## Phase 6: Polish & Full Verification

**Purpose**: Full verification of all acceptance criteria, regression prevention, and penetration testing validation.

- [x] T020 [P] Execute complete quickstart penetration testing scenarios defined in specs/021-appsec-audit-hardening/quickstart.md
- [x] T021 Run full security test suite (npx vitest run tests/security/)
- [x] T022 Run complete test suite (npm run test), lint check (npm run lint), and typecheck (npm run typecheck)

---

## Dependencies & Execution Order

### Phase Dependencies

```mermaid
flowchart TD
  P1[Phase 1: Setup] --> P2[Phase 2: Foundational]
  P2 --> P3[Phase 3: US1 - IDOR & Ownership Defense (MVP)]
  P3 --> P4[Phase 4: US2 - Parameterized Queries & SQLi Defense]
  P4 --> P5[Phase 5: US3 - Frontend Key Isolation & RLS]
  P5 --> P6[Phase 6: Polish & Full Verification]
```

- **Setup (Phase 1)**: Independent — test harness & startup validation.
- **Foundational (Phase 2)**: Auth extraction & query wrapper block user stories.
- **User Story 1 (Phase 3 - MVP)**: Ownership enforcement & anti-enumeration (404).
- **User Story 2 (Phase 4)**: Prepared statements & pre-query Zod validation.
- **User Story 3 (Phase 5)**: Client key restriction & PostgreSQL RLS policies.
- **Polish (Phase 6)**: End-to-end penetration testing & regression validation.

---

## Parallel Opportunities

- **Phase 1 (Setup)**: T001 and T002 can run in parallel.
- **Phase 2 (Foundational)**: T004 and T005 can run in parallel.
- **Phase 3 (US1)**: T006 can run in parallel with T007.
- **Phase 4 (US2)**: T011 can run in parallel with T012.
- **Phase 5 (US3)**: T015 and T016 can run in parallel.
- **Phase 6 (Polish)**: T020 can run alongside T021.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (T001 - T002).
2. Complete Phase 2: Foundational (T003 - T005).
3. Complete Phase 3: User Story 1 (T006 - T010).
4. **STOP & VALIDATE**: Run `tests/security/idorProtection.test.ts` to confirm MVP.
5. Proceed to Phase 4 (US2), Phase 5 (US3), and Phase 6 (Polish).
