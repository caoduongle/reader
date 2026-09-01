# AI Đọc Truyện — Gemini TTS Reader (Chrome Extension)

Đọc to nội dung bất kỳ trang web nào bằng giọng AI của **Gemini TTS** (Google AI Studio), với trình phát nổi (floating player) giống các trang đọc truyện: play/pause, next/prev, cài đặt giọng đọc + tốc độ, highlight đoạn đang đọc.

## 1. Lấy Gemini API Key (miễn phí)

1. Vào https://aistudio.google.com/apikey
2. Đăng nhập bằng tài khoản Google → **Create API key**
3. Copy key (dạng `AIza...`)

## 2. Cài extension vào Chrome

1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. Bấm **Load unpacked** → chọn thư mục `tts-extension` này
4. Icon extension sẽ xuất hiện trên thanh công cụ

## 3. Sử dụng

1. Bấm icon extension → dán **API key** vào ô, chọn giọng đọc + tốc độ → **Lưu cài đặt**
2. Mở trang bạn muốn nghe (báo, truyện, blog...) — nếu muốn chỉ đọc một đoạn, **bôi đen (select)** đoạn đó trước
3. Bấm icon extension → **▶ Bắt đầu đọc trang này**
4. Trình phát nổi xuất hiện góc dưới màn hình:
   - ⏮ / ⏭ : đoạn trước / sau
   - ▶ / ⏸ : phát / tạm dừng
   - ⚙ : mở bảng cài đặt giọng đọc & tốc độ
   - ✕ : đóng trình phát
   - Kéo thả (drag) để di chuyển vị trí

## Cách hoạt động (kỹ thuật)

- `content.js` quét các thẻ `<p>` / `article` / `.content` trên trang theo thứ tự xuất hiện để tạo hàng đợi văn bản cần đọc (hoặc dùng đúng đoạn bạn đang bôi đen, nếu có).
- Mỗi đoạn được gửi qua `background.js` (service worker) tới **Gemini TTS API** (`gemini-2.5-flash-preview-tts`), API trả về audio PCM 16-bit/24kHz.
- Extension chuyển PCM → WAV ngay trong trình duyệt để phát bằng thẻ `<audio>` chuẩn, đồng thời highlight đoạn văn bản tương ứng.
- Toàn bộ cấu hình (API key, giọng, tốc độ) lưu trong `chrome.storage.sync`.

## Có thể mở rộng thêm (gợi ý cho AI Riser Vietnam)

- Cache audio đã tạo (theo hash đoạn văn) để tránh gọi lại API khi đọc lại
- Thêm nút "tải xuống mp3" của cả chương/bài viết
- Dùng Gemini để tóm tắt trang trước khi đọc (dành cho bài dài)
- Audio tags của Gemini TTS (`[whispers]`, `[cheerfully]`...) để đọc biểu cảm hơn theo ngữ cảnh (vd: đoạn hội thoại)
- Thêm chế độ "đọc cả trang tự động cuộn" (auto-scroll theo đoạn đang đọc)

## Giới hạn hiện tại

- Model TTS của Gemini hiện là bản preview, có giới hạn quota miễn phí theo phút/ngày — nếu gặp lỗi 429, đợi một chút hoặc giảm tần suất.
- Nhận diện "nội dung chính" của trang bằng heuristic đơn giản (thẻ `<p>` dài > 25 ký tự) — với các trang có cấu trúc lạ có thể cần tinh chỉnh selector trong `collectReadableBlocks()`.
