# Technical Research: RVC Device Auto-Detection & Speech Error Visibility

**Feature**: `028-rvc-device-error-handling`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)  

---

## 1. Hardware Execution Device Detection

### Context
In `python-backend/server.py`, the execution device was hardcoded as `DEVICE = "cuda:0"`. On PCs lacking an NVIDIA GPU or running standard CPU-only PyTorch wheels, instantiating `rvc_python.infer.RVCInference(device=DEVICE, ...)` immediately throws a CUDA error, preventing model initialization.

### Decision
Implement automatic device detection using PyTorch's native API:
```python
import torch

OVERRIDE_DEVICE = os.environ.get("VOXREAD_DEVICE", "").strip()
if OVERRIDE_DEVICE:
    DEVICE = OVERRIDE_DEVICE
else:
    DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu:0"

print(f"[VoxRead] Dang dung thiet bi: {DEVICE}")
```

### Rationale
- `torch.cuda.is_available()` reliably returns `True` only when compatible CUDA drivers and hardware are present.
- Falling back to `"cpu:0"` allows RVC inference to run on any machine without requiring code changes.
- Terminal logging provides transparency during startup for debugging.
- The `VOXREAD_DEVICE` environment variable enables manual overrides (e.g. `cuda:1` or forcing `cpu:0`).

### Alternatives Considered
- CLI arguments (`--device cpu`): Requires changing invocation scripts across desktop wrappers and shell scripts. Environment variable + auto-detect provides zero-config operation while retaining override flexibility.

---

## 2. Model Initialization Exception Handling & Detailed Error Diagnostics

### Context
Currently in `python-backend/server.py`:
When `RVCInference` throws an exception (such as a corrupted `.pth` file, missing weights, or architectural mismatch), `reload_model()` catches the exception, prints it to stdout, and sets `rvc = None`. However, the error message is discarded. Subsequently:
- `GET /health` returns `reason: "model_missing"`, which is misleading because a model file is present, it just failed to load.
- `POST /speak` returns a generic 503 error instructing the user to copy a file.

### Decision
Store `last_init_error: Optional[str]` at the module level in `server.py`:
- In `reload_model()`:
  - If no `.pth` file exists: `last_init_error = "Chưa có file model (.pth) trong thư mục python-backend/model."`
  - If `RVCInference` raises an exception: `last_init_error = f"Lỗi khởi tạo model RVC: {str(e)}"`
- In `GET /health`:
  - If `not model_loaded`:
    ```python
    return jsonify({
        "ok": False,
        "reason": "model_init_failed" if MODEL_PATH else "model_missing",
        "model_loaded": False,
        "model_dir": model_dir,
        "error": last_init_error,
    })
    ```
- In `POST /speak`:
  - If `rvc is None`: return HTTP 503 with `{"error": last_init_error or "Chưa có model giọng RVC..."}`.
  - In `except Exception as e`: return HTTP 500 with `{"error": f"Lỗi khi tổng hợp giọng nói: {str(e)}"}`.

### Rationale
Retaining the exact initialization failure string ensures that downstream HTTP clients (React frontend) can diagnose whether the issue is missing weights, invalid file format, or PyTorch device errors.

---

## 3. Frontend Connection Status State Machine & `model_loaded` Guard

### Context
In `src/hooks/useVoiceServerStatus.ts` and `src/hooks/useTTS.ts`, health polling previously inspected `res.ok` and `data.ok`. If a backend server responded with HTTP 200 and `data.ok: true` without a valid model loaded, or if `model_loaded` was false, the frontend could improperly mark the status as `'connected'`.

### Decision
1. In `src/types.ts` and `src/hooks/useVoiceServerStatus.ts`, extend status types:
   ```typescript
   export type RVCServerStatus =
     | 'unknown'
     | 'checking'
     | 'connected'
     | 'no-model'
     | 'model_missing'
     | 'unreachable';

   export type VoiceServerConnectionStatus =
     | 'checking'
     | 'connected'
     | 'no-model'
     | 'model_missing'
     | 'unreachable';
   ```
2. In `checkHealth` (`useVoiceServerStatus.ts`) and `checkRVCServerHealth` (`useTTS.ts`):
   - Strict guard: Only set `'connected'` if `res.ok && data && data.ok === true && data.model_loaded === true`.
   - If `res.ok` but `!data.model_loaded`:
     - Transition to `'no-model'` (also treating `'model_missing'` equivalently).
     - Set `errorMessage` from `data.error || 'Server đang chạy nhưng chưa có model giọng hợp lệ (kiểm tra terminal server.py để xem lỗi chi tiết).'`.
3. In `SettingsModal.tsx`:
   - Support both `'no-model'` and `'model_missing'` for the amber/orange warning banner.
   - Display the hook's `errorMessage` or prop `serverErrorMessage` directly in the banner.

### Rationale
Ensures the UI never falsely reports "Đã kết nối" or "Đã sẵn sàng" when the server is online but model initialization failed.

---

## 4. Un-swallowing Synthesis Error JSON & User Notifications

### Context
In `src/hooks/useTTS.ts`:
- `fetchRVCSpeech`: Catches fetch errors and does `console.warn`, without reading `await res.json()` when `res.ok === false`.
- `testVoice`: Catches error and sets `setRvcServerStatus('unreachable')` without capturing `res.json().error`.
- `SettingsModal.tsx`: Declares `serverErrorMessage?: string | null` in `SettingsModalProps` but does not destructure it (dead prop).
- `App.tsx`: When speech synthesis fails mid-sentence, `speakSentence` stops, leaving reading silent without notifying the user why.

### Decision
1. **Response Error Body Parsing**:
   - In `fetchRVCSpeech` and `testVoice`:
     ```typescript
     if (!res.ok) {
       let errorDetail = `Lỗi server (${res.status})`;
       try {
         const errorBody = await res.json();
         if (errorBody && errorBody.error) {
           errorDetail = errorBody.error;
         }
       } catch {
         // fallback to status text
       }
       throw new Error(errorDetail);
     }
     ```
2. **State Updates in `useTTS`**:
   - On catch in `testVoice`, extract `err.message` and set `setServerErrorMessage(err.message)`.
   - In `speakSentence`, when `audioBlobUrl` is null, set `setServerErrorMessage(fetchErrorReason || 'Không thể tạo âm thanh từ server RVC.')`.
3. **Display in `SettingsModal.tsx`**:
   - Destructure `serverErrorMessage` from props.
   - Display `serverErrorMessage` prominently in the warning or error banner when present.
4. **Toast Notification in `App.tsx`**:
   - Add an effect in `App.tsx` observing `serverErrorMessage`.
   - If `serverErrorMessage` is updated while reading is in progress and `!isSettingsOpen`, invoke `showToast(serverErrorMessage)` so the user immediately knows why reading paused.

### Rationale
Eliminates confusing silent failures during reading and gives users actionable feedback when clicking "Thử giọng" or importing models.
