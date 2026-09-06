# Quickstart & Verification Guide: TTS Latency Diagnostics

**Feature**: `040-tts-latency-diagnostics`  
**Date**: 2026-09-06

This guide details how to verify real-time unbuffered server logging and client audio latency telemetry.

---

## 1. Prerequisites & Build

Ensure TypeScript compilation and Electron main process build succeed:

```powershell
npm run typecheck
npm run build:electron:main
```

---

## 2. Validation Step 1: Real-time Backend Log Verification

1. Start VoxRead in development mode:
   ```powershell
   npm run electron:dev
   ```
2. In the VoxRead UI:
   - Ensure TTS provider is set to **RVC Local** in Settings.
   - Load or open any book/chapter.
   - Click Play to read sentences.
3. Open `python-backend/server.log` in an editor or follow it in PowerShell:
   ```powershell
   Get-Content python-backend/server.log -Wait -Tail 20
   ```
4. **Expected Result**:
   - For every spoken sentence, a line matching:
     `[VoxRead][Timing] Edge-TTS: ...s | RVC inference: ...s`
     appears **immediately** without waiting for the buffer to fill or the application to quit.

---

## 3. Validation Step 2: Client Telemetry Verification

1. In the running Electron window, open Developer Tools (F12 or Ctrl+Shift+I).
2. Switch to the **Console** tab.
3. Observe the output as each sentence starts playing.
4. **Expected Result**:
   - Each sentence logs:
     ```text
     [VoxRead][ClientTiming] Cho fetch/cache: <X>ms | Cho audio bat dau phat sau khi gan src: <Y>ms
     ```
   - For pre-fetched sentences (cache hits), `Cho fetch/cache` is small (typically < 10ms).
   - For on-demand sentences, `Cho fetch/cache` reflects the combined network and backend generation time.
   - `Cho audio bat dau phat sau khi gan src` accurately measures the media element's time from source assignment to actual sound emission.

---

## 4. Validation Step 3: Diagnosing a 30s Freeze Incident

When you notice a ~30s freeze during reading:
1. Immediately copy the latest `[VoxRead][ClientTiming]` line from DevTools Console.
2. Copy the corresponding `[VoxRead][Timing]` line from `python-backend/server.log`.
3. Provide both lines to diagnose the exact root cause:
   - **Edge-TTS stall**: Server log shows `Edge-TTS: ~30s`.
   - **RVC inference stall**: Server log shows `RVC inference: ~30s`.
   - **Browser decoding stall**: Client log shows `Cho audio bat dau phat...: ~30000ms`.
   - **Local IPC/Network queueing**: Server log shows fast processing (<2s), but client shows `Cho fetch/cache: ~30000ms`.

