# Data Model: RVC Inference & Model State

**Feature Branch**: `031-rvc-infer-error-handling`  
**Date**: 2026-09-05  

---

## 1. Entities

### RvcInferenceResult
Represents the result returned by `rvc.vc.vc_single(...)`.

| Field / Variant | Type | Description |
|---|---|---|
| **Success Result** | `np.ndarray` | NumPy 1D array of audio samples (typically `np.int16` or `np.float32`) at target sample rate (`tgt_sr`). |
| **Error Result** | `tuple[str, Any]` | Tuple returned upon internal RVC failure. First element `result[0]` contains the error string/traceback. Second element is `(None, None)` or `None`. |

**Validation & State Transitions**:
- If `isinstance(result, tuple)`:
  - Extract `error_detail = result[0] if len(result) > 0 and result[0] else "Lỗi không xác định từ pipeline RVC"`
  - Raise `RuntimeError(f"Lỗi pipeline RVC: {error_detail}")`
- If `isinstance(result, np.ndarray)` (or non-tuple):
  - Pass to `wavfile.write(out_path, rvc.vc.tgt_sr, result)`

---

### SpeakRequest & SpeakResponse

#### Request (`POST /speak`)
```json
{
  "text": "Chuỗi văn bản cần đọc",
  "language": "vi"
}
```
- Validation:
  - `text`: non-empty string, length <= 10,000 characters.

#### Response:
- **HTTP 200 (Success)**:
  - Header `Content-Type`: `audio/wav`
  - Body: Binary WAV audio bytes
- **HTTP 400 (Bad Request)**:
  - Header `Content-Type`: `application/json`
  - Body: `{"error": "Thieu 'text' trong request"}` or `{"error": "Độ dài văn bản vượt quá giới hạn tối đa..."}`
- **HTTP 500 (Pipeline / Server Error)**:
  - Header `Content-Type`: `application/json`
  - Body: `{"error": "Đã xảy ra lỗi khi tổng hợp giọng nói: Lỗi pipeline RVC: <chi_tiet_loi>"}`
- **HTTP 503 (Model Unavailable)**:
  - Header `Content-Type`: `application/json`
  - Body: `{"error": "<thong_bao_chua_co_model>"}`

---

### ModelBadge (Frontend UI Component)

| Prop / State | Type | Value | Rendered Output |
|---|---|---|---|
| `activeModelName` | `string \| null` | Name of currently loaded `.pth` model | Determines active model |
| `file` | `string` | Filename in model list | The model item being rendered |
| `isActive` | `boolean` | `activeModelName === file` | When `true`, renders badge |
| `badgeText` | `string` | `"Đang dùng"` | Replaces legacy `"Đang nạp"` |
