# Quickstart & Verification Guide: Fix ESLint Any in useTTS ClientTiming

**Feature**: `041-fix-tts-eslint-any`  
**Date**: 2026-09-06

This guide details how to verify that the ESLint `@typescript-eslint/no-explicit-any` error is resolved and TypeScript compilation succeeds.

---

## 1. ESLint Static Analysis Verification

Run the project linter:

```powershell
npm run lint
```

**Expected Outcome**:
- Output indicates 0 problems (0 errors, 0 warnings).
- Exit code is 0.

---

## 2. TypeScript Typecheck Verification

Run TypeScript compiler check:

```powershell
npm run typecheck
```

**Expected Outcome**:
- `tsc --noEmit` completes cleanly with 0 diagnostics.
- Exit code is 0.

---

## 3. Scope Verification

Verify that only the intended line in `src/hooks/useTTS.ts` has been modified:

```powershell
git diff src/hooks/useTTS.ts
```

**Expected Outcome**:
- Only the return type on `__originalOnPlaying` changes from `any` to `unknown`.
- No other logic, variable names, or files are changed.
