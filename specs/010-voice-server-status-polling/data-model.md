# Data Model: Voice Server Connection State Machine

**Feature Branch**: `010-voice-server-status-polling`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. Connection State Machine

```
              ┌───────────────────────────┐
              │ enabled == false          │
              │ (provider == 'browser'    │
              │  or modal is closed)      │
              └─────────────┬─────────────┘
                            │ enabled = true
                            ▼
                    ┌───────────────┐
                    │   checking    │◄────────┐
                    └───────┬───────┘         │
                            │                 │ interval 6s
              ┌─────────────┴─────────────┐   │
   GET /health ok: true        GET /health fails
              ▼                           ▼   │
       ┌─────────────┐             ┌──────────┴────┐
       │  connected  │             │  unreachable  │
       └─────────────┘             └───────────────┘
```

---

## 2. Hook API & Types

```typescript
export type VoiceServerConnectionStatus = 'checking' | 'connected' | 'unreachable';

export interface UseVoiceServerStatusOptions {
  serverUrl: string;
  enabled: boolean;
  intervalMs?: number; // Defaults to 6000
}

export interface UseVoiceServerStatusReturn {
  status: VoiceServerConnectionStatus;
  isChecking: boolean;
  errorMessage: string | null;
  checkHealth: () => Promise<boolean>;
}
```
