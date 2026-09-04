# Research: AppSec Core Vulnerabilities & Architectural Mitigations

**Feature**: `021-appsec-audit-hardening`  
**Date**: 2026-09-04  

---

## 1. Auth Flow & Data Ownership (Broken Access Control / IDOR Defense)

### Decision: Server-Side Identity Extraction & Double-Check Ownership
- **Decision**: All authorization decisions MUST derive strictly from `req.user.id`, decoded from a cryptographically signed session token (JWT) or server session. Every route interacting with user records must query or verify `record.user_id === req.user.id`.
- **Anti-Enumeration Rationale**: When a resource ID is requested that does not belong to the active user, the endpoint MUST return HTTP 404 (Not Found) rather than HTTP 403 (Forbidden).
  - *Why*: An HTTP 403 confirms to an attacker that the resource ID exists in the database (ID Enumeration vulnerability). An HTTP 404 treats unauthorized resources as completely non-existent from the perspective of the requesting tenant.
- **Alternatives Considered**:
  - *Client-supplied user_id*: Passing `userId` in request query params or body. **Rejected** because any user can forge or alter client-side data.
  - *Global admin override in user routes*: Allowing unrestricted queries if a user has an admin flag without explicit admin route auditing. **Rejected**; administrative actions must strictly flow through `/api/admin/*` with audit logging.

---

## 2. Parameterized Queries & Strict Schema Validation (SQLi Defense)

### Decision: 100% Prepared Statements via Wrapper & Pre-DB Zod Validation
- **Decision**: All database interactions must use parameterized prepared statements (`$1, $2, ...`) passed as a decoupled array of values. Direct string concatenation or template literal embedding in SQL strings is strictly forbidden and checked by automated tests.
- **Pre-Validation Rationale**: Using Zod schemas before database queries provides defense-in-depth:
  - String length bounds prevent denial-of-service and buffer abuse.
  - Strict type coercion blocks type confusion.
  - Whitelisted object shapes (`.strict()`) prevent mass assignment and parameter pollution.
- **Alternatives Considered**:
  - *Manual escaping functions (e.g. mysql.escape / addslashes)*: **Rejected** as historically prone to character encoding bypasses and human omission errors.
  - *Heavyweight ORM (TypeORM, Prisma)*: **Rejected** for this application to maintain high throughput, low memory footprint, and transparent SQL security control.

---

## 3. Frontend Key Audit & Row-Level Security (RLS) Protection

### Decision: Strict Anonymous-Only Client Key & Database-Level RLS Enforcement
- **Decision**: The client application must only have access to `VITE_SUPABASE_ANON_KEY`. All master keys, admin keys, database connection URIs, and JWT signing secrets must remain in server-side environment variables (`.env`).
- **RLS Policy Architecture**:
  - 100% table coverage: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
  - Strict tenant policies: `USING (auth.uid() = user_id)`.
  - Database Trigger for Role Protection: `protect_sensitive_profile_fields` ensures that regular users cannot alter `role` or `is_admin` columns via direct client-side Supabase updates.
- **Alternatives Considered**:
  - *Client-side RLS bypass via Edge Functions*: Allowing client to call edge functions with service role. **Rejected** unless strictly guarded by custom server-side authorization.
  - *Application-only authorization without RLS*: Relying only on Express backend without enabling database RLS. **Rejected** because if direct database access (REST/GraphQL) is enabled, un-isolated tables would be completely exposed.
