# Phase 0 Research: TTS CORS Preflight Options Fix

**Feature**: `019-fix-tts-cors-preflight`  
**Date**: 2026-09-04  
**Target File**: `python-backend/server.py`

---

## 1. Problem Analysis & Root Cause

### Symptoms
When executing `pytest python-backend/tests -v`, the test suite fails on `test_speak_options_preflight_returns_cors_headers`:
```text
AssertionError: assert None == '*'
 where None = get('Access-Control-Allow-Origin')
```

### Root Cause
1. In `python-backend/server.py`, the `speak()` endpoint handles `OPTIONS` with:
   ```python
   if request.method == "OPTIONS":
       return Response(status=204)
   ```
2. The `@app.after_request` hook `_add_cors_headers(resp)` conditionally attaches `Access-Control-Allow-Origin` ONLY IF `request.headers.get("Origin")` is non-empty and present in `allowed_origins` or starts with `chrome-extension://`.
3. In `test_speak_options_preflight_returns_cors_headers(client)`, `client.options("/speak")` dispatches an `OPTIONS` request without an `Origin` header. Because `origin` is `None`, `_add_cors_headers` skips setting `Access-Control-Allow-*` headers entirely, returning only `X-Content-Type-Options` and `X-Frame-Options`.
4. Furthermore, the test explicitly expects wildcard `Access-Control-Allow-Origin: *` and allowed methods containing `POST, OPTIONS`, while the user specification also requires `Access-Control-Allow-Headers: Content-Type, Authorization`.

---

## 2. Technical Decisions

### Decision 1: Explicit Preflight Response Construction in `speak()`
- **Choice**: In `python-backend/server.py`, explicitly construct the preflight `Response(status=204)` with CORS headers directly within `speak()` for `request.method == "OPTIONS"`.
- **Headers**:
  - `Access-Control-Allow-Origin`: `*`
  - `Access-Control-Allow-Methods`: `POST, OPTIONS`
  - `Access-Control-Allow-Headers`: `Content-Type, Authorization`
- **Rationale**: Direct construction guarantees that whenever `OPTIONS /speak` is requested, the contract is immediately satisfied with HTTP 204 and required headers, regardless of client origin header presence.
- **Alternatives Considered**:
  - *Flask-CORS extension*: Adds an unnecessary dependency (`flask-cors`) when the project currently uses lightweight native header handling.
  - *Global wildcard in `_add_cors_headers`*: Could unintentionally broaden CORS across other internal endpoints (`/health`). Keeping it explicit on `/speak` or preserving origin checks for non-preflight responses maintains optimal security posture.

### Decision 2: Guarding Header Overwrite in `_add_cors_headers`
- **Choice**: In `_add_cors_headers(resp)`, check if `Access-Control-Allow-Origin` is already populated. If not, evaluate incoming `Origin` and attach CORS headers as before.
- **Rationale**: Prevents `_add_cors_headers` from overwriting or clearing the preflight headers set by the endpoint. Always appends security headers `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
- **Alternatives Considered**:
  - *Completely replacing `_add_cors_headers`*: Risky as other endpoints or existing `POST` callers rely on existing behavior.

---

## 3. Best Practices & Security Assessment

- **HTTP Status 204**: RFC 7231 specifies 204 No Content as the canonical response code for preflight requests.
- **Header Casing & Format**: All standard CORS headers use camel-hyphen format (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`).
- **Security Invariants**: `X-Content-Type-Options: nosniff` prevents MIME confusion attacks, and `X-Frame-Options: DENY` prevents clickjacking. Both must remain intact across all responses.
