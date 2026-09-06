# Implementation Plan: Fix ESLint Any in useTTS ClientTiming

**Branch**: `041-fix-tts-eslint-any` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/041-fix-tts-eslint-any/spec.md)

**Input**: Feature specification from `specs/041-fix-tts-eslint-any/spec.md`

## Summary

Resolve ESLint error `@typescript-eslint/no-explicit-any` on line 551 in `src/hooks/useTTS.ts` by updating the return type of `__originalOnPlaying` within the local `audioWithCustomProps` type declaration from `any` to `unknown`. Because the return value of this handler is never consumed (only invoked via `.call(audio, ev)`), `unknown` is type-safe, eliminates the lint error, and requires zero modifications to runtime logic, variable names, or other files.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+

**Primary Dependencies**: React 18, `@typescript-eslint/eslint-plugin`, ESLint 8.x

**Storage**: N/A

**Testing**: `npm run lint`, `npm run typecheck`

**Target Platform**: Desktop (Windows, macOS, Linux - Electron) / Web

**Project Type**: React TypeScript application

**Performance Goals**: Zero performance impact (type declaration change only)

**Constraints**:
- Must NOT alter any runtime logic or execution flow.
- Must NOT rename variables or perform additional refactoring.
- `npm run lint` must exit with 0 errors.
- `npm run typecheck` must exit with 0 errors.

**Scale/Scope**: 1 file (`src/hooks/useTTS.ts`), exactly 1 line modified (replacing `any` with `unknown`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) template is in default state; no active gates or rules are violated. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/041-fix-tts-eslint-any/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output (ESLint root cause & type analysis)
├── data-model.md        # Phase 1 output (Type definition structure)
├── quickstart.md        # Phase 1 output (Verification steps)
├── checklists/          # Requirements quality checklist
│   └── requirements.md
└── contracts/           # Phase 1 output
    └── handler-type-contract.md
```

### Source Code (repository root)

```text
src/hooks/
└── useTTS.ts            # Line 551: change return type from any to unknown
```

**Structure Decision**: In-place single-line type annotation change in `src/hooks/useTTS.ts`.

## Complexity Tracking

No constitution violations; no complexity added.
