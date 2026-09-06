# Feature Specification: Abort In-Flight Background TTS Prefetch

**Feature Branch**: `045-abort-in-flight-prefetch`

**Created**: 2026-09-06

**Status**: Ready for Review

**Input**: User description: "Trong src/hooks/useTTS.ts, hàm prefetchUpcoming (khoảng dòng 344-376) tạo một AbortController cho mỗi prefetch fetch, nhưng chỉ lưu controller đó vào prefetchCacheRef SAU KHI fetch đã resolve thành công (dòng .then(blobUrl => { ...; prefetchCacheRef.current.set(targetIdx, { blobUrl, abortController: controller }); })). Hậu quả: clearPrefetchCache() (dòng 118-134) và stop()/jumpToSentence() chỉ có thể abort các request ĐÃ XONG (vô nghĩa), KHÔNG BAO GIỜ abort được request THỰC SỰ đang chạy dở — vì lúc request còn đang chạy, controller của nó chưa từng được lưu vào đâu có thể truy cập từ clearPrefetchCache. Điều này khiến các request prefetch \"mồ côi\" (không còn cần dùng do người dùng đã nhảy câu/dừng đọc) tiếp tục chiếm giữ rvc_lock ở backend (python-backend/server.py), làm chậm request thực sự cần thiết. Yêu cầu: - Đổi kiểu của inFlightFetchesRef từ Map<number, Promise<string | null>> thành một Map lưu cả promise lẫn controller, ví dụ Map<number, { promise: Promise<string | null>; controller: AbortController }>. - Trong prefetchUpcoming: lưu {promise, controller} vào inFlightFetchesRef NGAY KHI bắt đầu fetch (trước khi .then), để controller có thể được truy cập và abort bất cứ lúc nào trong khi fetch còn đang chạy. - Trong clearPrefetchCache: trước khi xóa prefetchCacheRef, phải duyệt qua toàn bộ inFlightFetchesRef.current và gọi entry.controller.abort() cho từng phần tử còn tồn tại ở đó (bọc trong try/catch như code hiện tại đang làm cho prefetchCacheRef), rồi mới clear cả hai Map. - Cập nhật tất cả những nơi đang đọc inFlightFetchesRef.current.get(targetIdx) như một Promise trực tiếp (ví dụ trong speakSentence dòng 'await inFlightFetchesRef.current.get(index)!') để lấy đúng field .promise thay vì cả object. KHÔNG được thay đổi hành vi của MAX_PREFETCH_AHEAD, không đổi logic evictOldCache, không đổi backend server.py trong prompt này. Xác minh: npm run typecheck, npm run lint sạch. Viết test trong tests/hooks/useTTS.test.ts: giả lập 1 fetch prefetch chưa resolve (promise treo), gọi stop() hoặc jumpToSentence() sang chỗ khác, assert rằng AbortController tương ứng đã được .abort() gọi tới (dùng vi.fn() spy trên AbortController.prototype.abort hoặc kiểm tra signal.aborted === true)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Immediately Abort In-Flight Background Prefetches on Invalidation (Priority: P1) 🎯 MVP

As a reader navigating through audio chapters or pausing/stopping playback, when background sentences are being prefetched on the server, I want those in-flight prefetch requests to be aborted immediately if I stop or jump away, so that the voice synthesis engine is immediately freed to process my new requested sentence without waiting for obsolete requests.

**Why this priority**: Without in-flight abortion, jumping sentences or clicking stop leaves long-running speech synthesis tasks running on the server, holding server locks (`rvc_lock`) and delaying new speech synthesis requests by several seconds.

**Independent Test**:
1. Mount `useTTS` with sentences and initiate speech on sentence 0.
2. Observe background prefetch initiated for sentence 1 with a pending network promise.
3. Call `stop()` or `jumpToSentence(5)`.
4. Assert that the `AbortController.abort()` corresponding to sentence 1's in-flight request was invoked and `signal.aborted === true`.

**Acceptance Scenarios**:
1. **Given** sentence $N+1$ has a prefetch request currently in-flight, **When** `clearPrefetchCache()` is invoked (via `stop()`, `jumpToSentence()`, `jumpToParagraph()`, or unmount), **Then** `abort()` is invoked on the `AbortController` stored with that in-flight request.
2. **Given** an in-flight prefetch request is aborted, **When** its promise settles, **Then** it does not place stale entries into `prefetchCacheRef` nor disrupt subsequent playback.

---

### User Story 2 – Smooth Reuse of In-Flight Prefetches on Sequential Playback (Priority: P1) 🎯 MVP

As a reader listening continuously as sentence $N$ finishes and sentence $N+1$ begins, I want the player to await the already in-flight prefetch promise for sentence $N+1$ rather than issuing a duplicate fetch, so that playback transitions seamlessly with minimal latency.

**Why this priority**: Ensures audio caching benefits are retained for normal reading flow while structuring in-flight entries as `{ promise, controller }`.

**Independent Test**:
1. Trigger prefetch for sentence 1 while sentence 0 is playing.
2. Advance to sentence 1 while its prefetch is still in-flight.
3. Assert that `speakSentence(1)` awaits `inFlightFetchesRef.current.get(1)!.promise` without launching a redundant duplicate fetch.
4. When the promise resolves, verify audio begins playing.

**Acceptance Scenarios**:
1. **Given** sentence $K$ has an active in-flight prefetch entry, **When** `speakSentence(K)` is called, **Then** `speakSentence` awaits `entry.promise` directly and receives the synthesized audio blob URL.
2. **Given** the in-flight prefetch completes, **Then** the entry is deleted from `inFlightFetchesRef` and cached in `prefetchCacheRef` if still relevant.

---

### User Story 3 – Resilient Teardown and Exception Isolation (Priority: P2)

As a reader performing rapid actions (such as repeated stops, pauses, and chapter skips), I want all in-flight controllers to be aborted safely even if an individual abort call throws or encounters an edge case, so that reader stability is preserved.

**Why this priority**: Prevents unhandled exceptions during rapid state changes from breaking the React render tree or leaving dangling references in memory.

**Independent Test**:
1. Mock multiple in-flight entries where one controller's `abort()` throws an error.
2. Call `clearPrefetchCache()`.
3. Assert all controllers are processed, both maps are cleared, and no unhandled error is thrown.

**Acceptance Scenarios**:
1. **Given** one or more active in-flight requests in `inFlightFetchesRef.current`, **When** `clearPrefetchCache()` executes, **Then** each controller's `abort()` is called within a try/catch wrapper and both `inFlightFetchesRef` and `prefetchCacheRef` are cleared.

---

### Edge Cases

- **Immediate Resolution**: If a prefetch resolves or rejects before `clearPrefetchCache()` is called, its entry is already deleted from `inFlightFetchesRef.current` and stored in `prefetchCacheRef.current` (with its controller), where `clearPrefetchCache()` continues to abort and revoke object URLs safely.
- **Provider Boundary**: `browser` (Web Speech API) does not use `inFlightFetchesRef` or prefetching, remaining unaffected.
- **Eviction Isolation**: `evictOldCache()` only clears older prefetch cache entries (`prefetchCacheRef`) and does not modify active future in-flight requests.
- **Single Sentence Document**: Documents with a single sentence do not trigger prefetch (`offset = 1 >= sentenceList.length`), gracefully skipping loop execution.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `src/hooks/useTTS.ts`, update `inFlightFetchesRef` type declaration to store both promise and controller:
  ```typescript
  const inFlightFetchesRef = useRef<
    Map<number, { promise: Promise<string | null>; controller: AbortController }>
  >(new Map());
  ```
- **FR-002**: In `prefetchUpcoming(fromIndex)`:
  - Instantiate `const controller = new AbortController();`.
  - Initiate `fetchRVCSpeech(text, serverUrl, controller)`.
  - Store `{ promise: fetchPromise, controller }` into `inFlightFetchesRef.current.set(targetIdx, ...)` immediately upon creation (before awaiting or resolving `.then`).
  - Upon promise resolution, remove `targetIdx` from `inFlightFetchesRef.current` and, if `blobUrl` is valid, cache `{ blobUrl, abortController: controller }` in `prefetchCacheRef.current`.
- **FR-003**: In `clearPrefetchCache()`:
  - Before clearing maps, iterate through all entries in `inFlightFetchesRef.current`.
  - Invoke `entry.controller.abort()` for each entry inside a `try...catch` block.
  - Clear `inFlightFetchesRef.current` alongside `prefetchCacheRef.current`.
- **FR-004**: In `speakSentence(index)`:
  - When sentence $index$ is in `inFlightFetchesRef.current`, retrieve the promise via `await inFlightFetchesRef.current.get(index)!.promise`.
- **FR-005**: Strictly preserve the behavior and constants of `MAX_PREFETCH_AHEAD`, the logic of `evictOldCache`, and all backend code in `python-backend/server.py`.
- **FR-006**: Ensure full static type compliance (`npm run typecheck` with 0 errors) and linter hygiene (`npm run lint` with 0 errors and 0 warnings).
- **FR-007**: Add automated unit tests in `tests/hooks/useTTS.test.ts` verifying that in-flight prefetch requests have their `AbortController.abort()` called when `stop()` or `jumpToSentence()` is invoked.

### Key Entities

- **InFlightPrefetchEntry**: Record containing:
  - `promise`: `Promise<string | null>` representing the active network synthesis operation.
  - `controller`: `AbortController` linked directly to the HTTP request signal.
- **InFlightFetchesMap**: `Map<number, InFlightPrefetchEntry>` tracking background synthesis jobs indexed by sentence index.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of in-flight prefetch network requests are aborted via `controller.abort()` when the user halts playback or navigates to a non-consecutive sentence.
- **SC-002**: Elimination of orphaned background prefetch requests consuming server-side inference locks (`rvc_lock`).
- **SC-003**: Zero regression in sequential sentence playback latency (in-flight prefetches are seamlessly awaited by `speakSentence`).
- **SC-004**: Codebase passes `npm run typecheck` with 0 errors.
- **SC-005**: Codebase passes `npm run lint` with 0 errors and 0 warnings.
- **SC-006**: 100% of test suites pass in `npm test`.

## Assumptions

- Standard browser / Electron environment provides compliant `AbortController` implementation.
- The `fetchRVCSpeech` utility properly forwards `controller.signal` to `fetch(..., { signal: controller.signal })`.
