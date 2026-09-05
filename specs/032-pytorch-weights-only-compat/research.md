# Research & Technical Decisions: PyTorch >= 2.6 weights_only Compatibility

**Feature Branch**: `032-pytorch-weights-only-compat`  
**Date**: 2026-09-05  

---

## 1. Background & Root Cause Analysis

### PyTorch >= 2.6 Default Behavior Change
Starting with PyTorch 2.6, the default value of the `weights_only` parameter in `torch.load()` changed from `False` to `True`. This change was introduced as a security measure by the PyTorch team to reduce the risk of arbitrary code execution when unpickling untrusted model files.

### Upstream Library Conflict (`fairseq` & `rvc-python`)
`rvc-python` depends on `fairseq` (frozen since ~2022) to load the HuBERT feature extractor checkpoint (`hubert_base.pt`). Inside `fairseq.checkpoint_utils`, `torch.load(f, map_location=...)` is invoked without explicitly providing the `weights_only` keyword argument. 

Because `hubert_base.pt` contains pickled custom Python class instances (specifically `fairseq.data.dictionary.Dictionary`), PyTorch 2.6+ rejects the checkpoint during deserialization and raises:
```text
_pickle.UnpicklingError: Weights only load failed. Re-running `torch.load` with `weights_only=False` will likely succeed...
```
This error prevents the Hubert model from loading, which causes subsequent voice synthesis and preview ("Thử giọng") calls to fail immediately. Similar issues can arise with other acoustic model checkpoints like `rmvpe.pt`.

---

## 2. In-Process Monkeypatch vs. External Workarounds

### Decision
Apply an in-process monkeypatch to `torch.load` inside `python-backend/server.py` immediately after `import torch`, before importing `rvc_python.infer.RVCInference` and before the initial `reload_model()` call:
```python
_original_torch_load = torch.load

def _patched_torch_load(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _original_torch_load(*args, **kwargs)

torch.load = _patched_torch_load
```

### Rationale
1. **Zero External Mutation**: Modifying files inside `site-packages/fairseq/` or `site-packages/torch/` is fragile, non-reproducible across virtual environments, and wiped upon reinstallation or CI cache eviction.
2. **Process Scoping**: The patch applies strictly to the current Python server runtime process and does not affect other system utilities or external tools.
3. **Transparent Delegation via `setdefault`**: Using `kwargs.setdefault("weights_only", False)` ensures that:
   - Callers that do not specify `weights_only` (such as `fairseq` and `rvc-python`) seamlessly receive `weights_only=False`.
   - Callers that explicitly pass `weights_only=True` or `weights_only=False` retain their explicit preferences unchanged.
4. **Universal Coverage**: Because `torch.load` is patched at the module level in `torch`, any dependencies loaded subsequently (including `hubert_base.pt` and `rmvpe.pt`) automatically utilize the compatibility layer without needing separate fixes per model type.

### Alternatives Considered
- **Patching `site-packages/fairseq/checkpoint_utils.py` directly**: Rejected because it violates deployment reproducibility and requires custom post-install scripts.
- **Pinning PyTorch < 2.6**: Rejected because modern GPU drivers, CUDA releases, and operating systems require newer PyTorch builds, and pinning creates tech debt.
- **Using PyTorch safe globals (`torch.serialization.add_safe_globals`)**: PyTorch allows registering allowed safe classes (e.g. `torch.serialization.add_safe_globals([Dictionary])`). Rejected because `fairseq` models contain nested class hierarchies and closures that can trigger unpredictable unpickling rejections across minor versions; `weights_only=False` matches the battle-tested legacy behavior exactly for known, trusted local models.

---

## 3. Placement & Execution Order in `server.py`

### Decision
Place the patch directly after `import torch` (lines 19-20 in `python-backend/server.py`):
- MUST be placed BEFORE `from rvc_python.infer import RVCInference`
- MUST be placed BEFORE `discover_model_paths()` and the initial `reload_model()` invocation at the bottom of `server.py`.

### Rationale
Python imports execute top-level code upon module import. `rvc_python.infer` imports internal modules that may reference `torch.load`. Ensuring `torch.load` is patched before `RVCInference` is imported guarantees that no unpatched references are cached or executed during import time or initialization.

---

## 4. Test Strategy

### Decision
Add automated test coverage in `python-backend/tests/test_server.py` that verifies:
1. `torch.load` is actively patched by `server._patched_torch_load`.
2. When `torch.load` is invoked without `weights_only`, `weights_only=False` is passed to the original `torch.load`.
3. When `torch.load` is invoked with `weights_only=True`, the explicit `True` is forwarded without modification.
4. When `torch.load` is invoked with `weights_only=False`, the explicit `False` is forwarded without modification.
5. Verification that existing server endpoints and test suites remain 100% passing.
