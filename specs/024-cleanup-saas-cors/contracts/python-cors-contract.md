# Python Backend CORS Preflight & Response Contract

**Feature**: `024-cleanup-saas-cors`  
**Service**: `python-backend/server.py` (`http://127.0.0.1:8008`)  
**Status**: Active  

---

## 1. CORS Allowed Origins

A request's `Origin` header is considered **authorized** if and only if:
1. `Origin == "http://localhost:3000"`
2. `Origin == "http://127.0.0.1:3000"`
3. `Origin == "null"` (sent by Electron `file://` scheme in packaged builds)
4. `Origin.startswith("chrome-extension://")`

Any other origin (e.g. `https://trang-la.evil`, `http://malicious.com`) is **unauthorized**.

---

## 2. Preflight (OPTIONS) Contract

### Route: `/speak`
- **Method**: `OPTIONS`
- **Response Status**: `204 No Content`
- **Response Body**: Empty

### Headers:
- **If Origin is Authorized**:
  - `Access-Control-Allow-Origin: <Origin>` (echoes the exact incoming origin; never `*`)
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - `Access-Control-Max-Age: 86400`
- **If Origin is Unauthorized**:
  - `Access-Control-Allow-Origin` MUST NOT be emitted (or is `None`).
- **If Origin is Absent**:
  - `Access-Control-Allow-Origin` MUST NOT be emitted (or is `None`).
