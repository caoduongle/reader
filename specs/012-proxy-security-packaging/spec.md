# Feature Specification: Proxy Server Security Hardening & Electron Auto-Spawn

**Feature Branch**: `012-proxy-security-packaging`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "Sửa 3 vấn đề sau trong repo VoxRead (caoduongle/reader), làm theo đúng thứ tự A → B → C, commit riêng từng phần để dễ review/rollback độc lập. === PHẦN A: Siết CORS trong server.js (thay Access-Control-Allow-Origin: '*') === ... === PHẦN B: Chặn SSRF trong route POST /api/fetch-url (server.js) === ... === PHẦN C: Tự động spawn server.js trong app Electron đã đóng gói === ..."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Restrict Express Proxy CORS to Authorized Origins (Priority: P1) 🎯 MVP Part A

As a user running VoxRead on my computer, I want the local Express proxy server to reject cross-origin requests from arbitrary websites visited in external browser tabs, so that malicious websites cannot abuse my local Gemini quota (`/api/generate`) or use my machine to scan or fetch URLs (`/api/fetch-url`).

**Why this priority**: Leaving `Access-Control-Allow-Origin: '*'` exposes sensitive local endpoints to any malicious webpage opened in the user's web browser, causing silent Gemini quota theft and local network reconnaissance.

**Independent Test**:
- Send preflight `OPTIONS` and `POST /api/fetch-url` with `Origin: https://trang-doc-hai.evil` -> verify `Access-Control-Allow-Origin` is NOT returned.
- Send a request with `Origin: http://localhost:3000` -> verify `Access-Control-Allow-Origin: http://localhost:3000` is returned.
- Send a request without an `Origin` header (curl / server-to-server) -> verify the request passes without CORS headers.

**Acceptance Scenarios**:

1. **Given** a cross-origin request originating from an untrusted web origin (e.g. `https://trang-doc-hai.evil`), **When** an OPTIONS preflight or POST request reaches the proxy server, **Then** the server does NOT include an `Access-Control-Allow-Origin` header matching that origin, causing modern browsers to automatically block the request.
2. **Given** a request from the local Vite development server (`http://localhost:3000` or `http://127.0.0.1:3000`), **When** sent to the proxy server, **Then** the server sets `Access-Control-Allow-Origin` to that exact origin and allows preflight and actual requests to succeed.
3. **Given** a packaged Electron application where the renderer requests resources, **When** the renderer sends requests with its verified origin (`'null'` or custom protocol origin for packaged Electron `file://` contexts), **Then** the server recognizes the origin and sets `Access-Control-Allow-Origin` appropriately.
4. **Given** a non-browser client (such as curl, Electron main process, or server-to-server) with no `Origin` header, **When** reaching the proxy, **Then** the server processes the request normally without attaching CORS headers.

---

### User Story 2 - Prevent Server-Side Request Forgery (SSRF) in URL Fetching (Priority: P1) 🎯 MVP Part B

As a security-conscious user, I want the URL article fetching endpoint (`POST /api/fetch-url`) to strictly reject intranet, loopback, private, and reserved network addresses, so that external or untrusted links cannot be used to probe or attack internal services (such as the local RVC server on port 8008, local router admin portals, or cloud metadata endpoints).

**Why this priority**: Unchecked URL fetching allows attackers or malicious links to pivot through the user's desktop to scan or compromise private network devices.

**Independent Test**:
- Send `POST /api/fetch-url` with `{ "url": "http://127.0.0.1:3001/health" }` -> verify HTTP 400 with message `"Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."`.
- Send `POST /api/fetch-url` with `{ "url": "http://localhost:8008" }` -> verify HTTP 400 with the same message.
- Send `POST /api/fetch-url` with `{ "url": "https://example.com" }` -> verify normal public article extraction continues to work.
- Run automated unit tests in `tests/unit/fetchUrl.test.ts`.

**Acceptance Scenarios**:

1. **Given** a request to fetch `localhost`, loopback addresses (`127.0.0.0/8`, `::1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`, `fe80::/10`), unique local (`fc00::/7`), carrier-grade NAT (`100.64.0.0/10`), multicast/reserved ranges (`>= 224.0.0.0`), or IPv4-mapped IPv6 (`::ffff:x.x.x.x`), **When** `POST /api/fetch-url` is invoked, **Then** the server rejects the request with HTTP 400 and clear Vietnamese message: `"Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."`.
2. **Given** a hostname that resolves via DNS to at least one private/reserved IP, **When** checked prior to fetching, **Then** the server throws a validation error and returns HTTP 400 before establishing any HTTP connection.
3. **Given** a public website URL (e.g. `https://example.com`), **When** `POST /api/fetch-url` is invoked, **Then** the server resolves the public IP, proceeds with the fetch, and extracts the article content normally.

---

### User Story 3 - Automatic Bundling and Lifecycle Management in Packaged Electron App (Priority: P1) 🎯 MVP Part C

As an end user running the installed desktop application (`VoxRead.exe`), I want the Express proxy server to automatically start in the background when VoxRead launches and terminate completely when VoxRead exits, so that the "Đọc từ liên kết" feature works out-of-the-box without requiring me to install Node.js or run terminal commands manually.

**Why this priority**: Currently `server.js` is not packaged or spawned by Electron, rendering the "Đọc từ liên kết" and proxy features non-functional in release builds unless developers run `node server.js` manually in a separate terminal.

**Independent Test**:
- Package the application directory (`npm run build && npm run build:electron && npx electron-builder --win --dir`).
- Launch `release/win-unpacked/VoxRead.exe` without starting any terminal processes.
- Open "Đọc từ liên kết", fetch an article URL, and observe successful extraction.
- Close VoxRead via System Tray ("Thoát") and verify in Task Manager that no orphan Electron or Node processes remain.

**Acceptance Scenarios**:

1. **Given** the build command `npm run build:electron`, **When** executed, **Then** esbuild bundles `server.js` into a standalone CommonJS file `dist-electron/server.cjs` targeting Node 18, bundled alongside `main.cjs` and `preload.cjs`.
2. **Given** the packaged desktop application launching, **When** `app.whenReady()` executes, **Then** Electron spawns `dist-electron/server.cjs` using `process.execPath` with `ELECTRON_RUN_AS_NODE: '1'`, polling `http://127.0.0.1:3001/health` until ready (up to 60 attempts, 1s interval).
3. **Given** a scenario where the proxy script is missing or fails to spawn, **When** VoxRead starts, **Then** a localized prerequisite warning dialog is displayed explaining that "Đọc từ liên kết" will be unavailable, while allowing the main window to open gracefully without crashing.
4. **Given** the user exits the application (via window close when quitting or tray "Thoát"), **When** quitting triggers, **Then** all child process trees (both Python backend and Express proxy) are cleanly terminated using Windows `taskkill /F /T /PID`.

---

### Edge Cases

- **DNS Rebinding Limitation**: Pre-fetch DNS resolution cannot fully prevent time-of-check to time-of-use (TOCTOU) DNS rebinding if an attacker dynamically switches DNS answers between resolution and fetch. A clear architectural code comment must document this known limitation.
- **IPv4-Mapped IPv6 Addresses**: Addresses like `::ffff:127.0.0.1` or `::ffff:192.168.1.1` must be normalized and stripped to their IPv4 representation so they are rigorously caught by the private IP filter.
- **Electron Opaque Origin (`null`)**: Packaged Electron apps serving pages via `file://` serialize the `Origin` header as `"null"`. The exact origin must be verified on the target build and safely accommodated without allowing wildcards (`*`).
- **Gemini Key Absence in Packaged Mode**: `POST /api/generate` remains functional if `GEMINI_API_KEY` is present; if absent, it returns a 503 response cleanly without crashing the spawned server process.
- **Orphan Process Prevention**: If the application crashes unexpectedly or is terminated from the tray, child process termination must ensure no ghost server locks port 3001 on the user's machine.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Part A: CORS Restriction (server.js)
- **FR-001**: The Express server MUST replace the wildcard CORS header (`res.header('Access-Control-Allow-Origin', '*')`) with an explicit whitelist validation middleware.
- **FR-002**: The allowed origin whitelist MUST include `'http://localhost:3000'`, `'http://127.0.0.1:3000'`, and the verified packaged Electron origin (`'null'`).
- **FR-003**: If `req.headers.origin` matches an entry in the whitelist, the server MUST return `Access-Control-Allow-Origin` set strictly to that origin.
- **FR-004**: If `req.headers.origin` is present but NOT in the whitelist, the server MUST NOT set `Access-Control-Allow-Origin`.
- **FR-005**: If `req.headers.origin` is omitted (e.g. non-browser clients), the server MUST NOT set `Access-Control-Allow-Origin` and MUST permit the request to proceed.
- **FR-006**: The CORS middleware MUST handle `OPTIONS` preflight requests, returning HTTP 204.
- **FR-007**: The CORS middleware MUST apply globally across all proxy routes (`/health`, `/api/generate`, `/api/fetch-url`).

#### Part B: SSRF Protection (server.js & SSRF helper)
- **FR-008**: The system MUST implement an IP classification helper (`isPrivateOrReservedIp`) covering:
  - IPv4: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16` (including cloud metadata `169.254.169.254`), `172.16.0.0/12`, `192.168.0.0/16`, `>= 224.0.0.0` (multicast & reserved).
  - IPv6: `::1`, `fc00::/7` (unique local), `fe80::/10` (link-local), and IPv4-mapped IPv6 (`::ffff:x.x.x.x`).
- **FR-009**: The system MUST implement an asynchronous host validation helper (`assertPublicHost`) that rejects `localhost` immediately and resolves all DNS records (`dns.promises.lookup` with `{ all: true }`), throwing an error if any resolved IP is private or reserved.
- **FR-010**: Route `POST /api/fetch-url` MUST invoke `assertPublicHost(parsedUrl.hostname)` before performing `fetch()`.
- **FR-011**: If host validation fails due to a private or reserved address, `POST /api/fetch-url` MUST return HTTP 400 with message `"Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."`.
- **FR-012**: The codebase MUST include unit test coverage in `tests/unit/fetchUrl.test.ts` asserting that private/loopback URLs are blocked and public URLs continue to succeed.

#### Part C: Electron Auto-Spawn & Bundling
- **FR-013**: The npm script `"build:electron"` MUST bundle `server.js` into `dist-electron/server.cjs` using `esbuild` with `--bundle --platform=node --target=node18`.
- **FR-014**: In `electron/main.ts`, a `startProxyServer()` function MUST locate `dist-electron/server.cjs` across dev and packaged modes, spawn it using `process.execPath` with `ELECTRON_RUN_AS_NODE: '1'`, and poll `http://127.0.0.1:3001/health` for readiness (60 attempts, 1s interval).
- **FR-015**: In `electron/main.ts`, child process cleanup on application exit (`before-quit` and tray "Thoát") MUST terminate both the Python backend process and the Express proxy process tree cleanly using `taskkill /F /T /PID` on Windows.
- **FR-016**: If the proxy script cannot be found or fails to start, the system MUST display a non-blocking informational dialog warning the user in Vietnamese that "Đọc từ liên kết" will be unavailable, without crashing the application.

---

### Non-Functional & Scope Constraints

- **NFR-001**: No modifications to `python-backend/`.
- **NFR-002**: Existing JSON API contracts and response bodies MUST be strictly preserved.
- **NFR-003**: Code changes must pass `npm test`, `npx tsc --noEmit`, and `npx eslint .`.
- **NFR-004**: Execution order MUST strictly follow Part A -> Part B -> Part C with separate git commits for each part.
- **NFR-005**: All user-facing dialogs, warnings, and error messages MUST maintain the established Vietnamese tone.

---

### Key Entities

- **Origin Whitelist**: Set of trusted origins (`http://localhost:3000`, `http://127.0.0.1:3000`, verified Electron file context origin).
- **Host Validation Result**: Decision indicating whether a target hostname resolves exclusively to public internet IPs.
- **Proxy Process Controller**: State holder managing the spawned child process PID, health polling loop, and termination handlers in Electron main.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Preflight and POST requests from untrusted web origins are rejected by browsers due to omission of `Access-Control-Allow-Origin`.
- **SC-002**: Requests to fetch intranet, loopback, or metadata addresses via `POST /api/fetch-url` return HTTP 400 in 100% of test cases.
- **SC-003**: The packaged desktop binary (`VoxRead.exe`) launches the proxy server automatically in the background without user intervention, and "Đọc từ liên kết" loads online articles successfully.
- **SC-004**: Exiting VoxRead via the system tray cleanly terminates all spawned child processes with 0 leftover orphan processes.
- **SC-005**: All test suites pass with 100% success rate (`npm test`), zero TypeScript compilation errors (`tsc --noEmit`), and zero ESLint errors (`eslint .`).

---

## Assumptions

- Electron in production loads UI from `file://` or packaged assets where renderer `Origin` serializes to `'null'`, verified via build inspection.
- Node 18+ runtime APIs (`dns/promises`, `fetch`, `AbortSignal.timeout`) are available in the Electron runtime.
- GEMINI_API_KEY configuration UX in packaged mode is handled independently as an out-of-scope concern; `POST /api/fetch-url` operates completely independently of `GEMINI_API_KEY`.