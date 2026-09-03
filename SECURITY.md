# Chính Sách Bảo Mật (Security Policy) — VoxRead

Tài liệu này quy định các tiêu chuẩn an toàn, chính sách bảo mật thông tin và quản lý thông tin xác thực cho dự án VoxRead.

---

## 1. Chính Sách Lắng Nghe Dịch Vụ Cục Bộ (Localhost Binding Policy)

Ứng dụng VoxRead tích hợp các microservices cục bộ chạy trên máy tính người dùng:
- **Server RVC TTS local** (`python-backend/server.py` — cổng mặc định `8008`).
- **Server Proxy Gemini API** (`server.js` — cổng mặc định `3001`).

### ⚠️ Cảnh báo an toàn mạng:
1. **Chỉ lắng nghe trên Loopback (`127.0.0.1`)**:
   - Tất cả các server backend cục bộ **bắt buộc phải bind vào `127.0.0.1` (hoặc `localhost`)**.
   - **Tuyệt đối KHÔNG bind vào `0.0.0.0`**. Việc lắng nghe trên `0.0.0.0` sẽ phơi bày các cổng dịch vụ nội bộ ra toàn bộ mạng cục bộ (LAN, Wi-Fi công cộng) hoặc mạng Internet, tạo nguy cơ bị thiết bị khác gửi request độc hại hoặc truy cập tài nguyên máy tính của bạn.
2. **Không mở cổng Router / Port Forwarding**:
   - Không cấu hình port forwarding hay DMZ đối với cổng 8008 và 3001 trên modem/router cá nhân.

---

## 2. Quản Lý Thông Tin Xác Thực & GEMINI_API_KEY

Dự án có thể tương tác với Google Gemini AI thông qua API Key. Để đảm bảo an toàn tuyệt đối cho tài khoản và hạn mức sử dụng:

### Nguyên tắc bảo vệ khóa:
1. **Không bao giờ hardcode khóa**:
   - Tuyệt đối không dán trực tiếp giá trị API key vào mã nguồn giao diện (`src/`), mã Electron (`electron/`), hay bất kỳ file nào được theo dõi bởi Git.
2. **Không dùng tiền tố `VITE_` cho các bí mật**:
   - Vite sẽ tự động đóng gói (bundle) mọi biến môi trường có tiền tố `VITE_` vào các tệp JavaScript tĩnh công khai (`dist/assets/*.js`). Mọi người dùng đều có thể đọc được khóa này qua DevTools.
   - Luôn sử dụng biến môi trường tiêu chuẩn (`GEMINI_API_KEY`) trên môi trường Node.js / Express proxy (`server.js`).
3. **Sử dụng tệp `.env` cục bộ**:
   - Đặt API key trong tệp `.env` ở thư mục gốc (xem mẫu tại `.env.example`).
   - Tệp `.gitignore` của dự án đã được thiết lập để tự động bỏ qua mọi tệp `.env*` (trừ `.env.example`). Luôn kiểm tra `git status` trước khi commit để đảm bảo không đẩy nhầm file chứa thông tin nhạy cảm.

### Quy trình thu hồi và xoay vòng khóa (Revocation & Rotation):
Nếu bạn nghi ngờ `GEMINI_API_KEY` đã bị rò rỉ:
1. Truy cập ngay vào **[Google AI Studio API Keys](https://aistudio.google.com/apikey)**.
2. Tìm khóa đang nghi ngờ bị lộ và bấm biểu tượng **Delete** (Thùng rác) để vô hiệu hóa khóa ngay lập tức.
3. Tạo khóa mới bằng nút **Create API key**.
4. Cập nhật khóa mới vào file `.env` trên máy cá nhân:
   ```env
   GEMINI_API_KEY="AIzaSy_YOUR_NEW_KEY_HERE"
   ```
5. Khởi động lại Express proxy (`npm run proxy`).

---

## 3. Báo Cáo Lỗ Hổng Bảo Mật (Vulnerability Reporting)

Nếu bạn phát hiện bất kỳ vấn đề hoặc lỗ hổng bảo mật nào liên quan đến VoxRead:

1. **Không công khai lỗ hổng**:
   - Vui lòng **không** mở issue công khai trên GitHub để báo cáo các vấn đề bảo mật nghiêm trọng.
2. **Kênh tiếp nhận an toàn**:
   - Sử dụng tính năng **Private Vulnerability Reporting** trên tab **Security** của kho lưu trữ GitHub (nếu được bật).
   - Hoặc gửi thư điện tử trực tiếp tới quản trị viên dự án tại địa chỉ: `25020232@vnu.edu.vn` với tiêu đề `[SECURITY] Phát hiện lỗ hổng trên VoxRead`.
3. **Nội dung báo cáo**:
   - Mô tả chi tiết các bước tái hiện lỗi (Proof of Concept).
   - Đánh giá mức độ ảnh hưởng tiềm tàng.
   - Chúng tôi sẽ phản hồi trong vòng 48 giờ và phối hợp xử lý trước khi công bố bản vá.
