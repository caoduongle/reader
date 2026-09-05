# API Endpoint Contract: POST /api/fetch-url

**Feature Branch**: `029-fetch-url-hardening`  
**Date**: 2026-09-05  
**Spec**: [spec.md](../spec.md)

---

## Endpoint Details

- **Method**: `POST`
- **Route**: `/api/fetch-url`
- **Content-Type**: `application/json`
- **Authentication**: None (Local Express backend proxy)

---

## Request

### Headers
| Header | Value | Required |
|---|---|---|
| `Content-Type` | `application/json` | Yes |

### Body Parameters
```json
{
  "url": "https://truyen-online.test/chuong-1"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | Absolute URL starting with `http://` or `https://`, length <= 2048 characters. |

---

## Response

### 1. Success (HTTP 200 OK)
Returned when article content is successfully parsed either via Mozilla Readability or Gemini AI fallback.

```json
{
  "ok": true,
  "title": "Chương 1: Khởi Đầu Mới",
  "content": "Mặt trời vừa ló rạng qua rặng núi xa xa. Không khí buổi sớm mai trong lành và tĩnh mịch.\n\nLâm Phong bước ra khỏi căn nhà gỗ, hít một hơi thật sâu. Hôm nay là ngày cậu bắt đầu chuyến hành trình tu tiên.",
  "sanitizedHtml": "<p>Mặt trời vừa ló rạng qua rặng núi xa xa. Không khí buổi sớm mai trong lành và tĩnh mịch.</p><p>Lâm Phong bước ra khỏi căn nhà gỗ, hít một hơi thật sâu. Hôm nay là ngày cậu bắt đầu chuyến hành trình tu tiên.</p>",
  "byline": "Nam Phái",
  "siteName": "truyen-online.test",
  "nextChapterUrl": "https://truyen-online.test/chuong-2"
}
```

*Note*: If extracted via Gemini AI fallback, `byline` is `"AI Extracted"`. If no next chapter link was found in the document, `nextChapterUrl` is omitted (`undefined`).

---

### 2. Client Errors

#### 400 Bad Request
Occurs when the request body fails schema validation, points to internal/private addresses, exceeds redirect limits, specifies non-HTML MIME types, or exceeds the 5MB body size.

- **Missing/Empty URL**:
  ```json
  {
    "ok": false,
    "error": "Địa chỉ liên kết (URL) không được để trống."
  }
  ```
- **Invalid Protocol**:
  ```json
  {
    "ok": false,
    "error": "Địa chỉ liên kết (URL) không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://."
  }
  ```
- **Direct or Redirect SSRF Blocked**:
  ```json
  {
    "ok": false,
    "error": "Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."
  }
  ```
- **Too Many Redirects (> 5 hops)**:
  ```json
  {
    "ok": false,
    "error": "Trang web chuyển hướng quá nhiều lần (tối đa 5 lần)."
  }
  ```
- **Invalid Content-Type (non-HTML)**:
  ```json
  {
    "ok": false,
    "error": "Chỉ hỗ trợ đọc nội dung từ trang web HTML hoặc văn bản."
  }
  ```
- **Payload Too Large (> 5MB)**:
  ```json
  {
    "ok": false,
    "error": "Dung lượng trang web vượt quá giới hạn cho phép (tối đa 5MB)."
  }
  ```

#### 422 Unprocessable Entity
Occurs when the page could be fetched, but contains no article text or less than 100 characters, and Gemini AI fallback cannot extract content or is unconfigured.

```json
{
  "ok": false,
  "error": "Không thể trích xuất nội dung bài đọc từ trang web này. Trang có thể yêu cầu đăng nhập hoặc chỉ chứa hình ảnh."
}
```

#### 502 Bad Gateway
Occurs when the remote server returns an HTTP error status (4xx or 5xx) other than redirect.

```json
{
  "ok": false,
  "error": "Không thể tải trang web (mã lỗi HTTP 404). Trang web có thể bị chặn hoặc không tồn tại."
}
```

#### 504 Gateway Timeout
Occurs when the remote host takes longer than the timeout (15 seconds) to respond or complete streaming.

```json
{
  "ok": false,
  "error": "Quá thời gian chờ tải trang (15 giây). Vui lòng thử lại sau hoặc kiểm tra đường truyền mạng."
}
```
