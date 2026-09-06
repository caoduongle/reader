# Feature Specification: Fix ESLint Any in useTTS ClientTiming

**Feature Branch**: `041-fix-tts-eslint-any`

**Created**: 2026-09-06

**Status**: Ready for Review

**Input**: User description: "Sửa lỗi ESLint \"Unexpected any. Specify a different type @typescript-eslint/no-explicit-any\" trong file src/hooks/useTTS.ts. Lỗi nằm ở interface cục bộ audioWithCustomProps (biến dùng để lưu lại onplaying handler cũ trước khi gắn thêm log đo thời gian ClientTiming): trường __originalOnPlaying đang khai báo kiểu trả về là `any`. Đổi kiểu trả về từ `any` sang `unknown` (giá trị trả về của handler này không được sử dụng ở bất kỳ đâu, chỉ được .call() rồi bỏ qua, nên unknown là đủ và an toàn về type). KHÔNG được sửa bất kỳ logic nào khác trong file, không đổi tên biến, không refactor thêm. Xác minh: chạy `npm run lint` phải ra 0 lỗi, chạy `npm run typecheck` phải ra 0 lỗi. Không có test nào khác cần chạy cho thay đổi này."

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Clean Static Analysis and CI Quality Gate (Priority: P1) 🎯 MVP

As a developer running the codebase static analysis and automated verification pipeline, I want `npm run lint` and `npm run typecheck` to pass with zero errors, so that the code quality gates are satisfied without permitting unsafe explicit `any` types.

**Why this priority**: An ESLint error prevents continuous integration checks from succeeding and violates strict type safety rules configured in the project (`@typescript-eslint/no-explicit-any`).

**Independent Test**:
1. Run `npm run lint` in the project root.
2. Verify that ESLint passes cleanly with 0 errors and 0 warnings.
3. Run `npm run typecheck` in the project root.
4. Verify that TypeScript compilation completes with 0 diagnostics.

**Acceptance Scenarios**:
1. **Given** `src/hooks/useTTS.ts` contains the local `audioWithCustomProps` interface, **When** static analysis is executed via `npm run lint`, **Then** no `@typescript-eslint/no-explicit-any` errors are emitted on line 551 or elsewhere in the file.
2. **Given** `src/hooks/useTTS.ts` is compiled by TypeScript via `npm run typecheck`, **When** `tsc --noEmit` runs, **Then** all types resolve cleanly with exit code 0.

---

### User Story 2 – Unbroken Audio Playback and Client Timing Telemetry (Priority: P1)

As an end user listening to synthesized text-to-speech audio, I want audio sentences to play seamlessly while client-side timing diagnostics remain active and any pre-existing audio event listeners continue to execute, so that performance telemetry does not interfere with audio playback.

**Why this priority**: Replacing `any` with `unknown` must not affect runtime execution or degrade TTS playback functionality in any scenario.

**Independent Test**:
1. Start the VoxRead application (`npm run electron:dev` or in development mode).
2. Play any voice sentence using TTS.
3. Observe that audio playback proceeds normally without interruptions or exceptions.
4. Verify that `[VoxRead][ClientTiming]` telemetry logs continue to be printed to the DevTools console as expected.

**Acceptance Scenarios**:
1. **Given** `audio.onplaying` triggers during playback, **When** `__originalOnPlaying` is invoked via `.call(audio, ev)`, **Then** its returned value (typed as `unknown`) is safely discarded without affecting execution flow.
2. **Given** an existing `onplaying` handler was already attached to the audio element, **When** new playback starts, **Then** the original handler is preserved and invoked with the correct `this` and `Event` parameters.

---

### Edge Cases

- **Null or undefined handler**: When `audioWithCustomProps.__originalOnPlaying` is undefined or null, the type guard `typeof audioWithCustomProps.__originalOnPlaying === 'function'` prevents invocation without throwing runtime errors.
- **Handler returns a value or Promise**: Because the return type is declared as `unknown`, any return value produced by an existing handler is safely accepted and ignored at the call site without violating TypeScript safety.
- **Scope restriction**: No variable names, audio playback handlers, cache mechanisms, or timing calculations outside of the return type declaration are modified.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `src/hooks/useTTS.ts`, the return type of `__originalOnPlaying` inside the `audioWithCustomProps` type assertion MUST be changed from `any` to `unknown`:
  ```typescript
  __originalOnPlaying?: ((this: GlobalEventHandlers, ev: Event) => unknown) | null;
  ```
- **FR-002**: NO other code, logic, variables, or functions in `src/hooks/useTTS.ts` or any other file MUST be altered or refactored.
- **FR-003**: Executing `npm run lint` MUST complete with 0 errors and 0 warnings.
- **FR-004**: Executing `npm run typecheck` MUST complete with 0 errors.

### Key Entities

- **audioWithCustomProps**:
  - `__originalOnPlaying`: Optional handler property with signature `((this: GlobalEventHandlers, ev: Event) => unknown) | null`, used to retain previously bound `onplaying` listeners before attaching `timingOnPlaying`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run lint` outputs 0 errors and 0 warnings across all files.
- **SC-002**: `npm run typecheck` finishes with exit code 0.
- **SC-003**: Zero behavioral regressions in TTS audio playback or client latency logging telemetry.
- **SC-004**: Scope of git diff is strictly confined to changing `any` to `unknown` in `src/hooks/useTTS.ts`.

## Assumptions

- Handlers attached to `audio.onplaying` do not have caller-dependent return values (their return value is never consumed by the DOM event dispatcher or caller).
- `unknown` is the safest top type in TypeScript to represent an arbitrary discarded return value without triggering `@typescript-eslint/no-explicit-any`.
