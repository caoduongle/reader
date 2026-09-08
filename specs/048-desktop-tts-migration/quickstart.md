# Quickstart & Verification Guide: Loại bỏ RVC, chuyển sang VieNeu-TTS/Edge TTS/Web Speech

**Feature**: `048-desktop-tts-migration`
**Date**: 2026-09-08

---

## 1. Cài đặt phụ thuộc mới

```bash
# Python backend — chỉ còn flask + vieneu
cd python-backend
pip install -r requirements.txt --break-system-packages   # hoặc trong venv

# Node — thêm package Edge TTS đã chọn ở T002
npm install
```

## 2. Kiểm thử tự động

```bash
# Frontend
npm run typecheck
npm run lint
npm test

# Python backend
pytest python-backend/tests
```

**Kỳ vọng**: 0 lỗi TypeScript, 0 lỗi/warning ESLint, 100% test pass (Vitest + Pytest) — theo SC-004/SC-005 trong spec.md.

## 3. Xác minh thủ công theo từng User Story

### US1 — VieNeu-TTS
1. Khởi động app (`npm run electron:dev` hoặc tương đương).
2. Mở Settings → chọn engine "VieNeu-TTS".
3. Bấm phát 1 câu — nghe được audio giọng dựng sẵn.
4. Ghi/chọn 1 file audio 3-8 giây → bấm "Nhân bản giọng của tôi" → xác nhận giọng mới xuất hiện trong danh sách ngay, không cần khởi động lại app.
5. Chọn giọng vừa nhân bản → phát lại → xác nhận nghe đúng giọng đã nhân bản.

### US2 — Edge TTS
1. Chọn engine "Edge TTS (Microsoft)" trong Settings.
2. Bấm phát 1 câu — nghe được audio.
3. Mở DevTools/Network (nếu chạy bản web) hoặc log của `server.js` — xác nhận request đi tới `POST /api/speak/edge`, **không** có request nào tới cổng 8008 (`python-backend`) cho hành động này.
4. Tắt Internet, thử phát lại — xác nhận thông báo lỗi rõ ràng ("cần Internet"), không treo ứng dụng.

### US3 — Web Speech
1. Tắt hẳn `python-backend` và `server.js` (hoặc chỉ test trên bản build không kèm 2 tiến trình này).
2. Chọn "Giọng máy" trong Settings.
3. Bấm phát — xác nhận vẫn nghe được audio, 0 network request.

### US4 — Desktop-only
1. `npm run build`.
2. Kiểm tra `dist/` — xác nhận **không** có `sitemap.xml`, `robots.txt`, `llms.txt`, `manifest.webmanifest`, `404.html`, `og-preview.png`.
3. Mở app Electron đã build — xác nhận khởi động bình thường, không lỗi console liên quan `useDocumentSEO`/`NotFoundPage` đã xoá.

### US5 — Dọn tàn dư
1. `grep -rn "useVoiceServerStatus" src/ --include="*.ts" --include="*.tsx"` — xác nhận không còn file hook riêng biệt (chỉ còn tham chiếu trong `useTTS.ts` nếu có, tuỳ cách hợp nhất).
2. `grep -n "api/generate" server.js` — xác nhận route đã bị xoá.

## 4. Rollback nhanh nếu phát hiện vấn đề

- Toàn bộ thay đổi nằm trên nhánh `048-desktop-tts-migration` — `git checkout main` để quay lại trạng thái trước migration bất kỳ lúc nào trong quá trình review.
- Người dùng đã cập nhật app và có `localStorage` cũ (`ttsProvider: 'rvc-local'`) sẽ tự fallback về `'browser'` theo T005 — không cần can thiệp thủ công.
