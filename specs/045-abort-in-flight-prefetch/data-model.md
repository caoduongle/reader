# Data Model: In-Flight Prefetch & Abortion

**Feature**: `045-abort-in-flight-prefetch`  
**Date**: 2026-09-06

## 1. Entities

### InFlightPrefetchEntry
Represents an ongoing network request synthesizing speech for an upcoming sentence.

| Field | Type | Description |
|---|---|---|
| `promise` | `Promise<string \| null>` | Resolves to the synthesized audio blob URL or `null` if aborted/failed |
| `controller` | `AbortController` | Standard DOM `AbortController` passed to `fetch(..., { signal })` |

### CacheEntry (Existing)
Represents a completed, cached sentence audio blob.

| Field | Type | Description |
|---|---|---|
| `blobUrl` | `string` | Object URL referencing synthesized WAV audio |
| `abortController` | `AbortController \| null` | Controller retained for cleanup |

---

## 2. State Machine & Transitions

```text
[Idle / Not Prefetched]
       │
       │ prefetchUpcoming(fromIndex)
       ▼
[In-Flight: stored in inFlightFetchesRef]
  ├── User navigates / stops ──► entry.controller.abort() ──► [Deleted & Discarded]
  │
  ├── speakSentence(N) called ──► await entry.promise ──► [Assigned to audio.src]
  │
  └── Fetch completes in bg ──► entry stored in prefetchCacheRef ──► [Cached Audio Blob]
```

---

## 3. Invariants

1. Every entry added to `inFlightFetchesRef` MUST have a non-null `controller` and `promise`.
2. When `clearPrefetchCache()` runs, every active entry in `inFlightFetchesRef` MUST receive an `abort()` call.
3. Resolving or rejecting an in-flight fetch MUST remove its index from `inFlightFetchesRef`.
