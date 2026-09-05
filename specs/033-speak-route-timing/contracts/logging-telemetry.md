# Contract: /speak Timing Console Telemetry

**Feature Branch**: `033-speak-route-timing`  
**Date**: 2026-09-05  

---

## 1. Log Event Format

```text
[VoxRead][Timing] Edge-TTS: {t1-t0:.2f}s | RVC inference: {t2-t1:.2f}s | Text length: {len(text)} ky tu
```

### Fields Specification

| Segment | Format | Example | Description |
|---|---|---|---|
| Tag | `[VoxRead][Timing]` | `[VoxRead][Timing]` | Standard log tag for easy parsing and grepping |
| Edge-TTS Duration | `Edge-TTS: {t1-t0:.2f}s` | `Edge-TTS: 1.45s` | Elapsed seconds spent synthesizing MP3 from Edge-TTS |
| Separator | ` \| ` | ` \| ` | Visual delimiter between metrics |
| RVC Duration | `RVC inference: {t2-t1:.2f}s` | `RVC inference: 18.32s` | Elapsed seconds spent in neural RVC conversion under lock |
| Separator | ` \| ` | ` \| ` | Visual delimiter |
| Text Length | `Text length: {len(text)} ky tu` | `Text length: 245 ky tu` | Input text character count |

---

## 2. Execution Guarantees

1. **Emission Condition**: Printed exclusively when both `_synthesize_base` and `_run_rvc_inference` complete successfully.
2. **Channel**: Printed to standard output (`sys.stdout`).
3. **HTTP Integrity**: No modifications to HTTP status code (200), headers (`audio/wav`), or response body (binary bytes).
