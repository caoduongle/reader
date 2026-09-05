# Contract: Voice Server Microservice HTTP API

**Base URL**: `http://localhost:8008` (loopback only)

---

## 1. `POST /speak`

Synthesize text into speech via Edge-TTS and convert timbre with RVC.

### Request
- **Headers**:
  - `Content-Type: application/json`
  - `Origin: http://localhost:3000` | `http://127.0.0.1:3000` | `null`
- **Body**:
  ```json
  {
    "text": "Xin chào, đây là giọng đọc AI của tôi.",
    "language": "vi"
  }
  ```

### Responses
- **200 OK**:
  - `Content-Type: audio/wav`
  - Body: Raw WAV audio bytes.
- **400 Bad Request**:
  - `Content-Type: application/json`
  - Body: `{"error": "<reason>"}`
- **503 Service Unavailable**:
  - `Content-Type: application/json`
  - Body:
    ```json
    {
      "error": "Chưa có model giọng RVC (.pth) trong thư mục python-backend/model/. Vui lòng copy file .pth (và .index nếu có) vào thư mục python-backend/model/ rồi restart server."
    }
    ```
- **500 Internal Server Error**:
  - `Content-Type: application/json`
  - Body: `{"error": "Đã xảy ra lỗi khi tổng hợp giọng nói."}`

---

## 2. `OPTIONS /speak`

Preflight CORS check.

### Responses
- **204 No Content**:
  - If Origin is in `{"http://localhost:3000", "http://127.0.0.1:3000", "null"}`:
    - `Access-Control-Allow-Origin: <origin>`
    - `Access-Control-Allow-Methods: POST, OPTIONS`
    - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - If Origin is NOT in whitelist (e.g. `chrome-extension://*` or `https://attacker.com`):
    - No `Access-Control-Allow-*` headers returned.

---

## 3. `GET /health`

Server health check.

### Responses
- **200 OK**:
  - `Content-Type: application/json`
  - Body:
    ```json
    {
      "ok": true,
      "model_loaded": false
    }
    ```
