# Feature Specification: AppSec Core Hardening: Auth Ownership (IDOR Defense), Parameterized Queries (SQLi Defense) & Frontend Key Isolation with RLS Protection

**Feature Branch**: `021-appsec-audit-hardening`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: Comprehensive AppSec Audit covering 3 core vulnerability classes:
1. Auth Flow & Data Ownership (Broken Access Control / IDOR Defense)
2. Parameterized Queries (Database Injection / SQLi Defense)
3. Frontend Key Audit & Row-Level Security (RLS) Policy Hardening

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auth Flow & Strict Data Ownership (IDOR Defense) (Priority: P1) 🎯 MVP

As an authenticated user, I want the system to strictly verify my identity via server-validated session tokens and enforce data ownership checks on every resource request, so that no malicious or unauthorized actor can view, mutate, or delete my private documents, bookmarks, or reading progress by manipulating IDs.

**Why this priority**: Broken Access Control and IDOR (OWASP A01:2021) are the most critical risks to user data confidentiality. If a user can access another user's documents by changing an ID parameter, tenant isolation completely breaks down.

**Independent Test**:
1. Authenticate as User A and create a private document (Doc A).
2. Authenticate as User B (holding a valid JWT for User B).
3. Send requests from User B attempting to read, update, or delete Doc A (`GET /api/documents/:id`, `PATCH /api/documents/:id`, `DELETE /api/documents/:id`).
4. Verify HTTP 404 (Not Found) is returned without leaking Doc A's contents or metadata.

**Acceptance Scenarios**:
1. **Given** an authenticated user holding a valid JWT/cookie, **When** they request any document by ID, **Then** the server verifies that `req.user.id` precisely matches the record's `user_id` before returning data.
2. **Given** an authenticated user requesting a document ID belonging to another user, **When** the query executes, **Then** the server returns HTTP 404 to avoid confirming the existence of the victim's resource.
3. **Given** an unauthenticated request without a valid session token, **When** requesting protected resources, **Then** the request is rejected with HTTP 401 Unauthorized.

---

### User Story 2 - Parameterized Queries & Input Validation (SQLi Defense) (Priority: P2)

As an application user and system administrator, I want all input submitted through web forms and API requests to be treated strictly as data and validated against strict schemas, so that database queries are immune to SQL Injection (SQLi) attacks regardless of the characters entered.

**Why this priority**: Injection flaws (OWASP A03:2021) can compromise entire databases, leak authentication secrets, or cause data destruction. All database operations must execute via parameterized prepared statements without string concatenation.

**Independent Test**:
1. Submit inputs containing SQL metacharacters, tautologies, or injection sequences (e.g. `' OR '1'='1`, `"; DROP TABLE ...`) into document titles, search queries, notes, and profile fields.
2. Verify that input schemas validate and sanitize types and lengths.
3. Verify that database queries treat inputs purely as literal values without altering query syntax or logic.

**Acceptance Scenarios**:
1. **Given** any database query executed by the application backend, **When** user input is included, **Then** it MUST be bound using parameterized placeholders (`$1, $2, ...`) and passed via the query parameter array.
2. **Given** user input submitted to any API route, **When** received by the server, **Then** it is validated against strict Zod schemas before touching the database or storage layer.
3. **Given** a query executed with invalid or non-array parameters, **When** processed by the database wrapper, **Then** the wrapper throws an explicit error and halts execution immediately.

---

### User Story 3 - Frontend Key Isolation & RLS Policy Hardening (Priority: P3)

As a security auditor and platform engineer, I want sensitive database credentials, service-role keys, and admin tokens completely isolated to server-side environments, and all database tables protected by active Row-Level Security (RLS) policies, so that client applications have least-privilege access and cannot bypass tenant boundaries.

**Why this priority**: Exposing service-role or administrative keys to the client (OWASP A02:2021 / A05:2021) bypasses PostgreSQL RLS entirely, granting arbitrary read/write access to all application data.

**Independent Test**:
1. Inspect client environment variables (`VITE_*`), frontend source code, and compiled production assets.
2. Verify that zero master, admin, or service-role keys are exposed in client builds.
3. Execute direct database queries using the public anonymous role/key against sensitive tables (`user_profiles`, `documents`, `bookmarks`, `security_audit_logs`).
4. Verify that RLS policies prevent reading or modifying unauthorized records.

**Acceptance Scenarios**:
1. **Given** the frontend build bundle, **When** searched for secret keys, **Then** only `VITE_SUPABASE_ANON_KEY` with restricted public privileges is present.
2. **Given** sensitive operations (such as elevating a user's role or reading audit logs), **When** attempted via client credentials, **Then** database triggers and RLS policies block the action with an authorization exception.
3. **Given** database connection strings and JWT signing secrets, **When** checked, **Then** they exist exclusively in server-side `.env` and are never referenced in client code.

---

### Edge Cases

- How does the application handle users with deleted accounts attempting to access previously created documents?
  *Token validation fails immediately or database cascade foreign keys cleanly reject access.*
- How does the system handle concurrent updates to the same document?
  *Ownership verification remains atomic per update operation with timestamp tracking.*
- What happens if the database connection fails or is unavailable?
  *The query wrapper logs sanitized error information without leaking connection credentials or SQL stack traces to the client.*

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Server-Side Identity Extraction)**: The server MUST extract the user's identity (`userId`, `role`) strictly from a cryptographically verified JWT or secure server session, never trusting client-supplied user identifiers in headers or request bodies.
- **FR-002 (Strict Resource Ownership Verification)**: Every route retrieving, modifying, or deleting a user-owned resource MUST filter by both the resource ID and the verified `userId` (`WHERE id = $1 AND user_id = $2`).
- **FR-003 (Enumeration Defense)**: When a user attempts to access a resource they do not own, the system MUST return HTTP 404 (Not Found) rather than revealing that the ID exists.
- **FR-004 (100% Parameterized Database Queries)**: All SQL queries executed in backend services MUST use parameterized prepared statements (`$1, $2, ...`) with parameter arrays. Direct string interpolation (`${...}`) or concatenation is strictly prohibited.
- **FR-005 (Input Schema Validation & Sanitization)**: All API endpoints MUST validate incoming payload structure, types, and bounds using Zod schemas before forwarding data to query execution.
- **FR-006 (Zero Client Key Leakage)**: The client application MUST NEVER bundle, import, or reference administrative, service-role, or database master credentials.
- **FR-007 (Public Anon Key Restriction)**: Client-side database SDKs MUST exclusively use the limited public anonymous key (`VITE_SUPABASE_ANON_KEY`).
- **FR-008 (100% RLS Coverage)**: All application tables in PostgreSQL (`user_profiles`, `documents`, `bookmarks`, `security_audit_logs`) MUST have Row-Level Security explicitly enabled (`ENABLE ROW LEVEL SECURITY`).
- **FR-009 (Strict Tenant Isolation Policies)**: RLS policies on user data tables MUST constrain `SELECT`, `INSERT`, `UPDATE`, and `DELETE` strictly to `auth.uid() = user_id`.
- **FR-010 (Field Tampering & Mass Assignment Guard)**: Database triggers MUST reject unauthorized attempts by normal users to alter sensitive columns such as `role` or `is_admin`.
- **FR-011 (Audit Log Immutability)**: The `security_audit_logs` table MUST be insert-only from authenticated/client contexts with public `SELECT` disabled.
- **FR-012 (Sanitized Error Reporting)**: Database errors and internal system exceptions MUST be caught and sanitized by the error handler, returning generic error codes in production without leaking table names, column structures, or query text.

---

## Key Entities

- **UserSession**: Cryptographically signed identity context containing `id`, `email`, `role`, and expiration timestamp.
- **DocumentRecord**: User document entity with attributes `id`, `userId`, `title`, `content`, `sanitizedContent`, `sourceUrl`, `readingProgress`, `createdAt`, `updatedAt`.
- **ParameterizedQuery**: Query specification consisting of a SQL template with positional placeholders (`$1, $2, ...`) and an array of strongly typed values.
- **RLSPolicy**: PostgreSQL access control definition bounding operations per table to authenticated tenant context (`auth.uid()`).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of document and profile API endpoints enforce ownership verification, achieving 0 unauthorized cross-account access instances during automated penetration testing.
- **SC-002**: 100% of database queries use parameterized placeholders with 0 raw SQL string concatenations across the entire backend codebase.
- **SC-003**: 0 administrative or service-role keys present in client build artifacts, verified by automated regex scanning.
- **SC-004**: 100% of PostgreSQL tables enforce active RLS with tenant isolation policies.
- **SC-005**: 100% of injection test vectors (SQL tautologies, union selects, stacked queries) result in clean rejection without database syntax alterations.
- **SC-006**: 100% of automated security test suites pass with zero regressions.

---

## Assumptions

- The authentication layer provides valid JWTs via `Authorization: Bearer <token>` or secure HttpOnly cookies.
- Standalone local deployments without an external PostgreSQL database use in-memory stores that mirror the exact same ownership verification logic.
- Production PostgreSQL database has `pgcrypto` extension enabled and executes migrations with proper schema permissions.
