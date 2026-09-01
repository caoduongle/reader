# Đọc bằng giọng của bạn (viXTTS + WSL2) — Hướng dẫn cài đặt

Mục tiêu: chạy 1 server local trên máy bạn, dùng model **viXTTS** (clone giọng tiếng Việt từ ~10-30s mẫu), extension sẽ gọi vào server này thay vì Gemini.

Máy bạn: RTX 2050 (4GB VRAM) — **đủ mức tối thiểu**, nhưng cần đóng bớt ứng dụng trước khi chạy (RAM đang 94%, nên giải phóng còn dưới ~70% trước khi load model).

---

## Bước 1 — Cài WSL2 + Ubuntu

Mở **PowerShell (Run as Administrator)**, chạy:

```powershell
wsl --install -d Ubuntu-22.04
```

Khởi động lại máy nếu được yêu cầu. Sau khi cài xong, mở app **Ubuntu** từ Start Menu, tạo username/password cho Linux (chỉ dùng nội bộ, không liên quan Windows).

Kiểm tra GPU NVIDIA đã thấy được trong WSL2 chưa (không cần cài driver riêng trong WSL, dùng driver Windows luôn):

```bash
nvidia-smi
```

Nếu thấy thông tin RTX 2050 hiện ra → OK, driver GPU đã thông suốt vào WSL2. Nếu báo lỗi "command not found", cập nhật driver NVIDIA mới nhất trên Windows (từ trang chủ NVIDIA) rồi thử lại.

## Bước 2 — Cài Python + môi trường ảo (trong Ubuntu/WSL2)

```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip git ffmpeg

mkdir -p ~/vixtts-server && cd ~/vixtts-server
python3.11 -m venv venv
source venv/bin/activate
```

## Bước 3 — Cài PyTorch (bản CUDA) + các thư viện

```bash
pip install --upgrade pip
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install TTS==0.22.0 fastapi uvicorn python-multipart underthesea vinorm huggingface_hub
```

> Nếu bước cài `TTS` báo lỗi phiên bản, thử `pip install coqui-tts` (bản fork được duy trì) thay cho `TTS==0.22.0`.

## Bước 4 — Copy file server

Copy 2 file `server.py` và `requirements.txt` (mình đã tạo sẵn, tải ở phần dưới cuộc trò chuyện) vào `~/vixtts-server/`. Từ Windows, ổ đĩa Linux của WSL2 truy cập được qua đường dẫn `\\wsl$\Ubuntu-22.04\home\<username>\vixtts-server\` trong File Explorer — kéo thả file vào là được.

## Bước 5 — Thu âm giọng mẫu của bạn

- Ghi âm **10–30 giây** giọng nói rõ ràng, ít tạp âm (đọc 1 đoạn văn bình thường là đủ, không cần đọc kịch bản đặc biệt)
- Lưu file **WAV, 16-bit, mono**, đặt tên `voice_sample.wav`, để cùng thư mục `~/vixtts-server/`
- Mẹo: dùng app Voice Recorder trên điện thoại rồi AirDrop/gửi Zalo về máy, hoặc dùng Audacity ghi âm trực tiếp bằng mic laptop trong phòng yên tĩnh

## Bước 6 — Chạy server

```bash
cd ~/vixtts-server
source venv/bin/activate
python server.py
```

Lần đầu chạy sẽ tự tải model viXTTS (~2GB) từ Hugging Face, mất vài phút tùy mạng. Khi thấy dòng `Uvicorn running on http://0.0.0.0:8008`, server đã sẵn sàng.

WSL2 tự động forward cổng sang Windows, nên trên **Chrome ở Windows**, gọi `http://localhost:8008` là truy cập được server này bình thường — không cần cấu hình thêm.

## Bước 7 — Test nhanh (tùy chọn, trước khi gắn vào extension)

Mở terminal Windows (PowerShell) khác, chạy:

```powershell
curl -X POST http://localhost:8008/speak -H "Content-Type: application/json" -d "{\"text\": \"Xin chào, đây là giọng nói được nhân bản bằng AI.\"}" --output test.wav
```

Mở `test.wav` bằng Windows Media Player — nếu nghe ra giọng gần giống bạn (dù chưa hoàn hảo) là thành công.

---

## Xử lý sự cố thường gặp

| Lỗi | Cách khắc phục |
|---|---|
| `CUDA out of memory` | Đóng bớt ứng dụng dùng GPU khác trên Windows (trình duyệt nặng, game...); hoặc sửa `server.py` set `device = "cpu"` (chậm hơn nhiều nhưng vẫn chạy được) |
| `nvidia-smi` không nhận GPU trong WSL | Cập nhật driver NVIDIA trên Windows lên bản mới nhất, khởi động lại WSL bằng `wsl --shutdown` rồi mở lại |
| Giọng đọc bị vấp/ríu ở câu ngắn | Hạn chế đã biết của model — tránh câu dưới ~10 từ, extension đã tự gộp câu ngắn lại nên thường không gặp |
| Tải model rất chậm | Model tải từ Hugging Face (~2GB) — kiên nhẫn hoặc dùng mạng ổn định hơn ở lần chạy đầu |
