# Feature Specification: Backend & Application Security Hardening ("20 Tiêu chuẩn An toàn Bảo mật Backend & Cơ sở Dữ liệu")

**Feature Branch**: `016-backend-security-hardening`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: User description: "Bạn là một Kỹ sư Bảo mật Ứng dụng (AppSec Engineer). Hãy tiến hành rà soát mã nguồn backend, cơ sở dữ liệu và cấu hình luồng dữ liệu của dự án trước khi đưa vào hoạt động chính thức theo 20 tiêu chuẩn: 1. Hide API keys, 2. Purge Git secrets, 3. Use public DB key, 4. Enable Row-Level Security (RLS), 5. Encrypt sensitive data, 6. Enforce server-side authentication, 7. Lock record access, 8. Block field tampering, 9. Secure session cookies, 10. Hash passwords, 11. Rate limit login, 12. Add bot protection, 13. Parameterize queries, 14. Validate all input, 15. Escape user content, 16. Restrict file uploads, 17. Trim API responses, 18. Add security headers, 19. Force HTTPS, 20. Scan dependencies. Định dạng phản hồi: Phân tích từng mục theo cấu trúc: Đánh giá rủi ro hiện tại -> Tệp tin liên quan -> Code cấu hình/vá lỗi cụ thể."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - API Protection, Server Authentication & Header Hardening (Priority: P1) 🎯 MVP

As a system administrator and platform owner, I want all backend API endpoints (Gemini proxy, URL parser, OCR screen reader) to enforce strict server-side authentication, rate limiting, and HTTP security headers, so that unauthorized clients and bots cannot abuse services, exhaust API budgets, or mount denial-of-service attacks.

**Why this priority**: Unauthenticated and un-rate-limited backend endpoints represent immediate financial and operational vulnerability (API quota drainage and unauthenticated SSRF abuse).

**Independent Test**:
1. Send an unauthenticated request to `/api/generate`: verify HTTP 401 Unauthorized response.
2. Send >30 requests within 1 minute from the same IP: verify HTTP 429 Too Many Requests response.
3. Inspect HTTP response headers via curl: verify presence of `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.

**Acceptance Scenarios**:
1. **Given** a request without a valid JWT token, **When** calling protected endpoints, **Then** the server rejects the request with HTTP 401.
2. **Given** high-frequency calls exceeding threshold, **When** rate limit triggers, **Then** server returns HTTP 429 with retry-after metadata.
3. **Given** any HTTP traffic, **When** received on production port, **Then** server enforces HTTPS redirection and emits strict HSTS headers.

---

### User Story 2 - Database Row-Level Security, IDOR Defense & Safe Parameterization (Priority: P1)

As an authenticated user, I want my personal documents, bookmarks, and reading progress to be strictly private and inaccessible to other users, so that no unauthorized party can view, modify, or delete my data by tampering with record IDs (IDOR).

**Why this priority**: Data isolation and privacy are core requirements. Without database-level RLS and parameterized access controls, any user could read or alter another user's private library.

**Independent Test**:
1. Authenticate as User A and create a bookmark.
2. Authenticate as User B and attempt to query or update User A's bookmark by ID: verify database returns 0 rows or permission denied.
3. Attempt to inject SQL payloads in query parameters: verify query executes as literal parameterized text with zero SQL syntax alteration.

**Acceptance Scenarios**:
1. **Given** all user-facing database tables, **When** queried by any client, **Then** PostgreSQL Row-Level Security (RLS) restricts access strictly to rows where `auth.uid() = user_id`.
2. **Given** an update payload containing restricted fields (`role`, `is_admin`, `balance`), **When** processed by the server, **Then** restricted fields are stripped and ignored.
3. **Given** any database query, **When** constructed, **Then** parameters are passed strictly via parameterized prepared statements.

---

### User Story 3 - Input Validation, Content Escaping & Upload Restrictions (Priority: P2)

As a security auditor, I want all incoming request bodies to be strictly validated against typed schemas, user-generated content to be sanitized against stored XSS, and uploaded files to be whitelisted and isolated, so that malicious input cannot compromise the server or frontend readers.

**Why this priority**: Prevents Cross-Site Scripting (XSS), Server-Side Request Forgery (SSRF) bypasses, and Arbitrary File Upload vulnerabilities.

**Independent Test**:
1. Submit an invalid payload to `/api/fetch-url` or `/api/ocr`: verify schema validation rejects the request with descriptive HTTP 400.
2. Submit novel text containing `<script>` or event handlers: verify content is escaped or sanitized before storage and rendering.
3. Attempt to upload an executable or oversized file: verify upload rejects invalid MIME types and enforces 15MB ceiling with UUID renaming.

**Acceptance Scenarios**:
1. **Given** an API request with invalid types or unexpected fields, **When** validated by Zod schema, **Then** the request is rejected with specific validation errors.
2. **Given** web articles extracted via URL reader, **When** returned to client, **Then** HTML tags are sanitized and stripped of active executable scripts.
3. **Given** file uploads, **When** received, **Then** files are verified by magic bytes, assigned cryptographic UUID names, and stored in isolated storage.

---

### User Story 4 - Authentication Hardening, Password Hashing & Secret Hygiene (Priority: P2)

As a security engineer, I want passwords to be hashed with memory-hard algorithms (Argon2id/bcrypt), session cookies to have strict flags, and all source code and Git history to be purged of secrets, so that credentials remain safe against credential stuffing and repository leaks.

**Why this priority**: Protects against credential theft, session hijacking, and catastrophic repository leaks.

**Independent Test**:
1. Verify password hashing implementation: verify Argon2id or bcrypt (cost >= 12) is utilized.
2. Inspect session cookies: verify `HttpOnly`, `Secure`, and `SameSite=Lax/Strict` are present.
3. Scan repository history with `git-filter-repo` / secret scanners: verify 0 secrets exist in commit history.

**Acceptance Scenarios**:
1. **Given** user registration or password reset, **When** stored, **Then** passwords are never stored in plaintext and use Argon2id/bcrypt.
2. **Given** authentication sessions, **When** issued, **Then** cookies cannot be accessed by client JavaScript (`HttpOnly`).
3. **Given** client builds, **When** generated, **Then** zero service-role keys or private API tokens exist in client-side bundles.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Hide API keys)**: The system MUST strictly confine private API tokens (e.g. `GEMINI_API_KEY`, service-role keys) to server-side environments and never expose them in client-side bundles or repository code.
- **FR-002 (Purge Git secrets)**: The project MUST maintain `.gitignore` guards for all `.env*` files and provide verified remediation procedures to purge past committed secrets using `git-filter-repo`.
- **FR-003 (Use public DB key)**: Client-side database configurations MUST strictly utilize public/anonymous keys (`VITE_SUPABASE_ANON_KEY`); `SUPABASE_SERVICE_ROLE_KEY` MUST be restricted to backend server processes.
- **FR-004 (Enable Row-Level Security)**: All PostgreSQL/Supabase tables MUST have `ROW LEVEL SECURITY` enabled with policies enforcing `auth.uid() = user_id`.
- **FR-005 (Encrypt sensitive data)**: Sensitive user information (tokens, credentials, personal metadata) MUST be encrypted at rest using AES-256-GCM or `pgcrypto`.
- **FR-006 (Enforce server-side authentication)**: All non-public backend API endpoints MUST validate caller identity on the server via verified JWT tokens.
- **FR-007 (Lock record access)**: Backend endpoints MUST enforce ownership verification (`WHERE id = :id AND user_id = :authUserId`) to prevent Insecure Direct Object References (IDOR).
- **FR-008 (Block field tampering)**: Update handlers MUST enforce strict payload schemas that strip or reject protected system fields (`role`, `is_admin`, `balance`, `created_at`).
- **FR-009 (Secure session cookies)**: Authentication cookies MUST be configured with `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, and appropriate expiration.
- **FR-010 (Hash passwords)**: User passwords MUST be hashed using Argon2id or bcrypt (cost factor >= 12) with unique cryptographic salts.
- **FR-011 (Rate limit login & APIs)**: Sensitive routes (auth, OCR, text generation) MUST enforce rate limiting (e.g., 5 attempts/15min for auth; 30 req/min for AI endpoints).
- **FR-012 (Add bot protection)**: Public forms MUST integrate bot protection (Cloudflare Turnstile token validation or honeypot verification).
- **FR-013 (Parameterize queries)**: All database interactions MUST strictly utilize prepared statements or query builder abstractions with parameterized arguments.
- **FR-014 (Validate all input)**: Backend endpoints MUST validate request bodies, query params, and route parameters using Zod schemas before processing.
- **FR-015 (Escape user content)**: User-provided text and scraped web content MUST be sanitized and escaped prior to storage and rendering to prevent XSS.
- **FR-016 (Restrict file uploads)**: File upload endpoints MUST validate MIME types via magic bytes, enforce a 15MB limit, and assign randomized UUID filenames.
- **FR-017 (Trim API responses)**: API responses MUST filter out internal identifiers, system stack traces, database metadata, and sensitive tokens.
- **FR-018 (Add security headers)**: HTTP responses MUST include standard security headers (`HSTS`, `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- **FR-019 (Force HTTPS)**: The application server MUST redirect all incoming plaintext HTTP connections to HTTPS in production.
- **FR-020 (Scan dependencies)**: Automated dependency vulnerability scanning (`npm audit`, `pip audit`) MUST run regularly, and all moderate/high vulnerabilities must be patched.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 plain API keys, database service-role secrets, or credentials exposed in frontend bundles or Git history.
- **SC-002**: 100% of database tables enforce Row-Level Security (RLS) with zero cross-tenant data leakage in multi-user test scenarios.
- **SC-003**: 100% of protected API endpoints reject unauthenticated or tampered requests with appropriate HTTP 401/403 status.
- **SC-004**: Security header audit score of A+ on security evaluation tools with active HSTS, CSP, and framing protections.
- **SC-005**: 0 high or critical vulnerabilities reported across npm and python dependencies in production builds.

---

## Assumptions

- The backend architecture comprises Node.js Express (`server.js`) acting as an API proxy and security gateway, with Python Flask (`python-backend/server.py`) handling local RVC voice inference.
- Supabase / PostgreSQL provides the persistent cloud database layer when multi-user syncing is activated.
- In desktop Electron packaging, local loopback communication binds strictly to `127.0.0.1` with Origin verification.
