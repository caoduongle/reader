# Data Model: RVC Device Auto-Detection & Speech Error Visibility

**Feature**: `028-rvc-device-error-handling`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)  

---

## 1. Type Entities & Status Enums

### 1.1 RVCServerStatus & VoiceServerConnectionStatus

Represents the 5 primary connection and initialization states of the local Python RVC backend:

```typescript
export type RVCServerStatus =
  | 'unknown'
  | 'checking'
  | 'connected'
  | 'no-model'
  | 'model_missing'
  | 'unreachable';

export type VoiceServerConnectionStatus =
  | 'checking'
  | 'connected'
  | 'no-model'
  | 'model_missing'
  | 'unreachable';
```

#### State Definitions & Transitions

| State | Definition | Trigger / Source | Visual Indicator |
|:---|:---|:---|:---|
| `'unknown'` | Initial uninitialized state before first poll | Component initialization | None / Neutral |
| `'checking'` | Health request in-flight | Initiated by hook timer or user "Kiểm tra" click | Amber pulsing dot |
| `'connected'` | Server online, model weights verified and loaded in memory | `GET /health` returns `ok: true` AND `model_loaded: true` | Emerald green dot (`bg-emerald-500`) |
| `'no-model'` / `'model_missing'` | Server online and reachable, but weights are missing or failed to initialize | `GET /health` returns `model_loaded: false` | Amber dot (`bg-amber-500`) + amber alert banner with detailed message |
| `'unreachable'` | Server process offline, port closed, or network error | `fetch('/health')` throws NetworkError / AbortError / HTTP 502 | Rose red dot (`bg-rose-500`) + rose alert banner |

---

## 2. API Response Payloads

### 2.1 HealthResponse (`GET /health`)

```typescript
export interface HealthResponse {
  ok: boolean;
  model_loaded: boolean;
  reason?: 'model_missing' | 'model_init_failed' | string;
  error?: string | null;
  model_dir?: string;
  model_name?: string | null;
  index_name?: string | null;
}
```

- **Validation Rules**:
  - `model_loaded`: Boolean flag strictly indicating whether `rvc` instance is initialized.
  - `error`: Present when `model_loaded === false` and an initialization exception occurred, or when weights are missing.
  - `model_name`: Filename of the loaded `.pth` checkpoint, or `null` if not loaded.

### 2.2 SpeechErrorResponse (`POST /speak` 4xx/5xx)

```typescript
export interface SpeechErrorResponse {
  error: string;
}
```

- **Validation Rules**:
  - `error`: Human-readable Vietnamese explanation of why speech generation failed (e.g. model missing, text empty, or inference error).

---

## 3. Hook State & Component Props

### 3.1 UseVoiceServerStatusReturn

```typescript
export interface UseVoiceServerStatusReturn {
  status: VoiceServerConnectionStatus;
  isChecking: boolean;
  errorMessage: string | null;
  modelDir: string | null;
  modelName: string | null;
  checkHealth: () => Promise<boolean>;
  reloadModel: () => Promise<boolean>;
}
```

### 3.2 SettingsModalProps (Updated destructuring)

```typescript
export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TTSSettings;
  voices: TTSVoiceOption[];
  rvcServerStatus?: RVCServerStatus;
  serverErrorMessage?: string | null;
  onCheckRVCHealth?: (url?: string) => Promise<boolean>;
  onSaveSettings: (newSettings: TTSSettings) => void;
  onTestVoice: (voiceURI: string, rate: number, pitch: number, volume: number) => void;
}
```

- **Update**: `serverErrorMessage` is now actively destructured and rendered in the banner UI when non-null.
