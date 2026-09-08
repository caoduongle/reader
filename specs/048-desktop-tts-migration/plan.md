# Implementation Plan: Loại bỏ RVC, chuyển sang VieNeu-TTS/Edge TTS/Web Speech & tái tập trung Desktop-only

**Branch**: `048-desktop-tts-migration` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/048-desktop-tts-migration/spec.md`

---

## Summary

Loại bỏ toàn bộ pipeline RVC (`rvc-python`, `fairseq`, monkey-patch PyTorch, quy trình train qua Colab) khỏi `python-backend/`. Thay bằng **VieNeu-TTS** (thư viện `vieneu`, nhân bản giọng tức thì không cần train, chạy CPU/ONNX mặc định) làm engine giọng Việt local duy nhất do Python phục vụ. Chuyển **Microsoft Edge TTS** ra khỏi Python, thành một route mới (`POST /api/speak/edge`) trong `server.js` — vốn đã phải chạy toàn thời gian cho OCR/đọc URL — để giảm `python-backend` xuống chỉ còn phục vụ VieNeu-TTS. Giữ nguyên **Web Speech API** (client-side, không đổi). Song song, gỡ bỏ toàn bộ hạ tầng Web/SEO (`sitemap.xml`, `robots.txt`, `llms.txt`, `manifest.webmanifest`, `404.html`, `useDocumentSEO`, `siteConfig`, `NotFoundPage`) vì dự án chỉ còn nhắm tới Desktop (Electron). Dọn thêm route `/api/generate` chết và hợp nhất `useVoiceServerStatus` trùng lặp với health-check sẵn có trong `useTTS.ts`.

### Bối cảnh: đây là bản tổng hợp chính thức của quá trình rà soát toàn repo

Trước khi lập plan này, toàn bộ repo đã được rà soát thủ công (không chỉ dựa vào tên file): mọi file trong `src/`, `electron/`, `python-backend/`, `server.js`, `server/`, `lib/`, và cả 47 spec trước đó. Phát hiện chính: kiến trúc "local, single-user" hiện tại (sau khi SaaS/Auth bị gỡ ở `specs/024-cleanup-saas-cors`) là đúng hướng; nhưng RVC, khung Web/SEO, và một số audit bảo mật theo checklist SaaS chung chung đã khiến repo phình to ra ngoài phạm vi "desktop app đọc TXT/EPUB/PDF". Feature này giải quyết đúng 2 trong số các trục đó (RVC + Web/SEO) theo quyết định của chủ dự án; tính năng OCR màn hình + đọc từ URL được xác nhận **giữ nguyên**, nằm ngoài phạm vi.

## Technical Context

**Language/Version**: TypeScript 5.8 (Client & Electron), Python 3.10+ (cần xác nhận đúng phiên bản `vieneu` hỗ trợ), Node.js ≥18, React 19

**Primary Dependencies**:
- Gỡ bỏ: `rvc-python==0.1.5`, `fairseq==0.12.2` (vendor wheel), `edge-tts` (Python)
- Thêm: `vieneu` (Python, CPU/ONNX mặc định — không cần PyTorch), `node-edge-tts` (hoặc tương đương JS, cần chọn cụ thể khi code)
- Không đổi: Flask, Express, Helmet, React 19, Electron ≥34, `electron-builder`

**Storage**: Không đổi — `localStorage` cho `TTSSettings` (thêm field mới, field cũ `rvcServerUrl` cần xử lý migration nhẹ nhàng — xem Edge Cases trong spec.md); filesystem cho voice-clone reference clips (thay cho `model/*.pth`/`*.index`)

**Testing**: Vitest (`npm test`), `tsc --noEmit`, ESLint, Pytest (`pytest python-backend/tests`)

**Target Platform**: Electron Desktop — về nguyên tắc mở rộng được sang Windows/macOS/Linux vì không còn ràng buộc `fairseq-*-win_amd64.whl` chỉ chạy Windows (xem SC-008 trong spec.md); phạm vi feature này không bắt buộc hoàn thiện packaging đa nền tảng

**Project Type**: React Web Application (giữ layer UI) + Electron Desktop Shell + 2 local microservice (Node proxy mở rộng, Python rút gọn)

**Performance Goals**: Không thoái lui so với hiện tại — giữ nguyên kiến trúc prefetch N+1/N+2 trong `useTTS.ts`; tiến trình Python "rỗng" (chưa load model VieNeu) khởi động nhanh hơn đáng kể so với trước (không phải nạp PyTorch/fairseq)

**Constraints**:
- Không được đổi hành vi của nhánh `provider === 'browser'` (Web Speech API) — zero regression.
- Không được đổi hành vi route `/api/ocr`, `/api/fetch-url`, `GET /health` hiện có trong `server.js`.
- `python-backend` sau khi đổi phải khởi động được không cần GPU/CUDA.
- Cấu hình cũ (`ttsProvider: 'rvc-local'`, `rvcServerUrl`) trong `localStorage` của người dùng hiện tại không được làm crash ứng dụng.

**Scale/Scope**: ~10 file cốt lõi thay đổi trực tiếp (backend Python, route Node mới, `types.ts`, `useTTS.ts`, `useVoiceServerStatus.ts`, `SettingsModal.tsx`, `electron/main.ts`, `electron/preload.ts`) + ~10 file tài liệu/packaging/test đi kèm + ~10 file bị xoá hoàn toàn (nhóm SEO + `wheels/` + `docs/rvc-voice-setup.md` phần Colab).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` của repo vẫn là template gốc chưa được điền (toàn bộ placeholder `[PRINCIPLE_N_NAME]` chưa thay). Không có gate ràng buộc chính thức nào từ file này. Áp dụng các nguyên tắc kỹ thuật đã được dùng ngầm định xuyên suốt 47 spec trước (đặc biệt spec `001`) làm gate thay thế:

| Nguyên tắc | Trạng thái | Ghi chú |
|---|---|---|
| Không phá vỡ interface bên ngoài của `useTTS` | ✅ Đạt | Chữ ký `speak`, `pause`, `resume`, `currentIndex`, v.v. không đổi; chỉ đổi nội bộ cách chọn URL đích theo engine |
| Core reader không bị đụng vào | ✅ Đạt | `fileParser.ts`, `textParser.ts`, `indexedDB.ts`, toàn bộ UI đọc sách (`ReaderContent`, `TOCDrawer`, `BookmarksDrawer`...) — 0 thay đổi |
| OCR/đọc URL giữ nguyên 100% | ✅ Đạt | `electron/screenReader/`, `useScreenReaderClipboard.ts`, route `/api/ocr` + `/api/fetch-url` — 0 thay đổi, chỉ thêm route Edge TTS mới cạnh chúng trong cùng file `server.js` |
| Giảm phụ thuộc nặng thay vì thêm mới | ✅ Đạt | Gỡ PyTorch + fairseq (bắt buộc trước đây); `vieneu` mặc định CPU/ONNX nhẹ hơn nhiều |
| An toàn dữ liệu người dùng hiện có | ⚠️ Cần xử lý | Field `rvcServerUrl`/`ttsProvider: 'rvc-local'` cũ trong `localStorage` cần fallback graceful (FR-014) — xử lý ở Phase 2 Foundational |

**Kết quả**: PASS (1 mục cần xử lý chủ động, đã đưa vào Foundational task, không phải vi phạm cần biện minh).

**Khuyến nghị riêng** (không phải gate bắt buộc, nêu ở đây để ghi nhận): nên điền `.specify/memory/constitution.md` với các nguyên tắc thực tế của dự án (vd "Desktop-first: không thêm hạ tầng chỉ phục vụ web-hosting công khai", "Không audit bảo mật theo checklist không khớp kiến trúc thật") để làm gate thật cho các feature sau, tránh lặp lại lịch sử phình to đã ghi nhận ở `specs/016/017/020/021`.

## Project Structure

### Documentation (this feature)

```text
specs/048-desktop-tts-migration/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output (VieNeu-TTS, Node edge-tts port, migration của localStorage cũ)
├── data-model.md        # Phase 1 output (TTSProvider, TTSSettings, TTSServerStatus, state machine)
├── quickstart.md        # Phase 1 output (lệnh xác minh: typecheck/lint/test/pytest)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── contracts/
    ├── vieneu-server-api.yaml       # OpenAPI cho python-backend (/speak, /health, /voices/add)
    └── edge-tts-route-contract.md   # Hợp đồng cho route mới trong server.js
```

### Source Code (repository root)

```text
python-backend/
├── server.py            # Viết lại: chỉ còn Flask + vieneu, bỏ rvc_python/fairseq/torch-patch
├── requirements.txt     # Chỉ còn: flask, vieneu
└── wheels/              # XOÁ (fairseq vendor wheel không còn cần)

server.js                # Thêm route POST /api/speak/edge (node-edge-tts); route OCR/fetch-url/health không đổi

src/
├── types.ts                        # TTSProvider, TTSSettings, TTSServerStatus cập nhật
├── hooks/
│   ├── useTTS.ts                   # fetchServerSpeech chọn URL theo engine; giữ nguyên prefetch/cache/retry/timeout
│   └── useVoiceServerStatus.ts     # Hợp nhất vào health-check của useTTS (hoặc xoá, dùng chung 1 nguồn)
├── components/
│   └── SettingsModal.tsx           # 3-way engine selector; khối nhân bản giọng thay khối quản lý model RVC
├── hooks/useDocumentSEO.ts         # XOÁ (User Story 4)
├── utils/siteConfig.ts             # XOÁ (User Story 4)
├── components/NotFoundPage.tsx     # XOÁ (User Story 4)
└── App.tsx                         # Bỏ isNotFound/popstate/useDocumentSEO/NotFoundPage (User Story 4)

electron/
├── main.ts               # registerVoiceCloneIpcHandlers thay registerModelIpcHandlers; chuỗi text RVC cập nhật
└── preload.ts             # window.voxreadDesktop.voiceClone thay .models

public/                    # XOÁ: sitemap.xml, robots.txt, llms.txt, manifest.webmanifest, 404.html, og-preview.png
index.html                 # Bỏ Open Graph/Twitter/JSON-LD/canonical/robots meta (User Story 4)

docs/
├── rvc-voice-setup.md → voice-setup.md   # Bỏ "PHẦN A — Train qua Colab", thay bằng hướng dẫn nhân bản VieNeu
└── README.md                              # Cập nhật tiêu đề, sơ đồ kiến trúc, Quickstart

tests/
├── hooks/useTTS.test.ts                  # Cập nhật nhánh provider mới
├── hooks/useVoiceServerStatus.test.ts    # Xoá hoặc gộp
├── unit/serverProxy.test.ts              # Thêm test cho /api/speak/edge; xoá test /api/generate
└── seo/technicalSeo.test.ts              # XOÁ (User Story 4)

python-backend/tests/test_server.py       # Viết lại: mock Vieneu.infer/save, bỏ mock RVC/edge_tts
```

**Structure Decision**: Giữ nguyên cấu trúc monorepo hiện tại (frontend + electron + python-backend + server.js ở root) — không tách package, không đổi layout thư mục lớn. Thay đổi tập trung ở nội dung file, không phải vị trí file (trừ nhóm SEO bị xoá hẳn).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Không có vi phạm nào cần biện minh — 1 mục "⚠️ Cần xử lý" ở Constitution Check (migration `localStorage` cũ) là một task Foundational thông thường, không phải độ phức tạp phát sinh ngoài kế hoạch.
