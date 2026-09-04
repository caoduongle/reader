# Contract: `POST /api/fetch-url` SSRF Validation Extension

**Feature**: `012-proxy-security-packaging` (Part B)  
**Endpoint**: `POST /api/fetch-url`  
**Base URL**: `http://127.0.0.1:3001`  

---

## 1. Request Contract
Unchanged from feature 011.
```json
{
  "url": "http://127.0.0.1:3001/health"
}
```

---

## 2. SSRF Blocked Response (HTTP 400)

When `url` points to `localhost`, loopback, internal intranet (10.x, 172.16-31.x, 192.168.x), cloud metadata (169.254.x), carrier-grade NAT, or resolved DNS to private IPs:

- **HTTP Status**: `400 Bad Request`
- **Headers**:
  - `Content-Type: application/json; charset=utf-8`
- **Body**:
```json
{
  "ok": false,
  "error": "Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."
}
```

---

## 3. Public Web URL Extraction (HTTP 200)

When `url` points to a legitimate public website (e.g. `https://example.com`):

- **HTTP Status**: `200 OK`
- **Body**:
```json
{
  "ok": true,
  "title": "Example Domain",
  "content": "This domain is for use in illustrative examples in documents...",
  "byline": null,
  "siteName": "example.com"
}
```
*(Contract preserved identically to feature 011)*