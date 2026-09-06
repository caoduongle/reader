# Implementation Plan: TTS Generation Buffering Visual Indicator

**Branch**: `044-tts-buffering-indicator` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/044-tts-buffering-indicator/spec.md)

**Input**: Feature specification from `specs/044-tts-buffering-indicator/spec.md`

## Summary

Provide real-time visual buffering feedback in `ControlBar` when generating RVC speech synthesis so users do not mistake backend synthesis latency for an application freeze.

### Technical Implementation:
1. `src/hooks/useTTS.ts`: Add `isBuffering` state (`boolean`, defaults to `false`). In `speakSentence` (`rvc-local` branch), set `isBuffering = true` before fetch, and clear it in a `finally` block once `audio.src` is set or an early return occurs. Export `isBuffering`.
2. `src/App.tsx`: Destructure `isBuffering` from `useTTS` and pass it to `<ControlBar isBuffering={isBuffering} ... />`.
3. `src/components/ControlBar.tsx`: Accept `isBuffering?: boolean`. In the Play/Pause button, render an animated spinner (`Loader2`) and updated tooltip ("Đang tạo giọng đọc...") when `isBuffering === true`.
4. `tests/hooks/useTTS.test.ts`: Add automated unit test asserting `isBuffering` lifecycle.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18 / Node.js 20+

**Primary Dependencies**: Lucide React (`Loader2`), Tailwind CSS (`animate-spin`), React hooks

**Storage**: In-memory React state (`useState`)

**Testing**: Vitest (`npm test`), TypeScript compiler (`npm run typecheck`), ESLint (`npm run lint`)

**Target Platform**: Desktop (Electron) / Web

**Project Type**: React UI & Hook enhancement

**Performance Goals**: Instantaneous UI state transition on click (<16ms)

**Constraints**:
- `isBuffering` is strictly a presentation state; do NOT alter playback state machines or logic.
- Must not affect Web Speech API (`browser`) provider.
- Must pass `npm run typecheck` and `npm run lint` cleanly.

**Scale/Scope**: 3 source files touched (`useTTS.ts`, `App.tsx`, `ControlBar.tsx`), 1 test file updated (`useTTS.test.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) template is in default state; no active gates or rules are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/044-tts-buffering-indicator/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output (UX analysis & try/finally buffering lifecycle)
├── data-model.md        # Phase 1 output (BufferingState & visual mapping)
├── quickstart.md        # Phase 1 output (Verification steps)
├── checklists/          # Requirements quality checklist
│   └── requirements.md
└── contracts/           # Phase 1 output
    └── buffering-ui-contract.md
```

### Source Code (repository root)

```text
src/hooks/
└── useTTS.ts            # isBuffering state declaration, try/finally lifecycle, export

src/components/
└── ControlBar.tsx       # isBuffering prop, Loader2 icon, accessible label/tooltip

src/
└── App.tsx              # Destructure isBuffering from useTTS and thread to ControlBar

tests/hooks/
└── useTTS.test.ts       # Test asserting isBuffering transitions during speech synthesis
```

**Structure Decision**: Thread `isBuffering` directly from `useTTS` through `App.tsx` to `ControlBar.tsx`.

## Complexity Tracking

No constitution violations; minimal prop addition without external state managers.
