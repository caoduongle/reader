# Quickstart & Verification Guide: Client-Side Timeout for RVC Speech Synthesis

**Feature**: `047-rvc-speech-timeout`  
**Date**: 2026-09-06

This guide details automated unit tests and manual verification steps for the 20-second timeout mechanism.

---

## 1. Automated Unit Tests

Run Vitest targeting `useTTS`:

```powershell
npx vitest run tests/hooks/useTTS.test.ts
```

### Verified Behaviors:
- When `/speak` hangs indefinitely, advancing 20,000ms with `vi.useFakeTimers()` triggers abort and resolves `fetchRVCSpeech` to `null`.
- When caller provides an `AbortController`, the timeout aborts that exact controller.
- When caller omits `AbortController`, internal controller is created, timed out, and cleaned up.
- Fast-completing requests (success or failure) clear the timeout timer immediately without timer leaks.
- `checkRVCServerHealth` timeout remains strictly 2,500ms.

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
- 100% of test suites pass across the entire repository.
