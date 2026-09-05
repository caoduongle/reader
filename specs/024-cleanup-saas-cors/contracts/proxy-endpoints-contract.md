# Express Proxy Active Endpoints Contract

**Feature**: `024-cleanup-saas-cors`  
**Service**: `server.js` (`http://127.0.0.1:3001`)  
**Status**: Active  

---

## 1. Global Preconditions

1. **Host Binding**: Strictly bound to `127.0.0.1`.
2. **Startup Environment**: Zero requirement for `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, or Supabase credentials. Missing SaaS variables MUST NOT prevent server startup.
3. **Authentication**: All endpoints operate WITHOUT `requireAuth` middleware.
4. **Rate Limiting**:
   - `globalRateLimiter`: 120 req / minute on `/api/*`.
   - `aiRateLimiter`: 30 req / minute on `/api/generate` and `/api/ocr`.
5. **Security Headers**: Helmet CSP, HSTS, noSniff, frameguard (deny), referrer-policy, and permissions-policy emitted on all responses.
6. **Payload Size**: Capped at 15MB.

---

## 2. Active Endpoints Specifications

### 2.1 `/api/generate`
- **Method**: `POST`
- **Rate Limit**: `aiRateLimiter`
- **Input Body**:
  ```json
  {
    "prompt": "string (min 1 non-whitespace char)",
    "model": "optional string (default gemini-2.5-flash)",
    "systemInstruction": "optional string"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "ok": true, "text": "...", "modelUsed": "..." }`
  - `400 Bad Request`: Empty or invalid prompt
  - `503 Service Unavailable`: `GEMINI_API_KEY` missing or invalid

### 2.2 `/api/fetch-url`
- **Method**: `POST`
- **Rate Limit**: `globalRateLimiter`
- **Input Body**:
  ```json
  {
    "url": "http(s) URL string"
  }
  ```
- **Security Check**: Blocks private, intranet, loopback, or metadata addresses via `assertPublicHost`.
- **Responses**:
  - `200 OK`: `{ "ok": true, "title": "...", "content": "...", "sanitizedHtml": "..." }`
  - `400 Bad Request`: Invalid URL, non-HTTP/HTTPS protocol, or private IP (SSRF blocked)
  - `422 Unprocessable Entity`: No readable article extracted
  - `504 Gateway Timeout`: Fetch exceeded 10s timeout

### 2.3 `/api/ocr`
- **Method**: `POST`
- **Rate Limit**: `aiRateLimiter`
- **Input Body**:
  ```json
  {
    "image": "base64-encoded image string"
  }
  ```
- **Security Check**: Validates file magic bytes (`validateBase64Image` allowing PNG, JPEG, WEBP, GIF, BMP).
- **Responses**:
  - `200 OK`: `{ "ok": true, "text": "..." }`
  - `400 Bad Request`: Missing payload, non-image format, or payload > 15MB
  - `503 Service Unavailable`: `GEMINI_API_KEY` missing

### 2.4 Decommissioned Routes
- `/api/auth/*` -> `404 Not Found`
- `/api/documents/*` -> `404 Not Found`
- `/api/admin/*` -> `404 Not Found`
