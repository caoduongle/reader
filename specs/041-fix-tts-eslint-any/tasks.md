# Tasks: Fix ESLint Any in useTTS ClientTiming

**Feature**: 041-fix-tts-eslint-any | **Branch**: `041-fix-tts-eslint-any` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/041-fix-tts-eslint-any/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/041-fix-tts-eslint-any/plan.md)

---

## Phase 1: User Story 1 – Clean Static Analysis and CI Quality Gate (Priority: P1) 🎯 MVP

**Goal**: Eliminate the `@typescript-eslint/no-explicit-any` ESLint error in `src/hooks/useTTS.ts` by replacing `any` with `unknown` on `__originalOnPlaying`, satisfying lint and typecheck gates.

**Independent Test**: Execute `npm run lint` and `npm run typecheck`; both must exit with code 0 and 0 reported issues.

### Implementation for User Story 1

- [X] T001 [US1] In `src/hooks/useTTS.ts`, update `audioWithCustomProps` declaration on line 551 to change `__originalOnPlaying` return type from `any` to `unknown`: `__originalOnPlaying?: ((this: GlobalEventHandlers, ev: Event) => unknown) | null;`
- [X] T002 [US1] Run `npm run lint` to verify 0 ESLint errors and 0 warnings
- [X] T003 [US1] Run `npm run typecheck` to verify 0 TypeScript diagnostics

**Checkpoint**: User Story 1 complete — ESLint and TypeScript checks pass cleanly.

---

## Phase 2: User Story 2 – Unbroken Audio Playback and Telemetry Contract (Priority: P1)

**Goal**: Verify strict compliance with user constraints: no alterations to runtime logic, no renamed variables, and no extraneous refactoring.

**Independent Test**: Inspect `git diff src/hooks/useTTS.ts` to confirm only line 551 is modified.

### Verification for User Story 2

- [X] T004 [US2] Review `git diff src/hooks/useTTS.ts` to confirm exactly one line is changed (replacing `any` with `unknown`) and no other code, logic, or variables are altered

**Checkpoint**: User Story 2 complete — zero behavioral or syntactic regressions.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Execute full verification workflow per feature documentation.

- [X] T005 Run quickstart validation per `specs/041-fix-tts-eslint-any/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Must complete first to resolve the type definition and verify lint/typecheck.
- **Phase 2 (US2)**: Depends on Phase 1 (T001) to audit the resulting diff against constraints.
- **Phase 3 (Polish)**: Final validation verifying quickstart completion.

### User Story Dependencies

- **User Story 1 (P1)**: Independent core fix.
- **User Story 2 (P1)**: Depends on T001 to verify scope preservation.

### Parallel Opportunities

- T002 (`npm run lint`) and T003 (`npm run typecheck`) can execute in sequence or parallel once T001 is applied.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Apply single-line type change in `src/hooks/useTTS.ts` (T001).
2. Validate with `npm run lint` (T002) and `npm run typecheck` (T003).
3. Validate scope boundary via `git diff` (T004).
4. Run quickstart verification (T005).
