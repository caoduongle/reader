# Feature Specification: Loại bỏ RVC, chuyển sang VieNeu-TTS/Edge TTS/Web Speech & tái tập trung Desktop-only

**Feature Branch**: `048-desktop-tts-migration`

**Created**: 2026-09-08

**Status**: Ready for Review

**Input**: User description: "Rà soát thật kĩ từng file trong repo caoduongle/reader; repo đang đi chệch hướng khỏi mục tiêu app desktop đọc TXT/EPUB/PDF. Bỏ hoàn toàn pipeline RVC (rvc-python, fairseq, PyTorch, model .pth/.index, quy trình train qua Google Colab). Thay bằng 3 engine giọng đọc: VieNeu-TTS (nhân bản giọng tức thì, chạy local qua python-backend), Microsoft Edge TTS (chuyển từ python-backend sang route mới trong server.js/Node vì server.js vốn đã phải chạy toàn thời gian cho OCR/đọc URL), và Web Speech API (giữ nguyên, client-side). Giữ nguyên 100% tính năng đọc từ URL + OCR màn hình (Gemini) — không đổi gì. Bỏ hẳn khung Web/SEO song song với bản Desktop (sitemap.xml, robots.txt, llms.txt, manifest.webmanifest, 404.html, useDocumentSEO, siteConfig, NotFoundPage) vì repo chỉ còn tập trung Desktop. Dọn thêm: xoá route /api/generate không dùng tới, hợp nhất useVoiceServerStatus trùng lặp với health-check trong useTTS."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nghe giọng Việt chuyên biệt, nhân bản tức thì, không cần train (Priority: P1) 🎯 MVP

Là người đọc sách bằng VoxRead Desktop, tôi muốn chọn một giọng đọc tiếng Việt chất lượng cao (VieNeu-TTS) và — nếu muốn — nhân bản giọng của chính mình chỉ từ một đoạn ghi âm ngắn 3-8 giây, thay vì phải rời ứng dụng để train một model RVC riêng trên Google Colab.

**Why this priority**: Đây là yêu cầu cốt lõi của việc tái định hướng — thay thế toàn bộ gánh nặng vận hành của RVC (fairseq vendor wheel, PyTorch, monkey-patch tương thích, 7+ spec vá lỗi trong lịch sử: `022`, `023`, `027`, `028`, `031`, `032`, `039`, `046`, `047`) bằng một pipeline nhân bản giọng đơn giản, không cần train, không cần GPU bắt buộc.

**Independent Test**: Chọn engine "VieNeu-TTS" trong Settings, bấm phát một câu — nghe được audio phát ra từ giọng dựng sẵn. Ghi/chọn một clip audio 3-8 giây, bấm "Nhân bản giọng của tôi", chọn giọng vừa tạo, bấm phát — nghe được audio bằng giọng vừa nhân bản. Không có bước "train" hay "chờ" nào kéo dài quá vài giây.

**Acceptance Scenarios**:

1. **Given** engine đang chọn là VieNeu-TTS và `python-backend` đã sẵn sàng, **When** người dùng bấm phát một câu, **Then** ứng dụng gửi request tới `POST /speak` trên `python-backend` (cổng 8008) và phát audio WAV trả về.
2. **Given** người dùng cung cấp một file audio tham chiếu 3-8 giây, **When** bấm "Nhân bản giọng của tôi", **Then** hệ thống gọi `POST /voices/add`, lưu giọng mới, và giọng đó xuất hiện ngay trong danh sách lựa chọn — không có bước train, không cần rời ứng dụng.
3. **Given** `python-backend` chưa khởi động xong hoặc model VieNeu chưa tải lần đầu, **When** người dùng bấm phát, **Then** UI hiển thị trạng thái "đang tải" rõ ràng thay vì báo lỗi hoặc treo im lặng.

---

### User Story 2 - Nghe giọng Microsoft Edge TTS trực tiếp, không qua RVC (Priority: P1) 🎯 MVP

Là người đọc sách, tôi muốn chọn giọng Edge TTS (Microsoft) nghe tự nhiên mà không cần bất kỳ bước xử lý RVC nào ở giữa, và tính năng này không đòi hỏi cài đặt Python.

**Why this priority**: Edge-TTS vốn đã được dùng làm giọng nền cho RVC — tách nó ra thành lựa chọn độc lập là thay đổi rủi ro thấp, giá trị cao. Vì `server.js` đã bắt buộc phải chạy cho OCR/đọc URL (không đổi trong phạm vi này), việc thêm Edge TTS vào đó không phát sinh tiến trình mới nào, và loại bỏ hoàn toàn yêu cầu cài Python đối với nhóm người dùng chỉ cần giọng máy tốt, không cần nhân bản giọng.

**Independent Test**: Chọn engine "Edge TTS" trong Settings, bấm phát một câu — nghe được audio phát ra, ứng dụng gọi `POST /api/speak/edge` trên `server.js` (cổng 3001), không có tiến trình Python nào bị gọi tới cho request này.

**Acceptance Scenarios**:

1. **Given** engine đang chọn là Edge TTS, **When** người dùng bấm phát, **Then** request đi tới `${edgeTtsProxyUrl}/api/speak/edge`, không đi tới `python-backend`.
2. **Given** `python-backend` (VieNeu) chưa từng được khởi động thành công, **When** người dùng dùng Edge TTS, **Then** tính năng vẫn hoạt động bình thường (không phụ thuộc lẫn nhau giữa 2 engine server-side).
3. **Given** không có kết nối Internet, **When** người dùng dùng Edge TTS, **Then** hệ thống báo lỗi rõ ràng ("Edge TTS cần kết nối Internet") thay vì treo hoặc lỗi mơ hồ.

---

### User Story 3 - Giọng máy Web Speech API luôn sẵn sàng, 0 cấu hình (Priority: P2)

Là người đọc sách, tôi muốn có sẵn một lựa chọn giọng đọc hoạt động ngay lập tức, không cần chờ backend nào khởi động, để dùng khi mới cài đặt ứng dụng hoặc khi cả hai backend đều không khả dụng.

**Why this priority**: Đây là fallback "luôn hoạt động" quan trọng nhất về độ tin cậy, nhưng không cần thay đổi kỹ thuật gì (logic đã đúng từ trước) — chỉ cần đảm bảo không bị hồi quy trong quá trình tái cấu trúc 2 engine kia.

**Independent Test**: Tắt hoàn toàn `python-backend` và `server.js`, chọn "Giọng máy" trong Settings, bấm phát — vẫn nghe được audio (dùng `speechSynthesis` của trình duyệt/Chromium).

**Acceptance Scenarios**:

1. **Given** cả hai backend server đều không chạy, **When** người dùng chọn Web Speech API, **Then** phát audio thành công không qua network request nào.
2. **Given** nhánh code `provider === 'browser'` trong `useTTS.ts`, **When** thực hiện Giai đoạn 1 của migration, **Then** nhánh này không bị chỉnh sửa (regression-free).

---

### User Story 4 - Repo chỉ còn phục vụ Desktop, không còn song song Web/SEO (Priority: P2)

Là chủ dự án, tôi muốn gỡ bỏ toàn bộ hạ tầng phục vụ một website công khai (`voxread.app`) song song với bản Electron Desktop, vì đây không còn là mục tiêu của dự án và đang gây hiểu lầm/tài liệu sai lệch (ví dụ `llms.txt` nhắc tới "Argon2" không tồn tại trong code).

**Why this priority**: Độc lập hoàn toàn với việc đổi TTS — có thể triển khai/kiểm thử riêng — nhưng cùng chung mục tiêu "tái định hướng" nên gộp vào cùng đợt theo quyết định của chủ dự án.

**Independent Test**: Sau khi xoá, `npm run build` vẫn chạy thành công, ứng dụng Electron mở lên bình thường, không còn file `sitemap.xml`/`robots.txt`/`llms.txt`/`manifest.webmanifest`/`404.html`/`og-preview.png` nào trong `dist/`.

**Acceptance Scenarios**:

1. **Given** `src/App.tsx` sau khi sửa, **When** ứng dụng khởi động trong Electron (`file://.../index.html`), **Then** không còn state `isNotFound`, không còn listener `popstate`, không còn lời gọi `useDocumentSEO`.
2. **Given** thư mục `public/`, **When** build production, **Then** không còn xuất ra `sitemap.xml`, `robots.txt`, `llms.txt`, `manifest.webmanifest`, `404.html`, `og-preview.png`.
3. **Given** `index.html`, **When** kiểm tra `<head>`, **Then** không còn thẻ Open Graph, Twitter Card, JSON-LD, `<link rel="canonical">`, `<meta name="robots">`, `<link rel="manifest">`.

---

### User Story 5 - Dọn tàn dư kỹ thuật phát hiện trong quá trình rà soát (Priority: P3)

Là người bảo trì codebase, tôi muốn loại bỏ các đoạn code trùng lặp hoặc chết đã phát hiện trong lúc rà soát, để giảm bề mặt bảo trì cho các thay đổi sau này.

**Why this priority**: Không ảnh hưởng tính năng người dùng cuối, có thể hoãn lại nếu thời gian hạn chế, nhưng chi phí sửa thấp nên nên làm cùng đợt.

**Independent Test**: Grep toàn repo (loại trừ `specs/`) không còn thấy `useVoiceServerStatus` hook riêng biệt; `server.js` không còn route `/api/generate`.

**Acceptance Scenarios**:

1. **Given** `src/hooks/useVoiceServerStatus.ts` bị hợp nhất, **When** `SettingsModal.tsx` cần trạng thái server, **Then** nó dùng cùng một nguồn health-check duy nhất từ `useTTS.ts`.
2. **Given** route `/api/generate` trong `server.js` không được gọi ở bất kỳ đâu trong `src/`/`electron/` (đã xác nhận bằng grep khi rà soát), **When** dọn dẹp, **Then** route này bị xoá (trừ khi chủ dự án xác nhận muốn giữ cho mục đích khác).

---

### Edge Cases

- Người dùng đã có cấu hình `rvcServerUrl`/`ttsProvider: 'rvc-local'` lưu trong `localStorage` từ phiên bản cũ trước khi nâng cấp — ứng dụng cần fallback an toàn về `'browser'` thay vì crash hoặc gọi tới một route đã không còn tồn tại.
- Người dùng đã có file `.pth`/`.index` cũ trong `python-backend/model/` — không bắt buộc xoá, nhưng UI không được tham chiếu tới chúng nữa.
- `Vieneu.infer()` được gọi đồng thời bởi 2 request prefetch (N+1, N+2) cùng lúc — cần xác nhận an toàn luồng hoặc thêm khoá tương tự bản RVC cũ.
- Model weight của VieNeu chưa được tải về máy (lần chạy đầu tiên, cần tải từ Hugging Face Hub) trong khi mạng Internet của người dùng chập chờn — cần trạng thái "đang tải model" rõ ràng, không phải "lỗi".
- Người dùng chọn Edge TTS nhưng ngắt Internet giữa chừng khi đang đọc — cần thông báo rõ ràng, không phá vỡ trải nghiệm đọc các câu đã cache trước đó.
- Node package xử lý Edge TTS trả về lỗi khi voice ID không hợp lệ (ví dụ đổi vùng miền giọng) — cần map về thông báo dễ hiểu, không để lộ stack trace.

## Requirements *(mandatory)*

### Functional Requirements

**Backend Python (`python-backend/`)**

- **FR-001**: `python-backend/server.py` MUST loại bỏ hoàn toàn `rvc_python`, `RVC_PARAMS`, `discover_model_paths`, monkey-patch `torch.load`, `rvc_lock`, và các route `/model/list`, `/model/reload`, `/model/create-folder`.
- **FR-002**: `python-backend/server.py` MUST tích hợp thư viện `vieneu` (VieNeu-TTS), khởi tạo lazy (chỉ load model khi có request đầu tiên cần tới).
- **FR-003**: Route `POST /speak` MUST nhận `{text, voice}`, trả về audio WAV từ VieNeu-TTS (không còn tham số `engine` chọn RVC/Edge vì Python chỉ còn phục vụ VieNeu).
- **FR-004**: Route mới `POST /voices/add` MUST nhận file audio tham chiếu (3-8 giây) qua multipart/form-data, gọi `vieneu.add_voice()` + `vieneu.save_voices()` để nhân bản giọng không cần train.
- **FR-005**: Route `GET /health` MUST phản ánh đúng trạng thái model VieNeu (đã tải/chưa tải lần đầu).
- **FR-006**: `python-backend/requirements.txt` MUST chỉ còn `flask` + `vieneu` (bỏ `rvc-python`, `edge-tts`, mọi comment liên quan `fairseq`).
- **FR-007**: `python-backend/wheels/` (bao gồm file `.whl` fairseq vendor 9,8MB) MUST bị xoá hoàn toàn khỏi repo.

**Backend Node (`server.js`)**

- **FR-008**: `server.js` MUST thêm route mới `POST /api/speak/edge` nhận `{text, voice, rate?, pitch?, volume?}`, dùng một thư viện Node cho Edge TTS (vd `node-edge-tts`), trả về audio MP3.
- **FR-009**: Route mới MUST tái sử dụng middleware bảo mật đã có (`globalRateLimiter`, validate schema, `errorHandler`) — không tạo hạ tầng bảo mật riêng.
- **FR-010**: Route `/api/ocr`, `/api/fetch-url`, `GET /health` hiện có trong `server.js` MUST giữ nguyên không đổi (User Story không đổi — OCR/đọc URL nằm ngoài phạm vi).

**Frontend (`src/`)**

- **FR-011**: `src/types.ts`: `TTSProvider` MUST đổi từ `'browser' | 'rvc-local'` thành `'browser' | 'edge-tts' | 'vieneu-tts'`.
- **FR-012**: `TTSSettings` MUST thay `rvcServerUrl` bằng 2 field: `edgeTtsProxyUrl` (mặc định `http://localhost:3001`) và `vieneuServerUrl` (mặc định `http://localhost:8008`).
- **FR-013**: `src/hooks/useTTS.ts` MUST giữ nguyên kiến trúc prefetch N+1/N+2, cache `Map<index, blobUrl>`, retry, timeout, race-condition token — chỉ đổi phần chọn URL đích theo engine.
- **FR-014**: Khi đọc `TTSSettings` cũ từ `localStorage` có `ttsProvider === 'rvc-local'`, hệ thống MUST fallback an toàn về `'browser'` thay vì gọi route không tồn tại.
- **FR-015**: `src/components/SettingsModal.tsx` MUST thay switch 2 chiều RVC bằng lựa chọn 3 chiều (Web Speech / Edge TTS / VieNeu-TTS) và thay khối "Quản lý model" bằng khối "Nhân bản giọng của tôi".
- **FR-016**: `src/hooks/useVoiceServerStatus.ts` MUST được hợp nhất vào health-check của `useTTS.ts`, loại bỏ trùng lặp trạng thái.

**Electron (`electron/`)**

- **FR-017**: `electron/main.ts` MUST giữ nguyên cơ chế spawn/health-poll/kill cho cả `python-backend` (VieNeu) và `server.js` (proxy, nay gồm cả Edge TTS) — không thêm cơ chế spawn-on-demand mới.
- **FR-018**: IPC handler quản lý model RVC (`.pth`/`.index`) MUST đổi thành IPC handler nhân bản giọng (chọn file audio `.wav/.mp3/.m4a`, gọi `/voices/add`).
- **FR-019**: Chuỗi text tham chiếu RVC trong tray tooltip và dialog title MUST được cập nhật lại cho khớp thực tế mới.

**Desktop-only cleanup (User Story 4)**

- **FR-020**: MUST xoá `public/sitemap.xml`, `public/robots.txt`, `public/llms.txt`, `public/manifest.webmanifest`, `public/404.html`, `public/og-preview.png`.
- **FR-021**: MUST xoá `src/hooks/useDocumentSEO.ts`, `src/utils/siteConfig.ts`, `src/components/NotFoundPage.tsx`.
- **FR-022**: `src/App.tsx` MUST xoá state `isNotFound`, listener `popstate`, tính toán `seoTitle`/`seoDescription`, lời gọi `useDocumentSEO`, khối render điều kiện, import lazy `NotFoundPage`.
- **FR-023**: `index.html` MUST xoá toàn bộ Open Graph/Twitter Card/JSON-LD/canonical/`<meta name="robots">`/`<link rel="manifest">`, và cập nhật `<title>`/`<meta description>`/`<meta keywords>` để không còn nhắc "RVC voice clone".

**Dọn tàn dư (User Story 5)**

- **FR-024**: MUST xoá route `POST /api/generate` trong `server.js` (xác nhận không còn caller nào trong `src/`/`electron/` trước khi xoá).

### Key Entities

- **TTSProvider**: `'browser' | 'edge-tts' | 'vieneu-tts'` — engine giọng đọc đang chọn.
- **TTSSettings**: cấu hình TTS của người dùng, gồm `ttsProvider`, `edgeTtsProxyUrl`, `vieneuServerUrl`, giọng đã chọn cho từng engine.
- **VoiceCloneImportResult**: kết quả của thao tác nhân bản giọng (thành công/thất bại, tên giọng mới).
- **TTSServerStatus**: `'checking' | 'connected' | 'no-model' | 'model_missing' | 'unreachable'` — trạng thái backend đang health-check (dùng chung cho cả 2 backend, thay vì tách biệt RVC-only như trước).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 tham chiếu tới `rvc-python`, `fairseq`, `torch` bắt buộc còn lại trong `python-backend/requirements.txt`.
- **SC-002**: Dung lượng thư mục `python-backend/` (trừ `venv/`, `.gitignore`) giảm ít nhất ~10MB do xoá `wheels/`.
- **SC-003**: Quy trình "có giọng nói của riêng bạn" giảm từ nhiều bước qua Google Colab xuống còn 1 thao tác nhân bản tức thì trong ứng dụng (không rời ứng dụng, không cần train).
- **SC-004**: `npm run typecheck`, `npm run lint`, `npm test` sạch (0 lỗi) sau toàn bộ thay đổi frontend.
- **SC-005**: `pytest python-backend/tests` sạch (0 lỗi) sau khi viết lại theo engine mới.
- **SC-006**: Sau User Story 4, build production không còn phát sinh file nào trong nhóm SEO đã liệt kê ở FR-020/FR-023.
- **SC-007**: 100% tính năng OCR màn hình + đọc từ URL hoạt động không thay đổi hành vi so với trước migration (regression-free).
- **SC-008**: Loại bỏ ràng buộc chỉ-Windows của `fairseq-*-win_amd64.whl` — về nguyên tắc mở đường cho hỗ trợ macOS/Linux tốt hơn trong tương lai (không bắt buộc phải hoàn thiện packaging đa nền tảng trong phạm vi feature này).

## Assumptions

- Package Python `vieneu` cài đặt được qua `pip install vieneu` trên môi trường CI/dev hiện tại (Python 3.10+); cần xác nhận phiên bản Python chính xác được `vieneu` hỗ trợ khi triển khai thật.
- Một package Node cho Edge TTS (vd `node-edge-tts`) tồn tại, được bảo trì, và hỗ trợ tối thiểu chọn giọng + trả về buffer audio; tên method/tham số chính xác cần xác nhận khi code.
- Model weight VieNeu-TTS được tải từ Hugging Face Hub ở lần chạy đầu và cache lại cục bộ — người dùng cần Internet ít nhất một lần trước khi dùng VieNeu-TTS offline hoàn toàn.
- Không cần giữ tương thích ngược với model `.pth`/`.index` RVC cũ của người dùng hiện tại — đây là thay đổi có chủ đích theo yêu cầu, không phải migration dữ liệu.
- Tính năng OCR màn hình + đọc từ URL (Gemini) nằm ngoài phạm vi thay đổi của feature này theo xác nhận của chủ dự án.
