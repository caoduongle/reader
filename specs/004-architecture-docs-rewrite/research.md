# Research: Architecture Documentation Rewrite & RVC Guide Extraction

**Feature**: `004-architecture-docs-rewrite`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## 1. Context & Motivation

The VoxRead repository has evolved significantly from its original inception:
1. **Initial Conception**: An audio companion server for a Chrome extension ("AI Đọc Truyện"), providing local RVC voice conversion via Edge-TTS and Google Colab-trained models.
2. **Current State**: A comprehensive, modern e-book reading application built on React 19, TypeScript 5.8, Tailwind CSS v4, and packaged for Windows desktop via Electron 44, featuring IndexedDB document persistence, offline-capable PDF/EPUB parsing, reading analytics dashboards, and an integrated Python backend microservice.

However, the root `README.md` still contained only the legacy Colab training tutorial for the Chrome extension, with zero explanation of the React application, desktop packaging, or modern architecture.

---

## 2. Server & Extension Relationship Analysis

A rigorous investigation into git history, source files, and packaging configurations confirms the following relationships:

### A. `python-backend/server.py` vs Root `server.py`
- **Identity**: Identical byte-for-byte in code, dependencies, and configuration.
- **Implementation**: Flask microservice on port `8008` integrating `edge-tts` and `rvc-python==0.1.5`.
- **Purpose**:
  - Root `server.py` was the original file created during extension development.
  - When desktop packaging was introduced (`specs/001-rvc-tts-desktop`), `python-backend/server.py` was created to serve as the packaged microservice (`electron/main.ts` line 56, `package.json` line 29).
  - Root `server.py` was an unmaintained duplicate and was removed in feature `003` to maintain a single source of truth.

### B. `local-voice-server/server.py` vs `python-backend/server.py`
- **Identity**: Completely different architectures and AI models sharing the same API contract (`POST http://localhost:8008/speak`).
- **Implementation**:
  - `local-voice-server/server.py`: FastAPI + Uvicorn server running `capleaf/viXTTS` (Coqui XTTS-v2). Synthesizes Vietnamese speech directly from a 10–30s `voice_sample.wav` without training a separate checkpoint.
  - `python-backend/server.py`: Flask server running a two-stage pipeline: Edge-TTS generates base Vietnamese speech, then a trained RVC model (`.pth` + `.index`) transforms the acoustic timbre into the target voice.
- **Rationale for Replacement**: RVC with Edge-TTS provides substantially lower inference latency ($< 1-2\text{s}$ per sentence vs $> 5-10\text{s}$ on viXTTS), superior Vietnamese prosody, and lower VRAM consumption on consumer hardware.

### C. `tts-extension/`
- **Implementation**: Manifest v3 Chrome extension with content scripts for DOM text extraction and floating audio playback.
- **Providers**: Connected to either Google Gemini TTS API (`gemini-2.5-flash-preview-tts`) or local server at `http://localhost:8008/speak`.
- **Status**: Replaced by the standalone VoxRead web and desktop reader.

---

## 3. Architecture Visualization via Mermaid

To ensure 100% compatibility with GitHub's native Mermaid renderer:
- Use standard `flowchart TD` orientation.
- Enclose all node labels containing punctuation, parentheses, or colons in double quotes: e.g., `id["Label (Details)"]`.
- Avoid raw HTML styling tags.
- Represent primary client flows and service pipelines with clear visual boundaries using `subgraph`.

### Draft Diagram
```mermaid
flowchart TD
    User([Người dùng]) --> UI{Giao diện tương tác}

    UI -->|Ứng dụng chính Web / Desktop| VR["VoxRead Client (React 19 + Electron 44)"]
    UI -.->|Tiện ích trình duyệt (Legacy)| EXT["Chrome Extension (AI Đọc Truyện)"]

    VR -->|Lựa chọn 1: Giọng trình duyệt| WS["Web Speech Synthesis API"]
    VR -->|Lựa chọn 2: Giọng RVC cá nhân| RVC_SRV["Local Python Backend (Flask :8008)"]

    EXT -.->|API đám mây| GEMINI["Google Gemini 2.5 TTS API"]
    EXT -.->|Local server| RVC_SRV

    subgraph RVC_Pipeline ["Pipeline Xử Lý Giọng RVC Local (:8008)"]
        RVC_SRV --> ET["1. Edge-TTS: Tạo audio nền tiếng Việt"]
        ET --> RVC["2. RVC PyTorch: Biến đổi âm sắc giọng"]
    end

    WS --> OUT([Phát âm thanh & Highlight câu đọc])
    RVC --> OUT
    GEMINI -.-> OUT
```

---

## 4. Documentation Structure Strategy

### Root `README.md`
- **Tone**: Professional, modern, welcoming.
- **Sections**:
  1. **Title & Badge Header**: VoxRead overview and core value proposition.
  2. **Kiến trúc tổng thể**: Mermaid diagram and component explanations.
  3. **Cấu trúc thư mục**: 1-line description per top-level folder.
  4. **Bắt đầu nhanh**:
     - **Nhóm 1 (Chạy app đọc sách)**: Node.js, `npm install`, `npm run dev`, `npm run electron:dev`.
     - **Nhóm 2 (Cài đặt giọng đọc riêng RVC)**: Python venv, model weights, `server.py`, link to full guide.
  5. **Ghi chú kiến trúc & Lịch sử**: Transparent explanation of backend servers and historical extension.

### `docs/rvc-voice-setup.md`
- **Integrity**: Exact, verbatim migration of the original 254-line Vietnamese RVC training guide from `README.md`.
- **Content**:
  - Dataset preparation rules (duration, clean speech, formats).
  - Audio enhancement tools (Adobe Podcast, Audacity, `resemble-enhance`, UVR5).
  - Official Applio Google Colab notebook workflow (No UI & UI).
  - Preprocess dataset, feature extraction (RMVPE), training parameters (epochs, batch size).
  - Exporting `.pth` and `.index` checkpoints.
  - Setting up the local Python virtual environment and configuring `server.py`.
- **Language**: Vietnamese (100% original text, no cuts or translations).
