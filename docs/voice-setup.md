# Cấu hình giọng đọc trong VoxRead

> Thay thế `docs/rvc-voice-setup.md` cũ (hướng dẫn huấn luyện giọng RVC qua Google
> Colab). Từ feature `048-desktop-tts-migration`, VoxRead không còn dùng RVC —
> xem [`specs/048-desktop-tts-migration/`](../specs/048-desktop-tts-migration/) để
> biết đầy đủ lý do và quá trình chuyển đổi.

VoxRead có 3 lựa chọn giọng đọc ngang hàng, chọn trong **Cài đặt** (`Alt+,`) → tab
**"Giọng đọc & Tốc độ"**.

## 1. Giọng máy (Web Speech API)

Chạy hoàn toàn trong trình duyệt/renderer, không cần cài đặt gì, không có tiến
trình backend nào tham gia. Chất lượng và số lượng giọng tiếng Việt có sẵn phụ
thuộc vào hệ điều hành — Windows mặc định có khá ít giọng Việt, đây là giới hạn
của bản thân Web Speech API chứ không phải điều VoxRead có thể khắc phục.

## 2. Microsoft Edge TTS

Gọi tới dịch vụ Read Aloud miễn phí của Microsoft qua `server.js` (route
`POST /api/speak/edge`). Cần kết nối Internet mỗi khi phát, không cần cài Python.
Chọn giọng trong dropdown (mặc định `vi-VN-HoaiMyNeural`).

Đây là dịch vụ miễn phí không chính thức của Microsoft (thông qua thư viện cộng
đồng `node-edge-tts`) — có thể ngừng hoạt động hoặc thay đổi mà không báo trước,
tương tự mọi tích hợp dựa trên API không chính thức khác.

## 3. VieNeu-TTS — giọng Việt chuyên biệt, chạy offline

Cần `python-backend/venv` đã được thiết lập (`scripts/setup.ps1`/`setup.sh`).
Lần đầu dùng, server sẽ tự tải model từ Hugging Face Hub (cần Internet một lần
duy nhất), sau đó chạy hoàn toàn offline.

### Nhân bản giọng của bạn (không cần huấn luyện)

Khác biệt lớn nhất so với RVC trước đây: **không có bước train**. Chỉ cần:

1. Chuẩn bị một đoạn ghi âm giọng nói rõ ràng, ít tạp âm, dài **3–8 giây**
   (`.wav`, `.mp3`, hoặc `.m4a`).
2. Trong Cài đặt, chọn engine **VieNeu-TTS** → mục **"Nhân bản giọng của tôi"**.
3. Đặt tên cho giọng, chọn file audio, bấm **"Nhân bản giọng"**.
4. Giọng mới xuất hiện ngay trong danh sách chọn — thường chỉ mất vài giây xử lý
   (trích xuất đặc trưng giọng nói), không phải vài chục phút đến vài giờ như
   quy trình train RVC qua Colab trước đây.

Giọng đã nhân bản được lưu tại `python-backend/voices/user_voices.json` (kèm
đặc trưng giọng nói đã trích xuất, không lưu lại file audio gốc). Bấm
**"Mở thư mục"** trong Cài đặt để xem trực tiếp. Muốn xoá một giọng đã nhân bản,
bấm **"Xoá"** cạnh tên giọng trong danh sách.

### Nếu VieNeu-TTS báo "chưa sẵn sàng"

- Lần đầu tiên dùng luôn cần Internet để tải model — kiểm tra kết nối rồi bấm
  **"Kiểm tra"** lại trong Cài đặt.
- Nếu server Python chưa chạy, mở terminal và chạy thủ công để xem log lỗi chi
  tiết:
  ```bash
  cd python-backend
  # Windows: venv\Scripts\activate | macOS/Linux: source venv/bin/activate
  python server.py
  ```

### Tăng tốc bằng GPU (tuỳ chọn, không bắt buộc)

Mặc định VieNeu-TTS chạy CPU qua ONNX Runtime, đủ nhanh cho việc đọc sách theo
thời gian thực. Nếu muốn tăng tốc thêm cho văn bản dài và có GPU NVIDIA:

```bash
cd python-backend
# kích hoạt venv trước
pip install "vieneu[cuda]"
```

Khác với RVC trước đây (yêu cầu PyTorch + đúng phiên bản CUDA để chạy được ở mức
chấp nhận được), đây hoàn toàn là một lựa chọn hiệu năng, không phải điều kiện
bắt buộc để tính năng hoạt động.
