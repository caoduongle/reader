# VoxRead Application Security Architecture & Hardening Guide

This document specifies the security controls and operational practices implemented in the VoxRead backend, database layer, and data communication flow.

---

## 1. Security Architecture Overview

The system implements defense-in-depth across multiple protective tiers:

```mermaid
flowchart TD
    Client[Web SPA / Electron Client] -->|HTTPS Only| Gateway[Express Gateway: server.js]
    Gateway --> Helmet[Security Headers / Helmet]
    Helmet --> RateLimiter[Rate Limiter: 30 req/min AI, 5 req/15m Auth]
    RateLimiter --> Auth[JWT Server-Side Verification: requireAuth]
    Auth --> Validation[Zod Schema Validation & Strict Picking]
    Validation --> Sanitizer[Content Sanitizer: sanitize-html]
    Validation --> UploadGuard[File Magic Bytes & 15MB Ceiling]
    Sanitizer --> DB[(PostgreSQL / Supabase)]
    DB --> RLS[PostgreSQL Row-Level Security: auth.uid = user_id]
    DB --> Crypto[AES-256-GCM / pgcrypto Encryption at Rest]
```

---

## 2. The 20 Implemented AppSec Standards

1. **Hide API Keys**: `GEMINI_API_KEY`, `JWT_SECRET`, and `DATA_ENCRYPTION_KEY` reside exclusively in server environments (`process.env`). `x-powered-by` header disabled.
2. **Purge Git Secrets**: `.gitignore` guards `.env*`, `*.pem`, `*.key`. Automated purge script provided in `scripts/purge-git-secrets.bat`.
3. **Use Public DB Key**: Client uses `VITE_SUPABASE_ANON_KEY` respecting RLS; server uses `SUPABASE_SERVICE_ROLE_KEY` via `server/lib/supabaseAdmin.js`.
4. **Enable Row-Level Security (RLS)**: 100% of tables in `supabase/migrations/20260904_security_hardening.sql` enforce `auth.uid() = user_id`.
5. **Encrypt Sensitive Data**: AES-256-GCM symmetric authenticated encryption implemented in `server/lib/crypto.js` and `pgcrypto` in database.
6. **Server-Side Authentication**: `server/middleware/auth.js` enforces verified JWT tokens via Authorization header or secure cookie.
7. **Lock Record Access (IDOR)**: `server/routes/documents.js` enforces `WHERE id = $1 AND user_id = $2`.
8. **Block Field Tampering**: Strict Zod schemas reject unexpected fields (`role`, `is_admin`). Database triggers raise exceptions if unauthorized updates occur.
9. **Secure Session Cookies**: `server/lib/cookies.js` configures `HttpOnly`, `Secure` (in prod), `SameSite=Lax`.
10. **Hash Passwords**: `server/services/passwordService.js` hashes using Argon2id with 64MB RAM memory-hardness.
11. **Rate Limit Login & APIs**: `server/middleware/rateLimiter.js` applies 30 req/min for AI endpoints and 5 attempts/15min for auth.
12. **Add Bot Protection**: `server/middleware/botProtection.js` checks hidden honeypot fields and verifies Cloudflare Turnstile tokens.
13. **Parameterize Queries**: `server/db/index.js` wraps PostgreSQL connection pool enforcing prepared statements ($1, $2).
14. **Validate All Input**: `server/middleware/validate.js` and `server/validators/apiSchemas.js` validate 100% of request payloads.
15. **Escape User Content**: `server/lib/sanitizer.js` uses `sanitize-html` to strip `<script>`, event handlers, and malicious tags.
16. **Restrict File Uploads**: `server/middleware/uploadGuard.js` validates binary magic bytes, enforces 15MB limit, and assigns UUID names.
17. **Trim API Responses**: `server/middleware/errorHandler.js` strips error stack traces and internal paths in production.
18. **Add Security Headers**: Helmet injects `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.
19. **Force HTTPS**: `server/middleware/enforceHttps.js` redirects HTTP traffic to HTTPS in production.
20. **Scan Dependencies**: `package.json` overrides patch `qs` vulnerabilities; GitHub Actions runs automated weekly audits.

---

## 3. Secret Rotation Procedures

### Rotating JWT Secret
1. Generate new 32+ byte string: `node -e "console.log(crypto.randomBytes(32).toString('base64'))"`
2. Update `JWT_SECRET` in environment variables.
3. Existing client sessions will expire and require re-authentication.

### Rotating Data Encryption Key
1. Generate new 32-byte hex key: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`
2. Set `DATA_ENCRYPTION_KEY_NEW`.
3. Run database migration script to re-encrypt stored records using new key before decommissioning old key.

---

## 4. Cloud & AI API Spend Caps and Budget Alerts (FR-012)

To protect the platform against runaway billing and quota exhaustion:

### Google Cloud / Google AI Studio (Gemini API)
1. **Budget Creation**: Open [Google Cloud Console Billing](https://console.cloud.google.com/billing) -> **Budgets & alerts**.
2. **Hard Spending Limit**: Create a monthly budget (e.g. `$25.00/month`).
3. **Threshold Alerts**:
   - 50% threshold: Notification email sent to platform administrator.
   - 80% threshold: Warning notification to review usage spikes.
   - 100% threshold: Trigger Cloud Functions / Webhook to disable external API calls or throttle non-essential traffic.
4. **Google AI Studio Quota Limits**: Under **API Key settings**, restrict key usage to specific IP addresses and set per-minute request rate caps.

### Supabase Database & Storage Quotas
1. Access **Project Settings** -> **Usage & Billing**.
2. Set a **Spend Cap** enabled on the organization to prevent automatic upgrades to paid tiers upon exceeding free/pro quota boundaries.

---

## 5. Production Build & Deployment Hardening (FR-020)

1. **Vite Production Bundler**:
   - `build.sourcemap: false`: Disallows leaking readable TypeScript sources to the public web.
   - `esbuild.drop: ['console', 'debugger']`: Automatically strips all debug and console outputs from production bundles.
2. **Process Privilege Isolation**:
   - Run Node.js and Python processes as unprivileged non-root users (`uid=1000`) in Docker/systemd environments.
3. **Reverse Proxy SSL/TLS Termination**:
   - Nginx/Caddy fronting the application must enforce TLS 1.3 only with strong AEAD cipher suites.
