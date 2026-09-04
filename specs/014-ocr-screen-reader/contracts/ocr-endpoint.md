# API Contract: POST /api/ocr

**Feature**: `014-ocr-screen-reader`  
**Host**: `http://127.0.0.1:3001`  
**Endpoint**: `POST /api/ocr`  

---

## 1. Description
Accepts a base64-encoded image of an on-screen capture, validates payload integrity and API key configuration, and sends the image to Google GenAI (`gemini-2.5-flash`) to extract verbatim plain text without conversational filler or markdown formatting.

---

## 2. Request Headers & Body

### Headers
```http
POST /api/ocr HTTP/1.1
Host: 127.0.0.1:3001
Content-Type: application/json
Origin: http://localhost:3000 (or 'null' in packaged Electron)
```

### Request Body Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "image": {
      "type": "string",
      "description": "Base64 encoded PNG or JPEG image data, with optional data URI prefix",
      "minLength": 1
    }
  },
  "required": ["image"],
  "additionalProperties": true
}
```

### Example Request Body
```json
{
  "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

---

## 3. Responses

### 3.1 Success Response (HTTP 200 OK)
Returned when text is successfully recognized.

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "ok": true,
  "text": "Chương 1: Khởi Đầu Mới\n\nMặt trời vừa ló rạng qua rặng núi xa xa."
}
```

### 3.2 Missing or Invalid Image (HTTP 400 Bad Request)
Returned when `image` is missing, not a string, empty, or exceeds 15MB decoded.

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{
  "ok": false,
  "error": "Dữ liệu hình ảnh không hợp lệ hoặc để trống."
}
```

Or for size limit exceeded:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{
  "ok": false,
  "error": "Kích thước hình ảnh vượt quá giới hạn cho phép (tối đa 15MB)."
}
```

### 3.3 Missing or Unconfigured API Key (HTTP 503 Service Unavailable)
Returned when `GEMINI_API_KEY` is not present in `.env` or has placeholder value.

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json; charset=utf-8

{
  "ok": false,
  "error": "GEMINI_API_KEY is not configured on server. Please add a valid key to your local .env file."
}
```

### 3.4 Gemini API Execution Failure (HTTP 500 Internal Server Error)
Returned when Google Gemini throws an API, quota, or network exception.

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json; charset=utf-8

{
  "ok": false,
  "error": "Lỗi khi xử lý nhận diện chữ: [Gemini Error details]"
}
```