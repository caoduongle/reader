# Tasks: Local Voice Server Health Polling & Connection UI

**Feature**: `010-voice-server-status-polling`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Foundational Hook (Priority: P1) 🎯 MVP

**Purpose**: Implement the dedicated periodic health check hook with strict resource gating.

- [X] T001 [US1] Create `src/hooks/useVoiceServerStatus.ts` implementing periodic 6-second heartbeat polling to `${serverUrl}/health`, with `AbortController` cancellation and `enabled` conditional gating.
- [X] T002 [US1] Export connection types (`VoiceServerConnectionStatus`, `UseVoiceServerStatusOptions`, `UseVoiceServerStatusReturn`) in `src/hooks/useVoiceServerStatus.ts`.

---

## Phase 2: User Story 2 — SettingsModal UI Integration & Actionable Guidance (Priority: P1)

**Goal**: Seamlessly display real-time connection states in the settings modal and provide explicit terminal troubleshooting commands.

**Independent Test**: Mount `SettingsModal`, toggle voice source between "Giọng máy (mặc định)" and "Giọng của tôi (RVC local)", and observe UI indicators and network calls.

### Implementation for User Story 2

- [X] T003 [US2] Integrate `useVoiceServerStatus` into `src/components/SettingsModal.tsx`, passing `enabled: isOpen && localSettings.ttsProvider === 'rvc-local'`.
- [X] T004 [US2] Update the connection status UI in `src/components/SettingsModal.tsx` to render all 3 states (`checking`, `connected`, `unreachable`) with color-coded dot badges and localized labels.
- [X] T005 [US2] Connect the manual "Kiểm tra" button to hook's `checkHealth` method and sync the spinning icon with `isChecking` in `src/components/SettingsModal.tsx`.
- [X] T006 [US2] Render actionable troubleshooting banner when in `unreachable` state, recommending running `python server.py` and offering fallback to the default voice in `src/components/SettingsModal.tsx`.

**Checkpoint**: `SettingsModal` reflects live connection status and renders actionable guidance.

---

## Phase 3: User Story 3 — Automated Unit Tests for Hook & UI (Priority: P1)

**Goal**: Verify all connection states, timer cycles, and zero-network-waste behavior using Vitest and React Testing Library.

**Independent Test**: Execute `npm test -- tests/hooks/useVoiceServerStatus.test.ts` and confirm all test cases pass cleanly.

### Implementation for User Story 3

- [X] T007 [US3] Author comprehensive unit tests in `tests/hooks/useVoiceServerStatus.test.ts` asserting:
  - Transition to `'connected'` on successful `/health` response.
  - Transition to `'unreachable'` on network error/server offline.
  - Initial `'checking'` state and manual trigger via `checkHealth()`.
  - Zero `fetch` calls when `enabled: false`.
  - Proper timer clearance and abort controller invocation on unmount.

**Checkpoint**: Automated test suite validated and passing.

---

## Phase 4: Polish & Gate Enforcement

**Purpose**: Verify all quality gates across the entire codebase.

- [X] T008 Run `npm test` and verify 100% pass across all test suites.
- [X] T009 Verify `npm run typecheck`, `npm run lint`, and `npm run build` continue to succeed with 0 errors.

---

## Dependencies & Execution Order

```
Phase 1: Hook Implementation (T001 - T002) 🎯 MVP
       │
       ▼
Phase 2: SettingsModal UI Integration (T003 - T006)
       │
       ▼
Phase 3: Automated Tests (T007)
       │
       ▼
Phase 4: Gate Enforcement (T008 - T009)
```

---

## Notes

- Polling interval is set to 6 seconds (balancing responsiveness and socket conservation).
- Zero network requests are made when `localSettings.ttsProvider === 'browser'` or when modal is closed.
- All tests use fake timers and mocked `fetch` with no physical network dependencies.
