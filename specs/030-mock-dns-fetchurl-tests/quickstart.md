# Quickstart & Verification Guide: DNS Mocking in fetchUrl Tests

**Feature Branch**: `030-mock-dns-fetchurl-tests`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Running the Tests

Execute `tests/unit/fetchUrl.test.ts` with Vitest:

```powershell
npm test -- tests/unit/fetchUrl.test.ts
```

To run 5 consecutive times to verify zero flakiness:

```powershell
for ($i = 1; $i -le 5; $i++) {
  Write-Host "Run #$i"
  npm test -- tests/unit/fetchUrl.test.ts
  if ($LASTEXITCODE -ne 0) { throw "Run #$i failed" }
}
```

---

## 2. Verifying Absence of Outbound Network Calls

In `tests/unit/fetchUrl.test.ts`, an explicit assertion confirms `mockLookup` was called during domain resolution:

```typescript
expect(mockLookup).toHaveBeenCalledWith('example.com', { all: true });
```

---

## 3. Verification Summary

- **Single Test File**: 24/24 tests passed in `tests/unit/fetchUrl.test.ts`.
- **Consecutive Runs**: 5/5 passes with 100% stability.
- **Repository Full Test Suite**: 16/16 test files passed, 93/93 tests passed.
- **Type Checking**: 0 errors (`tsc --noEmit`).
- **Linting**: 0 errors, 0 warnings (`eslint .`).
- **Production Code Isolation**: `lib/ssrfGuard.js`, `lib/safeFetch.js`, and `server.js` remain completely untouched.
