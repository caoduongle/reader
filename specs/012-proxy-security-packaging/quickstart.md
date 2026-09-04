# Quickstart & Verification Guide: Proxy Security Hardening & Electron Auto-Spawn

**Feature**: `012-proxy-security-packaging`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Automated Test Suites & Quality Gates

Run all automated verification commands from repo root:

```bash
# 1. Run unit test suite (including new CORS and SSRF test cases)
npm test -- tests/unit/fetchUrl.test.ts

# 2. Verify TypeScript strict type check
npx tsc --noEmit

# 3. Verify ESLint formatting & rules
npx eslint .
```

---

## 2. Part A Manual Verification (CORS Restriction)

Start the proxy server (`node server.js` or `npm run proxy`).

### Test A1: Reject Untrusted Web Origin
```bash
curl -i -X POST http://127.0.0.1:3001/api/fetch-url \
  -H "Origin: https://trang-doc-hai.evil" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```
**Expected Outcome**: Preflight / response does **NOT** contain `Access-Control-Allow-Origin: https://trang-doc-hai.evil`.

### Test A2: Permit Local Development Origin
```bash
curl -i -X POST http://127.0.0.1:3001/api/fetch-url \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```
**Expected Outcome**: Response includes `Access-Control-Allow-Origin: http://localhost:3000` and `200 OK`.

---

## 3. Part B Manual Verification (SSRF Protection)

With proxy running on `127.0.0.1:3001`:

### Test B1: Block Intranet / Loopback Access
```bash
curl -i -X POST http://127.0.0.1:3001/api/fetch-url \
  -H "Content-Type: application/json" \
  -d '{"url":"http://127.0.0.1:3001/health"}'
```
**Expected Outcome**: HTTP `400 Bad Request` with payload:
```json
{
  "ok": false,
  "error": "Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."
}
```

### Test B2: Block Localhost by Hostname
```bash
curl -i -X POST http://127.0.0.1:3001/api/fetch-url \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:8008"}'
```
**Expected Outcome**: HTTP `400 Bad Request` with identical error message.

### Test B3: Allow Public Internet URL
```bash
curl -i -X POST http://127.0.0.1:3001/api/fetch-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```
**Expected Outcome**: HTTP `200 OK` with extracted article title and content.

---

## 4. Part C Manual Verification (Packaged Electron Build)

### Step 1: Package Unpacked Binary Directory
```bash
npm run build && npm run build:electron && npx electron-builder --win --dir
```

### Step 2: Launch Packaged VoxRead
Without running `node server.js` in any terminal:
- Open Windows Explorer or terminal and launch `release/win-unpacked/VoxRead.exe`.

### Step 3: Verify "Đọc từ liên kết" Works Automatically
- Open **"Đọc từ liên kết"** tab in VoxRead.
- Enter a public article URL (e.g. `https://vnexpress.net` or `https://example.com`).
- Click **"Lấy nội dung"**.
- Confirm that article content is extracted and loaded into the chapter list.

### Step 4: Verify Clean Process Cleanup
- Right-click VoxRead tray icon in taskbar notification area -> Select **"Thoát"**.
- Open Task Manager or run `tasklist | findstr /i "VoxRead node electron"` in PowerShell.
- Confirm zero orphan child processes remain running on port 3001 or port 8008.