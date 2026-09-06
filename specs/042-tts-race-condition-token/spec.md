# Feature Specification: TTS Generation Token & Race Condition Stale Check

**Feature Branch**: `042-tts-race-condition-token`

**Created**: 2026-09-06

**Status**: Ready for Review

**Input**: User description: "Trong src/hooks/useTTS.ts, hàm speakSentence (nhánh provider === 'rvc-local') đang có một lỗi race condition: sau khi await lấy audioBlobUrl (từ cache, in-flight fetch, hoặc fetch mới), đoạn \"Stale check\" hiện tại chỉ kiểm tra `!isPlayingRef.current || currentIdxRef.current !== index` trước khi gán audio.src và gọi audio.play(). Điều này có 2 hậu quả sai: (1) Nếu người dùng bấm Pause (isPaused = true) trong lúc promise đang chờ, audio vẫn bị ép phát tiếp vì stale check không kiểm tra isPaused. (2) Nếu người dùng đã nhảy sang phát một sentence khác (một lời gọi speakSentence mới, khác lần gọi cũ) trong lúc lần gọi cũ vẫn đang await, cả hai lời gọi có thể cùng ghi vào audioRef.current, gây xung đột. Yêu cầu: - Thêm một ref đếm thế hệ, ví dụ `const playTokenRef = useRef<number>(0);`, đặt gần các ref khác đầu hàm useTTS. - Ở đầu hàm speakSentence (trước khi bắt đầu xử lý bất kỳ provider nào), tăng playTokenRef.current lên 1 và lưu giá trị đó vào một biến cục bộ `const myToken = playTokenRef.current;` — đây là \"vé\" đại diện cho lượt gọi speakSentence hiện tại. - Trong stop(), cũng tăng playTokenRef.current lên 1 (để vô hiệu hóa mọi speakSentence đang await dở dang khi người dùng bấm Stop). - Sửa \"Stale check\" trong nhánh rvc-local thành kiểm tra cả 3 điều kiện: playTokenRef.current === myToken, isPlayingRef.current === true, isPausedRef.current === false, VÀ currentIdxRef.current === index. Nếu bất kỳ điều kiện nào sai, KHÔNG được gán audio.src, KHÔNG được gọi audio.play(), và return ngay (giữ nguyên hành vi return sớm như code hiện tại, chỉ mở rộng điều kiện). - Áp dụng cùng cách kiểm tra myToken này ngay trước dòng gọi `await audio.play()` cuối hàm (phòng trường hợp state thay đổi trong lúc gán audio.src xong nhưng trước khi play() được gọi). KHÔNG được đổi cách hoạt động của play(), resume(), pause(), jumpToSentence() trong prompt này — các hàm đó sẽ được xử lý ở bước sau. KHÔNG được xóa hay đổi logic cache (prefetchCacheRef, inFlightFetchesRef). Tiêu chí chấp nhận: 1. Nếu người dùng bấm Pause trong lúc speakSentence(N) đang chờ fetch, khi fetch xong audio KHÔNG tự động phát (không nghe thấy âm thanh phát ra), chỉ khi người dùng bấm Resume/Play thì mới phát. 2. Nếu người dùng jump sang sentence khác trong lúc speakSentence(N) đang chờ fetch, khi fetch của N xong, audio của N KHÔNG được gán vào audioRef.current / không phát. Xác minh: `npm run typecheck` và `npm run lint` phải sạch. Viết thêm unit test trong tests/hooks/useTTS.test.ts (tạo file mới nếu chưa có, theo đúng convention của tests/hooks/useVoiceServerStatus.test.ts: dùng vitest, @testing-library/react renderHook, vi.stubGlobal('fetch', ...), mock HTMLAudioElement/URL.createObjectURL) để cover 2 tiêu chí chấp nhận trên."

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Prevent Unintended Audio Playback When Paused During Synthesis (Priority: P1) 🎯 MVP

As a reader listening to synthesized audio, when I click "Pause" while a sentence audio request is still downloading or generating in the background, I expect the audio NOT to play automatically when the network request completes, so that playback remains paused until I explicitly choose to resume.

**Why this priority**: When users press Pause, hearing voice synthesis suddenly start blasting seconds later is jarring and confusing, breaking user control over playback.

**Independent Test**:
1. Trigger speech synthesis for sentence N where the audio fetch takes a non-zero duration (e.g. 500ms).
2. While the fetch is pending, trigger `pause()`.
3. Allow the fetch promise to resolve.
4. Verify that `audio.play()` is NEVER invoked and `audio.src` is NOT assigned for the stale sentence.
5. Verify that playback resumes only when user explicitly triggers `resume()` or `play()`.

**Acceptance Scenarios**:
1. **Given** sentence N is actively awaiting its audio synthesis promise, **When** the user pauses playback (`isPaused` becomes true), **Then** when the synthesis promise resolves, the stale check detects `isPausedRef.current === true`, aborts playback assignment, and returns early without calling `audio.play()`.

---

### User Story 2 – Eliminate Audio Collisions When Navigating or Skipping Sentences (Priority: P1) 🎯 MVP

As a reader navigating through sentences (e.g. jumping ahead or clicking next sentence), when I skip to sentence M while sentence N is still awaiting audio synthesis, I expect only sentence M's audio to load and play, so that sentence N never overwrites or collides with sentence M's playback.

**Why this priority**: Concurrent or stale speech requests overwriting the shared media player cause audio glitches, scrambled speech, incorrect sentence index highlighting, and double audio playback.

**Independent Test**:
1. Initiate synthesis for sentence 1 (slow response).
2. Before sentence 1 resolves, jump to sentence 2 (or trigger sentence 2 synthesis).
3. Allow sentence 1's promise to complete.
4. Verify that sentence 1's resolved audio blob is discarded and does not overwrite `audioRef.current.src` or trigger playback.
5. Verify that sentence 2 plays as the sole active speech source.

**Acceptance Scenarios**:
1. **Given** sentence N has generation ticket `myToken`, **When** sentence M is initiated, **Then** `playTokenRef.current` increments, rendering sentence N's ticket invalid (`playTokenRef.current !== myToken`).
2. **Given** sentence N's fetch resolves after sentence M was initiated, **When** sentence N executes its stale check, **Then** it observes `playTokenRef.current !== myToken` (or `currentIdxRef.current !== index`), aborts immediately, and does not touch the audio element.

---

### User Story 3 – Immediate Invalidation on Stop Action (Priority: P2)

As a user stopping reading playback, when I press Stop while speech is resolving, all in-flight synthesis tasks must be immediately invalidated so that no delayed speech ever triggers after stopping.

**Why this priority**: Guarantees clean teardown without orphan audio playing after the user explicitly stopped reading.

**Independent Test**:
1. Initiate speech synthesis for a sentence.
2. Trigger `stop()`.
3. Allow the asynchronous audio synthesis to finish.
4. Verify no audio plays and player remains idle.

**Acceptance Scenarios**:
1. **Given** an in-flight synthesis request, **When** `stop()` is called, **Then** `playTokenRef.current` is incremented, immediately invalidating any pending `speakSentence` resolution.

---

### Edge Cases

- **State change between `audio.src` assignment and `await audio.play()`**: If a user pauses or jumps in the brief microtask window between assigning `audio.src` and calling `audio.play()`, a second guard check immediately before `await audio.play()` prevents invoking `play()`.
- **Fast consecutive jumps**: If a user jumps rapidly through multiple sentences (e.g. index 1 → 2 → 3), each jump increments the generation token; only the latest token matching `playTokenRef.current` will be permitted to play.
- **Cache retention**: Existing cache structures (`prefetchCacheRef`, `inFlightFetchesRef`) must not be deleted or modified by this token validation so that already downloaded audio blobs remain reusable on subsequent plays.
- **Non-RVC Providers**: Non-RVC providers (such as Web Speech API) must remain unaffected; `playTokenRef.current` increments at the start of `speakSentence` universally to invalidate previous runs across all provider transitions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `src/hooks/useTTS.ts`, declare a generation counter reference `const playTokenRef = useRef<number>(0);` alongside the other state refs at the top of the hook.
- **FR-002**: At the start of `speakSentence(index)` (before evaluating any provider branches), increment `playTokenRef.current += 1` and capture the local token `const myToken = playTokenRef.current;`.
- **FR-003**: In `stop()`, increment `playTokenRef.current += 1` to invalidate any in-flight `speakSentence` invocations.
- **FR-004**: In `speakSentence` within the `rvc-local` provider flow, replace the stale check after resolving `audioBlobUrl` with a comprehensive guard checking that ALL of the following are satisfied:
  - `playTokenRef.current === myToken`
  - `isPlayingRef.current === true`
  - `isPausedRef.current === false`
  - `currentIdxRef.current === index`
  If ANY condition evaluates to false, do NOT set `audio.src`, do NOT call `audio.play()`, and return immediately.
- **FR-005**: In `speakSentence` within the `rvc-local` provider flow, insert an identical guard check immediately prior to `await audio.play()` at the end of the function:
  ```typescript
  if (
    playTokenRef.current !== myToken ||
    !isPlayingRef.current ||
    isPausedRef.current ||
    currentIdxRef.current !== index
  ) {
    return;
  }
  ```
- **FR-006**: Do NOT alter the implementations or behaviors of `play()`, `resume()`, `pause()`, or `jumpToSentence()`, and do NOT alter the caching logic in `prefetchCacheRef` or `inFlightFetchesRef`.
- **FR-007**: Add comprehensive automated unit tests in `tests/hooks/useTTS.test.ts` (using Vitest, `@testing-library/react`'s `renderHook`, `vi.stubGlobal('fetch', ...)`, and mocked `Audio`/`URL.createObjectURL`) covering both Acceptance Criteria:
  1. Pause during in-flight fetch prevents audio playback upon fetch resolution.
  2. Jumping to another sentence during in-flight fetch prevents the stale sentence audio from being assigned or played.

### Key Entities

- **PlayTokenTracker (`playTokenRef`)**: Monotonically increasing generation number tracking the current active sentence playback invocation.
- **GenerationTicket (`myToken`)**: Immutable local integer token captured per invocation of `speakSentence`, representing the authorization ticket for that specific speech cycle.
- **PlaybackGuardConditions**: Conjunction of `(playTokenRef.current === myToken && isPlayingRef.current && !isPausedRef.current && currentIdxRef.current === index)` governing whether an audio element may be configured and commanded to play.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of speech requests that complete after user has paused or jumped are cleanly aborted before `audio.play()` is invoked.
- **SC-002**: Zero audio collisions or conflicting `audio.src` assignments when rapid sentence skipping occurs.
- **SC-003**: All new and existing unit tests in `tests/hooks/useTTS.test.ts` pass cleanly via `npm test`.
- **SC-004**: Codebase passes `npm run lint` with 0 errors and 0 warnings.
- **SC-005**: Codebase passes `npm run typecheck` with 0 errors.

## Assumptions

- HTMLAudioElement mock in test environment supports `play()`, `pause()`, `src`, and event listener bindings.
- Cache prefetching and in-flight fetch mapping remain valid optimizations that can safely run in the background even if the originating sentence playback is cancelled.
