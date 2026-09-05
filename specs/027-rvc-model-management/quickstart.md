# Quickstart & Verification Guide: RVC Voice Model Management

**Feature Branch**: `027-rvc-model-management`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## 1. Automated Test Suites

Run the automated test suites for both backend and frontend to verify no regressions and validate model management contracts:

### Backend Pytest Suite
```bash
# Run backend tests including health diagnostic and model reload checks
pytest python-backend/tests
```

### Frontend Vitest Suite
```bash
# Run unit and hook tests including 4-state voice server status transitions
npm test
```

### Typecheck & Lint
```bash
npm run typecheck
npm run lint
```

---

## 2. End-to-End Manual Verification Scenarios

### Scenario 1: Clean Startup Without Models (Verify `model_missing` State)
1. Temporarily move or rename all `.pth` and `.index` files out of `python-backend/model/` (or delete the folder).
2. Start the Python backend:
   ```bash
   python python-backend/server.py
   ```
3. Verify terminal output logs:
   `[VoxRead] Cảnh báo: Chưa có model giọng RVC (.pth) trong thư mục python-backend/model/...`
4. Query health endpoint via curl or browser:
   ```bash
   curl http://localhost:8008/health
   ```
   **Expected output**:
   ```json
   {"ok":false,"model_loaded":false,"reason":"model_missing","model_dir":"..."}
   ```
5. Launch the desktop application:
   ```bash
   npm run dev
   ```
6. Open Settings (`Alt+,` or gear icon) > "Giọng đọc & Tốc độ" > select "Giọng của tôi (RVC local)".
7. **Expected UI state**:
   - Connection indicator shows amber/warning.
   - Alert banner renders: *"Server Python đang chạy nhưng chưa tìm thấy file model..."*.
   - Button **"+ Thêm model"** is visibly rendered inside the banner.
   - Section **"Quản lý model giọng đọc"** is visible below, showing empty model files and directory path.

---

### Scenario 2: One-Click Model Import & Auto-Reconnection
1. Click the **"+ Thêm model"** button in the warning banner.
2. The native system file picker opens with filter `*.pth, *.index`.
3. Select a valid `.pth` file (and optional matching `.index` file).
4. Click Open/Confirm.
5. **Expected Outcome**:
   - The selected files are copied into `python-backend/model/`.
   - The frontend automatically calls `/model/reload` and refreshes status.
   - Status transitions to **"Đã kết nối"** (green badge).
   - Warning banner disappears.
   - The **"Quản lý model giọng đọc"** card updates to show the loaded model name.

---

### Scenario 3: Persistent Management Card & Explorer Access
1. With server connected, navigate to "Giọng đọc & Tốc độ" > "Cấu hình Server RVC Local".
2. Scroll to **"Quản lý model giọng đọc"**.
3. Verify current model name is displayed alongside model directory path.
4. Click **"Mở thư mục"**:
   - Verify Windows Explorer (or system file manager) opens directly to `python-backend/model`.
5. Click **"+ Thêm model"** directly in this section:
   - Select another `.pth` model file.
   - Verify model list refreshes and new model becomes active.

---

### Scenario 4: Browser Mode Fallback (Non-Electron)
1. Open `http://localhost:3000` in Google Chrome or Microsoft Edge.
2. Navigate to Settings > "Giọng đọc & Tốc độ" > "Giọng của tôi (RVC local)".
3. Click "+ Thêm model" or "Mở thư mục".
4. **Expected Outcome**:
   - No crash or undefined IPC error occurs.
   - Path is copied to clipboard and friendly notification displays with file placement instructions.
