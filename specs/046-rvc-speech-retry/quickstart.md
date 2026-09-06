# Quickstart & Verification Guide: Transient Network Retry for RVC Speech Synthesis

**Feature**: `046-rvc-speech-retry`  
**Date**: 2026-09-06

This guide details automated unit tests and manual verification steps for the transient retry mechanism.

---

## 1. Automated Unit Tests

Run Vitest targeting `useTTS`:

```powershell
npx vitest run tests/hooks/useTTS.test.ts
```

### Verified Behaviors:
- Transient HTTP 500 error on 1st attempt retries after 400ms and succeeds on 2nd attempt (total 2 calls).
- Non-retryable HTTP 400 does NOT retry (total 1 call).
- Non-retryable HTTP 503 does NOT retry (total 1 call).
- Aborted request does NOT retry.

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
