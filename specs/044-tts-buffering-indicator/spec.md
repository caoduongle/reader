# Feature Specification: TTS Generation Buffering Visual Indicator

**Feature Branch**: `044-tts-buffering-indicator`

**Created**: 2026-09-06

**Status**: Ready for Review

**Input**: User description: "Hiện tại trong src/hooks/useTTS.ts, mỗi khi speakSentence(index) được gọi ở nhánh rvc-local, isPlaying được set = true NGAY LẬP TỨC (trước khi bắt đầu fetch audio từ server), khiến nút Play/Pause trong src/components/ControlBar.tsx hiển thị là \"đang phát\" (icon Pause) trong suốt thời gian chờ server tạo giọng (có thể vài giây), dù thực tế chưa có âm thanh nào phát ra. Đây là nguyên nhân khiến người dùng tưởng app bị treo và bấm lại nút. Yêu cầu: - Trong useTTS.ts, thêm state mới `const [isBuffering, setIsBuffering] = useState<boolean>(false);`. - Trong speakSentence (nhánh rvc-local): set setIsBuffering(true) ngay trước đoạn lấy audioBlobUrl (cache/in-flight/fetch), và set setIsBuffering(false) ngay khi audio.src đã được gán xong (bất kể phát thành công hay lỗi ngay sau đó) — dùng try/finally hoặc đặt lời gọi setIsBuffering(false) ở tất cả các nhánh return sớm do lỗi fetch, để tránh treo isBuffering=true mãi mãi khi fetch thất bại. - Export isBuffering trong object trả về của useTTS (thêm vào phần return cuối hàm). - Trong src/App.tsx: lấy isBuffering từ useTTS(...) và truyền xuống ControlBar qua 1 prop mới `isBuffering`. - Trong src/components/ControlBar.tsx: thêm prop `isBuffering?: boolean` vào ControlBarProps. Khi isBuffering === true, hiển thị một chỉ báo trực quan khác biệt với trạng thái Play/Pause bình thường (ví dụ spinner nhỏ đè lên icon, hoặc đổi title/aria-label thành \"Đang tạo giọng đọc...\"), thay vì hiện y hệt trạng thái \"đang phát\". KHÔNG được thay đổi hành vi phát/dừng thực tế (không phụ thuộc vào isBuffering để quyết định play/pause logic) — đây thuần túy là state hiển thị, không phải state điều khiển. Xác minh: `npm run typecheck`, `npm run lint` sạch. Test thủ công: chọn provider rvc-local, bấm Play, quan sát trong lúc chờ server trả WAV (vài giây) nút phải hiện trạng thái buffering khác với lúc đang phát thật."

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Clear Visual Indicator While Generating Speech (Priority: P1) 🎯 MVP

As a reader requesting voice synthesis for a sentence, when the local RVC server is synthesizing speech (which takes several seconds), I want to see a clear buffering indicator (such as a spinning indicator and tooltip "Đang tạo giọng đọc...") on the play button, so that I know the system is actively generating audio and is not frozen or unresponsive.

**Why this priority**: Without visual buffering feedback, showing a static "Pause" icon while silence continues leads users to believe the application froze, prompting them to click repeatedly and trigger race conditions.

**Independent Test**:
1. Set voice provider to `rvc-local`.
2. Click Play on any sentence with an uncached audio segment.
3. Observe the main play/pause button in `ControlBar` while the network request is pending.
4. Verify that the button displays a spinner or distinct loading indicator with title/aria-label indicating "Đang tạo giọng đọc...".
5. Once audio begins playing, verify the button transitions smoothly to the active playing state (Pause icon).

**Acceptance Scenarios**:
1. **Given** speech synthesis is requested for an RVC sentence, **When** the network request to fetch/generate the audio is pending, **Then** `isBuffering` is `true`, and `ControlBar` renders the loading spinner with tooltip "Đang tạo giọng đọc...".
2. **Given** the audio blob is received and assigned to `audio.src`, **When** the player is ready to emit sound, **Then** `isBuffering` transitions to `false`, and `ControlBar` displays the standard pause icon.

---

### User Story 2 – Reliable Reset on Failure or Navigation (Priority: P1) 🎯 MVP

As a reader, if speech generation fails, network times out, or playback is stopped/paused during generation, I want the buffering state to reset immediately to `false`, so that the user interface never gets stuck in a perpetual loading state.

**Why this priority**: A stuck loading state locks the user's perception of the player, preventing them from understanding whether the system encountered an error.

**Independent Test**:
1. Trigger speech synthesis with a mocked fetch that fails (e.g. network error or HTTP 500).
2. Verify `isBuffering` resets to `false` immediately upon failure.
3. Trigger speech synthesis with a delayed fetch, then invoke `stop()`.
4. Verify `isBuffering` resets to `false` immediately.

**Acceptance Scenarios**:
1. **Given** `speakSentence` is in-flight with `isBuffering === true`, **When** the fetch fails or aborts, **Then** `isBuffering` is set to `false` via try/finally before the function exits.
2. **Given** `speakSentence` is in-flight, **When** `stop()` is called, **Then** `isBuffering` is reset to `false`.

---

### User Story 3 – Accessibility and Tooltip Precision (Priority: P2)

As a screen-reader user or keyboard navigator, when speech is buffering, I want the button's accessible name (`aria-label`) and `title` to announce "Đang tạo giọng đọc..." rather than "Tạm dừng", so that assistive technologies provide accurate feedback.

**Why this priority**: Improves accessibility compliance and communicates status clearly to users relying on screen readers or hover tooltips.

**Independent Test**:
1. Inspect the DOM element `#tts-play-pause-btn` while `isBuffering === true`.
2. Verify `aria-label="Đang tạo giọng đọc..."` and `title="Đang tạo giọng đọc..."`.

**Acceptance Scenarios**:
1. **Given** `isBuffering === true`, **Then** `#tts-play-pause-btn` has `aria-label="Đang tạo giọng đọc..."` and `title="Đang tạo giọng đọc..."`.

---

### Edge Cases

- **Cache Hit (Zero Latency)**: When sentence audio is already cached in `prefetchCacheRef`, `isBuffering` is set to `true` and then immediately to `false` within the same microtask tick when `audio.src` is assigned, resulting in virtually imperceptible or no flicker.
- **Provider Isolation**: The `browser` provider (Web Speech API) does not use `isBuffering` (remains `false`), preventing unexpected visual state changes on standard system voices.
- **Display-Only State**: `isBuffering` is strictly presentation-only. No core audio playback, queuing, pausing, or token generation logic depends on `isBuffering`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `src/hooks/useTTS.ts`, declare a React state:
  ```typescript
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  ```
- **FR-002**: In `src/hooks/useTTS.ts` inside `speakSentence` for the `rvc-local` provider:
  - Set `setIsBuffering(true)` immediately prior to checking `prefetchCacheRef` or fetching `audioBlobUrl`.
  - Wrap the retrieval, validation, stale check, and `audio.src` assignment in a `try...finally` block (or ensure all exit branches call `setIsBuffering(false)`) such that `setIsBuffering(false)` is reliably executed as soon as `audio.src` is assigned or any early return occurs.
- **FR-003**: In `src/hooks/useTTS.ts` inside `stop()` and `pause()`, ensure `setIsBuffering(false)` is called to prevent orphan buffering indicators.
- **FR-004**: Export `isBuffering` in the return object of `useTTS`.
- **FR-005**: In `src/App.tsx`, destructure `isBuffering` from `useTTS` and pass it to `<ControlBar isBuffering={isBuffering} ... />`.
- **FR-006**: In `src/components/ControlBar.tsx`, add `isBuffering?: boolean` to `ControlBarProps`.
- **FR-007**: In `src/components/ControlBar.tsx`, when `isBuffering === true`:
  - Display an animated spinner icon (e.g. `Loader2` from `lucide-react` with `animate-spin`).
  - Set button `title="Đang tạo giọng đọc..."` and `aria-label="Đang tạo giọng đọc..."`.
- **FR-008**: Codebase MUST pass `npm run typecheck` and `npm run lint` with 0 errors.

### Key Entities

- **BufferingState (`isBuffering`)**: Boolean state exported by `useTTS` indicating whether the RVC voice synthesis pipeline is actively awaiting an audio blob before assigning it to the audio element.
- **ControlBarBufferingVisual**: Visual rendering branch in `ControlBar` replacing the default Play/Pause icon with an animated loader when `isBuffering` is active.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Clicking Play on an uncached RVC sentence immediately displays visual buffering feedback within <50ms.
- **SC-002**: The buffering indicator is automatically cleared when `audio.src` is assigned and playback begins.
- **SC-003**: 100% of failed or aborted fetch requests reset `isBuffering` to `false` without leaving the UI stuck.
- **SC-004**: Codebase passes `npm run lint` with 0 errors and 0 warnings.
- **SC-005**: Codebase passes `npm run typecheck` with 0 errors.
- **SC-006**: All existing unit tests pass via `npm test`.

## Assumptions

- `lucide-react` provides `Loader2` or equivalent icon with Tailwind `animate-spin` support.
- User interactions with the button while buffering continue to be governed by `onTogglePlay` without disabling the button unless explicitly desired.
