# Data Model: Transient Network Retry Policy

**Feature**: `046-rvc-speech-retry`  
**Date**: 2026-09-06

## 1. Retry Configuration

| Parameter | Type | Default | Description |
|---|---|---|---|
| `maxRetries` | `number` | `1` | Maximum additional fetch attempts allowed on retryable failures |
| `retryDelayMs` | `number` | `400` | Backoff delay before re-issuing request |
| `retryableStatuses` | `number[]` | `5xx \ {503}` | HTTP response status codes eligible for retry |
| `nonRetryableStatuses` | `number[]` | `4xx, 503` | Status codes causing immediate failure without retry |

---

## 2. Request Lifecycle & Retry State Machine

```text
[Initiate Request] (maxRetries = 1)
       │
       ▼
[HTTP fetch(/speak)]
       │
       ├── Success (200 OK) ────────► [Return blobUrl]
       │
       ├── Non-Retryable Error ─────► [Surface error toast] ──► [Return null]
       │   (4xx, 503, Aborted)
       │
       └── Retryable Error (500, network)
             │
             ├── maxRetries > 0 && !aborted
             │     │
             │     ▼
             │   [Log console.warn]
             │   [Sleep 400ms]
             │   [Check !aborted]
             │     │
             │     └── Re-dispatch: maxRetries = 0 ──► [HTTP fetch(/speak)]
             │
             └── maxRetries <= 0
                   │
                   ▼
                 [Surface error toast] ──► [Return null]
```
