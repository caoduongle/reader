# Phase 0 Research: Transient Network Retry for RVC Speech Synthesis

**Feature**: `046-rvc-speech-retry`  
**Date**: 2026-09-06

## 1. Problem Analysis: Transient Edge-TTS Upstream Dropped Packets

### Background
In `python-backend/server.py`, the `/speak` endpoint utilizes `edge_tts.Communicate` to stream synthesized Vietnamese speech frames before piping them to RVC inference.
Microsoft Edge-TTS communicates via WebSocket with upstream Azure endpoints. Intermittently, connections drop or Azure resets streams, producing:
```text
edge_tts.exceptions.NoAudioReceived: No audio was received from Edge TTS service.
```
This triggers an unhandled exception resulting in HTTP 500 from the Flask server.

### Current Client Failure
In `src/hooks/useTTS.ts`, `fetchRVCSpeech` previously attempted synthesis only once:
1. When `/speak` returned HTTP 500, `fetchRVCSpeech` logged a warning, set `serverErrorMessage`, and returned `null`.
2. `speakSentence` treated `null` as fatal, called `setIsPlaying(false)` and halted reading.
3. The reader had to manually hit Play again to re-attempt the sentence, which almost always succeeds on the second attempt because the dropped socket was transient.

---

## 2. Technical Decisions

### Decision 1: Self-Contained Recursive Backoff in `fetchRVCSpeech`
```typescript
const fetchRVCSpeech = useCallback(
  async (
    text: string,
    serverUrl: string,
    abortController?: AbortController,
    maxRetries: number = 1
  ): Promise<string | null> => { ... }
);
```
- **Rationale**: Keeps retry logic encapsulated inside the single network layer utility. Callers (`prefetchUpcoming` and `speakSentence`) do not need complex retry loops.
- **Alternatives Considered**: Retrying in `speakSentence`. Rejected because `prefetchUpcoming` would not benefit from retry, leading to cache misses.

### Decision 2: Strict Error Classification
- **Retryable Errors**:
  1. HTTP 5xx responses EXCEPT HTTP 503 (`res.status >= 500 && res.status !== 503`).
  2. Network exceptions (`TypeError: Failed to fetch`, DNS failures, socket resets) EXCEPT `AbortError`.
- **Non-Retryable Errors**:
  1. Client errors: HTTP 4xx (e.g. 400 Bad Request, empty payload, invalid parameters).
  2. Service unavailable: HTTP 503 (RVC model not loaded/configured).
  3. Abort: `err.name === 'AbortError'` or `abortController.signal.aborted === true`.

### Decision 3: 400ms Backoff Delay with Pre/Post Abort Checks
```typescript
if (isRetryable && maxRetries > 0 && !abortController?.signal?.aborted) {
  console.warn(`[VoxRead] Retry fetch RVC speech sau lỗi: ${errorMsg}`);
  await new Promise(resolve => setTimeout(resolve, 400));
  if (abortController?.signal?.aborted) return null;
  return fetchRVCSpeech(text, serverUrl, abortController, maxRetries - 1);
}
```
- **Rationale**: 400ms is sufficient for upstream Edge-TTS WebSocket endpoints to clear stale sessions, without delaying user perception unnecessarily.
- Double-checking `abortController.signal.aborted` after the delay prevents launching an HTTP request if the user stopped playback during the 400ms window.

### Decision 4: Surface Error Toast Only on Final Failure
- Do not call `setServerErrorMessage` while retries remain (`maxRetries > 0` on retryable error).
- Only call `setServerErrorMessage` if all attempts fail or on non-retryable errors.

---

## 3. Testing Strategy

### Unit Tests in `tests/hooks/useTTS.test.ts`
1. Mock `/speak` first call -> HTTP 500; second call -> HTTP 200 with audio blob. Assert `fetchRVCSpeech` succeeds and `fetch` called twice.
2. Mock `/speak` -> HTTP 400. Assert `fetch` called once (no retry) and error set.
3. Mock `/speak` -> HTTP 503. Assert `fetch` called once (no retry) and error set.
4. Mock `/speak` -> HTTP 500 with `abortController.signal.aborted = true`. Assert `fetch` called once.
