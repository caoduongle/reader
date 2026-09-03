# Quickstart & Verification Guide: Read from Web URL ("Đọc từ liên kết")

**Feature Branch**: `011-read-from-url`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Running Automated Tests

```bash
npm test -- tests/unit/fetchUrl.test.ts
```

Expected test cases:
- Extracts clean article text and title from valid mock HTML.
- Rejects non-HTTP URLs with HTTP 400.
- Handles timeout (10s) with friendly HTTP 504 message.
- Rejects empty/unextractable DOM with HTTP 422.

---

## 2. Manual Verification in VoxRead

1. Start application:
   ```bash
   npm run dev
   ```
2. Open **"Add Novel or Document"** (`Upload` button in the top bar).
3. Click the 4th tab: **"Đọc từ liên kết"** (globe icon).
4. Enter any article link (e.g., `https://vnexpress.net/...`).
5. Click **"Lấy nội dung"**:
   - The button shows a spinning loader: "Đang lấy nội dung...".
   - Upon completion, the modal closes automatically.
   - The reader displays the article with chapter title, paragraph splits, word count, and highlights.
   - Click Play to listen to TTS reading the article immediately!
6. Test error handling:
   - Enter an invalid link like `invalid-url` or a non-existent page `https://this-domain-does-not-exist-12345.xyz`.
   - Verify that a clear, localized Vietnamese error appears in the red alert banner without crashing the modal.
