# Gemini Proxy API Contracts & Endpoint Specifications

**Feature**: `006-security-gemini-proxy`  
**Date**: 2026-09-03  

---

## 1. Endpoint: `GET /health`

- **Purpose**: Verify proxy server liveness and check if `GEMINI_API_KEY` is loaded.
- **Request**: No body, no auth headers.
- **Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "service": "voxread-gemini-proxy",
    "geminiConfigured": true
  }
  ```

---

## 2. Endpoint: `POST /api/generate`

- **Purpose**: Authenticated generation proxy for Gemini models.
- **Request**:
  - Headers: `Content-Type: application/json`
  - Body:
    ```json
    {
      "prompt": "Vui lòng tóm tắt đoạn văn sau...",
      "model": "gemini-2.5-flash"
    }
    ```
- **Responses**:
  - **200 OK** (Successful generation):
    ```json
    {
      "ok": true,
      "text": "Tóm tắt nội dung...",
      "modelUsed": "gemini-2.5-flash"
    }
    ```
  - **400 Bad Request** (Missing prompt):
    ```json
    {
      "ok": false,
      "error": "Prompt is required"
    }
    ```
  - **503 Service Unavailable** (API key not configured):
    ```json
    {
      "ok": false,
      "error": "GEMINI_API_KEY is not configured on server. Please set it in .env"
    }
    ```

---

## 3. SECURITY.md Document Contract

`SECURITY.md` at repository root must contain three mandatory sections:
1. **Chính sách lắng nghe dịch vụ cục bộ (Local Server Binding Policy)**:
   - Warning that `server.py` (port 8008) and `server.js` (port 3001) must only bind to `127.0.0.1`.
2. **Quản lý khóa bí mật & GEMINI_API_KEY (API Key Management Policy)**:
   - Rules for `.env` exclusion in `.gitignore`.
   - Never prefix secrets with `VITE_`.
   - Key rotation and revocation instructions.
3. **Báo cáo lỗ hổng bảo mật (Vulnerability Reporting)**:
   - Contact channels and disclosure policies.
