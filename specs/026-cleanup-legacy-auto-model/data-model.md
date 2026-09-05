# Data Model: Server State & Model Auto-Discovery

## State Lifecycle

```
[Server Start]
      │
      ▼
Scan `python-backend/model/`
      │
      ├─── Found `.pth`? ──── NO ───► `rvc = None`
      │                               Log console warning
      │                               Health `model_loaded: false`
      │                               `/speak` returns HTTP 503
      │
      └─── YES
            │
            ▼
      Select first sorted `.pth` as `MODEL_PATH`
      Select first sorted `.index` (or `""`) as `INDEX_PATH`
      Initialize `rvc = RVCInference(...)`
      Health `model_loaded: true`
      `/speak` synthesizes audio
```

## Model Discovery Schema

```python
class ModelDiscoveryResult:
    model_path: Optional[str]   # Full path to .pth file, or None
    index_path: str             # Full path to .index file, or ""
```

## CORS Policy Model

| Origin | Allowed? | Reason |
|---|---|---|
| `http://localhost:3000` | Yes | Local React dev server |
| `http://127.0.0.1:3000` | Yes | Local loopback IP |
| `null` | Yes | Electron local `file://` origin |
| `chrome-extension://*` | No | Decommissioned architecture |
| `https://*` (external) | No | Prevent cross-site scripting/theft |

## HTTP Status Codes

| Endpoint | Condition | Code | Payload |
|---|---|---|---|
| `POST /speak` | Normal synthesis | 200 | Binary `audio/wav` |
| `POST /speak` | Empty/missing text | 400 | `{"error": "Thieu 'text' trong request"}` |
| `POST /speak` | Text > 10,000 chars | 400 | `{"error": "Độ dài văn bản vượt quá..."}` |
| `POST /speak` | Model not loaded (`rvc is None`) | 503 | `{"error": "Chưa có model giọng RVC (.pth)..."}` |
| `POST /speak` | Inference error | 500 | `{"error": "Đã xảy ra lỗi khi tổng hợp giọng nói."}` |
| `GET /health` | Server running | 200 | `{"ok": true, "model_loaded": bool}` |
