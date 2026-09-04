# VoxRead — Trình Đọc Sách Thông Minh với Giọng Đọc AI & RVC Local

[![CI](https://github.com/caoduongle/reader/actions/workflows/ci.yml/badge.svg)](https://github.com/caoduongle/reader/actions/workflows/ci.yml)

**VoxRead** là ứng dụng đọc sách điện tử (E-Reader) hiện đại hỗ trợ định dạng **TXT, EPUB, PDF** với khả năng tổng hợp giọng đọc Text-to-Speech (TTS) mượt mà. Ứng dụng kết hợp giữa giọng đọc Web Speech tự nhiên của hệ thống và công nghệ **nhân bản giọng nói AI (RVC — Retrieval-based Voice Conversion)** chạy cục bộ (offline) trên máy tính của bạn.

---

## 🏛️ Kiến trúc tổng thể hệ thống

Hệ thống hỗ trợ cả giao diện ứng dụng chính (Web & Windows Desktop) và tiện ích trình duyệt (Legacy Extension), kết nối linh hoạt tới các bộ tổng hợp giọng đọc:

```mermaid
flowchart TD
    User([👤 Người dùng]) --> UI{Lựa chọn giao diện}

    UI -->|Ứng dụng chính Web / Desktop| VR["📖 VoxRead (React 19 + Electron 44)"]
    UI -.->|Tiện ích mở rộng trình duyệt| EXT["🧩 Chrome Extension (AI Đọc Truyện)"]

    VR -->|Tùy chọn 1: Giọng hệ thống| WS["🔊 Web Speech Synthesis API"]
    VR -->|Tùy chọn 2: Giọng cá nhân RVC| RVC_SRV["🐍 Python Backend (Flask :8008)"]

    EXT -.->|API đám mây| GEMINI["☁️ Google Gemini 2.5 TTS API"]
    EXT -.->|Server local| RVC_SRV

    subgraph RVC_Pipeline ["Pipeline Xử Lý Giọng RVC Cục Bộ (:8008)"]
        RVC_SRV --> ET["1. Edge-TTS: Tạo âm thanh nền tiếng Việt (MP3)"]
        ET --> RVC["2. RVC PyTorch: Biến đổi âm sắc giọng theo checkpoint (.pth / .index)"]
    end

    WS --> OUT([🎧 Âm thanh đọc sách & Highlight câu đồng bộ])
    RVC --> OUT
    GEMINI -.-> OUT
```

---

## 📁 Cấu trúc thư mục dự án

| Thư mục           | Vai trò & Trách nhiệm (1 dòng)                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/`            | Toàn bộ mã nguồn giao diện người dùng React 19, các components, hooks đọc sách, audio và tiện ích lưu trữ.      |
| `electron/`       | Mã nguồn tiến trình chính (Main process) và Preload script quản lý cửa sổ desktop và tiến trình Python backend. |
| `python-backend/` | Microservice Python Flask chạy Edge-TTS và RVC local để nhân bản giọng đọc và suy luận âm thanh.                |
| `public/`         | Tài nguyên tĩnh công khai (icon, logo, mẫu truyện) phục vụ ứng dụng web và desktop.                             |
| `specs/`          | Hồ sơ đặc tả kỹ thuật, kế hoạch triển khai (Spec-Kit) và checklist chất lượng kiểm thử của từng phiên bản.      |
| `docs/`           | Tài liệu hướng dẫn chuyên sâu chi tiết (hướng dẫn huấn luyện giọng RVC, quy chuẩn kiến trúc).                   |
| `model/`          | Thư mục quy ước chứa trọng số mô hình RVC đã huấn luyện (`.pth` và `.index`).                                   |
| `dist/`           | Sản phẩm đóng gói web production sau khi tối ưu hóa dung lượng (bundle code-splitting).                         |
| `dist-electron/`  | Sản phẩm biên dịch tiến trình Electron main và preload (`.cjs`).                                                |
| `release/`        | Bộ cài đặt ứng dụng Windows desktop (`.exe` NSIS và bản portable).                                              |

---

## 🚀 Bắt đầu nhanh (Quickstart)

### ⚡ Thiết lập môi trường tự động 1 lệnh (Khuyến nghị)

Dự án cung cấp sẵn script tự động kiểm tra phiên bản Node.js & Python, cài đặt dependencies JavaScript (`npm install`), và cấu hình môi trường ảo Python virtualenv cho backend:

- **Trên Windows (PowerShell)**:

  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
  ```

  _(Hoặc chạy `.\scripts\setup.ps1` nếu bạn đã mở sẵn terminal PowerShell)_.

  > [!NOTE]
  > **Không cần Visual C++ Build Tools trên Windows**: `fairseq` được đóng gói sẵn dạng wheel trong `python-backend/wheels/` để tránh yêu cầu Visual C++ Build Tools khi cài lại — nếu đổi phiên bản Python, cần build lại wheel theo hướng dẫn trong [`python-backend/wheels/README.md`](python-backend/wheels/README.md).

- **Trên macOS / Linux (Bash)**:
  ```bash
  chmod +x scripts/setup.sh
  ./scripts/setup.sh
  ```

---

### 📖 Khởi động ứng dụng

Sau khi chạy script thiết lập xong, bạn có thể khởi động ngay:

- **Chạy bản Web** (mở tại `http://localhost:3000`):
  ```bash
  npm run dev
  ```
- **Chạy bản Desktop Windows (Electron)**:
  ```bash
  npm run electron:dev
  ```
- **Đóng gói bộ cài đặt Desktop (.exe)**:
  ```bash
  npm run electron:build
  ```

---

### 🧪 Chạy Kiểm Thử Tự Động (Testing)

Dự án trang bị hệ thống kiểm thử tự động hai đầu:

1. **Frontend Tests (Vitest & React Testing Library)**:
   ```bash
   # Chạy toàn bộ unit & component tests một lần
   npm test

   # Chạy ở chế độ theo dõi (watch mode)
   npm run test:watch
   ```

2. **Backend Tests (Pytest)**:
   - **Windows**:
     ```powershell
     python-backend\venv\Scripts\python.exe -m pytest python-backend\tests
     ```
   - **macOS / Linux**:
     ```bash
     python-backend/venv/bin/pytest python-backend/tests
     ```

---

### 🚀 Tự Động Hóa CI/CD (GitHub Actions)

Dự án thiết lập 2 luồng workflow chuyên biệt:

1. **Continuous Integration ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))**:
   - **Kích hoạt**: Tự động chạy khi có `push` hoặc `pull_request` vào nhánh `main`.
   - **Cơ chế**: Chạy song song 2 job trên `ubuntu-latest`:
     - **`frontend`**: Cài đặt bằng `npm ci`, tuần tự kiểm tra `typecheck` $\rightarrow$ `lint` $\rightarrow$ `test` $\rightarrow$ `build` (dừng ngay lập tức nếu bước nào thất bại).
     - **`backend`**: Cài đặt dependencies Python 3.10 và chạy `pytest`.
2. **Đóng gói Desktop Installer ([`.github/workflows/build-electron.yml`](.github/workflows/build-electron.yml))**:
   - **Kích hoạt**: Chạy thủ công trên giao diện GitHub (`workflow_dispatch`) hoặc tự động kích hoạt khi đẩy git tag phiên bản release (ví dụ: `v1.0.0`).
   - **Cơ chế**: Chạy trên `windows-latest` để đóng gói tệp cài đặt `.exe` bằng `electron-builder` và tải artifact lên GitHub.

---

### 🎙️ Cấu hình giọng đọc cá nhân RVC (Tùy chọn)

Dành cho người muốn đọc sách bằng chính giọng AI của bản thân:

1. **Đặt file model**:
   - Copy 2 file `.pth` và `.index` vào thư mục `python-backend/model/`.
2. **Khởi chạy server RVC**:
   - Chạy lệnh:
     ```bash
     cd python-backend
     venv\Scripts\activate
     python server.py
     ```
   - Server lắng nghe tại `http://localhost:8008`. Mở VoxRead $\rightarrow$ vào **Cài đặt** $\rightarrow$ chọn nguồn giọng **"Giọng của tôi (Local RVC)"** để bắt đầu nghe.

> 📖 **Hướng dẫn chi tiết toàn tập về RVC**:  
> Xem toàn bộ hướng dẫn chuẩn bị dataset, khử ồn audio, và các bước huấn luyện model miễn phí trên Google Colab tại:  
> 👉 **[Tài liệu hướng dẫn huấn luyện & cài đặt RVC chi tiết (docs/rvc-voice-setup.md)](docs/rvc-voice-setup.md)**.

---

## 🔍 Ghi chú kiến trúc: Phân tích & Lịch sử các Server

Trong quá trình phát triển dự án, mã nguồn có sự chuyển dịch kiến trúc quan trọng giữa các phiên bản backend:

### 1. `python-backend/server.py` vs `server.py` (root cũ)

- **Bản chất**: Cùng một mã nguồn 100%. Cả hai đều viết bằng **Flask**, sử dụng pipeline `Edge-TTS` + `rvc-python`, lắng nghe tại cổng `8008`.
- **Nguyên nhân**: Ban đầu `server.py` đặt ở thư mục gốc phục vụ cho Chrome extension. Khi dự án phát triển bản Desktop Electron, file được copy vào `python-backend/server.py` để tiện quản lý tiến trình và đóng gói vào installer (`electron/main.ts` dòng 56 và `package.json` dòng 29 trỏ trực tiếp tới `python-backend/server.py`). Bản ở gốc repo là bản trùng lặp thừa và đã được dọn dẹp.

### 2. `local-voice-server/` vs `python-backend/server.py`

- **Bản chất**: **Hai server hoàn toàn khác nhau về công nghệ và mô hình AI**, nhưng dùng chung một giao thức gọi `POST http://localhost:8008/speak`:
  - `local-voice-server/server.py`: Viết bằng **FastAPI + Uvicorn**, dùng mô hình **viXTTS (XTTS-v2)** để clone giọng zero-shot trực tiếp từ một đoạn ghi âm `voice_sample.wav` 10–30s (không cần huấn luyện model riêng).
  - `python-backend/server.py`: Viết bằng **Flask**, dùng **Edge-TTS + RVC** (`rvc-python`). Tạo giọng nền tiếng Việt chuẩn tốc độ cao qua Edge-TTS rồi dùng RVC biến đổi âm sắc theo checkpoint `.pth`.
- **Lý do chuyển đổi**: viXTTS đòi hỏi cấu hình máy rất nặng (~2GB model, ngốn nhiều VRAM và tốc độ đọc chậm hơn trên CPU/GPU phổ thông). Pipeline Edge-TTS + RVC cho tốc độ suy luận nhanh hơn gấp nhiều lần, ngữ điệu tiếng Việt tự nhiên hơn và nhẹ hơn cho người dùng cuối.

---

## 📌 Hạng mục cần quyết định (Dành cho chủ Repository)

1. **Định hướng tiện ích Chrome Extension (`tts-extension`)**:
   - Hiện tại VoxRead đã phát triển thành ứng dụng độc lập hoàn chỉnh trên Web và Desktop (Electron) với khả năng import tệp TXT/PDF/EPUB và quản lý tiến trình đọc sách.
   - Tiện ích mở rộng Chrome extension cũ là một luồng đọc độc lập trực tiếp trên trang web. Cần quyết định duy trì nó thành một repo phụ riêng biệt hay tích hợp sâu vào hệ sinh thái VoxRead.
2. **Lựa chọn công nghệ Voice Cloning**:
   - Kiến trúc hiện tại ưu tiên **Edge-TTS + RVC** (`python-backend/server.py`) vì tốc độ và độ ổn định.
   - Thư mục `local-voice-server` (viXTTS zero-shot) có thể được lưu trữ tại nhánh thử nghiệm (`experiments/vixtts`) nếu muốn tiếp tục nghiên cứu phương án clone giọng tức thì không cần train model.
