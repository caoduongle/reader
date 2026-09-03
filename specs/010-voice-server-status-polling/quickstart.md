# Quickstart & Verification Guide: Voice Server Health Polling

**Feature Branch**: `010-voice-server-status-polling`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Running Automated Tests

```bash
npm test -- tests/hooks/useVoiceServerStatus.test.ts
```

Expected output:
- Assertions verify `checking`, `connected`, and `unreachable` transitions.
- Assertions verify zero requests when `enabled` is `false`.

---

## 2. Manual Verification Walkthrough

1. Run the app: `npm run dev`
2. Open Settings modal ($\text{Gear icon}$).
3. Switch voice provider to **"Giọng của tôi (RVC local)"**:
   - If Python server is NOT running: Status shows red **"Chưa kết nối"** with warning banner.
   - Start server in terminal:
     ```bash
     python python-backend/server.py
     ```
   - Within 6 seconds, the indicator automatically turns green: **"Đã kết nối"**!
   - Stop server (`Ctrl+C`):
   - Within 6 seconds, the indicator automatically turns red: **"Chưa kết nối"**!
4. Switch back to **"Giọng máy (mặc định)"**:
   - Observe Network tab in browser DevTools: polling stops immediately.
