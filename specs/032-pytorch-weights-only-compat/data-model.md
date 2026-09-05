# Data Model: PyTorch Serialization Compatibility

**Feature Branch**: `032-pytorch-weights-only-compat`  
**Date**: 2026-09-05  

---

## 1. Entities

### TorchLoadInvocation
Represents an invocation of `torch.load(*args, **kwargs)` intercepted by the server's runtime monkeypatch.

| Attribute / Parameter | Type | Default Injected | Description |
|---|---|---|---|
| `args` | `tuple` | N/A | Positional arguments forwarded to `_original_torch_load` (e.g. file path, buffer, or file-like object). |
| `map_location` | `str \| torch.device \| Callable \| dict \| None` | Caller-provided | Target device mapping for loaded tensors (e.g., `"cpu"`, `"cuda:0"`). |
| `weights_only` | `bool \| None` | `False` (via `setdefault`) | Flag controlling whether to restrict unpickling to weights only or allow arbitrary Python objects. |
| `kwargs` | `dict` | N/A | Additional keyword arguments forwarded transparently to `_original_torch_load`. |

### Parameter Transformation Flow

```text
Caller (e.g. fairseq, rvc_python)
       │
       ▼
_patched_torch_load(*args, **kwargs)
       │
       ├─► kwargs.setdefault("weights_only", False)
       │     - If "weights_only" is missing: sets kwargs["weights_only"] = False
       │     - If "weights_only" was already provided (True/False): retains existing value
       │
       ▼
_original_torch_load(*args, **kwargs)
       │
       ▼
PyTorch Deserialization (Loads model state + Dictionary objects)
```

---

## 2. Checkpoint Assets Covered

| Asset Name | Loader Path | Custom Objects Required | Behavior with Default PyTorch 2.6 | Behavior with Monkeypatch |
|---|---|---|---|---|
| `hubert_base.pt` | `fairseq.checkpoint_utils` via `rvc_python.infer` | `fairseq.data.dictionary.Dictionary` | Fails with `UnpicklingError` | Successfully loads vocabulary & acoustic weights |
| `rmvpe.pt` | Pitch extractor in `rvc_python` | Neural network weights & pickling graph | Potential failure if serialized with custom classes | Successfully loads pitch extractor weights |
| `*.pth` voice models | `rvc_python` model loader | Model weights & configuration dictionary | Loads without weights_only restriction | Seamless loading across all model formats |
