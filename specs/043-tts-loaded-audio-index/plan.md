# Implementation Plan: Accurate Audio Resume via Loaded Audio Index Reference

**Branch**: `043-tts-loaded-audio-index` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/043-tts-loaded-audio-index/spec.md)

**Input**: Feature specification from `specs/043-tts-loaded-audio-index/spec.md`

## Summary

Fix the double-play / sentence replay bug during in-flight speech synthesis in `src/hooks/useTTS.ts` (`rvc-local` provider). Instead of inferring whether the reusable `HTMLAudioElement` can be resumed by checking generic DOM properties (`audio.src`, `audio.paused`, `audio.ended`), explicitly track the sentence index actually loaded into the audio element with `loadedAudioIndexRef = useRef<number | null>(null)`.

In both `play()` and `resume()`, restrict in-place playback resumption to instances where `loadedAudioIndexRef.current` matches the target sentence index, the audio is paused, and has not ended. If any condition is unmet, invoke `speakSentence` to fetch or resolve the target sentence fresh.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18 / Node.js 20+

**Primary Dependencies**: Vitest, `@testing-library/react`, React hooks

**Storage**: In-memory React ref (`loadedAudioIndexRef`)

**Testing**: Vitest (`npm test`), TypeScript compiler (`npm run typecheck`), ESLint (`npm run lint`)

**Target Platform**: Desktop (Electron) / Modern Browser

**Project Type**: React Hook Implementation

**Performance Goals**: Instantaneous in-place resume (<0.1ms synchronous ref comparison)

**Constraints**:
- Must preserve existing `playTokenRef` and stale checks.
- Must preserve Web Speech API provider behavior (`browser`).
- Must not alter caching logic.
- Must pass `npm run typecheck` and `npm run lint` cleanly.

**Scale/Scope**: 1 file modified (`src/hooks/useTTS.ts`), unit test suite updated (`tests/hooks/useTTS.test.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) template is in default state; no active gates or rules are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/043-tts-loaded-audio-index/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output (Replay analysis & explicit index tracking)
├── data-model.md        # Phase 1 output (LoadedAudioIndexTracker entity)
├── quickstart.md        # Phase 1 output (Verification guide)
├── checklists/          # Requirements quality checklist
│   └── requirements.md
└── contracts/           # Phase 1 output
    └── resume-guard-contract.md
```

### Source Code (repository root)

```text
src/hooks/
└── useTTS.ts            # Add loadedAudioIndexRef, update play() and resume() guards

tests/hooks/
└── useTTS.test.ts       # Add test simulating play/resume during in-flight fetch
```

**Structure Decision**: In-place ref tracking and guard refinement inside `src/hooks/useTTS.ts`, verified via unit tests in `tests/hooks/useTTS.test.ts`.

## Complexity Tracking

No constitution violations; minimal state addition preventing significant UI bugs.
