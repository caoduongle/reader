# Implementation Plan: Backend & Database Security Hardening ("20 Tiêu chuẩn An toàn Bảo mật")

**Branch**: `016-backend-security-hardening` | **Date**: 2026-09-04 | **Spec**: [specs/016-backend-security-hardening/spec.md](file:///e:/reader/specs/016-backend-security-hardening/spec.md)

**Input**: Feature specification from `/specs/016-backend-security-hardening/spec.md`

---

## Summary

This plan outlines the systematic hardening of the VoxRead backend, database layer, and data communication flow against 20 industry-standard Application Security (AppSec) benchmarks. The architectural design integrates defense-in-depth across the Node.js Express API gateway (`server.js`), the cloud database layer (PostgreSQL / Supabase RLS and `pgcrypto`), local audio synthesis microservices (`python-backend/server.py`), and CI/CD dependency scanning. Each standard follows the strict evaluation pattern: **Đánh giá rủi ro hiện tại $\rightarrow$ Tệp tin liên quan $\rightarrow$ Code cấu hình/vá lỗi cụ thể**.

---

## Technical Context

**Language/Version**: 
- Node.js >= 20.x (ES Modules)
- TypeScript ~5.8.2
- Python 3.10+ (for Edge-TTS / RVC microservice)
- PostgreSQL 15+ (Supabase cloud database)

**Primary Dependencies**:
- Web Framework & Gateway: `express` (^4.21.2)
- HTTP Security Headers: `helmet` (^8.0.0)
- Rate Limiting & DoS Protection: `express-rate-limit` (^7.5.0)
- Schema Validation: `zod` (^3.24.2)
- Password Hashing: `argon2` (^0.41.1)
- XSS Prevention & Sanitization: `sanitize-html` (^2.14.0)
- Binary File Type Verification: `file-type` (^20.1.0)
- Identity & Session: `jsonwebtoken` (^9.0.2), `cookie-parser` (^1.4.7)
- AI & Reader Services: `@google/genai` (^2.4.0), `@mozilla/readability` (^0.6.0), `jsdom` (^30.0.1)

**Storage**:
- Cloud Database: PostgreSQL with Supabase Row-Level Security (RLS) policies, AES-256 / `pgcrypto` encryption-at-rest.
- Client Cache: IndexedDB (`voxread_db`) for local document caching and offline reading.

**Testing**:
- Unit & Contract Testing: `vitest run`
- API Integration Testing: `supertest`
- Vulnerability Scanning: `npm audit`, `pip-audit`, GitHub Actions CI.

**Target Platform**:
- Node.js API Gateway (bound strictly to `127.0.0.1` locally, reverse-proxied over HTTPS in production)
- Electron Desktop App (`com.voxread.app`)
- Web SPA (Vite + React 19)

**Performance Goals**:
- Middleware security overhead (headers, validation, rate limiter) < 10ms per request.
- Argon2id password hashing execution: 150ms – 300ms (memory-hard, resistant to GPU attacks).
- Readability article extraction & sanitization < 500ms p95.

**Constraints**:
- Absolute isolation of private API keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) from client bundles.
- Zero disruption to local RVC Python audio pipeline (`http://127.0.0.1:8008`).
- Strict 15MB file upload limit with binary magic bytes validation.
- 100% prevention of cross-tenant data access via PostgreSQL RLS.

**Scale/Scope**:
- Complete audit and hardening of all backend endpoints (`/health`, `/api/generate`, `/api/fetch-url`, `/api/ocr`, `/api/auth/*`, `/api/documents/*`, `/api/upload`).
- Protection of 5 database tables with RLS and mass assignment triggers.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Assessment | Status |
| :--- | :--- | :--- |
| **I. Library-First & Modularity** | Security functions are separated into discrete, reusable modules (`server/middleware/auth.js`, `server/lib/crypto.js`, `server/validators/`). | **PASS** |
| **II. CLI & Operational Interfaces** | Automated verification scenarios can be executed directly via standard CLI tools (`npm run test`, `npm audit`, `curl`). | **PASS** |
| **III. Test-First (TDD)** | Test scenarios and expected HTTP status codes (401, 403, 400, 429) are specified in `quickstart.md` before implementation. | **PASS** |
| **IV. Integration Testing** | End-to-end proxy tests and multi-tenant RLS SQL test scenarios are formally defined in `quickstart.md`. | **PASS** |
| **V. Simplicity & YAGNI** | Native Express middleware and standard PostgreSQL RLS are utilized without adding unneeded microservice complexity. | **PASS** |

*Constitution Gate Result*: **ALL CHECKS PASSED**.

---

## Project Structure

### Documentation (this feature)

```text
specs/016-backend-security-hardening/
├── spec.md              # Feature specification with 20 AppSec standards
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output: 20 standards risk & code analysis
├── data-model.md        # Phase 1 output: PostgreSQL DDL, RLS policies, triggers
├── quickstart.md        # Phase 1 output: Executable test & verification scenarios
└── contracts/
    └── security-contracts.md # Phase 1 output: Middleware signatures & Zod schemas
```

### Source Code (repository root)

```text
server.js                          # Main Express gateway entrypoint
server/
├── middleware/
│   ├── auth.js                    # FR-006: Server-side JWT verification
│   ├── rateLimiter.js             # FR-011: Express rate limiting (auth, AI, global)
│   ├── validate.js                # FR-014: Zod request validation middleware
│   ├── botProtection.js           # FR-012: Turnstile & Honeypot verification
│   ├── uploadGuard.js             # FR-016: Magic bytes, 15MB limit, UUID filenames
│   ├── enforceHttps.js            # FR-019: Production HTTPS redirection
│   └── errorHandler.js            # FR-017: Trimmed API responses, no stack traces
├── lib/
│   ├── crypto.js                  # FR-005: AES-256-GCM encryption at rest
│   ├── sanitizer.js               # FR-015: HTML & text sanitization
│   ├── cookies.js                 # FR-009: HttpOnly, Secure, SameSite cookie options
│   └── ssrfGuard.js               # SSRF protection for /api/fetch-url
├── validators/
│   ├── apiSchemas.js              # Zod schemas for /api/generate, /api/fetch-url, /api/ocr
│   └── documentSchemas.js         # FR-008: Strict schemas blocking field tampering
└── db/
    └── index.js                   # FR-013: Parameterized database client pool

supabase/
└── migrations/
    └── 20260904_security_hardening.sql # FR-004, FR-005, FR-008: Tables, RLS, triggers

python-backend/
└── server.py                      # Hardened CORS, error trimming, input length checks

package.json                       # FR-020: Security dependencies & overrides
.gitignore                         # FR-002: Secret guards (.env, .pem, .key)
```

**Structure Decision**: 
The solution extends the existing Express gateway (`server.js`) by modularizing security concerns into `server/middleware/`, `server/lib/`, and `server/validators/`. Database security is implemented as native SQL migrations under `supabase/migrations/` to ensure zero database leakage regardless of client access patterns.

---

## 20-Item Security Architecture Mapping

| Standard | Core Component | Implementation File | Verification Test |
| :--- | :--- | :--- | :--- |
| **1. Hide API keys** | Backend Proxy Isolation | `server.js`, `vite.config.ts` | Code audit, bundle inspection |
| **2. Purge Git secrets** | Git hygiene & `git-filter-repo` | `.gitignore`, `scripts/purge-secrets` | Secret scanning, `.gitignore` test |
| **3. Use public DB key** | Client/Server Client Isolation | `src/lib/supabaseClient.ts` | Inspect client bundle for service role |
| **4. Enable RLS** | PostgreSQL Security Policies | `supabase/migrations/` | Cross-tenant SQL query returns 0 rows |
| **5. Encrypt sensitive data** | AES-256-GCM & `pgcrypto` | `server/lib/crypto.js` | Ciphertext validation in storage |
| **6. Server-side auth** | JWT Verification Middleware | `server/middleware/auth.js` | Missing token returns 401 |
| **7. Lock record access** | IDOR Ownership Checks | `server/routes/documents.js` | Foreign ID access returns 404 |
| **8. Block field tampering** | Strict Zod Schemas | `server/validators/` | Extra fields rejected with 400 |
| **9. Secure session cookies** | HttpOnly / Secure / SameSite | `server/lib/cookies.js` | Inspect `Set-Cookie` header flags |
| **10. Hash passwords** | Argon2id Hashing | `server/services/passwordService.js` | Hash format verification (`$argon2id$`) |
| **11. Rate limit login** | Express Rate Limiters | `server/middleware/rateLimiter.js` | 31st request triggers 429 |
| **12. Add bot protection** | Cloudflare Turnstile + Honeypot | `server/middleware/botProtection.js` | Filled honeypot returns 400 |
| **13. Parameterize queries** | Prepared Statements | `server/db/index.js` | SQL injection payloads evaluated literally |
| **14. Validate all input** | Zod Schema Middleware | `server/middleware/validate.js` | Malformed payload returns 400 with details |
| **15. Escape user content** | `sanitize-html` & DOMPurify | `server/lib/sanitizer.js` | `<script>` stripped from article content |
| **16. Restrict file uploads** | Magic Bytes & 15MB limit | `server/middleware/uploadGuard.js` | Spoofed mime types rejected with 400 |
| **17. Trim API responses** | Error Trimming & DTOs | `server/middleware/errorHandler.js` | Zero stack traces returned in production |
| **18. Add security headers** | Helmet HTTP Headers | `server.js` | HSTS, CSP, X-Frame-Options present in headers |
| **19. Force HTTPS** | TLS Redirection Middleware | `server/middleware/enforceHttps.js` | HTTP request returns 301 to HTTPS |
| **20. Scan dependencies** | `npm audit` & Dependency Overrides | `package.json` | `npm audit` reports 0 vulnerabilities |

---

## Complexity Tracking

> **Constitution Check**: All gates passed without exceptions. No unneeded complexity introduced.
