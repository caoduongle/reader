# Data Model: Client-Side Timeout for RVC Speech Synthesis

**Feature**: `047-rvc-speech-timeout`  
**Date**: 2026-09-06

---

## 1. Timeout Configuration & Timing Specifications

| Parameter | Type | Default Value | Description |
|---|---|---|---|
| `RVC_FETCH_TIMEOUT_MS` | `number` | `20000` (20s) | Hard ceiling for speech synthesis HTTP request duration |
| `RVC_HEALTH_TIMEOUT_MS` | `number` | `2500` (2.5s) | Liveness probe timeout for `/health` (unchanged) |
| `RVC_RETRY_DELAY_MS` | `number` | `400` (400ms) | Backoff delay between transient retries (from Feature 046) |

---

## 2. Request Lifecycle & Timeout State Machine

```text
                  [fetchRVCSpeech Invoked]
                            │
              ┌─────────────┴─────────────┐
        [Caller provided]           [Caller omitted]
        abortController             abortController
              │                             │
              ▼                             ▼
       activeController =            activeController =
        abortController              new AbortController()
              │                             │
              └─────────────┬───────────────┘
                            │
                            ▼
              [Set 20,000ms Timeout Timer]
                            │
                   [Execute HTTP Fetch]
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
[Completes <20s]      [Exceeds 20s]      [Caller Aborts <20s]
       │                    │                    │
[clearTimeout]      [Timer fires: abort] [clearTimeout]
       │                    │                    │
[Return blobUrl /     [fetch throws      [Return null]
  error handling]      AbortError]
                            │
                      [clearTimeout]
                            │
                      [Return null]
```
