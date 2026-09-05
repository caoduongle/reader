# Feature Specification: PyTorch >= 2.6 weights_only Compatibility for RVC Pipeline

**Feature Branch**: `032-pytorch-weights-only-compat`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "File: python-backend/server.py. Vấn đề: PyTorch >= 2.6 đổi mặc định torch.load(weights_only=...) từ False sang True. Thư viện fairseq (dependency của rvc-python, dùng để load hubert_base.pt) gọi torch.load() mà không truyền weights_only, nên bị chặn với lỗi UnpicklingError khi load file fairseq.data.dictionary.Dictionary bên trong checkpoint. Cần khôi phục hành vi cũ CHỈ cho tiến trình server này, không sửa file trong site-packages/fairseq. Yêu cầu sửa: Ngay sau dòng 'import torch' ở đầu server.py, thêm đoạn monkeypatch sau (đặt TRƯỚC dòng 'from rvc_python.infer import RVCInference' và trước khi reload_model() được gọi lần đầu): import torch; _original_torch_load = torch.load; def _patched_torch_load(*args, **kwargs): kwargs.setdefault('weights_only', False); return _original_torch_load(*args, **kwargs); torch.load = _patched_torch_load. Lưu ý: đoạn patch này phải chạy TRƯỚC lời gọi reload_model() đầu tiên (dòng 'Khoi tao model luc bat dau' ở cuối file) vì đó là lúc load_hubert() thực sự được gọi. Kiểm tra sau khi sửa: chạy lại python server.py, bấm 'Thử giọng' — lần này quá trình load hubert_base.pt phải qua được bước torch.load, tiến tới bước xử lý RVC pipeline thực sự."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seamless Voice Synthesis with Legacy Model Checkpoints (Priority: P1) 🎯 MVP

As a user running the VoxRead desktop application with modern PyTorch (version 2.6 or later), when I trigger voice preview ("Thử giọng") or synthesize speech, I want the local voice server to load required acoustic models (such as `hubert_base.pt` and `rmvpe.pt`) without unpickling errors, so that voice conversion completes successfully without crashing or requiring manual patches to third-party libraries.

**Why this priority**: In PyTorch >= 2.6, `torch.load()` changed its default parameter from `weights_only=False` to `weights_only=True`. The upstream `fairseq` library (a frozen dependency of `rvc-python`) loads checkpoints containing custom Python objects (such as `fairseq.data.dictionary.Dictionary`) without specifying `weights_only`. Consequently, any voice synthesis request fails immediately during model load with an unhandled `UnpicklingError`, rendering voice cloning unusable.

**Independent Test**:
1. Run the Python backend under PyTorch >= 2.6.
2. Initialize or trigger model loading containing custom Python object checkpoints (`hubert_base.pt` via `fairseq`).
3. Verify that `torch.load` loads the checkpoint successfully without throwing `_pickle.UnpicklingError: Weights only load failed`.
4. Trigger voice synthesis via `POST /speak` or "Thử giọng" and verify the pipeline proceeds past the model loading phase.

**Acceptance Scenarios**:
1. **Given** a server runtime running PyTorch >= 2.6, **When** `fairseq` or `rvc-python` calls `torch.load()` without providing `weights_only`, **Then** the call defaults `weights_only` to `False` and loads the checkpoint objects successfully.
2. **Given** a voice preview request triggered from the VoxRead UI ("Thử giọng"), **When** the backend loads `hubert_base.pt`, **Then** the process completes without `UnpicklingError` and proceeds directly to audio conversion.

---

### User Story 2 - Respect Explicit Caller Parameters in Deserialization (Priority: P2)

As a developer or subsystem invoking `torch.load`, when I explicitly supply a `weights_only` parameter (either `True` or `False`), I want my explicit setting to be honored without being overwritten, so that intentional security restrictions or custom invocation parameters remain untouched.

**Why this priority**: The compatibility patch should restore legacy defaults for unconfigured third-party callers while avoiding unwanted interference with explicit parameter choices elsewhere in the process.

**Independent Test**:
1. Execute `torch.load(..., weights_only=True)` within the server environment.
2. Verify that `weights_only=True` is received and enforced by the underlying loader.
3. Execute `torch.load(..., weights_only=False)` and verify `weights_only=False` is preserved.

**Acceptance Scenarios**:
1. **Given** a call to `torch.load()` with an explicit `weights_only=True`, **When** the wrapped loader is executed, **Then** `weights_only=True` is passed to the original `torch.load`.
2. **Given** a call to `torch.load()` without specifying `weights_only`, **When** the wrapped loader is executed, **Then** `weights_only=False` is supplied via `setdefault`.

---

### Edge Cases

- **Custom keyword arguments**: Any additional arbitrary arguments or keyword arguments passed to `torch.load(*args, **kwargs)` must be forwarded transparently to the original function.
- **Order of import**: The patch must be installed before `from rvc_python.infer import RVCInference` is imported and before the initial `reload_model()` call at startup, ensuring that `fairseq` receives the patched function regardless of module caching.
- **Third-party isolation**: The solution must be applied strictly in-memory within `python-backend/server.py` and must not alter files located in `site-packages/` or virtual environment directories.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `python-backend/server.py` MUST intercept `torch.load` immediately after `import torch` by defining a wrapper that sets `weights_only=False` by default.
- **FR-002**: The wrapper MUST be assigned to `torch.load` before `from rvc_python.infer import RVCInference` is evaluated and before the initial `reload_model()` invocation occurs.
- **FR-003**: The patched `torch.load` MUST use `kwargs.setdefault("weights_only", False)` to avoid overwriting explicit arguments provided by callers.
- **FR-004**: The monkeypatch MUST remain process-local and MUST NOT modify any files inside `site-packages/fairseq` or the global Python environment.
- **FR-005**: All subsequent checkpoint loading calls (`hubert_base.pt`, `rmvpe.pt`, and `.pth` models) within the server process MUST automatically benefit from this default behavior.
- **FR-006**: Automated unit tests in `python-backend/tests/test_server.py` MUST verify that `torch.load` defaults `weights_only` to `False` when omitted, and respects explicit `weights_only` flags when provided.

---

### Key Entities

- **TorchLoader**: PyTorch checkpoint deserializer (`torch.load`) responsible for reading pickled model weights, architectures, and dictionaries.
- **AcousticCheckpoints**: Pre-trained model checkpoints (`hubert_base.pt`, `rmvpe.pt`) distributed for RVC inference containing serialized dictionary objects from `fairseq`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 occurrences of `UnpicklingError` caused by `weights_only=True` when loading community checkpoints (`hubert_base.pt`, `rmvpe.pt`) on PyTorch >= 2.6.
- **SC-002**: 100% preservation of explicit caller arguments passed into `torch.load`.
- **SC-003**: 0 files modified within `site-packages/` or external third-party dependency directories.
- **SC-004**: 100% test pass rate across backend pytest unit tests (`pytest python-backend/tests/test_server.py`).

---

## Assumptions

- The server process runs in a trusted local desktop environment where official RVC models (`hubert_base.pt`, `rmvpe.pt`) are downloaded from standard verified community repositories.
- `torch` is installed in the active Python backend virtual environment (`venv`).
- The patch operates exclusively within the running server process lifecycle.
