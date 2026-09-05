# Tasks: WAV Audio Playback Error Diagnostics

**Feature**: 034-wav-error-diagnostics | **Branch**: `034-wav-error-diagnostics` | **Date**: 2026-09-05
**Spec**: [spec.md](file:///e:/reader/specs/034-wav-error-diagnostics/spec.md) | **Plan**: [plan.md](file:///e:/reader/specs/034-wav-error-diagnostics/plan.md)

---

## Phase 1: User Story 1 – Actionable Browser-Side Audio Error Reporting (Priority: P1) 🎯 MVP

**Goal**: Replace the generic `audio.onerror` handler in `useTTS.ts` with one that reads the W3C `MediaError` object, maps the code to a human-readable name, and surfaces the reason in both the UI banner and console.

**Independent Test**: Trigger an audio playback error in the Electron app → verify the banner shows the specific MediaError code (e.g., `MEDIA_ERR_DECODE`) instead of the generic message. Verify `console.error` emits the `[VoxRead]` prefixed reason.

### Implementation for User Story 1

- [X] T001 [US1] Replace `audio.onerror` handler in `src/hooks/useTTS.ts` (lines 560-565): change callback signature from `e => { ... }` to `() => { ... }`, read `audio.error` (MediaError), define `codeMap` mapping codes 1-4 to W3C constant names (`MEDIA_ERR_ABORTED`, `MEDIA_ERR_NETWORK`, `MEDIA_ERR_DECODE`, `MEDIA_ERR_SRC_NOT_SUPPORTED`), compute `reason` string (with optional `message` suffix), emit `console.error('[VoxRead] Audio playback error:', reason, 'blob size check pending')`, set `setIsPlaying(false)` and `setIsPaused(false)`, set `setServerErrorMessage` to `` `Lỗi phát âm thanh WAV (${reason}).` ``

**Checkpoint**: User Story 1 complete — audio errors now show specific MediaError code in UI banner and console.

---

## Phase 2: User Story 2 – Backend WAV Output Telemetry (Priority: P2)

**Goal**: Add a debug log line in `_run_rvc_inference` that prints the NumPy array shape, dtype, sample rate, and computed duration after successful RVC inference, enabling cross-referencing with frontend errors.

**Independent Test**: Send a valid `POST /speak` request → verify the server terminal prints `[VoxRead][Debug] WAV output: shape=..., dtype=..., sample_rate=..., duration=...s`. Run `pytest python-backend/tests/test_server.py -v` → verify the new test passes alongside all existing tests.

### Implementation for User Story 2

- [X] T002 [US2] Add WAV debug log line in `python-backend/server.py` function `_run_rvc_inference` (between line 193 error-tuple check and line 195 `wavfile.write`): insert `print(f"[VoxRead][Debug] WAV output: shape={result.shape}, dtype={result.dtype}, sample_rate={rvc.vc.tgt_sr}, duration={len(result)/rvc.vc.tgt_sr:.2f}s")`

- [X] T003 [US2] Add test `test_speak_wav_debug_log_emitted` in `python-backend/tests/test_server.py` following the pattern of existing `test_speak_timing_log_emitted` (line 361): mock `_synthesize_base` and `vc_single` (return `np.zeros(16000, dtype=np.int16)`), send `POST /speak`, capture stdout with `capsys.readouterr()`, assert `[VoxRead][Debug] WAV output:` is present, assert `shape=`, `dtype=`, `sample_rate=`, `duration=` substrings are present

**Checkpoint**: User Story 2 complete — every successful `/speak` response now logs WAV metadata for cross-referencing.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and verification

- [X] T004 Run full backend test suite: `pytest python-backend/tests/test_server.py -v` — verify all tests pass (existing + new)
- [X] T005 Run quickstart.md validation scenarios from [quickstart.md](file:///e:/reader/specs/034-wav-error-diagnostics/quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1 — Frontend)**: No dependencies — can start immediately
- **Phase 2 (US2 — Backend)**: No dependencies — can start immediately, independent of Phase 1
- **Phase 3 (Polish)**: Depends on Phase 1 and Phase 2 completion

### User Story Dependencies

- **User Story 1 (P1)**: Standalone — modifies only `src/hooks/useTTS.ts`
- **User Story 2 (P2)**: Standalone — modifies only `python-backend/server.py` and `python-backend/tests/test_server.py`
- US1 and US2 touch completely different files and can be executed in parallel

### Parallel Opportunities

- T001 and T002 can run in parallel (different files: `useTTS.ts` vs `server.py`)
- T002 and T003 are sequential (T003 tests the change from T002)

---

## Parallel Example: US1 + US2

```bash
# These can run simultaneously — zero file overlap:
Task T001: "Replace audio.onerror handler in src/hooks/useTTS.ts"
Task T002: "Add WAV debug log in python-backend/server.py"

# Then sequentially:
Task T003: "Add test for WAV debug log in python-backend/tests/test_server.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 (frontend error handler)
2. **STOP and VALIDATE**: Trigger an audio error → verify banner shows specific code
3. Deploy if ready — immediate diagnostic value

### Full Delivery

1. T001 (frontend) + T002 (backend) — in parallel
2. T003 (backend test)
3. T004 + T005 (validation)
4. Both stories deliver independent diagnostic value

---

## Notes

- No setup or foundational phase needed — this feature modifies existing code, no new dependencies
- No test tasks for US1 — `useTTS.ts` has no existing unit test infrastructure; the spec does not request frontend tests
- US2 includes a test task (T003) because the backend already has a pytest suite with an established pattern (`test_speak_timing_log_emitted`)
- Total: 5 tasks, ~15 lines of code changed across 2 source files + 1 test file
