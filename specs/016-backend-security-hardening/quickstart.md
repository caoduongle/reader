# Phase 1: Security Hardening Quickstart & Verification Guide

**Feature**: `016-backend-security-hardening`  
**Purpose**: Step-by-step runnable guide to verify that all 20 AppSec security protections are active and operating correctly.

---

## 1. Prerequisites & Environment Setup

Ensure your local `.env` has the required security keys:
```env
# Backend Security Keys
PORT=3001
NODE_ENV=development
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
DATA_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
CLOUDFLARE_TURNSTILE_SECRET_KEY=test-turnstile-secret
```

Start the backend server:
```bash
npm run proxy
```

---

## 2. Automated Test & Audit Commands

Run dependency vulnerability audit:
```bash
npm audit
```
*Expected Outcome*: 0 vulnerabilities (all `qs` issues resolved via overrides).

Run backend security test suite:
```bash
npm run test
```
*Expected Outcome*: 100% tests passing across authentication, rate limiting, validation, and SSRF defense.

---

## 3. Step-by-Step Penetration & Verification Scenarios

### Scenario 1: Verify Security Headers (FR-018)
Check that `helmet` has injected standard defensive headers.

**Command**:
```bash
curl -I http://127.0.0.1:3001/health
```

**Expected Response Headers**:
```text
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
```

---

### Scenario 2: Enforce Server-Side Authentication (FR-006)
Attempt to call protected `/api/generate` without a valid Bearer token.

**Command**:
```bash
curl -X POST http://127.0.0.1:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello Gemini"}'
```

**Expected Response**:
```json
HTTP/1.1 401 Unauthorized
{
  "ok": false,
  "error": "Yêu cầu xác thực. Vui lòng cung cấp Authorization header hợp lệ (Bearer token)."
}
```

---

### Scenario 3: Rate Limiting & DoS Defense (FR-011)
Execute rapid bursts to verify that the rate limiter triggers on the 31st request within 1 minute.

**Command (PowerShell)**:
```powershell
1..35 | ForEach-Object {
  curl.exe -s -o /dev/null -w "%{http_code}`n" -X POST http://127.0.0.1:3001/api/generate `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer valid_test_token" `
    -d '{"prompt": "test"}'
}
```

**Expected Outcome**:
- Requests 1 to 30: Return `200 OK` (or `503` if Gemini key unconfigured)
- Requests 31 to 35: Return `429 Too Many Requests` with header `Retry-After: <seconds>`

---

### Scenario 4: Input Validation via Zod Schemas (FR-014)
Send an empty prompt or unexpected field type to verify schema rejection.

**Command**:
```bash
curl -X POST http://127.0.0.1:3001/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid_test_token" \
  -d '{"prompt": ""}'
```

**Expected Response**:
```json
HTTP/1.1 400 Bad Request
{
  "ok": false,
  "error": "Dữ liệu yêu cầu không hợp lệ.",
  "issues": [
    {
      "path": "prompt",
      "message": "Prompt không được để trống"
    }
  ]
}
```

---

### Scenario 5: Bot Protection & Honeypot Trigger (FR-012)
Simulate a bot filling out the hidden honeypot field `_hp_website`.

**Command**:
```bash
curl -X POST http://127.0.0.1:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "spambot@example.com",
    "password": "Password123!",
    "_hp_website": "http://spamsite.com"
  }'
```

**Expected Response**:
```json
HTTP/1.1 400 Bad Request
{
  "ok": false,
  "error": "Xác thực bot không thành công."
}
```

---

### Scenario 6: Magic Bytes File Upload Guard (FR-016)
Attempt to upload an executable or script disguised as an image (`malware.exe` renamed to `sample.png`).

**Command**:
```bash
curl -X POST http://127.0.0.1:3001/api/upload \
  -H "Authorization: Bearer valid_test_token" \
  -F "file=@malware.exe;type=image/png"
```

**Expected Response**:
```json
HTTP/1.1 400 Bad Request
{
  "ok": false,
  "error": "Định dạng file không được phép: phát hiện nội dung không phải image/jpeg, image/png hoặc application/pdf."
}
```

---

### Scenario 7: Database Row-Level Security (RLS) Isolation (FR-004, FR-007)
Using Supabase SQL editor or migration runner, execute cross-tenant query:

**SQL Command**:
```sql
-- Authenticate as User A (mock auth.uid() = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

-- User A creates a document
INSERT INTO public.documents (title, content, sanitized_content, user_id)
VALUES ('Tài liệu bí mật của User A', 'Nội dung riêng tư', 'Nội dung riêng tư', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Switch context to User B
SET LOCAL "request.jwt.claims" = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

-- User B attempts to read User A's document
SELECT * FROM public.documents WHERE title = 'Tài liệu bí mật của User A';
```

**Expected SQL Output**:
`0 rows returned`. User B receives zero records due to PostgreSQL RLS policy enforcement.
