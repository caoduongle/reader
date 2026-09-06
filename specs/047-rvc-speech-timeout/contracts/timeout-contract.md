# Interface Contract: Speech Synthesis Timeout & Lifecycle

**Feature**: `047-rvc-speech-timeout`  
**Date**: 2026-09-06

---

## 1. Function Signature (`src/hooks/useTTS.ts`)

```typescript
const fetchRVCSpeech = useCallback(
  async (
    text: string,
    serverUrl: string,
    abortController?: AbortController,
    maxRetries: number = 1
  ): Promise<string | null> => { ... },
  []
);
```

---

## 2. Invariants & Guarantees

1. **Active Controller Selection**:
   - `const activeController = abortController || new AbortController();`
2. **Timeout Binding**:
   - Exactly one timeout (`setTimeout(() => activeController.abort(), 20000)`) is bound per attempt.
   - No second controller is created if `abortController` was passed.
3. **Timer Leak Freedom**:
   - The timeout timer MUST be cleared via `clearTimeout` before or when `fetchRVCSpeech` returns or throws (guaranteed by `finally`).
4. **Clean Abort Handling**:
   - When the 20s timeout elapses, `activeController.abort()` causes `fetch` to reject with `AbortError` or sets `activeController.signal.aborted = true`.
   - `fetchRVCSpeech` resolves to `null` without throwing unhandled exceptions.
5. **Caller Transparency**:
   - Existing callers (`speakSentence`, `prefetchUpcoming`) continue passing their existing `AbortController` instances and receive automatic 20s timeout protection.
