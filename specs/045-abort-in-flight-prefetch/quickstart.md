# Quickstart & Verification Guide: Abort In-Flight Background TTS Prefetch

**Feature**: `045-abort-in-flight-prefetch`  
**Date**: 2026-09-06

This guide covers automated unit tests and verification steps for in-flight prefetch cancellation.

---

## 1. Automated Unit Tests

Run Vitest targeting `useTTS`:

```powershell
npx vitest run tests/hooks/useTTS.test.ts
```

### Verified Behaviors:
- In-flight background prefetch has its `AbortController.abort()` called when `stop()` is invoked.
- In-flight background prefetch has its `AbortController.abort()` called when `jumpToSentence()` is invoked.
- `speakSentence` seamlessly awaits in-flight `.promise` without issuing duplicate network requests.

---

## 2. Static Analysis & Build Verification

```powershell
npm run typecheck
npm run lint
npm test
```

**Expected Results**:
- 0 TypeScript compiler diagnostics (`tsc --noEmit`).
- 0 ESLint errors and 0 warnings.
- 100% of test suites pass.
