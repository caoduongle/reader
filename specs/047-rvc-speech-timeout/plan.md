# Implementation Plan: Client-Side Timeout for RVC Speech Synthesis

**Branch**: `047-rvc-speech-timeout` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/047-rvc-speech-timeout/spec.md)

**Input**: Feature specification from `specs/047-rvc-speech-timeout/spec.md`

## Summary

Incorporate a 20-second client-side timeout directly inside `fetchRVCSpeech` in `src/hooks/useTTS.ts`. When a synthesis request is dispatched, set a 20,000ms timer that invokes `.abort()` on the active `AbortController` (reusing any caller-provided controller or creating an internal one if omitted). Always clean up the timer via `clearTimeout` in a `finally` block upon completion or failure. Preserve the existing 2,500ms timeout on `checkRVCServerHealth` for `/health`.

### Technical Implementation:
1. `src/hooks/useTTS.ts`:
   - Define constant `const RVC_FETCH_TIMEOUT_MS = 20000;`.
   - In `fetchRVCSpeech`:
     - Determine active controller: `const controller = abortController || new AbortController();`.
     - Schedule timeout: `const timeoutId = setTimeout(() => controller.abort(), RVC_FETCH_TIMEOUT_MS);`.
     - Ensure timer cleanup in `finally { clearTimeout(timeoutId); }`.
     - In error handler, cleanly return `null` on abort without throwing or unhandled rejection.
   - Leave `checkRVCServerHealth` timeout at `2500ms` unchanged.
2. `tests/hooks/useTTS.test.ts`:
   - Add unit test using `vi.useFakeTimers()` to simulate a hanging fetch promise.
   - Advance timers by 20,000ms.
   - Assert `controller.signal.aborted === true` and `fetchRVCSpeech` resolves to `null` cleanly.
   - Assert timers are cleared when requests resolve early.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18 / Node.js 20+

**Primary Dependencies**: React (`useCallback`), Web Standard `fetch`, `AbortController`, `setTimeout` / `clearTimeout`

**Storage**: N/A (in-memory timer management)

**Testing**: Vitest (`npm test`), TypeScript compiler (`npm run typecheck`), ESLint (`npm run lint`)

**Target Platform**: Electron / Web Desktop

**Project Type**: React hook network resilience & resource cleanup

**Performance Goals**: Automatically recover from deadlocked/frozen server responses within 20s. Zero memory/timer leaks.

**Constraints**:
- Single controller reuse when `abortController` argument is supplied.
- Must execute `clearTimeout` on every resolution and rejection path.
- Must NOT touch `checkRVCServerHealth` 2,500ms timeout.
- 0 TypeScript compilation errors, 0 ESLint errors and warnings.

**Scale/Scope**: 1 source file (`src/hooks/useTTS.ts`), 1 test file (`tests/hooks/useTTS.test.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution template has no active restrictive gates. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/047-rvc-speech-timeout/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output (Controller reuse, timing constants & cleanup)
├── data-model.md        # Phase 1 output (Timeout state machine)
├── quickstart.md        # Phase 1 output (Verification guide)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── contracts/
    └── timeout-contract.md# Interface contract for fetchRVCSpeech timeout
```

### Source Code (repository root)

```text
src/hooks/
└── useTTS.ts            # fetchRVCSpeech with 20s timeout and finally { clearTimeout }

tests/hooks/
└── useTTS.test.ts       # Automated tests asserting 20s timeout abortion and timer cleanup
```

**Structure Decision**: Self-contained within `src/hooks/useTTS.ts` and `tests/hooks/useTTS.test.ts`.

## Complexity Tracking

No constitution violations or external libraries introduced.
