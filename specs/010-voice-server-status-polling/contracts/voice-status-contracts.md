# Voice Server Status Contracts & Network Invariants

**Feature**: `010-voice-server-status-polling`  
**Date**: 2026-09-03  

---

## 1. Network Invariants

1. **Zero Requests When Disabled**: When `enabled` is `false`, zero `fetch` requests to `/health` may be executed.
2. **Deterministic Cleanup**: On unmount or `enabled` toggle, any active `setInterval` timer and pending `AbortController` must be cleared immediately.
3. **Endpoint Target**: All requests must query `${serverUrl}/health` without duplicate trailing slashes.

---

## 2. UI Contract

The `SettingsModal` must render:
- When `status === 'checking'`: text `"Đang kiểm tra..."`
- When `status === 'connected'`: text `"Đã kết nối"`
- When `status === 'unreachable'`: text `"Chưa kết nối"` and terminal troubleshooting hint mentioning `python server.py`.
