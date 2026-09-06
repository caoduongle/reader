# Phase 0 Research: Abort In-Flight Background TTS Prefetch

**Feature**: `045-abort-in-flight-prefetch`  
**Date**: 2026-09-06

## 1. Problem Analysis: Orphaned Background Inference Requests

### Background
In `src/hooks/useTTS.ts`, VoxRead prefetches up to `MAX_PREFETCH_AHEAD` future sentences (e.g. $N+1, N+2$) via `fetchRVCSpeech(...)` whenever sentence $N$ begins playing.
Each RVC synthesis request requires backend inference (Edge-TTS conversion + RVC pitch/timbre transformation) protected by an exclusive mutex `rvc_lock` in `python-backend/server.py`.

### The Defect
1. `prefetchUpcoming` created an `AbortController` for each prefetch request, but only cached it in `prefetchCacheRef` inside `.then(blobUrl => ...)` *after* the network request successfully completed.
2. While the request was actively running, `inFlightFetchesRef` only held the bare `Promise<string | null>`.
3. When the user stopped playback (`stop()`), jumped to another sentence (`jumpToSentence()`), or changed chapters, `clearPrefetchCache()` was called. Because `clearPrefetchCache()` only checked `prefetchCacheRef` (which held only completed requests), it called `.abort()` on requests that had already finished.
4. The request actively executing on the server was never aborted. It continued running, holding `rvc_lock` on the backend and blocking subsequent speech synthesis requests for several seconds.

---

## 2. Technical Decisions

### Decision 1: Typed In-Flight Ref Tuple (`InFlightPrefetchEntry`)
Change `inFlightFetchesRef` from storing bare promises to an explicit object:
```typescript
interface InFlightPrefetchEntry {
  promise: Promise<string | null>;
  controller: AbortController;
}

const inFlightFetchesRef = useRef<Map<number, InFlightPrefetchEntry>>(new Map());
```
- **Rationale**: Keeps controller and promise unified under the sentence index key.
- **Alternatives Considered**: Storing separate `Map<number, AbortController>` and `Map<number, Promise<string | null>>`. Rejected because maintaining parallel maps introduces synchronization hazards.

### Decision 2: Immediate Registration in `prefetchUpcoming`
```typescript
const controller = new AbortController();
const fetchPromise = fetchRVCSpeech(text, serverUrl, controller).then(blobUrl => {
  inFlightFetchesRef.current.delete(targetIdx);
  if (blobUrl) {
    prefetchCacheRef.current.set(targetIdx, { blobUrl, abortController: controller });
  }
  return blobUrl;
});

inFlightFetchesRef.current.set(targetIdx, { promise: fetchPromise, controller });
```
- **Rationale**: Ensures the controller is reachable from `clearPrefetchCache` immediately from the millisecond the request starts.

### Decision 3: Comprehensive Abort in `clearPrefetchCache`
```typescript
const clearPrefetchCache = useCallback(() => {
  inFlightFetchesRef.current.forEach(entry => {
    if (entry.controller) {
      try {
        entry.controller.abort();
      } catch {
        // ignore
      }
    }
  });
  inFlightFetchesRef.current.clear();

  prefetchCacheRef.current.forEach(entry => {
    if (entry.abortController) {
      try {
        entry.abortController.abort();
      } catch {
        // ignore
      }
    }
    if (entry.blobUrl) {
      URL.revokeObjectURL(entry.blobUrl);
    }
  });
  prefetchCacheRef.current.clear();
}, []);
```
- **Rationale**: Immediately signals all active HTTP connections to cancel and release server resources, while also releasing blob URLs for completed requests.

### Decision 4: Read Access in `speakSentence`
Update line 521:
```typescript
} else if (inFlightFetchesRef.current.has(index)) {
  audioBlobUrl = await inFlightFetchesRef.current.get(index)!.promise;
  prefetchCacheRef.current.delete(index);
}
```
- **Rationale**: Seamlessly awaits the `.promise` field of the in-flight entry.

---

## 3. Testing Strategy

### Unit Test in `tests/hooks/useTTS.test.ts`
1. Spy on `AbortController.prototype.abort`.
2. Trigger `play(0)` with mock fetch where `/speak` for sentence 1 returns a pending promise.
3. Call `stop()` or `jumpToSentence(2)`.
4. Verify that `AbortController.prototype.abort` was called for sentence 1's controller.
5. Verify that in-flight map is cleared.
