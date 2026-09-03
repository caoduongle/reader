# Data Model & Architecture Specification: Documentation & System Structure

**Feature Branch**: `004-architecture-docs-rewrite`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. Documentation Information Architecture

The VoxRead documentation architecture separates high-level system onboarding from deep technical domain guides:

```
reader/
├── README.md               # [PORTAL] System overview, Mermaid diagram, directory table, dual quickstart
├── docs/
│   └── rvc-voice-setup.md  # [DEEP GUIDE] Complete 100% original Vietnamese RVC & Colab training guide
└── specs/                  # [SPECIFICATIONS] Formal feature specifications and execution history
    ├── 001-rvc-tts-desktop/
    ├── 002-core-stability-fixes/
    ├── 003-cleanup-bundle-optimization/
    └── 004-architecture-docs-rewrite/
```

---

## 2. Core Entities & Content Models

### 2.1 Directory Entity Map (`DirectoryDescriptor`)

Models the top-level repository layout with exactly one concise line per directory:

| Directory | Type | 1-Line Role Description |
|---|---|---|
| `src/` | Frontend Source | Toàn bộ mã nguồn giao diện người dùng React 19, các components, hooks đọc sách, audio và tiện ích. |
| `electron/` | Desktop Host | Mã nguồn tiến trình chính (Main process) và Preload script quản lý cửa sổ desktop và tiến trình Python. |
| `python-backend/` | Microservice | Backend Python Flask chạy Edge-TTS và RVC local để nhân bản giọng đọc và suy luận âm thanh. |
| `public/` | Static Assets | Các tài nguyên tĩnh công khai (icon, logo, worker scripts) phục vụ ứng dụng web và desktop. |
| `specs/` | Feature Specs | Toàn bộ hồ sơ đặc tả kỹ thuật, kế hoạch triển khai (Spec-Kit) và checklist chất lượng của từng phiên bản. |
| `docs/` | Documentation | Tài liệu hướng dẫn chuyên sâu chi tiết (hướng dẫn train giọng RVC, quy chuẩn kiến trúc). |
| `model/` | Model Weights | Thư mục chứa trọng số mô hình RVC đã huấn luyện (`.pth` và `.index`). |
| `dist/` | Build Output | Sản phẩm đóng gói web production sau khi tối ưu bundle và code-splitting. |
| `dist-electron/` | Electron Build | Sản phẩm biên dịch tiến trình Electron main và preload. |
| `release/` | Desktop Release | Bộ cài đặt ứng dụng Windows desktop (`.exe` NSIS và portable). |

---

### 2.2 Onboarding Persona Tracks (`OnboardingTrack`)

Models the distinct user pathways in the "Bắt đầu nhanh" section:

```typescript
export interface OnboardingTrack {
  trackId: 'app-reader' | 'voice-rvc';
  title: string;
  targetAudience: string;
  prerequisites: string[];
  terminalCommands: string[];
  expectedOutcome: string;
  deepDiveDocPath?: string;
}
```

#### Track A: `app-reader`
- **Tiêu đề**: Dành cho người muốn chạy / phát triển app đọc sách VoxRead
- **Đối tượng**: Độc giả muốn trải nghiệm ứng dụng đọc sách hoặc lập trình viên phát triển giao diện web/desktop
- **Yêu cầu tiên quyết**: Node.js $\ge 18$, `npm`
- **Lệnh thực thi**:
  ```bash
  npm install
  npm run dev          # Chạy bản web tại http://localhost:3000
  npm run electron:dev # Hoặc chạy bản ứng dụng Desktop Windows
  ```
- **Kết quả**: Giao diện đọc sách VoxRead khởi động ngay lập tức, đọc văn bản bằng giọng Web Speech có sẵn của trình duyệt/hệ điều hành.

#### Track B: `voice-rvc`
- **Tiêu đề**: Dành cho người muốn cấu hình giọng đọc cá nhân (RVC)
- **Đối tượng**: Người dùng muốn tạo giọng đọc bằng AI từ chính giọng nói của mình
- **Yêu cầu tiên quyết**: Python 3.10+, PyTorch (hỗ trợ CUDA), file model RVC (`.pth` và `.index`)
- **Lệnh thực thi**:
  ```bash
  cd python-backend
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt
  python server.py
  ```
- **Kết quả**: Server RVC khởi động tại `http://localhost:8008`, ứng dụng VoxRead tự động phát hiện và kích hoạt giọng đọc cá nhân trong phần Cài đặt.
- **Tài liệu chi tiết**: `docs/rvc-voice-setup.md`

---

### 2.3 System Component Architecture (`SystemArchitectureNode`)

Models the functional layers depicted in the visual Mermaid diagram:

```
[Layer 1: User Interfaces]
 ├── VoxRead Desktop (Electron)
 ├── VoxRead Web (Browser)
 └── Legacy Chrome Extension

[Layer 2: Synthesis Providers]
 ├── Web Speech API (Native System Voice)
 ├── Local RVC Flask Server (:8008)
 │    ├── Edge-TTS (Vietnamese Base Audio)
 │    └── PyTorch RVC Inference (Timbre Transformation)
 └── Gemini 2.5 Audio API (Cloud Synthesis)

[Layer 3: Output & Presentation]
 ├── Continuous Audio Stream
 └── Reactive Sentence-by-Sentence Highlighting
```
