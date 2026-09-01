# Data Model: Local RVC Voice Cloning Integration & Windows Desktop Packaging

**Feature**: `001-rvc-tts-desktop`  
**Date**: 2026-09-01  
**Status**: Completed

---

## 1. Core Data Entities

### 1.1 TTSSettings Extension

Extends the existing user settings stored in `localStorage` under `voxread_tts_settings_v1`.

| Field Name | Type | Default Value | Description |
|------------|------|---------------|-------------|
| `ttsProvider` | `'browser' \| 'rvc-local'` | `'browser'` | The active voice engine provider. Backward compatible. |
| `rvcServerUrl` | `string` | `'http://localhost:8008'` | Base URL of the local RVC server. |
| `voiceURI` | `string` | `""` | Active browser voice URI (active only when `ttsProvider === 'browser'`). |
| `rate` | `number` | `1.0` | Speed factor ($0.5\times$ to $3.0\times$). Applied to both browser utterance and `<audio>` element. |
| `pitch` | `number` | `1.0` | Voice pitch ($0.5$ to $2.0$). Applied only to browser voice; locked/ignored for RVC. |
| `volume` | `number` | `1.0` | Loudness level ($0.0$ to $1.0$). Applied to both providers. |

**Validation Rules**:
- `ttsProvider` must be strictly `'browser'` or `'rvc-local'`.
- `rvcServerUrl` must be a valid HTTP/HTTPS URL string without trailing slash (e.g., `http://localhost:8008`).
- `rate` must be constrained within $[0.5, 3.0]$.
- `volume` must be constrained within $[0.0, 1.0]$.

---

### 1.2 RVC Server Health State

Transient client-side state in `useTTS` representing the reachability of the local voice server.

```typescript
export type RVCServerStatus = 'unknown' | 'checking' | 'connected' | 'unreachable';

export interface RVCServerHealth {
  status: RVCServerStatus;
  isModelLoaded: boolean;
  lastChecked: number; // Unix timestamp ms
  errorMessage?: string;
}
```

**State Transitions**:
```
               [ Mount / Settings Change ]
                            │
                            ▼
                      ┌───────────┐
                      │ checking  │
                      └─────┬─────┘
           GET /health ok   │   GET /health failed / timeout (2s)
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
  ┌─────────────┐                        ┌─────────────┐
  │  connected  │                        │ unreachable │
  └──────┬──────┘                        └──────┬──────┘
         │                                      │
         └─────────────► [ User Retries ] ◄─────┘
```

---

### 1.3 Audio Prefetch Cache Record

Transient in-memory structure managed inside `useTTS` via React `useRef`.

```typescript
export interface AudioCacheItem {
  sentenceIndex: number;
  blobUrl: string;       // Created via URL.createObjectURL(blob)
  blobSize: number;      // Size in bytes for debugging/metrics
  createdAt: number;     // Timestamp for TTL / eviction
  abortController?: AbortController; // Used to cancel in-flight fetches on jump
}
```

**Cache Lifecycle & Bounds**:
- Maximum capacity: $3$ items (current sentence $N$, and upcoming sentences $N+1$, $N+2$).
- Eviction rule: FIFO on sentence completion. When sentence $N$ completes, revoke URL with `URL.revokeObjectURL(item.blobUrl)` and remove key.
- Invalidation rule: On non-sequential navigation (e.g. jumpToParagraph, jumpToSentence $> N+1$, chapter change, or `stop()`), immediately abort all pending `fetch` requests and revoke all stored URLs.

---

### 1.4 Desktop Process State (Electron Main Process)

Maintained in Electron main process memory (`electron/main.ts`).

```typescript
export interface BackendProcessState {
  process: ChildProcess | null;
  pid: number | null;
  isPackaged: boolean;
  pythonPath: string;
  serverPath: string;
  isServerReady: boolean;
  startupAttempts: number;
  maxStartupAttempts: number; // 60 seconds
}
```

---

## 2. Storage & Persistence

- **User Preferences**: Persisted in browser `localStorage` using key `voxread_tts_settings_v1`. Schema migration handles missing `ttsProvider` and `rvcServerUrl` by applying default values.
- **Audio Files**: Audio is processed purely in-memory as `Blob` $\rightarrow$ `ObjectURL`. No audio files are written to the local disk during playback.
- **Backend Model Weights**: Reside in `python-backend/model/*.pth` and `python-backend/model/*.index`. Managed entirely on disk by the user.
