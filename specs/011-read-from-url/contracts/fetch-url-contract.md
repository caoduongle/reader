# Contract: `POST /api/fetch-url` API Specification

**Feature**: `011-read-from-url`  
**Endpoint**: `POST /api/fetch-url`  
**Base URL**: `http://127.0.0.1:3001` (or proxied `/api/fetch-url`)  

---

## 1. Request Format

### Headers
- `Content-Type: application/json`

### Body Parameters
```json
{
  "url": "https://vietnamnet.vn/bai-viet-mau-123.html"
}
```

---

## 2. Response Formats

### 2.1 Success (HTTP 200)
```json
{
  "ok": true,
  "title": "Tiêu đề bài viết trích xuất",
  "content": "Nội dung văn bản hoàn chỉnh của bài viết...",
  "byline": "Tác giả bài viết (nếu có)",
  "siteName": "vietnamnet.vn"
}
```

### 2.2 Invalid URL (HTTP 400)
```json
{
  "ok": false,
  "error": "Địa chỉ liên kết (URL) không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://."
}
```

### 2.3 Extraction Failed / Non-Article (HTTP 422)
```json
{
  "ok": false,
  "error": "Không thể trích xuất nội dung bài đọc từ trang web này. Trang có thể yêu cầu đăng nhập hoặc chỉ chứa hình ảnh."
}
```

### 2.4 Timeout / Unreachable (HTTP 504 / 502)
```json
{
  "ok": false,
  "error": "Quá thời gian chờ tải trang (10 giây). Vui lòng thử lại sau hoặc kiểm tra đường truyền mạng."
}
```
