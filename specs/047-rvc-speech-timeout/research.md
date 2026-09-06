# Research: Client-Side Timeout for RVC Speech Synthesis

**Feature**: `047-rvc-speech-timeout`  
**Date**: 2026-09-06

---

## 1. Controller Attachment Strategy

### Decision
Reuse caller-provided `abortController` when passed; instantiate an internal `AbortController` only when caller omits it.

### Rationale
- Callers like `speakSentence` and `prefetchUpcoming` instantiate an `AbortController` to track request lifecycles (e.g. aborting prefetch when navigating or stopping).
- Creating a secondary controller inside `fetchRVCSpeech` would sever the connection to the caller's signal unless complex `AbortSignal.any()` polyfills were used.
- Attaching the timeout directly via `setTimeout(() => activeController.abort(), 20000)` allows both caller cancellations and timeout expirations to trigger the exact same signal seamlessly.

### Alternatives Considered
- *Dual-controller with `AbortSignal.any([callerSignal, timeoutSignal])`*: Requires newer standard / polyfill, unnecessarily complex when single controller abort mutation achieves identical semantics.
- *Wrapping fetch in `Promise.race([fetchPromise, timeoutPromise])`*: Leaves the underlying HTTP socket open on timeout, continuing to consume backend resources. `abort()` properly closes the connection.

---

## 2. Timeout Duration & Constant Scoping

### Decision
Define `const RVC_FETCH_TIMEOUT_MS = 20000;` (20 seconds) for speech synthesis, while keeping `checkRVCServerHealth` at strictly `2500ms`.

### Rationale
- 20 seconds provides ample leeway for Edge-TTS upstream generation and local RVC pitch conversion on large sentences.
- Any request exceeding 20 seconds is pathological (socket freeze, thread deadlock, or upstream hang) and should be terminated.
- The `/health` check serves a totally different purpose (quick liveness check) and must retain its 2.5-second timeout for responsive status indicators.

---

## 3. Timer Lifecycle & Leak Prevention

### Decision
Enclose the fetch execution in a `try ... finally` block that always executes `clearTimeout(timeoutId)`.

### Rationale
- In typical execution, requests resolve within 200–1500ms.
- Without `clearTimeout`, thousands of timers could linger in Node/browser event loops during long reading sessions.
- In `finally`, `clearTimeout` runs regardless of whether the request succeeded, threw an error, was aborted, or was rejected.

---

## 4. Interaction with Retry Policy (Feature 046)

### Decision
When timeout aborts the request, `activeController.signal.aborted` becomes `true`. The error handler treats this as an abort (`signal.aborted === true`), returning `null` without retrying.

### Rationale
- Retrying an operation that just took 20 seconds and timed out would freeze the user for another 20 seconds (40 seconds total).
- Consistent with Feature 046 contract: aborted requests never retry.
- If a request fails with an HTTP 500 in 1 second, its 20s timer is cleared in `finally`, and the recursive retry call initializes its own fresh 20s timer.
