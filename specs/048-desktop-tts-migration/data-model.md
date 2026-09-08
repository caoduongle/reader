# Data Model: Loại bỏ RVC, chuyển sang VieNeu-TTS/Edge TTS/Web Speech

**Feature**: `048-desktop-tts-migration`
**Date**: 2026-09-08

---

## 1. `TTSProvider` (thay đổi)

| Trước | Sau |
|---|---|
| `'browser' \| 'rvc-local'` | `'browser' \| 'edge-tts' \| 'vieneu-tts'` |

## 2. `TTSSettings` (thay đổi field)

| Field | Trước | Sau | Ghi chú |
|---|---|---|---|
| `ttsProvider` | `TTSProvider` (2 giá trị) | `TTSProvider` (3 giá trị) | Migration: `'rvc-local'` cũ → fallback `'browser'` |
| `rvcServerUrl` | `string` (mặc định `http://localhost:8008`) | **Xoá** | Thay bằng 2 field dưới |
| `edgeTtsProxyUrl` | — | `string` (mặc định `http://localhost:3001`) | Trỏ vào `server.js` |
| `vieneuServerUrl` | — | `string` (mặc định `http://localhost:8008`) | Trỏ vào `python-backend` |

## 3. `TTSServerStatus` (đổi tên từ `RVCServerStatus`, dùng chung cho 2 backend)

```typescript
type TTSServerStatus =
  | 'checking'
  | 'connected'
  | 'no-model'        // VieNeu: model chưa tải xong lần đầu
  | 'model_missing'
  | 'unreachable';
```

Trạng thái này được health-check độc lập theo backend đang được engine hiện tại sử dụng — không còn poll cả 2 backend cùng lúc nếu người dùng chỉ dùng 1 engine.

## 4. `VoiceCloneImportResult` (đổi tên từ `ModelImportResult`)

```typescript
interface VoiceCloneImportResult {
  success: boolean;
  voiceName?: string;   // tên giọng vừa nhân bản, hiển thị trong danh sách chọn
  error?: string;
}
```

## 5. `VoiceCloneBridge` (đổi tên từ `DesktopModelsBridge`, expose qua `electron/preload.ts`)

```typescript
interface VoiceCloneBridge {
  pickReferenceClip: () => Promise<string | null>;   // mở dialog chọn .wav/.mp3/.m4a
  addVoice: (name: string, clipPath: string) => Promise<VoiceCloneImportResult>;
  openVoicesFolder: () => Promise<void>;
}
```

## 6. Vòng đời request `POST /speak` / `POST /api/speak/edge` theo engine

```text
                     [Người dùng bấm phát 1 câu]
                                │
                    ┌───────────┴───────────┐
              engine = 'browser'      engine ≠ 'browser'
                    │                       │
                    ▼                       ▼
         speechSynthesis.speak()    fetchServerSpeech(text, engine, voice)
         (0 network request)                │
                    │              ┌─────────┴─────────┐
                    │        engine='edge-tts'   engine='vieneu-tts'
                    │              │                     │
                    │              ▼                     ▼
                    │   POST {edgeTtsProxyUrl}/   POST {vieneuServerUrl}/speak
                    │      api/speak/edge          (python-backend, cổng 8008)
                    │   (server.js, cổng 3001)            │
                    │              │                     │
                    │              ▼                     ▼
                    │      audio/mpeg (MP3)         audio/wav (WAV)
                    │              │                     │
                    └──────────────┴──────────┬──────────┘
                                               ▼
                                  [Phát qua HTMLAudioElement,
                                   cache theo Map<index, blobUrl>,
                                   prefetch N+1/N+2 — không đổi]
```

## 7. Route `POST /voices/add` (mới, `python-backend`) — thay thế khái niệm "import model RVC"

| Trước (RVC) | Sau (VieNeu) |
|---|---|
| Người dùng train model trên Colab (hàng chục phút - hàng giờ) | Người dùng ghi/chọn 1 clip audio 3-8 giây |
| Tải `.pth` + `.index` về máy | Không cần tải gì thêm |
| Copy vào `python-backend/model/`, app tự dò (`discover_model_paths`) | Gọi `POST /voices/add` (multipart audio), backend gọi `vieneu.add_voice()` + `save_voices()` |
| Chọn model trong danh sách dò được | Chọn giọng mới trong danh sách (xuất hiện ngay, không cần khởi động lại) |
