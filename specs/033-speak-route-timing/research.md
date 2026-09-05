# Research & Technical Decisions: /speak Route Latency Timing

**Feature Branch**: `033-speak-route-timing`  
**Date**: 2026-09-05  

---

## 1. Timing Measurement Mechanism

### Decision
Use Python standard library `time.time()` to measure wall-clock elapsed time across the two major speech synthesis phases in `python-backend/server.py`:
```python
t0 = time.time()
asyncio.run(_synthesize_base(text, base_path))
t1 = time.time()

with rvc_lock:
    _run_rvc_inference(base_path, out_path)
t2 = time.time()
```

### Rationale
- Minimal overhead: `time.time()` is implemented in C at the OS level, adding sub-microsecond overhead per invocation.
- Directly satisfies user requirements without external dependencies.
- Wall-clock seconds accurately reflect what the user experiences during the 20-30s wait period.

### Alternatives Considered
- `time.perf_counter()`: Offers higher fractional resolution, but for operations measured in seconds (20-30s) formatted to two decimal places (`.2f`), `time.time()` fulfills the explicit user design request perfectly while maintaining simplicity.
- Dedicated APM / OpenTelemetry tracing: Rejected as unnecessary complexity for a local single-process desktop backend.

---

## 2. Telemetry Output & Formatting

### Decision
Emit formatted diagnostics directly to standard output before reading the generated audio file:
```python
print(f"[VoxRead][Timing] Edge-TTS: {t1-t0:.2f}s | RVC inference: {t2-t1:.2f}s | Text length: {len(text)} ky tu")
```

### Rationale
- `[VoxRead][Timing]` prefix provides an easily identifiable tag for terminal log inspection and automated pytest log capturing (`capsys`).
- Including text length provides immediate context on input volume versus synthesis duration.
- Emitted before reading `out.wav` so that timing metrics are logged immediately when computation finishes.

---

## 3. Placement & Exception Safety

### Decision
Place timing collection inside the existing `try:` block in `/speak`:
- If `_synthesize_base` or `_run_rvc_inference` fails, execution drops into `except Exception:` and timing logging is bypassed.
- No partial or corrupted metrics are printed.
- File cleanup in `finally:` remains completely unaffected.

---

## 4. Test Verification Strategy

### Decision
In `python-backend/tests/test_server.py`, utilize pytest's standard `capsys` fixture to intercept `sys.stdout` during a successful `POST /speak` call:
- Assert that `[VoxRead][Timing]` appears in `capsys.readouterr().out`.
- Assert that tokens `"Edge-TTS:"`, `"RVC inference:"`, and `"Text length:"` are present in the log output.
