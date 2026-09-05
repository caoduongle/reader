# Contract: PyTorch Deserializer Runtime Monkeypatch

**Feature Branch**: `032-pytorch-weights-only-compat`  
**Date**: 2026-09-05  

---

## 1. Interface Signature

```python
def _patched_torch_load(*args, **kwargs) -> Any
```

### Module Replacement
- Replaces global attribute `torch.load` in module `torch`.
- Stores reference to pre-patch function in `_original_torch_load`.

---

## 2. Behavioral Specifications

### Case 1: Caller omits `weights_only`
- **Input**: `torch.load("path/to/checkpoint.pt", map_location="cpu")`
- **Transformation**: `kwargs["weights_only"]` is set to `False`.
- **Underlying Call**: `_original_torch_load("path/to/checkpoint.pt", map_location="cpu", weights_only=False)`
- **Result**: Deserializes custom Python objects (such as `fairseq.data.dictionary.Dictionary`) without `UnpicklingError`.

### Case 2: Caller provides explicit `weights_only=True`
- **Input**: `torch.load("path/to/model.pt", weights_only=True)`
- **Transformation**: `kwargs["weights_only"]` remains `True` (untouched by `setdefault`).
- **Underlying Call**: `_original_torch_load("path/to/model.pt", weights_only=True)`
- **Result**: Enforces strict weights-only unpickling as requested by caller.

### Case 3: Caller provides explicit `weights_only=False`
- **Input**: `torch.load("path/to/model.pt", weights_only=False)`
- **Transformation**: `kwargs["weights_only"]` remains `False`.
- **Underlying Call**: `_original_torch_load("path/to/model.pt", weights_only=False)`
- **Result**: Deserializes with `weights_only=False`.

### Case 4: Exception Propagation
- Any exception raised by `_original_torch_load` (e.g. `FileNotFoundError`, `RuntimeError`) MUST propagate directly to the caller without suppression or masking.
