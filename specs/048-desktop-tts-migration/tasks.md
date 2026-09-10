# Tasks: Loại bỏ RVC, chuyển sang VieNeu-TTS/Edge TTS/Web Speech & tái tập trung Desktop-only

**Branch**: `048-desktop-tts-migration` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

> **Trạng thái: 35/35 task đã triển khai và xác minh hoàn tất** (`tsc --noEmit`,
> `tsc --noEmit -p electron/tsconfig.json`, `eslint .`, `vitest run` 122/122 pass, `pytest`
> 20/20 pass — tất cả sạch; cả 3 engine và voice cloning đã được chạy và nghe thử thật).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Xác nhận các phụ thuộc mới trước khi viết code thật

- [x] T001 Xác nhận `pip install vieneu` cài đặt thành công + import được trên môi trường dev/CI hiện tại (Python 3.10+)
- [x] T002 Chọn cụ thể 1 package Node cho Edge TTS (`node-edge-tts` / `@andresaya/edge-tts` / khác), xác nhận API `synthesize`/tương đương
- [x] T003 [P] Ghi chú lại cấu hình `python-backend/model/*.pth`/`*.index` hiện có của người dùng (nếu có) trước khi gỡ logic liên quan — không tự động xoá file người dùng (Đã kiểm tra: ghi nhận model cũ `Chess_25e_12750s.pth` và `Chess.index` còn nguyên trong `python-backend/model/`, không bị xoá)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type/contract nền tảng mà mọi User Story phía dưới phụ thuộc vào

**⚠️ CRITICAL**: Không bắt đầu User Story nào trước khi xong phase này

- [x] T004 Cập nhật `src/types.ts`: `TTSProvider` → `'browser' | 'edge-tts' | 'vieneu-tts'`; `TTSSettings` thay `rvcServerUrl` bằng `edgeTtsProxyUrl` + `vieneuServerUrl`; đổi `RVCServerStatus` → `TTSServerStatus`; đổi `ModelImportResult`/`DesktopModelsBridge` → `VoiceCloneImportResult`/`VoiceCloneBridge`
- [x] T005 [US-ALL] Thêm logic migration: nơi `TTSSettings` được đọc từ `localStorage`, nếu `ttsProvider === 'rvc-local'` (giá trị cũ không còn hợp lệ) → fallback về `'browser'` (FR-014)
- [x] T006 [P] Cập nhật `python-backend/requirements.txt`: bỏ `rvc-python`, `edge-tts`, comment fairseq; thêm `vieneu`
- [x] T007 [P] Cập nhật `package.json`: thêm package Node đã chọn ở T002 vào dependencies

**Checkpoint**: Type/contract nền tảng sẵn sàng — bắt đầu implement User Story theo thứ tự ưu tiên

---

## Phase 3: User Story 1 - VieNeu-TTS: nhân bản giọng tức thì, không cần train (Priority: P1) 🎯 MVP

**Goal**: `python-backend` chỉ còn phục vụ VieNeu-TTS; người dùng nhân bản giọng từ 1 clip ngắn, không train.

**Independent Test**: Chọn VieNeu-TTS trong Settings, phát 1 câu → nghe audio. Upload 1 clip 3-8s → nhân bản → chọn giọng mới → phát → nghe đúng giọng đã nhân bản.

### Tests for User Story 1 🧪

- [x] T008 [P] [US1] Viết lại `python-backend/tests/test_server.py`: mock `Vieneu.infer`/`Vieneu.save` cho route `/speak`; test route mới `/voices/add`; test `/health` phản ánh `vieneu_ready`
- [x] T009 [P] [US1] Cập nhật `tests/hooks/useTTS.test.ts`: thêm case engine `'vieneu-tts'` gọi đúng `${vieneuServerUrl}/speak`

### Implementation for User Story 1

- [x] T010 [US1] Viết lại `python-backend/server.py`: bỏ `rvc_python`/`RVC_PARAMS`/`discover_model_paths`/monkey-patch `torch.load`/`rvc_lock`/route `/model/*`; thêm `Vieneu` lazy-init; route `POST /speak` (trả WAV), `GET /health`, `POST /voices/add` (multipart audio 3-8s → `add_voice` + `save_voices`)
- [x] T011 [US1] Xoá hoàn toàn `python-backend/wheels/` (file `.whl` fairseq vendor + README hướng dẫn build lại)
- [x] T012 [US1] `src/hooks/useTTS.ts`: đổi tên `fetchRVCSpeech` → `fetchServerSpeech`; khi `engine === 'vieneu-tts'` gọi `${vieneuServerUrl}/speak`; giữ nguyên nguyên vẹn cơ chế prefetch N+1/N+2, cache, retry, timeout, `playTokenRef`
- [x] T013 [US1] `src/components/SettingsModal.tsx`: thêm lựa chọn "VieNeu-TTS" vào engine selector; thêm khối "Nhân bản giọng của tôi" (chọn/ghi audio → gọi `/voices/add`) thay khối "Quản lý model giọng đọc" cũ; xoá ghi chú "cao độ cố định theo RVC"
- [x] T014 [US1] `electron/main.ts` + `electron/preload.ts`: đổi `registerModelIpcHandlers` → `registerVoiceCloneIpcHandlers` (dialog filter `.wav/.mp3/.m4a` thay `.pth/.index`); đổi `window.voxreadDesktop.models` → `.voiceClone`

**Checkpoint**: VieNeu-TTS hoạt động độc lập, kiểm thử được riêng

---

## Phase 4: User Story 2 - Microsoft Edge TTS trực tiếp qua Node (Priority: P1) 🎯 MVP

**Goal**: Edge TTS chạy qua `server.js`, không cần Python, không qua RVC.

**Independent Test**: Chọn Edge TTS trong Settings, phát 1 câu → request đi tới `server.js:3001/api/speak/edge`, không đụng tới `python-backend`.

### Tests for User Story 2 🧪

- [x] T015 [P] [US2] Thêm test cho `POST /api/speak/edge` trong `tests/unit/serverProxy.test.ts` (mock package Node đã chọn)

### Implementation for User Story 2

- [x] T016 [US2] `server.js`: thêm route `POST /api/speak/edge` (dùng package T002), tái sử dụng `globalRateLimiter` + `validate` + `errorHandler` có sẵn; route `/api/ocr`, `/api/fetch-url`, `/health` giữ nguyên không đổi
- [x] T017 [US2] `src/hooks/useTTS.ts`: khi `engine === 'edge-tts'` gọi `${edgeTtsProxyUrl}/api/speak/edge`
- [x] T018 [US2] `src/components/SettingsModal.tsx`: thêm lựa chọn "Edge TTS (Microsoft)" vào engine selector

**Checkpoint**: Cả VieNeu-TTS (US1) và Edge TTS (US2) hoạt động độc lập — 2 engine server-side đã xong

---

## Phase 5: User Story 3 - Web Speech API giữ nguyên, luôn sẵn sàng (Priority: P2)

**Goal**: Xác nhận zero regression cho nhánh giọng máy.

**Independent Test**: Tắt cả 2 backend, chọn Web Speech → vẫn phát được audio.

### Tests for User Story 3 🧪

- [x] T019 [P] [US3] Xác nhận test hiện có cho nhánh `provider === 'browser'` trong `tests/hooks/useTTS.test.ts` vẫn pass không sửa

### Implementation for User Story 3

- [x] T020 [US3] Rà soát `src/hooks/useTTS.ts` nhánh `if (provider === 'browser')` — xác nhận 0 dòng bị đụng tới bởi T012/T017
- [x] T021 [US3] `src/components/SettingsModal.tsx`: cập nhật copy UI cho rõ 3 lựa chọn ngang hàng (Web Speech / Edge TTS / VieNeu-TTS)

**Checkpoint**: Cả 3 engine hoạt động độc lập — đủ điều kiện MVP hoàn chỉnh cho phần TTS

---

## Phase 6: User Story 4 - Tái tập trung Desktop-only, bỏ khung Web/SEO (Priority: P2)

**Goal**: Không còn hạ tầng phục vụ `voxread.app` công khai song song Desktop.

**Independent Test**: `npm run build` xong, thư mục `dist/` không còn `sitemap.xml`/`robots.txt`/`llms.txt`/`manifest.webmanifest`/`404.html`/`og-preview.png`.

### Implementation for User Story 4

- [x] T022 [P] [US4] Xoá `public/sitemap.xml`, `public/robots.txt`, `public/llms.txt`, `public/manifest.webmanifest`, `public/404.html`, `public/og-preview.png`
- [x] T023 [P] [US4] Xoá `src/hooks/useDocumentSEO.ts`, `src/utils/siteConfig.ts`, `src/components/NotFoundPage.tsx`
- [x] T024 [US4] Sửa `src/App.tsx`: xoá state `isNotFound` (dòng ~47-53), listener `popstate` (~54-59), tính `seoTitle`/`seoDescription` (~263-269), lời gọi `useDocumentSEO` (~275), khối render điều kiện (~478-489), import lazy `NotFoundPage` (~20)
- [x] T025 [US4] Sửa `index.html`: xoá Open Graph/Twitter Card/JSON-LD/`<link rel="canonical">`/`<meta name="robots">`/`<link rel="manifest">`; cập nhật `<title>`/`<meta description>`/`<meta keywords>` bỏ nhắc "RVC voice clone"
- [x] T026 [P] [US4] Xoá `tests/seo/technicalSeo.test.ts`

**Checkpoint**: Build production không còn phát sinh artifact SEO nào; app Electron chạy bình thường

---

## Phase 7: User Story 5 - Dọn tàn dư kỹ thuật (Priority: P3)

**Goal**: Giảm bề mặt bảo trì — xoá dead code, hợp nhất trùng lặp.

**Independent Test**: Grep repo (loại `specs/`) không còn `useVoiceServerStatus` riêng biệt; `server.js` không còn `/api/generate`.

### Implementation for User Story 5

- [x] T027 [US5] Xoá route `POST /api/generate` trong `server.js` (đã xác nhận 0 caller trong `src/`/`electron/` khi rà soát) + xoá test tương ứng trong `tests/unit/serverProxy.test.ts`
- [x] T028 [US5] Hợp nhất `src/hooks/useVoiceServerStatus.ts` vào health-check của `useTTS.ts`; cập nhật `SettingsModal.tsx` dùng 1 nguồn trạng thái duy nhất; xoá `tests/hooks/useVoiceServerStatus.test.ts` hoặc gộp vào `useTTS.test.ts`

**Checkpoint**: Không còn trùng lặp state, không còn endpoint chết

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Tài liệu, packaging, CI, xác minh cuối

- [x] T029 [P] Đổi `docs/rvc-voice-setup.md` → `docs/voice-setup.md`: xoá "PHẦN A — Train qua Google Colab", thay bằng hướng dẫn nhân bản giọng VieNeu (chọn/ghi clip → bấm nút)
- [x] T030 [P] Cập nhật `README.md`: tiêu đề, sơ đồ Mermaid kiến trúc, Quickstart (bỏ CUDA/GPU như yêu cầu bắt buộc), mục lịch sử dự án
- [x] T031 [P] Cập nhật `.github/workflows/build-electron.yml`: bỏ step "Install fairseq from vendored wheel" và "Install PyTorch CPU"
- [x] T032 [P] Cập nhật `scripts/setup.ps1`/`scripts/setup.sh`: bỏ dò/cài fairseq wheel; bỏ tự động dò `nvidia-smi` cài CUDA PyTorch bắt buộc
- [x] T033 Cập nhật chuỗi text còn sót trong `electron/main.ts`: tray tooltip (dòng 340) và dialog title (dòng 606) bỏ nhắc RVC
- [x] T034 Chạy `npm run typecheck && npm run lint && npm test` + `pytest python-backend/tests` — xác nhận sạch theo SC-004/SC-005
- [x] T035 Chạy `quickstart.md` để xác minh thủ công toàn bộ 5 User Story (Đã xác minh thật end-to-end: VieNeu-TTS tải model Hugging Face Hub và phát audio 48kHz, nhân bản giọng từ clip 3.4s thành công, Edge TTS tạo MP3 qua server.js, Web Speech API phát khi cả 2 backend offline)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Không phụ thuộc — bắt đầu ngay
- **Foundational (Phase 2)**: Phụ thuộc Setup — CHẶN toàn bộ User Story
- **User Story 1 & 2 (Phase 3-4, P1/MVP)**: Phụ thuộc Foundational; độc lập với nhau (2 backend khác nhau) — làm song song được
- **User Story 3 (Phase 5, P2)**: Phụ thuộc Foundational; chỉ là xác nhận không hồi quy, không phụ thuộc US1/US2
- **User Story 4 (Phase 6, P2)**: Hoàn toàn độc lập với US1/US2/US3 — có thể làm song song bất kỳ lúc nào sau Setup
- **User Story 5 (Phase 7, P3)**: Nên làm sau US1/US2 vì liên quan trực tiếp tới health-check mà US1/US2 vừa đổi
- **Polish (Phase 8)**: Phụ thuộc tất cả User Story đã chọn hoàn tất

### Parallel Opportunities

- T001, T002, T003 (Phase 1) chạy song song
- T006, T007 (Phase 2) chạy song song với nhau, sau T004
- US1 (Phase 3) và US2 (Phase 4) có thể làm song song bởi 2 người/2 phiên khác nhau — không đụng file chung ngoài `useTTS.ts` (T012 vs T017 sửa 2 nhánh khác nhau trong cùng file, cần merge cẩn thận nếu làm song song thật)
- US4 (Phase 6) hoàn toàn tách biệt, làm song song với US1/US2/US3 bất kỳ lúc nào

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Hoàn tất Phase 1 (Setup) + Phase 2 (Foundational)
2. Hoàn tất Phase 3 (US1 — VieNeu-TTS) và Phase 4 (US2 — Edge TTS)
3. **VALIDATE**: cả 2 engine server-side phát được audio độc lập, Web Speech (US3) không hồi quy
4. Đây là điểm dừng hợp lý nếu cần release sớm — đã giải quyết đúng yêu cầu cốt lõi "bỏ RVC, chuyển sang 3 engine"

### Incremental Delivery

1. Setup + Foundational → nền tảng sẵn sàng
2. US1 → kiểm thử độc lập → VieNeu-TTS hoạt động
3. US2 → kiểm thử độc lập → Edge TTS hoạt động, không cần Python
4. US3 → xác nhận Web Speech không hồi quy
5. US4 → dọn Web/SEO, độc lập hoàn toàn, có thể chèn vào bất kỳ lúc nào ở trên
6. US5 → dọn tàn dò cuối cùng khi mọi thứ đã ổn định
7. Polish → tài liệu, CI, packaging, xác minh toàn diện

## Notes

- [P] = khác file, không phụ thuộc nhau
- [USn] = gắn task với User Story tương ứng để truy vết
- Task nào động vào `useTTS.ts` (T012, T017, T020) nên làm tuần tự trong cùng 1 phiên để tránh xung đột merge, dù về lý thuyết độc lập theo User Story
- Đánh dấu `[x]` khi đã triển khai thật và xác minh được (không đánh dấu trước khi test/build thật)
