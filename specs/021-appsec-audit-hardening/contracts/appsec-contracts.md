# Security Interface Contracts: AppSec Core Hardening

**Feature**: `021-appsec-audit-hardening`  
**Date**: 2026-09-04  

---

## 1. Document Ownership API Contract

### `GET /api/documents/:id`
- **Headers**: `Authorization: Bearer <JWT>` or valid session cookie
- **Request Parameters**: `id`: string (document identifier)
- **Security Validation**:
  1. `requireAuth` extracts `req.user.id`.
  2. Database query: `SELECT * FROM documents WHERE id = $1 AND user_id = $2`.
  3. If not found or ownership mismatch: Return `HTTP 404` with body:
     ```json
     { "ok": false, "error": "Không tìm thấy tài liệu yêu cầu." }
     ```
  4. If owner matches: Return `HTTP 200` with document payload.

### `PATCH /api/documents/:id`
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**: Validated via `updateDocumentSchema`
- **Security Validation**:
  - Ownership checked before mutation.
  - Prohibits altering `userId` or `id`.
  - Returns `HTTP 404` if not owner.

### `DELETE /api/documents/:id`
- **Headers**: `Authorization: Bearer <JWT>`
- **Security Validation**:
  - Ownership checked before deletion.
  - Returns `HTTP 404` if not owner.
  - Returns `HTTP 200` upon successful deletion.

---

## 2. Database Parameterization Contract

### `query(text: string, params: any[]): Promise<QueryResult>`
- **Contract Rules**:
  - `text` must be a non-empty string.
  - `text` must not contain unparameterized dynamic string injections.
  - `params` must be an Array. Passing objects, strings, or undefined for params throws an Error.
  - Executes as a prepared statement on PostgreSQL.

---

## 3. Environment & Key Isolation Contract

| Secret Name | Client Visibility | Server Visibility | Purpose |
|:---|:---|:---|:---|
| `VITE_SUPABASE_ANON_KEY` | **PUBLIC** (bundled) | Read-only | Public anonymous client with RLS restrictions |
| `VITE_SUPABASE_URL` | **PUBLIC** (bundled) | Read-only | Supabase project gateway URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **FORBIDDEN** | **SECRET** (`.env`) | Backend administrative migrations & cron |
| `JWT_SECRET` | **FORBIDDEN** | **SECRET** (`.env`) | Signing and verifying user session tokens |
| `DATABASE_URL` | **FORBIDDEN** | **SECRET** (`.env`) | Direct PostgreSQL connection string |
| `GEMINI_API_KEY` | **FORBIDDEN** | **SECRET** (`.env`) | AI OCR & Generation proxy service |
