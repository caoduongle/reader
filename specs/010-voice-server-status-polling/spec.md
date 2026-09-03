# Feature Specification: Local Voice Server Health Polling & Connection UI

**Feature Branch**: `010-voice-server-status-polling`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "1. Trong app React chính, tìm màn hình/component nơi người dùng chọn nguồn giọng đọc (ví dụ tương đương lựa chọn 'Giọng của tôi (server local)'). Nếu component đã tồn tại: thêm một hook (ví dụ useVoiceServerStatus) kiểm tra kết nối server local bằng cách gọi định kỳ GET http://localhost:8008/health. 2. Hiển thị rõ 3 trạng thái trong UI: đang kiểm tra / đã kết nối / chưa kết nối được — kèm gợi ý hành động cụ thể khi ở trạng thái 'chưa kết nối' (ví dụ: 'Hãy chạy python server.py trong terminal rồi thử lại'). 3. Đảm bảo việc poll health-check CHỈ chạy khi người dùng đang chọn nguồn giọng 'server local' — không gọi mạng thừa khi đang dùng nguồn giọng Gemini/máy mặc định. 4. Thêm test (dùng Vitest + RTL) cho cả 3 trạng thái UI trên, mock fetch tương ứng cho từng trường hợp. Ràng buộc: Không phá vỡ luồng chọn giọng mặc định; interval hợp lý 5–10 giây; dừng poll khi unmount hoặc khi rời cài đặt. Định nghĩa hoàn thành: Component/hook hoạt động đúng cả 3 trạng thái; có test tự động; luồng mặc định không bị ảnh hưởng."

---

## Component Existence Audit *(Requirement 1)*

- **Verification**: The voice source selection component **already exists** in the main React application at [`src/components/SettingsModal.tsx`](file:///e:/reader/src/components/SettingsModal.tsx#L405-L453).
- **Current Flow**:
  - `localSettings.ttsProvider === 'browser'`: "Giọng máy (mặc định) - Giọng Web Speech của trình duyệt/hệ thống".
  - `localSettings.ttsProvider === 'rvc-local'`: "Giọng của tôi (RVC local) - Voice cloning từ server Python local".
- **Current Limitation**: Connection health is only checked once on manual button click or initial switch. It lacks periodic polling (`setInterval`), leaving the UI stale if the local Python server is started or stopped after opening settings.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dedicated Health Polling Hook (`useVoiceServerStatus`) (Priority: P1) 🎯 MVP

As a user configuring a local AI voice server, I want the application to automatically detect when my local Python RVC server starts or stops while the settings screen is open, so that I receive immediate feedback without having to repeatedly click a manual check button.

**Why this priority**: Real-time server connectivity feedback eliminates user confusion when setting up local Python TTS services.

**Independent Test**: Mount the hook with `enabled = true` and `serverUrl = "http://localhost:8008"`. Verify it polls `/health` every 5–8 seconds, updates status, and ceases polling when `enabled = false`.

**Acceptance Scenarios**:

1. **Given** `enabled` is `true`, **When** the hook mounts, **Then** it immediately sets status to `'checking'` and calls `GET ${serverUrl}/health`.
2. **Given** the local server responds with HTTP 200 and `{ ok: true }`, **When** the response is parsed, **Then** status updates to `'connected'`.
3. **Given** the local server is offline or unreachable, **When** fetch fails or times out, **Then** status updates to `'unreachable'`.
4. **Given** `enabled` is `false` (e.g. user selected default voice or closed modal), **When** time elapses, **Then** the hook performs zero network requests.

---

### User Story 2 - Three-State Connection UI & Actionable Troubleshooting (Priority: P1)

As a user navigating the settings modal, I want to see clear, color-coded visual indicators for all three connection states (`checking`, `connected`, `unreachable`), and when disconnected, receive explicit terminal commands to launch the server.

**Why this priority**: Clear guidance prevents frustration for non-technical readers attempting to use local voice cloning.

**Independent Test**: Render `SettingsModal` with mocked server responses and observe UI rendering for each state.

**Acceptance Scenarios**:

1. **Given** status is `'checking'`, **When** viewing the RVC settings section, **Then** an amber pulsing indicator displays with the text "Đang kiểm tra...".
2. **Given** status is `'connected'`, **When** viewing the RVC settings section, **Then** an emerald green indicator displays with the text "Đã kết nối".
3. **Given** status is `'unreachable'`, **When** viewing the RVC settings section, **Then** a rose red indicator displays with the text "Chưa kết nối", accompanied by an actionable banner:
   - "Chưa kết nối được server giọng đọc tại http://localhost:8008"
   - Suggests running `python server.py` (or `python python-backend/server.py`) in the terminal.
   - Suggests falling back to "Giọng máy (mặc định)" to continue reading.

---

### User Story 3 - Automated Test Suite for All Connection States (Priority: P1)

As a maintainer, I want comprehensive unit tests in Vitest and React Testing Library verifying hook behavior, status transitions, and zero unnecessary network traffic.

**Why this priority**: Testing guarantees that polling timers are strictly hermetic and do not leak memory or make unauthorized background calls.

**Independent Test**: Execute `npm test` targeting `tests/hooks/useVoiceServerStatus.test.ts`.

**Acceptance Scenarios**:

1. **Given** a mock `fetch` returning `{ ok: true }`, **When** `useVoiceServerStatus` executes, **Then** it asserts transition from `'checking'` to `'connected'`.
2. **Given** a mock `fetch` throwing a NetworkError, **When** `useVoiceServerStatus` executes, **Then** it asserts transition from `'checking'` to `'unreachable'`.
3. **Given** `enabled` is `false`, **When** advancing fake timers by 30 seconds, **Then** `fetch` is called 0 times.

---

### Edge Cases

- **Fast Polling Throttling**: The polling interval must be set conservatively (5 to 8 seconds) to prevent CPU or loopback socket flooding.
- **Component Unmount Cleanup**: `clearInterval` and `AbortController.abort()` must be called upon unmount so pending asynchronous requests do not cause state updates on unmounted components.
- **Dynamic Server URL**: If the user edits the server URL input, polling should automatically re-check against the newly entered URL.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create `src/hooks/useVoiceServerStatus.ts` providing periodic health checking and connection state tracking.
- **FR-002**: System MUST configure `useVoiceServerStatus` to poll `GET ${serverUrl}/health` at an interval of 6 seconds, strictly gated by `enabled: boolean`.
- **FR-003**: System MUST expose three distinct states from `useVoiceServerStatus`: `'checking'`, `'connected'`, and `'unreachable'`.
- **FR-004**: System MUST integrate `useVoiceServerStatus` into `src/components/SettingsModal.tsx`, passing `enabled: isOpen && localSettings.ttsProvider === 'rvc-local'`.
- **FR-005**: System MUST render all three connection states in `SettingsModal.tsx` with appropriate color badges and labels.
- **FR-006**: When in `'unreachable'` state, system MUST display actionable troubleshooting instructions recommending `python server.py` and voice fallback.
- **FR-007**: System MUST NOT perform health check polling when `ttsProvider` is `'browser'` or when `SettingsModal` is closed.
- **FR-008**: System MUST provide automated Vitest tests covering all three connection states and polling deactivation.

---

### Non-Functional & Scope Constraints

- **NFR-001 (Zero Regressions on Default Voice)**: The default Web Speech / Gemini voice flow must remain completely unaffected.
- **NFR-002 (Resource Efficiency)**: Unmounted components or disabled states must execute zero network requests.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Manual verification confirms UI transitions between `checking`, `connected`, and `unreachable` when toggling server availability.
- **SC-002**: Automated test suite for `useVoiceServerStatus` passes with 100% assertion success.
- **SC-003**: Zero network requests to `/health` occur when `ttsProvider` is set to `'browser'`.
- **SC-004**: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass cleanly with exit code 0.
