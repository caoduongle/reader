# Implementation Plan: Abort In-Flight Background TTS Prefetch

**Branch**: `045-abort-in-flight-prefetch` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/045-abort-in-flight-prefetch/spec.md)

**Input**: Feature specification from `specs/045-abort-in-flight-prefetch/spec.md`

## Summary

Ensure background speech prefetch requests (`prefetchUpcoming`) are immediately cancellable by storing both the active `Promise` and its associated `AbortController` in `inFlightFetchesRef`. When `clearPrefetchCache()` is executed (upon stop, navigation, or unmount), immediately invoke `.abort()` on all in-flight controllers to release the server-side inference mutex (`rvc_lock`) and prevent delayed processing of obsolete requests.

### Technical Implementation:
1. `src/hooks/useTTS.ts`:
   - Define `interface InFlightPrefetchEntry { promise: Promise<string | null>; controller: AbortController; }`.
   - Update `inFlightFetchesRef` type to `Map<number, InFlightPrefetchEntry>`.
   - In `prefetchUpcoming`: store `{ promise: fetchPromise, controller }` into `inFlightFetchesRef.current` immediately when the fetch is dispatched.
   - In `clearPrefetchCache`: iterate `inFlightFetchesRef.current` and invoke `entry.controller.abort()` within `try...catch` before clearing the map.
   - In `speakSentence`: update in-flight reading to access `.promise` (`await inFlightFetchesRef.current.get(index)!.promise`).
2. `tests/hooks/useTTS.test.ts`:
   - Add unit tests verifying `AbortController.prototype.abort` (or `signal.aborted`) is triggered on in-flight prefetch requests when `stop()` or `jumpToSentence()` is called.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18 / Node.js 20+

**Primary Dependencies**: React (`useRef`, `useCallback`), Web Standard `AbortController`

**Storage**: In-memory React ref (`inFlightFetchesRef`, `prefetchCacheRef`)

**Testing**: Vitest (`npm test`), TypeScript compiler (`npm run typecheck`), ESLint (`npm run lint`)

**Target Platform**: Electron / Web Desktop

**Project Type**: React hook enhancement

**Performance Goals**: Instantaneous abort dispatch (<5ms), releasing backend `rvc_lock` immediately on user navigation.

**Constraints**:
- DO NOT alter `MAX_PREFETCH_AHEAD`.
- DO NOT alter `evictOldCache` logic.
- DO NOT modify `python-backend/server.py`.
- 0 TypeScript compiler errors, 0 ESLint errors and 0 warnings.

**Scale/Scope**: 1 source file (`src/hooks/useTTS.ts`), 1 test file (`tests/hooks/useTTS.test.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution template has no active restrictive gates. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/045-abort-in-flight-prefetch/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output (Problem analysis & technical decisions)
├── data-model.md        # Phase 1 output (InFlightPrefetchEntry & transitions)
├── quickstart.md        # Phase 1 output (Verification guide)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── contracts/
    └── prefetch-abort-contract.md # Interface & hook operational contracts
```

### Source Code (repository root)

```text
src/hooks/
└── useTTS.ts            # inFlightFetchesRef typing, prefetch registration, clearPrefetchCache abort loop

tests/hooks/
└── useTTS.test.ts       # Automated unit tests asserting in-flight abort invocation
```

**Structure Decision**: In-place refactor of `inFlightFetchesRef` in `src/hooks/useTTS.ts` without modifying component interfaces or backend code.

## Complexity Tracking

No constitution violations or architectural complexity introduced.
