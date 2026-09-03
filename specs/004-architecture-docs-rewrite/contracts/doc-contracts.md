# Documentation Schema & Structural Contract

**Feature**: `004-architecture-docs-rewrite`  
**Date**: 2026-09-03  

---

## 1. Root `README.md` Contract

The root `README.md` must adhere to the following section schema:

1. **Header / Project Identity**:
   - Project Name: **VoxRead**
   - Value Proposition: Desktop & Web AI E-Reader with Personalized Voice Cloning.
2. **Kiến trúc tổng thể (Architecture Overview)**:
   - Valid GitHub Mermaid diagram (`flowchart TD`).
   - Detailed component descriptions: UI clients, synthesis engines, local storage.
3. **Cấu trúc thư mục (Directory Structure)**:
   - Markdown table covering all top-level directories: `src/`, `electron/`, `python-backend/`, `public/`, `specs/`, `docs/`, `model/`, `dist/`, `dist-electron/`, `release/`.
   - Exactly 1 concise line of Vietnamese description per directory.
4. **Bắt đầu nhanh (Quickstart)**:
   - **Track A**: Chạy ứng dụng đọc sách (Node.js, npm commands).
   - **Track B**: Cấu hình giọng đọc RVC riêng (Python, model placement, commands).
   - Prominent link to `docs/rvc-voice-setup.md`.
5. **Ghi chú kiến trúc & Quyết định kỹ thuật (Architecture Notes)**:
   - Technical analysis of `python-backend/server.py` vs root `server.py` vs `local-voice-server/` vs `tts-extension/`.
   - Open architectural decisions for repo owner.

---

## 2. `docs/rvc-voice-setup.md` Contract

The extracted document must preserve 100% of original Vietnamese text with exact fidelity:

- **Original Title**: `# Hướng dẫn huấn luyện & cài đặt mô hình giọng nói RVC`
- **Section A**: Train giọng nói trên Google Colab (Applio, dataset, preprocessing, resemble-enhance, feature extraction, export).
- **Section B**: Cài đặt & chạy server local trên máy tính (Python environment, PyTorch, model placement, parameters, CUDA).
- **Section C**: Kết nối giọng đọc vào ứng dụng VoxRead.
- **Troubleshooting**: Lọc ồn, format file WAV, xử lý lỗi CUDA out-of-memory.

---

## 3. GitHub Mermaid Compatibility Constraints

- Graph type: `flowchart TD`.
- Node identifiers: Alphanumeric without spaces (`VR`, `RVC_SRV`, etc.).
- Label strings: Must be surrounded by double quotes whenever containing punctuation or parentheses (e.g. `["Label (Info)"]`).
- Zero raw HTML tags in labels.
