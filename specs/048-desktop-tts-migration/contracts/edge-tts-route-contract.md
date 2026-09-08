# Interface Contract: `POST /api/speak/edge` (server.js)

**Feature**: `048-desktop-tts-migration`
**Date**: 2026-09-08

---

## 1. Vị trí

Thêm vào `server.js`, cùng chỗ với `/api/generate` (bị xoá ở US5), `/api/fetch-url`, `/api/ocr` (giữ nguyên). Dùng chung `globalRateLimiter` đã áp cho `/api` (dòng `app.use('/api', globalRateLimiter)`), dùng chung `errorHandler` middleware sẵn có trong `server/middleware/`.

## 2. Request

```http
POST /api/speak/edge
Content-Type: application/json

{
  "text": "Xin chào, đây là VoxRead.",
  "voice": "vi-VN-HoaiMyNeural",
  "rate": "+0%",
  "pitch": "+0Hz",
  "volume": "+0%"
}
```

| Field | Type | Required | Ghi chú |
|---|---|---|---|
| `text` | string | ✅ | Văn bản cần đọc |
| `voice` | string | ❌ | Mặc định `vi-VN-HoaiMyNeural`; hỗ trợ mọi voice ID hợp lệ của Edge TTS |
| `rate` | string | ❌ | Định dạng SSML-style của Edge TTS, mặc định `+0%` |
| `pitch` | string | ❌ | Mặc định `+0Hz` |
| `volume` | string | ❌ | Mặc định `+0%` |

## 3. Response

- **200**: `Content-Type: audio/mpeg`, body là MP3 bytes.
- **400**: JSON `{ error: "..." }` khi `text` rỗng hoặc thiếu.
- **502**: JSON `{ error: "..." }` khi dịch vụ Edge TTS của Microsoft không phản hồi/lỗi mạng — map về thông báo dễ hiểu, không lộ stack trace thư viện.

## 4. Invariants

1. Route này **không** gọi tới `python-backend` (cổng 8008) trong bất kỳ trường hợp nào — 2 engine server-side độc lập hoàn toàn.
2. Route này **không** yêu cầu `GEMINI_API_KEY` — khác với `/api/ocr` và `/api/fetch-url` (fallback Gemini).
3. `GET /health` hiện có của `server.js` **không đổi** — vẫn chỉ báo `geminiConfigured`; không cần thêm field riêng cho Edge TTS vì route này không có khái niệm "model đã tải" (Edge TTS là dịch vụ cloud, không có trạng thái sẵn sàng cục bộ để báo cáo — chỉ có thể lỗi tại thời điểm gọi).
4. Middleware bảo mật (Helmet, CORS, rate limiter, `validate(schema)`) áp dụng giống hệt các route `/api/*` khác — không tạo pipeline riêng.

## 5. Phía client (`src/hooks/useTTS.ts`)

```typescript
// Khi engine === 'edge-tts'
const res = await fetch(`${edgeTtsProxyUrl}/api/speak/edge`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, voice }),
  signal: controller.signal,
});
```

Áp dụng đúng cơ chế timeout/retry/AbortController đã có trong `fetchServerSpeech` (kế thừa từ `fetchRVCSpeech` cũ, spec `047`) — không viết lại logic này riêng cho Edge TTS.
