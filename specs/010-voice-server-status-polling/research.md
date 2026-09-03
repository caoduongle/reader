# Research: Local Voice Server Health Polling & Connection Lifecycle

**Feature**: `010-voice-server-status-polling`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## 1. Existing Voice Selection Architecture in VoxRead

### Component Location: `src/components/SettingsModal.tsx`
- The user selects between two TTS providers:
  1. `browser`: Standard Web Speech API (English / Vietnamese system voices).
  2. `rvc-local`: High-fidelity voice conversion via local Flask Python microservice running at `http://localhost:8008`.
- The current implementation in `SettingsModal.tsx` contains static status rendering and manual check buttons, but lacks periodic health polling.

---

## 2. Polling Strategy & Resource Conservation

### 2.1 Polling Cadence (6 Seconds)
- **Why 6 seconds?**: A 6-second heartbeat provides near-instant UI reactivity (user starts `python server.py`, and the modal reflects "Đã kết nối" within a few seconds) without overloading the local event loop or creating unnecessary socket pressure.

### 2.2 Strict Gating (`enabled`)
- Polling MUST NOT execute when:
  1. The user has selected `browser` ("Giọng máy (mặc định)").
  2. The `SettingsModal` is closed (`isOpen === false`).
  3. The component has unmounted.
- `AbortController` ensures any inflight fetch request is cleanly canceled when the modal closes or switches providers, preventing memory leaks and state updates on unmounted components.

---

## 3. UI State Transitions & Actionable Guidance

| State | Badge Visual | Text Label | Actionable Guidance Banner |
|---|---|---|---|
| `checking` | Amber pulsing dot | "Đang kiểm tra..." | Spinner on manual check button; waiting for response. |
| `connected` | Emerald green ringed dot | "Đã kết nối" | Model loaded flag verified; voice ready for reading. |
| `unreachable` | Rose red ringed dot | "Chưa kết nối" | Explicit warning banner with exact terminal launch command (`python server.py`) and option to fall back to default voice. |
