# Quickstart & Verification Guide: Accurate Audio Resume via Loaded Audio Index Reference

**Feature**: `043-tts-loaded-audio-index`  
**Date**: 2026-09-06

This guide details testing and static verification for the loaded audio index tracking and resume guards.

---

## 1. Targeted Unit Tests

Run Vitest targeting the `useTTS` test suite:

```powershell
npm test -- tests/hooks/useTTS.test.ts
```

### Key Scenarios Tested:
1. **Replay Prevention on In-Flight Fetch**:
   - Sentence 0 plays to finish (`ended = true`).
   - Sentence 1 starts fetching (slow network).
   - User calls `play(1)` or `resume()` while sentence 1 is still fetching.
   - **Verification**: `audio.play()` is NOT called on sentence 0.
   - Sentence 1 fetch resolves.
   - **Verification**: Sentence 1 plays exactly once.
2. **In-Place Resume when Paused Mid-Sentence**:
   - Sentence 1 is actively playing and paused mid-sentence (`paused = true, ended = false`).
   - User calls `resume()`.
   - **Verification**: `audio.play()` is called directly without a new network fetch.

---

## 2. Full Verification Commands

```powershell
npm test
npm run lint
npm run typecheck
```

**Expected Results**:
- All Vitest test suites pass (100%).
- 0 ESLint errors and 0 warnings.
- 0 TypeScript compiler diagnostics.
