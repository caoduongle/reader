# API Endpoint Contracts: RVC Backend Error Diagnostics & Device Handling

**Feature**: `028-rvc-device-error-handling`  
**Date**: 2026-09-05  

---

## 1. `GET /health`

Checks server health, execution device, and model readiness.

### Request
```http
GET /health HTTP/1.1
Host: localhost:8008
```

### Response Scenarios

#### Scenario A: Model loaded successfully
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": true,
  "model_loaded": true,
  "model_name": "my_voice.pth",
  "index_name": "my_voice.index",
  "model_dir": "E:\\reader\\python-backend\\model",
  "device": "cpu:0"
}
```

#### Scenario B: No model weights present
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": false,
  "reason": "model_missing",
  "model_loaded": false,
  "model_dir": "E:\\reader\\python-backend\\model",
  "error": "Chưa có file model (.pth) trong thư mục python-backend/model."
}
```

#### Scenario C: Model present but initialization failed (corrupted file, CUDA mismatch)
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": false,
  "reason": "model_init_failed",
  "model_loaded": false,
  "model_dir": "E:\\reader\\python-backend\\model",
  "error": "Lỗi khởi tạo model RVC (my_voice.pth): corrupted checkpoint or CUDA unavailable"
}
```

---

## 2. `POST /speak`

Synthesizes Vietnamese speech using the active RVC voice model.

### Request
```http
POST /speak HTTP/1.1
Host: localhost:8008
Content-Type: application/json

{
  "text": "Xin chào, đây là giọng đọc thử nghiệm.",
  "language": "vi"
}
```

### Response Scenarios

#### Scenario A: Synthesis Successful
```http
HTTP/1.1 200 OK
Content-Type: audio/wav

[Raw RIFF WAV Audio Stream]
```

#### Scenario B: Model Not Loaded / Missing (503 Service Unavailable)
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "error": "Chưa có model giọng RVC (.pth) trong thư mục python-backend/model. Vui lòng copy file .pth (và .index nếu có) vào thư mục python-backend/model/ rồi restart server."
}
```

#### Scenario C: Model Initialization Failed Earlier (503 Service Unavailable)
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "error": "Model RVC chưa sẵn sàng do lỗi khởi tạo: corrupted checkpoint. Vui lòng kiểm tra terminal server.py."
}
```

#### Scenario D: Synthesis Exception during Processing (500 Internal Server Error)
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Đã xảy ra lỗi khi tổng hợp giọng nói: CUDA out of memory"
}
```
