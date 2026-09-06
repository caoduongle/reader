# Interface Contract: Prefetch Abort Lifecycle

**Feature**: `045-abort-in-flight-prefetch`  
**Date**: 2026-09-06

## 1. Internal Hook Types (`useTTS.ts`)

```typescript
interface InFlightPrefetchEntry {
  promise: Promise<string | null>;
  controller: AbortController;
}
```

## 2. In-Flight Reference Signature

```typescript
const inFlightFetchesRef: React.MutableRefObject<Map<number, InFlightPrefetchEntry>>;
```

## 3. Operational Contracts

### A. Prefetch Initiation (`prefetchUpcoming`)
- **Precondition**: `sentenceList[targetIdx]` exists, not in `prefetchCacheRef`, not in `inFlightFetchesRef`.
- **Postcondition**: Entry `{ promise, controller }` is immediately present in `inFlightFetchesRef.current` with `targetIdx` key before any asynchronous dispatch yields.

### B. Cache Clear (`clearPrefetchCache`)
- **Action**: Iterates all entries in `inFlightFetchesRef.current`, executes `entry.controller.abort()`, then calls `.clear()`.
- **Guarantee**: No active HTTP connection initiated by `prefetchUpcoming` remains un-aborted after `clearPrefetchCache()` returns.

### C. In-Flight Playback (`speakSentence`)
- **Access Pattern**:
  ```typescript
  if (inFlightFetchesRef.current.has(index)) {
    audioBlobUrl = await inFlightFetchesRef.current.get(index)!.promise;
    prefetchCacheRef.current.delete(index);
  }
  ```
