# Data Model: /speak Route Timing Telemetry

**Feature Branch**: `033-speak-route-timing`  
**Date**: 2026-09-05  

---

## 1. Entities

### TimingSnapshot
Represents the in-memory timing parameters recorded during a single execution of the `/speak` route.

| Field | Type | Description | Source |
|---|---|---|---|
| `t0` | `float` | Unix timestamp immediately preceding `_synthesize_base` | `time.time()` |
| `t1` | `float` | Unix timestamp immediately following `_synthesize_base` | `time.time()` |
| `t2` | `float` | Unix timestamp immediately following `_run_rvc_inference` | `time.time()` |
| `edge_tts_duration` | `float` | Elapsed seconds during base audio generation | `t1 - t0` |
| `rvc_duration` | `float` | Elapsed seconds during neural voice conversion | `t2 - t1` |
| `text_len` | `int` | Length of sanitized input text string in characters | `len(text)` |

---

## 2. Telemetry Flow

```text
POST /speak Request Received
       │
       ▼
Input Validation & Directory Setup
       │
       ├─► t0 = time.time()
       │
       ▼
asyncio.run(_synthesize_base(text, base_path))
       │
       ├─► t1 = time.time()
       │
       ▼
with rvc_lock:
    _run_rvc_inference(base_path, out_path)
       │
       ├─► t2 = time.time()
       │
       ▼
print(f"[VoxRead][Timing] Edge-TTS: {t1-t0:.2f}s | RVC inference: {t2-t1:.2f}s | Text length: {len(text)} ky tu")
       │
       ▼
Read & Stream Binary WAV Bytes
```
