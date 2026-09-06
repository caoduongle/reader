# Quickstart & Verification Guide: TTS Generation Token & Race Condition Stale Check

**Feature**: `042-tts-race-condition-token`  
**Date**: 2026-09-06

This guide covers running the automated unit test suite and static checks to verify race condition prevention in `useTTS`.

---

## 1. Automated Unit Tests

Run Vitest targeting the new `useTTS` test suite:

```powershell
npm test -- tests/hooks/useTTS.test.ts
```

### Verification Scenarios Covered:
1. **Scenario 1 - Pause Mid-Fetch**:
   - `speakSentence(0)` is invoked with an artificial network delay.
   - `pause()` is invoked while the fetch is still unresolved.
   - Fetch resolves with an audio blob.
   - **Verification**: `audio.play()` is not called; `audio.src` is not configured.
2. **Scenario 2 - Jump Mid-Fetch**:
   - `speakSentence(0)` is invoked with an artificial network delay.
   - `speakSentence(1)` (or `jumpToSentence(1)`) is invoked while fetch 0 is unresolved.
   - Fetch 0 resolves.
   - **Verification**: Sentence 0 audio is discarded; only sentence 1 proceeds to play.

---

## 2. Full Test Suite & Static Analysis

Ensure all tests, lint rules, and type checks pass cleanly:

```powershell
npm test
npm run lint
npm run typecheck
```

**Expected Results**:
- All test suites pass.
- 0 ESLint errors and 0 warnings.
- 0 TypeScript compiler errors.
