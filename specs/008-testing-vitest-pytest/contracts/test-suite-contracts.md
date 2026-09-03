# Test Suite Contracts & Execution Invariants

**Feature**: `008-testing-vitest-pytest`  
**Date**: 2026-09-03  

---

## 1. Developer Commands Contract

`package.json` MUST expose the following test commands:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Invariants:
1. `npm test` executes all frontend tests in non-watch mode and exits with code 0 on all-pass, non-zero on any failure.
2. Python backend tests execute via `pytest python-backend/` (or with venv active: `pytest`).

---

## 2. Assertion Integrity Contract

1. **No Dummy Assertions**: Neither test suite may contain trivial assertions like `expect(true).toBe(true)` or `assert True`.
2. **Failure Sensitivity**: If the core logic in `splitIntoSentences` or `/speak` is broken, the corresponding test MUST fail.
3. **Execution Time**: The complete frontend suite must finish in $< 10$ seconds; the backend suite in $< 5$ seconds.
