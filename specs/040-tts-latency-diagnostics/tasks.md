# Tasks: TTS Latency Diagnostics (Unbuffered Python Spawn & Client Audio Playback Timing)

**Feature**: 040-tts-latency-diagnostics | **Branch**: `040-tts-latency-diagnostics` | **Date**: 2026-09-06
**Spec**: [spec.md](file:///e:/reader/specs/040-tts-latency-diagnostics/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/040-tts-latency-diagnostics/plan.md)

---

## Phase 1: User Story 1 – Real-time Backend Log Flushing (Priority: P1) 🎯 MVP

**Goal**: Pass `PYTHONUNBUFFERED=1` in `electron/main.ts` when spawning `server.py` so standard output/error are not block-buffered when redirected to `server.log`.

**Independent Test**: Launch `npm run electron:dev`, invoke a speech request with RVC, and verify that `[VoxRead][Timing]` log statements immediately appear in `python-backend/server.log` without delay.

### Implementation for User Story 1

- [X] T001 [P] [US1] In `electron/main.ts` within `startPythonBackend()`, add `env: { ...process.env, PYTHONUNBUFFERED: '1' }` to the `spawn(pythonExe, [serverScript], { ... })` configuration options.

**Checkpoint**: User Story 1 complete — Python stdout/stderr redirection is unbuffered in `server.log`.

---

## Phase 2: User Story 2 – Client-Side End-to-End Latency Diagnostics (Priority: P1)

**Goal**: Measure client-side durations for fetch/cache resolution and actual audio playback start in `src/hooks/useTTS.ts`, logging `[VoxRead][ClientTiming]` to the console while preserving any existing event handlers.

**Independent Test**: Open DevTools Console in VoxRead, play sentences with RVC provider, and verify that `[VoxRead][ClientTiming] Cho fetch/cache: <X>ms | Cho audio bat dau phat sau khi gan src: <Y>ms` is logged upon audio playback commencement (`onplaying`).

### Implementation for User Story 2

- [X] T002 [P] [US2] In `src/hooks/useTTS.ts` inside `speakSentence()` for the RVC provider flow, capture `clientT0 = performance.now()` before cache/in-flight/fetch resolution, capture `clientT1 = performance.now()` after obtaining `audioBlobUrl`, and attach an `audio.onplaying` listener (preserving any existing handler) that captures `clientT2 = performance.now()` and logs `[VoxRead][ClientTiming] Cho fetch/cache: ${(clientT1 - clientT0).toFixed(0)}ms | Cho audio bat dau phat sau khi gan src: ${(clientT2 - clientT1).toFixed(0)}ms`.

**Checkpoint**: User Story 2 complete — DevTools console displays granular client timing breakdown for every spoken sentence.

---

## Phase 3: User Story 3 – End-to-End Bottleneck Isolation & Verification (Priority: P2)

**Goal**: Verify and document the end-to-end diagnostic workflow by correlating backend `server.log` with frontend console timing to isolate potential 30s freeze incidents.

**Independent Test**: Cross-reference `[VoxRead][Timing]` in `python-backend/server.log` with `[VoxRead][ClientTiming]` in DevTools Console to verify both streams provide synchronized timing metrics.

### Verification for User Story 3

- [X] T003 [US3] Validate end-to-end telemetry correlation following `quickstart.md`, confirming that both `server.log` and DevTools console yield matching duration metrics during RVC sentence playback.

**Checkpoint**: User Story 3 complete — definitive numerical telemetry is available for freeze diagnosis.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validate type safety, build outputs, and codebase regression status.

- [X] T004 Run `npm run typecheck` to ensure 0 TypeScript compilation errors across main and renderer processes.
- [X] T005 Run `npm run build:electron:main` to ensure Electron main process bundle builds cleanly.
- [X] T006 Run `npm test` to verify full automated test suite passes with 0 regressions.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: Independent backend change (`electron/main.ts`)
- **Phase 2 (US2)**: Independent frontend change (`src/hooks/useTTS.ts`)
- **Phase 3 (US3)**: Depends on both US1 (T001) and US2 (T002) for full correlation
- **Phase 4 (Polish)**: Validates after implementation tasks

### User Story Dependencies

- **User Story 1 (P1)**: Independent
- **User Story 2 (P1)**: Independent
- **User Story 3 (P2)**: Integrates US1 and US2 for validation

### Parallel Opportunities

- T001 (`electron/main.ts`) and T002 (`src/hooks/useTTS.ts`) touch completely different files and can be executed concurrently in parallel (`[P]`).
- T004, T005, and T006 can run after T001 and T002 are implemented.

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Implement T001 in `electron/main.ts` (Backend unbuffered logging).
2. Implement T002 in `src/hooks/useTTS.ts` (Frontend timing diagnostics).
3. Validate T004 (`npm run typecheck`) and T005 (`npm run build:electron:main`).
4. Validate T006 (`npm test`).
5. Execute manual run check per T003 (`quickstart.md`).
