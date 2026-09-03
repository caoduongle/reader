# Quickstart & Verification Guide: Security Proxy & Policy

**Feature Branch**: `006-security-gemini-proxy`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Proxy Verification Workflows

### Verification 1: Start Express Proxy
```bash
node server.js
```
- **Check**:
  - Console prints: `[Proxy] VoxRead Gemini Proxy running on http://127.0.0.1:3001`
  - Binds strictly to `127.0.0.1`.

---

### Verification 2: Check Health Endpoint
```bash
curl http://127.0.0.1:3001/health
```
- **Expected**:
  ```json
  {"status":"ok","service":"voxread-gemini-proxy","geminiConfigured":false}
  ```
  *(or `geminiConfigured: true` if `.env` contains a key)*.

---

### Verification 3: Verify Missing Key Handling
```bash
curl -X POST http://127.0.0.1:3001/api/generate -H "Content-Type: application/json" -d '{"prompt":"Hello"}'
```
- **Expected**:
  Returns HTTP 503 with informative JSON error indicating `GEMINI_API_KEY` is not configured, without crashing the server.

---

### Verification 4: Verify `SECURITY.md`
- Inspect `SECURITY.md` in repository root.
- Confirm presence of:
  - 127.0.0.1 binding warnings for RVC and proxy servers.
  - API key storage & rotation policies.
  - Responsible disclosure reporting instructions.

---

### Verification 5: Regression & Build Check
```bash
npm run lint
```
- **Expected**: 0 TypeScript errors.
- Existing reading flows (Web Speech and RVC) remain fully operational.
