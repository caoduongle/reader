# Quickstart & Verification Guide: TTS Generation Buffering Visual Indicator

**Feature**: `044-tts-buffering-indicator`  
**Date**: 2026-09-06

This guide details automated unit tests and manual verification steps for the buffering indicator.

---

## 1. Automated Unit Tests

Run Vitest targeting `useTTS`:

```powershell
npm test -- tests/hooks/useTTS.test.ts
```

### Verified Behaviors:
- `isBuffering === true` while speech synthesis fetch is in-flight.
- `isBuffering === false` once `audio.src` is assigned.
- `isBuffering === false` if fetch fails or user stops playback.

---

## 2. Static Analysis & Build Verification

```powershell
npm run typecheck
npm run lint
npm test
```

**Expected Results**:
- 0 TypeScript compiler diagnostics.
- 0 ESLint errors and 0 warnings.
- 100% of test suites pass.

---

## 3. Manual UI Verification

1. Launch VoxRead:
   ```powershell
   npm run electron:dev
   ```
2. In Settings, select **RVC Local** as the TTS provider.
3. Open any novel or chapter.
4. Click the Play button on an uncached sentence.
5. **Observation**:
   - The Play/Pause button immediately displays a spinning loader (`Loader2`).
   - Hovering the button displays "Đang tạo giọng đọc...".
   - Once server returns audio and playback commences, button turns into the standard "Pause" icon.
