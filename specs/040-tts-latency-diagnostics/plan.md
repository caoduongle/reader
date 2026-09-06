# Implementation Plan: TTS Latency Diagnostics (Unbuffered Python Spawn & Client Audio Playback Timing)

**Branch**: `040-tts-latency-diagnostics` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/040-tts-latency-diagnostics/spec.md)

**Input**: Feature specification from `specs/040-tts-latency-diagnostics/spec.md`

## Summary

This feature resolves log-buffering on the Python backend and introduces end-to-end client latency telemetry to diagnose periodic ~30s reading freezes:
1. **Backend (Electron main process)**: Pass `PYTHONUNBUFFERED: '1'` into `spawn()` options `env` in `electron/main.ts` so that `print()` statements from `server.py` (`[VoxRead][Timing]` and `[VoxRead][Debug]`) are immediately flushed to `python-backend/server.log` without block-buffering delays.
2. **Frontend (`useTTS.ts`)**: Measure elapsed time before fetch/cache resolution (`clientT0` to `clientT1`) and from `audio.src` assignment until `audio.onplaying` (`clientT1` to `clientT2`), logging `[VoxRead][ClientTiming]` to the console while preserving any existing event handlers.
3. **Diagnostics & Troubleshooting**: Allow immediate side-by-side comparison of `server.log` and DevTools console logs to definitively isolate whether stalls originate in Edge-TTS upstream, RVC GPU inference, local network/IPC, or browser audio playback.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (Electron 34+), Python 3.10+

**Primary Dependencies**: React 18, Electron, Node.js `child_process`, HTMLAudioElement, Web Speech API

**Storage**: Local file `python-backend/server.log`

**Testing**: `npm run typecheck`, `npm run build:electron:main`, `npm test`

**Target Platform**: Desktop (Windows, macOS, Linux)

**Project Type**: Electron Desktop Application (Main Process + React Renderer)

**Performance Goals**:
- Near 0ms overhead for unbuffered file logging.
- Sub-millisecond timing accuracy via `performance.now()`.

**Constraints**:
- Must preserve all existing environment variables in `process.env`.
- Must preserve any existing `onplaying` / `onplay` event handlers on the audio element.
- Zero TypeScript type errors.

**Scale/Scope**: 2 files modified (`electron/main.ts`, `src/hooks/useTTS.ts`), ~25 LOC modified.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) template is in default state; no active gates or rules are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/040-tts-latency-diagnostics/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/          # Requirements quality checklist
│   └── requirements.md
└── contracts/           # Phase 1 output
    └── timing-telemetry.md
```

### Source Code (repository root)

```text
electron/
└── main.ts              # startPythonBackend: spawn with PYTHONUNBUFFERED=1

src/hooks/
└── useTTS.ts            # speakSentence: client timing instrumentation around fetch/cache and audio.onplaying

python-backend/
└── server.log           # Unbuffered stdout/stderr log output from server.py
```

**Structure Decision**: Targeted changes directly inside `electron/main.ts` and `src/hooks/useTTS.ts`.

## Complexity Tracking

No constitution violations; no unnecessary abstractions added.
