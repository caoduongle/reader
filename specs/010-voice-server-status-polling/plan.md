# Implementation Plan: Local Voice Server Health Polling & Connection UI

**Branch**: `010-voice-server-status-polling` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/010-voice-server-status-polling/spec.md`  

---

## Summary

Implement real-time health polling and 3-state connection management for the local Python RVC voice server in VoxRead:
1. **Custom Polling Hook (`src/hooks/useVoiceServerStatus.ts`)**: Create a React hook that periodically polls `${serverUrl}/health` every 6 seconds, conditioned strictly on `enabled`.
2. **Settings Modal Integration (`src/components/SettingsModal.tsx`)**: Replace static status checks with `useVoiceServerStatus`, rendering the 3 distinct connection states (`checking`, `connected`, `unreachable`) with intuitive badges and actionable troubleshooting commands.
3. **Zero Network Waste**: Ensure polling is active exclusively when `isOpen === true` and `localSettings.ttsProvider === 'rvc-local'`, preventing background network calls when using the default Web Speech / Gemini voice provider.
4. **Automated Unit Tests**: Add Vitest tests covering all three states, timer intervals, error handling, and disabled gating.

---

## Technical Context

**Language/Format**: TypeScript / React 19 (TSX)  
**Target Files**:
- `src/hooks/useVoiceServerStatus.ts` [NEW] (Health polling hook)
- `src/components/SettingsModal.tsx` [MODIFY] (Integrate real-time status and actionable UI)
- `tests/hooks/useVoiceServerStatus.test.ts` [NEW] (Unit test suite for hook)
**Testing & Verification**: Vitest unit tests, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`  
**Constraints**:
- Zero impact on default voice provider (`browser`)
- Polling timer strictly terminated upon unmount or when modal is closed
- No blanket `eslint-disable` comments

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Dual-Stack Integrity | ✅ Passed | Works seamlessly with local Flask server without breaking Web Speech fallback. |
| II. True Quality Gates | ✅ Passed | Tested with fake timers and mocked fetch asserting real state transitions. |
| III. Resource Conservation | ✅ Passed | Polling strictly gated by `enabled` (zero network calls on default voice). |
| IV. Build & Type Integrity | ✅ Passed | Types clean, `typecheck` and `lint` pass with zero errors. |

---

## Project Structure

### Documentation (this feature)

```text
specs/010-voice-server-status-polling/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Polling architecture & state machine research
├── data-model.md        # State transitions & hook interface
├── quickstart.md        # Manual & automated verification guide
├── contracts/           # Contracts & invariants
│   └── voice-status-contracts.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── src/
│   ├── hooks/
│   │   └── useVoiceServerStatus.ts     # [NEW] Heartbeat polling hook
│   └── components/
│       └── SettingsModal.tsx           # [MODIFY] Connect hook & render 3 states
└── tests/
    └── hooks/
        └── useVoiceServerStatus.test.ts # [NEW] Vitest unit test suite
```

---

## Phases & Deliverables

### Phase 1: Core Polling Hook Implementation
1. Create `src/hooks/useVoiceServerStatus.ts` with 6-second heartbeat, `AbortController`, and `enabled` gating.
2. Export clean types: `VoiceServerConnectionStatus`, `UseVoiceServerStatusOptions`, `UseVoiceServerStatusReturn`.

### Phase 2: SettingsModal UI Integration
1. Wire `useVoiceServerStatus` inside `src/components/SettingsModal.tsx`.
2. Render 3 visual states (`checking`, `connected`, `unreachable`).
3. Connect manual "Kiểm tra" button to `checkHealth`.
4. Display actionable troubleshooting banner with `python server.py` guidance.

### Phase 3: Automated Unit Testing
1. Author `tests/hooks/useVoiceServerStatus.test.ts` covering:
   - Initial check and successful transition to `connected`.
   - Error handling and transition to `unreachable`.
   - Actionable error messaging.
   - Zero fetch requests when `enabled: false`.
   - Cleanup on unmount.

### Phase 4: Polish & Gate Enforcement
1. Run `npm test` and verify 100% pass across all test files.
2. Run `npm run typecheck`, `npm run lint`, and `npm run build` to confirm zero regressions.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**
