# Interface Contract: Speech Synthesis Fetch & Retry

**Feature**: `046-rvc-speech-retry`  
**Date**: 2026-09-06

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

## 2. Invariants & Guarantees

1. **Deterministic Bounded Calls**: For any single invocation of `fetchRVCSpeech(text, url, ctrl)`, the underlying network `fetch` MUST be called at most `maxRetries + 1` times (default: $\le 2$).
2. **Backoff Delay**: Between attempt 1 and attempt 2, the function MUST delay execution by 400ms.
3. **No Retries on Configuration Errors**: If `res.status` is in $[400, 499]$ or $503$, `maxRetries` is ignored and `null` is returned without retry.
4. **Abort Sensitivity**: If `abortController.signal.aborted` is `true` either before, during, or immediately following the 400ms delay, no further network request is dispatched and `null` is returned.
5. **Caller Transparency**: Callers (`speakSentence`, `prefetchUpcoming`) invoke `fetchRVCSpeech(text, url, ctrl)` without supplying `maxRetries` and receive seamless retry recovery.
