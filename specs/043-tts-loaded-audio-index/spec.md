# Feature Specification: Accurate Audio Resume via Loaded Audio Index Reference

**Feature Branch**: `043-tts-loaded-audio-index`

**Created**: 2026-09-06

**Status**: Ready for Review

**Input**: User description: "Trong src/hooks/useTTS.ts, hàm play() (khoảng dòng 630) và resume() (khoảng dòng 679) đang quyết định \"resume audio hiện có\" hay \"gọi speakSentence mới\" dựa vào trạng thái của audioRef.current (audio.src, audio.paused, audio.ended) — phần tử <audio> này được TÁI SỬ DỤNG cho mọi sentence. Lỗi: nếu speakSentence(N) đang await fetch dở dang, audioRef.current.src vẫn còn là blob của sentence N-1 (đã ended). Nếu người dùng bấm Play/Resume ngay lúc đó, code gọi audioRef.current.play() lên audio CŨ của N-1 — theo chuẩn HTMLMediaElement, gọi play() trên audio đã ended sẽ tua về đầu và phát lại từ đầu, khiến app đọc lại câu N-1 trước khi (một lúc sau) speakSentence(N) mới hoàn tất và chuyển sang câu N. Đây chính là bug \"phải bấm play 2 lần, nghe lại câu cũ rồi mới sang câu hiện tại\". Yêu cầu: play() và resume() không được tự suy luận qua audio.src/.paused/.ended nữa. Thay vào đó: - Thêm một ref theo dõi index mà audioRef.current.src hiện đang thực sự đại diện, ví dụ `const loadedAudioIndexRef = useRef<number | null>(null);`. Set giá trị này = index NGAY TRƯỚC dòng `audio.src = audioBlobUrl;` trong speakSentence, và set về null trong stop() và khi audio.onerror xảy ra. - Trong play(): chỉ được coi là \"có thể resume tại chỗ\" (gọi thẳng audioRef.current.play()) khi đồng thời: loadedAudioIndexRef.current === targetIndex, audioRef.current.paused === true, và audioRef.current.ended === false. Nếu không thỏa cả 3, luôn gọi speakSentence(targetIndex) (fetch/phát lại từ đầu một cách tường minh, không dựa vào state cũ của audio). - Trong resume(): áp dụng đúng điều kiện tương tự (loadedAudioIndexRef.current === currentIdxRef.current, paused, !ended) trước khi gọi audioRef.current.play(); nếu không thỏa, gọi speakSentence(currentIdxRef.current) thay vì play() trên audio cũ. KHÔNG được đổi lại Stale check / playTokenRef đã thêm ở prompt trước. KHÔNG được đổi hành vi của provider 'browser' (Web Speech API), chỉ sửa nhánh rvc-local. Tiêu chí chấp nhận: Trong lúc speakSentence(N) đang chờ fetch (audio.src vẫn là N-1), bấm Play hoặc Resume KHÔNG được nghe lại âm thanh của câu N-1; chỉ có duy nhất 1 lượt phát cho câu N khi fetch của N hoàn tất. Xác minh: `npm run typecheck`, `npm run lint` sạch; bổ sung test trong tests/hooks/useTTS.test.ts mô phỏng đúng kịch bản trên (mock fetch trả về chậm bằng cách trì hoãn resolve promise, gọi play() giữa lúc đang chờ, assert audioRef không bị phát audio của index cũ)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Prevent Accidental Replay of Previous Sentence on Play/Resume (Priority: P1) 🎯 MVP

As a reader who pauses and resumes playback, when sentence N is currently generating its audio (with the media element still retaining the finished audio blob of sentence N-1), pressing Play or Resume must NEVER trigger playback of sentence N-1; instead, it must await or trigger sentence N's audio synthesis cleanly, eliminating the "play twice / hear previous sentence" bug.

**Why this priority**: Hearing the preceding sentence repeat unexpectedly when resuming reading disrupts reading continuity and creates severe confusion about playback progress.

**Independent Test**:
1. Complete playback of sentence 0 so `audioRef.current.src` holds sentence 0's blob and has `ended === true`.
2. Initiate speech for sentence 1 with a delayed/in-flight network fetch.
3. While the fetch for sentence 1 is in-flight, invoke `play(1)` or `resume()`.
4. Verify that `audioRef.current.play()` is NOT called on sentence 0's ended audio.
5. When sentence 1's audio fetch completes, verify that sentence 1's audio loads and plays once without repetition.

**Acceptance Scenarios**:
1. **Given** sentence N-1 has ended and sentence N is awaiting audio synthesis, **When** the user calls `play(N)` or `resume()`, **Then** the system detects `loadedAudioIndexRef.current !== N` (or `audio.ended === true`), refuses in-place resume of the old audio element, and instead triggers speech synthesis for sentence N.
2. **Given** a delayed fetch for sentence N is in-flight, **When** `play(N)` is invoked, **Then** sentence N-1 is not replayed from the beginning.

---

### User Story 2 – Reliable In-Place Resume When Paused Mid-Sentence (Priority: P1) 🎯 MVP

As a reader pausing during the active playback of sentence N, when I click Resume or Play, I want the audio to continue playing directly from the current paused playback position without re-fetching or reloading the audio blob from scratch.

**Why this priority**: When audio is already loaded and paused mid-speech, resuming directly from memory provides instant sound without network latency or re-synthesis delay.

**Independent Test**:
1. Start playback of sentence N.
2. Pause playback while the audio is actively playing (`audio.paused = true`, `audio.ended = false`).
3. Call `resume()` or `play(N)`.
4. Verify that `audioRef.current.play()` is invoked directly without dispatching a new fetch request to the backend.

**Acceptance Scenarios**:
1. **Given** sentence N's audio is currently loaded in `audioRef.current` (`loadedAudioIndexRef.current === N`), the audio is paused (`audio.paused === true`), and has not ended (`audio.ended === false`), **When** `resume()` or `play(N)` is called, **Then** the existing audio element resumes playback directly in-place.

---

### User Story 3 – Loaded Audio Index Lifecycle Teardown (Priority: P2)

As a developer maintaining audio playback state, when playback is stopped or encounters an audio decoding/loading error, `loadedAudioIndexRef` must be reset to `null` so that future playback attempts never mistake a broken or stopped audio element for valid loaded audio.

**Why this priority**: Prevents stale index retention across sessions or following fatal media errors.

**Independent Test**:
1. Mount hook and play sentence N.
2. Call `stop()` or trigger `audio.onerror`.
3. Verify `loadedAudioIndexRef.current` is reset to `null`.

**Acceptance Scenarios**:
1. **Given** an active or paused audio session, **When** `stop()` is invoked, **Then** `loadedAudioIndexRef.current` is set to `null`.
2. **Given** an audio playback error occurs in `audio.onerror`, **Then** `loadedAudioIndexRef.current` is set to `null`.

---

### Edge Cases

- **Rapid Play Clicks**: If a user clicks Play repeatedly while sentence N is fetching, `loadedAudioIndexRef.current` remains not equal to N (or null), preventing repeated invocation of `audio.play()` on stale media elements while generating tickets (`playTokenRef`) safely sequence each attempt.
- **Audio Ended State**: In standard HTMLMediaElement behavior, calling `play()` on an audio element with `ended = true` seeks to 0 and replays. The strict check `!audio.ended` in both `play()` and `resume()` prevents this unwanted behavior.
- **Web Speech Provider**: The browser provider (`speechSynthesis`) does not use `loadedAudioIndexRef` and its behavior remains completely untouched.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `src/hooks/useTTS.ts`, declare a tracking ref:
  ```typescript
  const loadedAudioIndexRef = useRef<number | null>(null);
  ```
  near the other hook refs.
- **FR-002**: In `speakSentence`, set `loadedAudioIndexRef.current = index` immediately prior to assigning `audio.src = audioBlobUrl`.
- **FR-003**: In `audio.onerror` callback within `speakSentence`, reset `loadedAudioIndexRef.current = null`.
- **FR-004**: In `stop()`, reset `loadedAudioIndexRef.current = null`.
- **FR-005**: In `play(index)` (for the `rvc-local` provider branch), permit in-place resume if and only if ALL of the following conditions are met:
  1. `audioRef.current` is non-null
  2. `loadedAudioIndexRef.current === targetIndex`
  3. `audioRef.current.paused === true`
  4. `audioRef.current.ended === false`
  If any of these conditions is not met, do NOT call `audioRef.current.play()`; instead, execute `speakSentence(targetIndex)`.
- **FR-006**: In `resume()` (for the `rvc-local` provider branch), permit in-place resume if and only if ALL of the following conditions are met:
  1. `audioRef.current` is non-null
  2. `loadedAudioIndexRef.current === currentIdxRef.current`
  3. `audioRef.current.paused === true`
  4. `audioRef.current.ended === false`
  If any of these conditions is not met, do NOT call `audioRef.current.play()`; instead, execute `speakSentence(currentIdxRef.current)`.
- **FR-007**: Do NOT modify the generation token logic (`playTokenRef`) or stale checks implemented previously. Do NOT modify the `browser` (Web Speech API) provider branch.
- **FR-008**: Add automated unit test in `tests/hooks/useTTS.test.ts` verifying that when sentence N is fetching while sentence N-1's audio is still in `audioRef.current`, invoking `play()` or `resume()` does NOT trigger playback of sentence N-1.

### Key Entities

- **LoadedAudioIndexTracker (`loadedAudioIndexRef`)**: Ref storing `number | null` indicating the exact sentence index currently configured in `audioRef.current.src`.
- **InPlaceResumePredicate**: Conjunction of `(loadedAudioIndexRef.current === targetIndex && audio.paused && !audio.ended)` determining whether `audio.play()` can safely resume current playback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero occurrences of sentence N-1 replaying when the user triggers Play or Resume while sentence N is fetching.
- **SC-002**: Exactly 1 audio playback initiation occurs for sentence N once its fetch resolves.
- **SC-003**: In-place resume works seamlessly with 0ms re-fetch overhead when pausing and resuming mid-sentence.
- **SC-004**: Codebase passes `npm run lint` with 0 errors and 0 warnings.
- **SC-005**: Codebase passes `npm run typecheck` with 0 errors.
- **SC-006**: All unit tests in `tests/hooks/useTTS.test.ts` pass cleanly via `npm test`.

## Assumptions

- Browser HTMLAudioElement sets `audio.ended = true` when playback reaches the end of an audio source, and sets `audio.paused = true` when paused.
- Direct invocation of `speakSentence(currentIdxRef.current)` in `resume()` handles fetching or cached-blob resolution safely.
