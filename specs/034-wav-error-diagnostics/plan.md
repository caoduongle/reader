# Implementation Plan: WAV Audio Playback Error Diagnostics

**Branch**: `034-wav-error-diagnostics` | **Date**: 2026-09-05 | **Spec**: [spec.md](file:///e:/reader/specs/034-wav-error-diagnostics/spec.md)

**Input**: Feature specification from `/specs/034-wav-error-diagnostics/spec.md`

## Summary

VoxRead's `audio.onerror` handler in `useTTS.ts` logs a generic DOM event (`e`) instead of reading `audio.error` (the W3C `MediaError` object), giving users and developers zero diagnostic information when WAV playback fails. The backend (`server.py`) provides no metadata about the WAV file it generates, making cross-referencing impossible.

This plan adds two isolated, non-breaking changes:
1. **Frontend**: Replace the generic `onerror` handler with one that reads `audio.error`, maps the code to a human-readable name, and surfaces it in both the UI banner and console.
2. **Backend**: Add a debug log line after successful RVC inference printing the NumPy array shape, dtype, sample rate, and computed duration.

## Technical Context

**Language/Version**: TypeScript (React hooks, Electron/Chromium) + Python 3.11 (Flask)

**Primary Dependencies**: React `useState`/`useCallback` (frontend), Flask + `scipy.io.wavfile` + `rvc_python` (backend)

**Storage**: N/A (no persistence changes)

**Testing**: `pytest` (backend, `python-backend/tests/test_server.py`); no frontend unit tests for this hook currently

**Target Platform**: Electron desktop app (Chromium renderer), Python Flask server on localhost

**Project Type**: Desktop app with local Python TTS/RVC backend

**Performance Goals**: N/A (diagnostic logging only, negligible overhead)

**Constraints**: Changes must be strictly non-breaking — no alteration to HTTP contracts, playback state management, or file cleanup routines

**Scale/Scope**: 2 files modified, ~15 lines changed total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is an empty template with no concrete principles or constraints defined. No gates to evaluate. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/034-wav-error-diagnostics/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
└── hooks/
    └── useTTS.ts          # Frontend: audio.onerror handler (line ~560)

python-backend/
├── server.py              # Backend: _run_rvc_inference debug log (line ~195)
└── tests/
    └── test_server.py     # Backend: new test for WAV debug log
```

**Structure Decision**: This is a desktop app with a web frontend (`src/`) and a local Python backend (`python-backend/`). The two changes are isolated to one file each, plus one new test.
