# Feature Specification: Immediate Eviction of Active Sentence URL from Prefetch Cache

**Feature Branch**: `038-tts-active-url-cache-delete`  
**Created**: 2026-09-06  
**Status**: Draft  
**Input**: File: `src/hooks/useTTS.ts`, hàm `speakSentence` (dòng ~503-510). Vấn đề: URL lấy ra từ `prefetchCacheRef` để phát không bị xóa khỏi cache, nên các lần gọi `clearPrefetchCache()` sau đó (stop, jumpToSentence, hết chương) có thể thu hồi nhầm URL đang được audio element đọc dở (`URL.revokeObjectURL(entry.blobUrl)`), gây lỗi "FFmpegDemuxer: data source error" hoặc `MEDIA_ERR_NETWORK` / `MEDIA_ERR_DECODE`. Yêu cầu: Xóa ngay `index` khỏi `prefetchCacheRef.current` khi chuyển sang trạng thái đang phát, cho cả trường hợp lấy từ cache có sẵn và trường hợp await từ `inFlightFetchesRef`.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Reliable Audio Playback During Rapid Seeking and Stopping (Priority: P1) 🎯 MVP

As a user listening to text-to-speech with local RVC voice synthesis, when I rapidly pause, resume, jump across sentences, or seek through a long chapter, I want playback to transition smoothly without triggering "Lỗi phát âm thanh WAV (MEDIA_ERR_NETWORK...)" or demuxer data source failures, so that my listening experience is uninterrupted during navigation.

**Why this priority**: When a prefetched audio blob URL is assigned to `audio.src` but kept in `prefetchCacheRef`, subsequent calls to `clearPrefetchCache()` (which execute on stop, seek, or chapter completion) call `URL.revokeObjectURL()` on that active URL. The browser's audio demuxer fails when trying to read remaining audio buffers from the revoked URL, causing sudden playback crashes.

**Independent Test**:
1. Open a long chapter and start TTS reading with RVC local provider.
2. Rapidly and repeatedly jump between sentences, pause, resume, and seek forward/backward while audio is playing.
3. Verify that playback smoothly transitions to target sentences.
4. Verify that no `MEDIA_ERR_NETWORK`, `MEDIA_ERR_DECODE`, or `FFmpegDemuxer: data source error` errors occur in the UI banner or console.

**Acceptance Scenarios**:
1. **Given** a sentence audio URL is present in `prefetchCacheRef`, **When** `speakSentence(index)` retrieves it, **Then** `index` is immediately deleted from `prefetchCacheRef.current`.
2. **Given** a sentence audio fetch is currently in flight in `inFlightFetchesRef`, **When** `speakSentence(index)` awaits the promise, **Then** `index` is deleted from `prefetchCacheRef.current` upon resolution.
3. **Given** an active sentence audio is playing and `clearPrefetchCache()` is invoked by a navigation action, **Then** the active sentence's blob URL is NOT revoked because it has already been removed from `prefetchCacheRef`.

---

### User Story 2 – Unbroken Sequential Playback Across Chapters (Priority: P2)

As a user reading through an entire chapter sequentially without manual seeking, I want each sentence to play in order and advance to the next sentence seamlessly without regression, so that default automated reading remains completely stable.

**Why this priority**: Evicting active items from `prefetchCacheRef` must not disrupt normal cache prefetching for upcoming sentences (N+1, N+2) or on-ended progression.

**Independent Test**:
1. Start reading from sentence 0 of a chapter.
2. Let the audio play continuously through multiple sentences without manual intervention.
3. Verify that upcoming sentences are prefetched and played sequentially without latency or playback errors.

**Acceptance Scenarios**:
1. **Given** continuous reading mode is enabled, **When** sentence N finishes playing, **Then** sentence N+1 starts playing immediately from cache or on-demand fetch.
2. **Given** the last sentence of a chapter finishes, **When** `clearPrefetchCache()` runs, **Then** the chapter completes cleanly and `onChapterComplete()` triggers without error.

---

### Edge Cases

- **Sentence is fetched on-demand (cache miss)**: If neither `prefetchCacheRef` nor `inFlightFetchesRef` has the sentence, it is fetched on demand via `fetchRVCSpeech(...)` and never enters `prefetchCacheRef`, so `clearPrefetchCache()` will not affect it.
- **Rapid double click on the same sentence**: Deleting `index` from cache on the first click ensures subsequent clicks will re-fetch or use existing `audio.src` if already loaded.
- **Fetch failure / Abort**: If the in-flight fetch returns `null`, `prefetchCacheRef.delete(index)` is a safe no-op.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `src/hooks/useTTS.ts` inside `speakSentence`, when `prefetchCacheRef.current.has(index)` is true, the function MUST immediately call `prefetchCacheRef.current.delete(index)` after retrieving `blobUrl`.
- **FR-002**: In `src/hooks/useTTS.ts` inside `speakSentence`, when `inFlightFetchesRef.current.has(index)` is true, the function MUST call `prefetchCacheRef.current.delete(index)` immediately after awaiting the in-flight fetch promise.
- **FR-003**: The deletion MUST transfer ownership of the blob URL from the prefetch cache to the active `audio` element, preventing `clearPrefetchCache()` from calling `URL.revokeObjectURL()` on currently active audio.
- **FR-004**: Existing prefetching (`prefetchUpcoming`), sequential playback (`audio.onended`), and cleanup logic MUST remain fully operational with zero type errors.

---

### Key Entities

- **PrefetchCache**:
  - Map of `sentenceIndex -> CacheEntry ({ blobUrl, abortController })`.
  - Entries in the cache represent *standby/prefetch* audio assets only.
  - Active audio assets playing in `audio.src` are excluded from the cache.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 occurrences of `MEDIA_ERR_NETWORK` or `FFmpegDemuxer: data source error` caused by premature `URL.revokeObjectURL()` during rapid jumping, pausing, or seeking.
- **SC-002**: 100% pass rate on TypeScript type checking (`npm run typecheck`).
- **SC-003**: 100% pass rate on automated Vitest test suite (`npm test`).
- **SC-004**: Zero regression on uninterrupted sequential chapter playback.

---

## Assumptions

- Once `audio.src` receives a `blob:` URL, the browser holds the reference until playback completes or `audio.src` is overwritten.
- Once evicted from `prefetchCacheRef`, the active blob URL is cleaned up when `audio.src = ''` or when garbage-collected after window/hook lifecycle ends.
