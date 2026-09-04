# HTTP Contracts: TTS Backend Service

**Feature**: `019-fix-tts-cors-preflight`  
**Base URL**: `http://localhost:8008`

---

## 1. `OPTIONS /speak` (CORS Preflight)

Client preflight probe to verify cross-origin access and permitted request methods/headers.

### Request
```http
OPTIONS /speak HTTP/1.1
Host: localhost:8008
Origin: http://localhost:3000
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```
*(Note: Client may omit Origin or Access-Control-Request-* headers in synthetic/test calls)*

### Response (Contract)
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

---

## 2. `POST /speak` (Speech Synthesis)

Converts input text to customized RVC speech output.

### Request
```http
POST /speak HTTP/1.1
Host: localhost:8008
Content-Type: application/json

{
  "text": "Xin chào thế giới.",
  "language": "vi"
}
```

### Success Response
```http
HTTP/1.1 200 OK
Content-Type: audio/wav
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

<binary WAV audio bytes>
```

### Error Responses
1. **Missing or blank text**:
   ```http
   HTTP/1.1 400 Bad Request
   Content-Type: application/json
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY

   {"error": "Thieu 'text' trong request"}
   ```
2. **Text length > 10,000 characters**:
   ```http
   HTTP/1.1 400 Bad Request
   Content-Type: application/json
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY

   {"error": "Độ dài văn bản vượt quá giới hạn tối đa (10,000 ký tự)."}
   ```

---

## 3. `GET /health` (Health & Readiness)

### Response
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

{
  "ok": true,
  "model_loaded": true
}
```
