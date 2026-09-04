# Contract: Electron Main Proxy Process Lifecycle

**Feature**: `012-proxy-security-packaging` (Part C)  
**Host Process**: Electron Main Process (`electron/main.ts`)  
**Child Process Binary**: `process.execPath` (Electron binary) with `ELECTRON_RUN_AS_NODE: '1'`  
**Child Script**: `dist-electron/server.cjs`  

---

## 1. Spawn Configuration

```typescript
const proxyProcess = spawn(process.execPath, [proxyScriptPath], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  cwd: path.dirname(proxyScriptPath),
  detached: false,
  stdio: 'ignore',
});
```

- **Environment**: Inherits `process.env` plus `ELECTRON_RUN_AS_NODE: '1'`.
- **Working Directory**: `path.dirname(proxyScriptPath)`.
- **stdio**: `'ignore'` (prevents stdout/stderr pipe buffer deadlock).

---

## 2. Health Polling Contract

- **Target URL**: `http://127.0.0.1:3001/health`
- **Polling Interval**: `1000ms`
- **Max Attempts**: `60` (Total timeout = 60s)
- **Success Criteria**:
  - `response.ok === true`
  - JSON body contains `{ "status": "ok" }`
- **Failure Handling**:
  - If 60 attempts lapse without success, emit warning `console.warn('Express proxy health poll timed out after 60s')`.
  - Non-blocking: main application window continues to function normally.

---

## 3. Prerequisite Warning Dialog Contract

Triggered if `proxyScriptPath` does not exist:

- **Type**: `'info'`
- **Title**: `'Thông báo thiết lập VoxRead'`
- **Message**: `'Lưu ý về tính năng Đọc từ liên kết'`
- **Detail**:
  ```text
  Không tìm thấy kịch bản máy chủ proxy (server.cjs).
  
  Tính năng "Đọc từ liên kết" sẽ tạm thời không khả dụng cho tới khi hoàn tất đóng gói.
  Bạn vẫn có thể sử dụng các tính năng tải file, dán văn bản và giọng đọc bình thường.
  ```
- **Buttons**: `['Đã hiểu, mở VoxRead']`

---

## 4. Termination Contract

When application triggers `before-quit` or user selects "Thoát" from System Tray:

```typescript
if (process.platform === 'win32') {
  exec(`taskkill /F /T /PID ${pid}`, err => { ... });
} else {
  proxyProcess.kill('SIGTERM');
}
```
- **Windows Command**: `taskkill /F /T /PID ${proxyProcess.pid}`
- Guarantees termination of the proxy process and any spawned child threads.
- Clean cleanup ensured for both `pythonProcess` and `proxyProcess`.