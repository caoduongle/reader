# Implementation Plan: TTS Generation Token & Race Condition Stale Check

**Branch**: `042-tts-race-condition-token` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/042-tts-race-condition-token/spec.md)

**Input**: Feature specification from `specs/042-tts-race-condition-token/spec.md`

## Summary

Eliminate audio playback race conditions in `src/hooks/useTTS.ts` (`rvc-local` provider) where:
1. Pausing while an audio synthesis promise is in-flight fails to prevent audio autoplay when the promise resolves.
2. Jumping to another sentence while an earlier fetch is in-flight allows multiple requests to collide and overwrite `audioRef.current`.

### Technical Solution
- Introduce a generation token ref: `const playTokenRef = useRef<number>(0);`.
- Increment `playTokenRef.current` and capture local `myToken` at the start of `speakSentence`.
- Increment `playTokenRef.current` in `stop()`.
- Expand the stale check after awaiting `audioBlobUrl` to require:
  `playTokenRef.current === myToken && isPlayingRef.current && !isPausedRef.current && currentIdxRef.current === index`.
- Repeat the guard check immediately prior to `await audio.play()`.
- Implement unit tests in `tests/hooks/useTTS.test.ts` to assert pause-during-fetch and jump-during-fetch protections.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18 / Node.js 20+

**Primary Dependencies**: Vitest, `@testing-library/react`, React hooks (`useRef`, `useCallback`, `useState`)

**Storage**: In-memory React refs (`playTokenRef`, `isPlayingRef`, `isPausedRef`, `currentIdxRef`)

**Testing**: Vitest (`npm test`), TypeScript (`npm run typecheck`), ESLint (`npm run lint`)

**Target Platform**: Desktop (Electron) / Modern Browser

**Project Type**: React Application / Hook implementation

**Performance Goals**: Negligible CPU/memory impact (<0.1ms integer check)

**Constraints**:
- Must NOT alter `play()`, `pause()`, `resume()`, or `jumpToSentence()` behavior in this phase.
- Must NOT alter caching logic (`prefetchCacheRef`, `inFlightFetchesRef`).
- Must pass `npm run typecheck` and `npm run lint` with 0 errors.

**Scale/Scope**: 1 source file modified (`src/hooks/useTTS.ts`), 1 new test file (`tests/hooks/useTTS.test.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) template is in default state; no active gates or rules are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/042-tts-race-condition-token/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output (Race condition analysis & token strategy)
├── data-model.md        # Phase 1 output (Token entities & lifecycle)
├── quickstart.md        # Phase 1 output (Verification guide)
├── checklists/          # Requirements quality checklist
│   └── requirements.md
└── contracts/           # Phase 1 output
    └── guard-contract.md
```

### Source Code (repository root)

```text
src/hooks/
└── useTTS.ts            # Add playTokenRef, increment at speakSentence/stop, add 4-part stale guards

tests/hooks/
└── useTTS.test.ts       # New unit tests verifying pause and jump stale checks
```

**Structure Decision**: Targeted changes directly inside `src/hooks/useTTS.ts` with dedicated unit test file `tests/hooks/useTTS.test.ts`.

## Complexity Tracking

No constitution violations; simple monotonic counter with no external dependencies or state bloat.
