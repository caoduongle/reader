# Quickstart & Penetration Testing Guide: AppSec Core Hardening

**Feature**: `021-appsec-audit-hardening`  
**Date**: 2026-09-04  

---

## 1. Automated Security Test Suites

Execute all security tests:
```bash
npm run test tests/security/
```

Expected output:
- All 12 security test files pass (100% green).
- Tests cover:
  - `clientSecrets.test.ts`: Scans code & bundle for leaked private keys.
  - `rlsIsolation.test.ts`: Validates RLS policies and tenant boundaries.
  - `injectionUpload.test.ts`: Validates parameterized query and SQL injection defense.
  - `authHardening.test.ts`: Validates Argon2id password hashing and session tokens.
  - `adminGuard.test.ts`: Validates RBAC protection on administrative routes.

---

## 2. Manual Penetration Testing Scenarios

### Scenario A: IDOR Cross-Tenant Access Verification
1. Log in as **User A**: Obtain `token_user_a`.
2. Create Document 1 under User A: Note `doc_id_1`.
3. Log in as **User B**: Obtain `token_user_b`.
4. Attempt to fetch Document 1 using User B's credentials:
   ```bash
   curl -X GET "http://127.0.0.1:3001/api/documents/{doc_id_1}" \
        -H "Authorization: Bearer {token_user_b}"
   ```
5. **Expected Result**: HTTP 404 Not Found (`{ "ok": false, "error": "Không tìm thấy tài liệu yêu cầu." }`).
   *Verification*: No document metadata or content is disclosed to User B.

---

### Scenario B: SQL Injection Resilience Verification
1. Send a request with SQL tautology payloads:
   ```bash
   curl -X POST "http://127.0.0.1:3001/api/documents" \
        -H "Authorization: Bearer {token_user_a}" \
        -H "Content-Type: application/json" \
        -d '{"title": "'\'' OR '''1'''='''1''' --", "content": "Test content"}'
   ```
2. **Expected Result**: The title is stored as the literal string `' OR '1'='1' --` without altering any database queries or affecting other records.

---

### Scenario C: Frontend Secret Audit Verification
1. Run a scan across all client files and build output for service role or admin patterns:
   ```bash
   grep -ri "service_role" src/ public/ dist/
   grep -ri "DATABASE_URL" src/ public/ dist/
   ```
2. **Expected Result**: 0 matches found in client-facing files. Only references in `tests/` or `server/` are permitted.
