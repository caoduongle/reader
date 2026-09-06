# Data Model: Immediate Eviction of Active Sentence URL from Prefetch Cache

**Feature**: 038-tts-active-url-cache-delete | **Date**: 2026-09-06

> This feature modifies in-memory state transitions of the prefetch cache. No persistent database entities are altered.

---

## Audio Blob URL Lifecycle & State Transitions

An audio blob URL undergoes three lifecycle states:

| State | Holder | Lifecycle Meaning | Revocation Policy |
|---|---|---|---|
| **In-Flight** | `inFlightFetchesRef` | Currently being fetched from `POST /speak` | Aborted via `AbortController` if cancelled |
| **Prefetched (Standby)** | `prefetchCacheRef` | Stored ahead of time for upcoming sentences (N+1, N+2) | May be revoked at any time by `clearPrefetchCache()` or `evictOldCache()` |
| **Active Playing** | `audioRef.current.src` | Currently loaded into HTML5 Audio element | **Protected**: Excluded from `prefetchCacheRef`; never revoked by `clearPrefetchCache()` |

### Transition Flow in `speakSentence(index)`

```text
Sentence audio requested for index
  │
  ├─► Case A: index in prefetchCacheRef
  │     ├── Retrieve blobUrl
  │     └── prefetchCacheRef.delete(index)        [State: Prefetched ──► Active Playing]
  │
  ├─► Case B: index in inFlightFetchesRef
  │     ├── Await inFlightFetchesRef.get(index)
  │     └── prefetchCacheRef.delete(index)        [State: In-Flight ──► Active Playing]
  │
  └─► Case C: Cache miss
        └── Fetch on demand (never enters prefetchCacheRef)
  │
  ▼
audio.src = audioBlobUrl (Audio element plays)
  │
  ▼
User calls stop() / jumps / chapter completes ──► clearPrefetchCache() runs
  └─► Iterates prefetchCacheRef ONLY: Active audio URL is NOT revoked!
```
