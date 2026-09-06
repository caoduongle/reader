# Implementation Plan: Transient Network Retry for RVC Speech Synthesis

**Branch**: `046-rvc-speech-retry` | **Date**: 2026-09-06 | **Spec**: [spec.md](file:///e:/reader/specs/046-rvc-speech-retry/spec.md)

**Input**: Feature specification from `specs/046-rvc-speech-retry/spec.md`

## Summary

Incorporate an automatic, self-healing retry mechanism directly within `fetchRVCSpeech` in `src/hooks/useTTS.ts`. When a transient upstream failure occurs (such as Microsoft Edge-TTS `NoAudioReceived` triggering HTTP 500, or a temporary dropped network connection), pause for 400ms and re-attempt synthesis once (`maxRetries = 1`, maximum 2 total HTTP requests per sentence). Immediately abort if user pauses/navigates or if the failure is a non-retryable configuration error (HTTP 4xx or 503).

### Technical Implementation:
1. `src/hooks/useTTS.ts`:
   - Update `fetchRVCSpeech` parameter list with `maxRetries: number = 1`.
   - Distinguish retryable failures (network error or HTTP 5xx excluding 503) from non-retryable failures (HTTP 4xx, HTTP 503, `AbortError`).
   - If retryable and `maxRetries > 0` and `!abortController?.signal?.aborted`:
     - Output `console.warn(`[VoxRead] Retry fetch RVC speech sau lỗi: ${errorMsg}`)`.
     - `await new Promise(resolve => setTimeout(resolve, 400))`.
     - Check `abortController?.signal?.aborted`; if aborted return `null`.
     - Return `fetchRVCSpeech(text, serverUrl, abortController, maxRetries - 1)`.
   - Only surface `setServerErrorMessage(errorMsg)` when no retries remain or error is non-retryable.
2. `tests/hooks/useTTS.test.ts`:
   - Add unit tests verifying retry on HTTP 500 (succeeds on attempt 2).
   - Add unit tests verifying NO retry on HTTP 400 and HTTP 503.
   - Add unit test verifying abort cancellation during retry.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18 / Node.js 20+

**Primary Dependencies**: React (`useCallback`), Web Standard `fetch` & `AbortController`

**Storage**: N/A (stateless in-memory retry)

**Testing**: Vitest (`npm test`), TypeScript compiler (`npm run typecheck`), ESLint (`npm run lint`)

**Target Platform**: Electron / Web Desktop

**Project Type**: React hook network resilience enhancement

**Performance Goals**: <500ms recovery on transient dropped connection, avoiding manual user re-clicks.

**Constraints**:
- Maximum 1 retry attempt (max 2 total HTTP requests).
- DO NOT retry HTTP 4xx or HTTP 503.
- DO NOT add retry logic to `prefetchUpcoming` or `speakSentence`.
- DO NOT alter `python-backend/server.py`.
- 0 TypeScript compilation errors, 0 ESLint errors and warnings.

**Scale/Scope**: 1 source file (`src/hooks/useTTS.ts`), 1 test file (`tests/hooks/useTTS.test.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution template has no active restrictive gates. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/046-rvc-speech-retry/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output (Error classification & backoff design)
├── data-model.md        # Phase 1 output (Retry policy state machine)
├── quickstart.md        # Phase 1 output (Verification guide)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── contracts/
    └── retry-contract.md# Interface contract for fetchRVCSpeech
```

### Source Code (repository root)

```text
src/hooks/
└── useTTS.ts            # fetchRVCSpeech with maxRetries parameter, 400ms backoff, and retryable checks

tests/hooks/
└── useTTS.test.ts       # Automated tests asserting retry on 500 and fail-fast on 400/503/abort
```

**Structure Decision**: Fully encapsulated in `fetchRVCSpeech` inside `src/hooks/useTTS.ts`.

## Complexity Tracking

No constitution violations or external libraries introduced.
