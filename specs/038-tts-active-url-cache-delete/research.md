# Research: Immediate Eviction of Active Sentence URL from Prefetch Cache

**Feature**: 038-tts-active-url-cache-delete | **Date**: 2026-09-06

## Research Task 1: Blob URL Invalidation and FFmpegDemuxer Errors

### Decision
Immediately delete `index` from `prefetchCacheRef.current` upon assigning or resolving its URL for active playback in `speakSentence`.

### Rationale
- `URL.revokeObjectURL(url)` immediately deletes the browser's mapping between the blob URI and the underlying binary buffer.
- In Chromium (used by Electron), media elements decode and buffer audio incrementally via `FFmpegDemuxer`. If the blob URL is revoked before the demuxer finishes buffering all frames, any subsequent read operation fails with a data source error.
- In `useTTS.ts`, `clearPrefetchCache()` loops over all entries in `prefetchCacheRef.current` and calls `URL.revokeObjectURL(entry.blobUrl)`.
- When a user pauses, seeks, jumps sentences, or when a chapter ends, `clearPrefetchCache()` is invoked. If the currently playing sentence index is still present in `prefetchCacheRef.current`, its URL is revoked mid-playback, causing playback crashes (`MEDIA_ERR_NETWORK` / `MEDIA_ERR_DECODE`).
- By deleting the entry from `prefetchCacheRef.current` when playback begins, the URL is no longer considered "standby prefetch" and is protected from `clearPrefetchCache()`.

---

## Research Task 2: In-Flight Fetch Cache Synchronization

### Decision
Delete `index` from `prefetchCacheRef.current` in the `inFlightFetchesRef` branch as well:
```typescript
} else if (inFlightFetchesRef.current.has(index)) {
  audioBlobUrl = await inFlightFetchesRef.current.get(index)!;
  prefetchCacheRef.current.delete(index);
}
```

### Rationale
- In `prefetchUpcoming`:
  ```typescript
  const fetchPromise = fetchRVCSpeech(text, serverUrl, controller).then(blobUrl => {
    inFlightFetchesRef.current.delete(targetIdx);
    if (blobUrl) {
      prefetchCacheRef.current.set(targetIdx, { blobUrl, abortController: controller });
    }
    return blobUrl;
  });
  ```
- Because the promise's `.then()` handler runs and puts the result into `prefetchCacheRef.current` before the promise resolves, awaiting `inFlightFetchesRef.current.get(index)!` in `speakSentence` means the entry has just been added to `prefetchCacheRef.current`.
- Deleting `index` from `prefetchCacheRef.current` immediately after `await` ensures proper synchronization and prevents the newly resolved URL from staying in the standby cache during active playback.
