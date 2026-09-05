# API Contract: Voice Synthesis Endpoint

**Feature Branch**: `031-rvc-infer-error-handling`  
**Endpoint**: `POST /speak`  
**Base URL**: `http://localhost:8008` (Default port)

---

## POST /speak

Synthesizes speech using Edge-TTS followed by RVC model voice transformation.

### Request

- **Headers**:
  - `Content-Type`: `application/json`
- **Body**:
```json
{
  "text": "Xin chào, đây là giọng đọc thử nghiệm.",
  "language": "vi"
}
```

### Responses

#### 200 OK
Audio synthesis succeeded.
- **Headers**:
  - `Content-Type`: `audio/wav`
- **Body**: Binary WAV audio stream.

#### 400 Bad Request
Missing or invalid input parameters.
- **Headers**:
  - `Content-Type`: `application/json`
- **Body**:
```json
{
  "error": "Thieu 'text' trong request"
}
```
or
```json
{
  "error": "Độ dài văn bản vượt quá giới hạn tối đa (10,000 ký tự)."
}
```

#### 500 Internal Server Error (RVC Pipeline Failure)
Internal pipeline failure occurred in `vc_single` (e.g., shape mismatch, index corrupted, audio processing failure).
- **Headers**:
  - `Content-Type`: `application/json`
- **Body**:
```json
{
  "error": "Đã xảy ra lỗi khi tổng hợp giọng nói: Lỗi pipeline RVC: <actual_pipeline_error_details>"
}
```
*Note: Under no circumstances should this endpoint return a crash trace containing `'tuple' object has no attribute 'dtype'`.*

#### 503 Service Unavailable
No RVC voice model loaded.
- **Headers**:
  - `Content-Type`: `application/json`
- **Body**:
```json
{
  "error": "Chưa có model giọng RVC (.pth) trong thư mục python-backend/model/..."
}
```
