# Implementation Plan: Deterministic DNS Mocking for Web Article Fetcher Tests

**Branch**: `030-mock-dns-fetchurl-tests` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/030-mock-dns-fetchurl-tests/spec.md`

## Summary

Add in-memory mocking of the Node.js built-in `dns/promises` module in `tests/unit/fetchUrl.test.ts` to eliminate external network DNS resolution queries during test runs. By mocking `lookup()` to return a public IP record (`93.184.216.34`), tests utilizing real domain names (like `https://example.com/article`) will run deterministically without incurring network latency or hitting Vitest's 5000ms timeout on CI runners. Production code remains untouched.

---

## Technical Context

**Language/Version**: Node.js v24.16.0 / TypeScript / ES Modules  
**Primary Dependencies**: Vitest, `@google/genai`, `jsdom`, Express  
**Storage**: N/A  
**Testing**: Vitest v4 (`npm test -- tests/unit/fetchUrl.test.ts`)  
**Target Platform**: Windows / Cross-platform CI  
**Project Type**: Unit Test Mocking & Hardening  
**Performance Goals**: Test execution < 500ms total, zero DNS timeout errors  
**Constraints**: Zero production code changes (`lib/ssrfGuard.js`, `lib/safeFetch.js`, and `server.js` untouched); 100% test pass rate (23/23 tests) across 5+ consecutive runs  
**Scale/Scope**: Scope isolated to `tests/unit/fetchUrl.test.ts`  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Details |
|---|---|---|
| **Hermetic Testing** | PASSED | Replaces unpredictable external DNS resolution with fast, predictable in-memory Vitest mock. |
| **Security Integrity** | PASSED | Production SSRF guard logic remains 100% active; test mock simulates valid public records without weakening validation. |
| **No Production Impact** | PASSED | Zero changes to production code. |

---

## Project Structure

### Documentation (this feature)

```text
specs/030-mock-dns-fetchurl-tests/
├── spec.md                  # Feature requirements and user stories
├── checklists/
│   └── requirements.md      # Specification quality checklist
├── plan.md                  # Implementation plan (this file)
├── research.md              # Research decisions on dns/promises mocking
├── data-model.md            # Mock DNS record schema and interaction flow
├── contracts/
│   └── api-endpoints.md     # Interface contract for mocked dns/promises module
└── quickstart.md            # Test execution and verification guide
```

### Source Code

```text
tests/unit/
└── fetchUrl.test.ts         # Add vi.mock('dns/promises') and mockLookup spy at top of file
```

---

## Implementation Details

In `tests/unit/fetchUrl.test.ts`:
1. Define `mockLookup = vi.fn().mockImplementation(async (hostname, options) => ...)` returning `[{ address: '93.184.216.34', family: 4 }]` when `options?.all` is true.
2. Define `vi.mock('dns/promises', () => ({ lookup: mockLookup }))` hoisted at the top of the file alongside `vi.mock('@google/genai')`.
3. Add a verification assertion in the `allows fetching public URL with mocked HTML response` test confirming `mockLookup` was invoked instead of native DNS.
4. Execute `npx vitest run tests/unit/fetchUrl.test.ts` 5 times consecutively to prove 100% stability.
