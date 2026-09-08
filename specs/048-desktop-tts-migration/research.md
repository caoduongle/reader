# Research: Loại bỏ RVC, chuyển sang VieNeu-TTS/Edge TTS/Web Speech

**Feature**: `048-desktop-tts-migration`
**Date**: 2026-09-08

---

## 1. VieNeu-TTS — engine thay thế RVC

### Decision

Dùng thư viện Python `vieneu` (repo [pnnbao97/VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS), Apache-2.0) làm engine giọng Việt local, thay hoàn toàn RVC.

### Rationale

- **Không cần train**: nhân bản giọng tức thì chỉ từ 3-8 giây audio mẫu (`vieneu.add_voice()`), khác biệt lớn nhất so với RVC (bắt buộc train qua Google Colab, tốn hàng chục phút tới hàng giờ, cần chuẩn bị dataset).
- **Nhẹ hơn nhiều**: bản mặc định (v3 Turbo) chạy CPU qua ONNX Runtime, không cần PyTorch — loại bỏ toàn bộ gánh nặng `fairseq` (vendor wheel chỉ chạy Windows `win_amd64`, phải build lại bằng Visual C++ mỗi khi đổi Python) và PyTorch (~700MB-2GB) từng khiến installer nặng 500MB-1.5GB.
- Chuyên biệt tiếng Việt (train từ 10.000+ giờ dữ liệu song ngữ), 23 giọng dựng sẵn 3 miền, 48kHz.
- License Apache-2.0 cho engine gốc — dùng thoải mái kể cả thương mại. *(Lưu ý: voice pack cộng đồng fine-tune riêng trên HuggingFace có thể có license khác, vd `cc-by-nc-4.0` — không áp dụng cho giọng dựng sẵn hoặc giọng người dùng tự nhân bản.)*

### Alternatives Considered

- **Giữ RVC, chỉ vá lỗi tiếp**: bị loại vì đây chính là gốc rễ của 7+ spec vá lỗi trong lịch sử (`022`, `023`, `027`, `028`, `031`, `032`, `039`, `046`, `047`) — vấn đề mang tính cấu trúc (phụ thuộc bên thứ 3 không còn bảo trì tốt), không phải lỗi từng dòng code.
- **Coqui TTS / XTTS**: cân nhắc nhưng không chuyên biệt tiếng Việt bằng VieNeu, và nặng hơn (yêu cầu PyTorch mặc định).
- **v4 của VieNeu (API-only, chất lượng cao nhất)**: loại khỏi phạm vi vì không chạy offline/local — trái với tinh thần desktop app.

### Rủi ro cần kiểm chứng khi code thật

- Phiên bản Python chính xác `vieneu` hỗ trợ (repo gốc có `.python-version` riêng) — không giả định giữ nguyên Python 3.10 hiện tại của `python-backend`.
- Chữ ký chính xác `Vieneu.save()` khi ghi ra buffer (BytesIO) thay vì path file.
- Tính an toàn luồng khi gọi `infer()` đồng thời (kiến trúc prefetch N+1/N+2 hiện tại gửi request song song) — có thể cần `threading.Lock()` tương tự RVC cũ.
- Model weight tải từ Hugging Face Hub ở lần chạy đầu, cần Internet ít nhất 1 lần.

---

## 2. Vị trí xử lý Microsoft Edge TTS: Node (`server.js`) thay vì Python

### Decision

Chuyển Edge TTS ra khỏi `python-backend`, thêm route mới trong `server.js` (Node/Express) dùng một package JS (vd `node-edge-tts`).

### Rationale

- `server.js` **đã bắt buộc chạy toàn thời gian** vì phục vụ OCR màn hình + đọc từ URL (giữ nguyên theo quyết định chủ dự án, xem spec.md User Story không đổi) — thêm route Edge TTS vào đó không sinh thêm tiến trình nào, gần như miễn phí về vận hành.
- `server.js` đã có `GET /health` (dòng 101) mà `electron/main.ts` đã poll qua `PROXY_HEALTH_URL` — tái dùng nguyên, không cần viết cơ chế health-check mới.
- Hệ quả: `python-backend` chỉ còn phục vụ đúng VieNeu-TTS, `requirements.txt` gọn lại chỉ còn `flask` + `vieneu`.
- Nhiều package Node port của Edge TTS tồn tại và được cộng đồng dùng (`node-edge-tts`, `@andresaya/edge-tts`, `edge-tts-node`, `@travisvn/edge-tts`) — một số hỗ trợ `rate`/`pitch`/`volume` trực tiếp trong API, tiện hơn cả bản Python (không cần xử lý SSML thủ công).

### Alternatives Considered

- **Giữ Edge TTS trong Python, chỉ bỏ bước RVC**: đơn giản hơn về số dòng thay đổi, nhưng khiến Python vẫn là phụ thuộc bắt buộc cho một engine (Edge TTS) mà về bản chất không cần Python — bị loại vì không tận dụng được lợi thế "server.js đã chạy sẵn".
- **Spawn Python theo yêu cầu (on-demand) chỉ khi chọn VieNeu-TTS**: bị loại cho phạm vi này — bản thân model VieNeu đã lazy-load *bên trong* tiến trình Flask (Vieneu() chỉ khởi tạo khi có request đầu tiên), nên một tiến trình Flask "rỗng" chỉ tốn vài chục MB RAM; không đáng đánh đổi với độ phức tạp quản lý vòng đời tiến trình theo yêu cầu (loading state, xử lý lỗi khởi động giữa chừng).

---

## 3. Xử lý dữ liệu `localStorage` cũ của người dùng hiện tại

### Decision

Khi đọc `TTSSettings` từ `localStorage`, nếu gặp `ttsProvider === 'rvc-local'` (giá trị không còn hợp lệ trong enum mới) → tự động fallback về `'browser'`.

### Rationale

- Người dùng đã cài bản cũ (trước migration) có thể có `ttsProvider: 'rvc-local'` lưu sẵn — nếu không xử lý, ứng dụng sẽ cố gọi route/engine không còn tồn tại, gây lỗi khó hiểu ngay lần mở app đầu tiên sau khi cập nhật.
- Fallback về `'browser'` (Web Speech) vì đây là engine luôn hoạt động, không cần setup — trải nghiệm an toàn nhất cho người dùng chưa kịp chọn lại engine mới.
- Không cần migration dữ liệu phức tạp (vd tự động chuyển sang `'edge-tts'`) vì đây là thay đổi có chủ đích, không phải nâng cấp tương thích ngược hoàn toàn.

### Alternatives Considered

- **Tự động map `'rvc-local'` → `'vieneu-tts'`**: bị loại vì `vieneu-tts` cần backend Python sẵn sàng, có thể chưa cài đúng phiên bản mới — rủi ro crash cao hơn so với fallback về `'browser'`.
