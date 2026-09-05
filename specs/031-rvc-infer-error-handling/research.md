# Research & Technical Decisions: RVC Inference Error Handling & Active Model UI

**Feature Branch**: `031-rvc-infer-error-handling`  
**Date**: 2026-09-05  

---

## 1. Direct RVC Pipeline Invocation vs. Library infer_file

### Decision
Bypass `rvc.infer_file(base_path, out_path)` and execute `rvc.vc.vc_single(...)` directly within a custom helper `_run_rvc_inference(base_path, out_path)` in `python-backend/server.py`.

### Rationale
In `rvc-python==0.1.5` (`rvc_python/infer.py`), `infer_file` invokes `self.vc.vc_single(...)` and passes its return value directly to `wavfile.write(output_path, self.vc.tgt_sr, wav_opt)`.
In `rvc_python/modules/vc/modules.py`, `vc_single` catches internal pipeline errors (e.g. index mismatch, checkpoint corruption, feature shape mismatch) and returns a tuple:
```python
except:
    info = traceback.format_exc()
    logger.warning(info)
    return info, (None, None)
```
Because `wavfile.write()` expects a NumPy `ndarray`, passing this tuple causes Python to crash with:
`'tuple' object has no attribute 'dtype'`
This completely masks the actual error message (`info`). By calling `vc_single` directly, we can inspect the returned type:
1. If `isinstance(result, tuple)`: Extract the error message and raise `RuntimeError(f"Lỗi pipeline RVC: {error_detail}")`.
2. If `result` is a valid NumPy ndarray: Call `wavfile.write(out_path, rvc.vc.tgt_sr, result)`.

### Alternatives Considered
- **Monkey-patching `infer_file`**: Modifying `RVCInference.infer_file` dynamically at runtime. Rejected because it introduces implicit global side effects and is harder to debug or trace.
- **Forking/Updating `rvc-python`**: Creating a local fork or package patch. Rejected because `_run_rvc_inference` is only 15 lines of code and provides complete control locally without package management overhead.
- **Catching `AttributeError` around `infer_file`**: Catching `'tuple' object has no attribute 'dtype'`. Rejected because the actual error string inside the tuple would still be lost, failing requirement FR-003 and SC-002.

---

## 2. Parameter Mapping for `vc_single`

### Decision
Extract model parameters from `rvc` instance and `rvc.models[rvc.current_model]` to match the exact arguments passed by `infer_file`:
```python
model_info = rvc.models[rvc.current_model]
file_index = model_info.get("index", "")

result = rvc.vc.vc_single(
    sid=0,
    input_audio_path=base_path,
    f0_up_key=rvc.f0up_key,
    f0_method=rvc.f0method,
    file_index=file_index,
    index_rate=rvc.index_rate,
    filter_radius=rvc.filter_radius,
    resample_sr=rvc.resample_sr,
    rms_mix_rate=rvc.rms_mix_rate,
    protect=rvc.protect,
    f0_file="",
    file_index2="",
)
```

### Rationale
This preserves 100% parameter compatibility with the library's intended behavior while exposing the return object for validation before file I/O.

---

## 3. Audio File Serialization

### Decision
Use `from scipy.io import wavfile` and call `wavfile.write(out_path, rvc.vc.tgt_sr, result)`.

### Rationale
- `scipy` is already an established runtime dependency installed in `python-backend/venv`.
- `rvc.vc.tgt_sr` dynamically provides the correct target sample rate corresponding to the loaded voice model (e.g., 40000 Hz for V2 40k models, 48000 Hz for V2 48k models).
- The resulting `.wav` file is read and streamed back via Flask `Response(wav_bytes, mimetype="audio/wav")`.

---

## 4. Concurrency & Thread Safety

### Decision
Execute `_run_rvc_inference(base_path, out_path)` under the existing `with rvc_lock:` block in `/speak`.

### Rationale
PyTorch models and underlying CUDA/CPU memory buffers on `rvc.vc` are stateful and not thread-safe for concurrent inference. The `rvc_lock` threading lock ensures sequential inference across parallel web requests, preventing race conditions or GPU memory corruption.

---

## 5. Active Model Status UI Clarification

### Decision
In `src/components/SettingsModal.tsx`, update line 797:
```tsx
{activeModelName === file && (
  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded font-sans shrink-0 ml-2">
    Đang dùng
  </span>
)}
```

### Rationale
The condition `{activeModelName === file}` renders only when the backend reports that the `.pth` file is the currently active, loaded model. The previous text `"Đang nạp"` (meaning "Loading...") gave users the false impression that model loading had hung or was incomplete. Changing to `"Đang dùng"` (meaning "In use" / "Active") accurately communicates current operational status.
