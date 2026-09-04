# Contract: CORS Whitelist & Preflight Policy

**Feature**: `012-proxy-security-packaging` (Part A)  
**Applies to**: All Express Proxy Routes (`/health`, `/api/generate`, `/api/fetch-url`)  
**Server Host & Port**: `127.0.0.1:3001`  

---

## 1. Allowed Origins Whitelist

| Origin | Context | Description |
|---|---|---|
| `http://localhost:3000` | Vite Dev Server | Local React development environment |
| `http://127.0.0.1:3000` | Vite Dev Server (IP) | Local React development environment via IP |
| `null` | Electron Packaged App | Serialized Origin when loaded via `file://dist/index.html` |

---

## 2. Request & Response Matrix

### Scenario 1: Whitelisted Origin (Preflight `OPTIONS`)
- **Request Headers**:
  - `Origin: http://localhost:3000`
  - `Access-Control-Request-Method: POST`
- **Response**:
  - HTTP Status: `204 No Content`
  - `Access-Control-Allow-Origin: http://localhost:3000`
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`

### Scenario 2: Whitelisted Origin (Actual `POST` / `GET`)
- **Request Headers**:
  - `Origin: http://localhost:3000`
- **Response**:
  - HTTP Status: Dependent on route (e.g. `200 OK`)
  - `Access-Control-Allow-Origin: http://localhost:3000`
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`

### Scenario 3: Non-Whitelisted Origin (Untrusted / Malicious Website)
- **Request Headers**:
  - `Origin: https://trang-doc-hai.evil`
- **Response**:
  - Preflight `OPTIONS`: HTTP `204 No Content`
  - Header `Access-Control-Allow-Origin`: **OMITTED**
  - **Client Browser Behavior**: Web browser automatically aborts cross-origin request; script in `https://trang-doc-hai.evil` cannot read response or send cross-origin payload.

### Scenario 4: Non-Browser Client (Curl, Node.js, Electron Main)
- **Request Headers**:
  - No `Origin` header
- **Response**:
  - HTTP Status: Normal route response
  - `Access-Control-Allow-Origin`: **OMITTED** (CORS does not apply to non-browser contexts)