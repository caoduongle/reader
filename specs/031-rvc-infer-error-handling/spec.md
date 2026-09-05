# Feature Specification: RVC Pipeline Error Transparency & Active Model UI Clarity

**Feature Branch**: `031-rvc-infer-error-handling`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "File: python-backend/server.py. Vấn đề: rvc.infer_file(base_path, out_path) đang gọi vào hàm infer_file() của thư viện rvc-python==0.1.5 (site-packages), hàm này có bug: khi rvc.vc.vc_single() nội bộ gặp lỗi, nó trả về tuple (chuỗi_lỗi, (None, None)) thay vì raise exception, khiến infer_file() ghi nhầm tuple đó vào wavfile.write() và crash với lỗi khó hiểu ''tuple' object has no attribute 'dtype'' — che mất lỗi thật sự đang xảy ra bên trong pipeline RVC. Yêu cầu sửa: KHÔNG dùng rvc.infer_file(...) nữa. Thay bằng hàm mới gọi trực tiếp rvc.vc.vc_single(...) (đúng các tham số infer_file() đang truyền), tự kiểm tra kết quả trả về để phát hiện đúng dạng lỗi và raise lại với message thật, thay vì để crash mù mờ. 1. Thêm import ở đầu server.py: from scipy.io import wavfile. 2. Thêm hàm mới ngay trước route /speak: _run_rvc_inference(base_path, out_path). 3. Trong route /speak, thay rvc.infer_file bằng _run_rvc_inference. 4. Cập nhật python-backend/tests/test_server.py đổi sang mock rvc.vc.vc_single với 2 case (ndarray thành công và tuple thất bại). File: src/components/SettingsModal.tsx dòng ~797: Đổi label badge từ 'Đang nạp' thành 'Đang dùng'."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - RVC Pipeline Error Transparency and Crash Prevention (Priority: P1) 🎯 MVP

As a user listening to custom voice cloning in VoxRead, when an RVC voice conversion issue occurs (such as mismatched index file, corrupted checkpoint, unsupported feature dimensions, or model format incompatibility), I want the server to report the actual underlying error message instead of crashing with an obscure `'tuple' object has no attribute 'dtype'`, so that I can immediately understand and resolve the configuration or model problem.

**Why this priority**: The bug in `rvc-python==0.1.5` swallows internal exceptions from `vc_single()` and passes the error tuple `(error_message, (None, None))` directly to `scipy.io.wavfile.write()`, which crashes on `.dtype`. This completely masks the root cause of conversion failures, preventing users and developers from diagnosing why voice synthesis failed.

**Independent Test**:
1. Configure a test where `rvc.vc.vc_single(...)` encounters an internal error and returns an error tuple `("Model architecture mismatch", (None, None))`.
2. Send a request to `POST /speak`.
3. Verify that the server intercepts the tuple and responds with HTTP 500 containing `"Loi pipeline RVC: Model architecture mismatch"`, rather than crashing on `'tuple' object has no attribute 'dtype'`.
4. Configure a test where `rvc.vc.vc_single(...)` succeeds and returns a valid audio NumPy ndarray.
5. Send a request to `POST /speak`; verify it writes the WAV file and returns HTTP 200 with `audio/wav`.

**Acceptance Scenarios**:
1. **Given** an audio synthesis request processed by `/speak`, **When** `rvc.vc.vc_single()` succeeds and returns a NumPy ndarray, **Then** `_run_rvc_inference()` writes the audio to the output path using `wavfile.write()` with `rvc.vc.tgt_sr` and returns HTTP 200 with `audio/wav`.
2. **Given** an audio synthesis request processed by `/speak`, **When** `rvc.vc.vc_single()` fails internally and returns `(error_str, (None, None))`, **Then** `_run_rvc_inference()` detects that `result` is a `tuple`, extracts `error_str`, and raises `RuntimeError(f"Loi pipeline RVC: {error_detail}")`.
3. **Given** `_run_rvc_inference()` raises `RuntimeError`, **When** `/speak` handles the exception, **Then** it returns HTTP 500 with the exact error details in JSON without unhandled crash.

---

### User Story 2 - Accurate Model Status Label in Settings Modal (Priority: P2)

As a user navigating the Voice Settings modal, I want the active voice model badge to read "Đang dùng" instead of "Đang nạp", so that I am reassured the model is currently active and ready, rather than thinking the application is stuck in an ongoing loading loop.

**Why this priority**: "Đang nạp" denotes progressive loading in Vietnamese. Because the badge renders exclusively on the currently active, already loaded `.pth` model (`activeModelName === file`), the label confuses users into thinking the model load was incomplete or hung.

**Independent Test**:
1. Open the Settings modal with an active model selected.
2. Inspect the model list in Voice Settings.
3. Verify the badge text next to the active model displays "Đang dùng".

**Acceptance Scenarios**:
1. **Given** an active model matching `activeModelName`, **When** the model entry is rendered in `SettingsModal.tsx`, **Then** the badge displays "Đang dùng".

---

### Edge Cases

- **Empty error tuple**: If `vc_single` returns an empty tuple `()`, the handler must fall back to `"Loi khong xac dinh tu pipeline RVC"`.
- **Concurrency lock**: `_run_rvc_inference()` must execute within `with rvc_lock:` to ensure thread safety across concurrent `/speak` requests.
- **Missing index**: If `model_info` has no `"index"` key, `model_info.get("index", "")` gracefully defaults to `""`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `python-backend/server.py` MUST import `wavfile` from `scipy.io`.
- **FR-002**: `python-backend/server.py` MUST implement `_run_rvc_inference(base_path: str, out_path: str)` invoking `rvc.vc.vc_single(...)` directly instead of `rvc.infer_file(...)`.
- **FR-003**: `_run_rvc_inference` MUST inspect the return value of `vc_single`: if it is an instance of `tuple`, it MUST extract the error message from the first element and raise `RuntimeError(f"Loi pipeline RVC: {error_detail}")`.
- **FR-004**: If `result` is not a tuple, `_run_rvc_inference` MUST write the audio data to `out_path` using `wavfile.write(out_path, rvc.vc.tgt_sr, result)`.
- **FR-005**: The `/speak` route in `python-backend/server.py` MUST call `_run_rvc_inference(base_path, out_path)` under `with rvc_lock:`.
- **FR-006**: `python-backend/tests/test_server.py` MUST update tests to mock `rvc.vc.vc_single`, verifying both the success case (ndarray) and the failure case (error tuple).
- **FR-007**: `src/components/SettingsModal.tsx` MUST update the active model badge label from `"Đang nạp"` to `"Đang dùng"`.

---

### Key Entities

- **RvcInferenceResult**: Either a NumPy `ndarray` of synthesized audio samples (on success) or a `tuple` of `(str, (None, None))` (on internal pipeline failure).
- **ModelBadge**: UI indicator in Settings modal showing the active state of an imported `.pth` model.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 occurrences of `'tuple' object has no attribute 'dtype'` errors across all RVC voice synthesis operations.
- **SC-002**: 100% of internal RVC pipeline errors are exposed with explicit, meaningful error descriptions in `/speak` responses.
- **SC-003**: 100% of Python backend tests pass (`pytest python-backend/tests/test_server.py`).
- **SC-004**: 100% of frontend/Node unit tests pass (`npm test`).
- **SC-005**: 0 typecheck errors (`npm run typecheck`) and 0 linting errors (`npm run lint`).

---

## Assumptions

- `scipy` is already installed in the Python environment as a dependency of `rvc-python`.
- `rvc.vc.tgt_sr` provides the target sampling rate (e.g. 40000 or 48000 Hz) configured on model load.
