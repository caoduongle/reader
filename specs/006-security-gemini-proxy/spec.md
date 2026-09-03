# Feature Specification: Gemini API Key Security Audit, Server-Side Proxy & SECURITY.md

**Feature Branch**: `006-security-gemini-proxy`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "Nhiệm vụ: 1. Grep toàn bộ repo tìm mọi chỗ dùng GEMINI_API_KEY, process.env, import.meta.env, và mọi import từ @google/genai trong src/ và electron/. Liệt kê đầy đủ danh sách file + số dòng trong PR description; 2. Với MỖI chỗ gọi Gemini API tìm được, xác định nó chạy ở đâu: renderer process/trình duyệt hay ở main process Electron / server Node riêng. Ghi kết luận rõ ràng; 3. Nếu phát hiện API key có khả năng bị bundle vào code client: triển khai lớp proxy bằng Express — client gọi tới endpoint nội bộ (/api/generate), proxy giữ key ở server/main-process và forward tới Gemini; 4. Kiểm tra .gitignore đã chặn .env thật chưa; chạy git log -p để xác nhận chưa từng có secret thật bị commit; 5. Viết SECURITY.md ở root: cảnh báo server RVC bind 127.0.0.1, chính sách GEMINI_API_KEY không hardcode/commit, cách xoay vòng, cách báo lỗi bảo mật; Ràng buộc: Không lộ key thật, giữ nguyên hành vi app."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Security Audit of Credentials & API Entry Points (Priority: P1)

As a security auditor and maintainer, I want a complete audit of all environment variable usages (`GEMINI_API_KEY`, `process.env`, `import.meta.env`) and `@google/genai` package imports across `src/` and `electron/`, with explicit determination of execution context (client renderer vs server/main process) and verification that no real secrets exist in git history, so that the project has zero accidental credential exposure.

**Why this priority**: Client bundles (`dist/assets/*.js`) are publicly readable by any end user. Leaking API keys into client bundles or git history can lead to unauthorized cloud quota consumption, bill spikes, and account suspension.

**Independent Test**: Can be tested by running static analysis across the entire codebase (`grep_search` and `git log -p`), inspecting all references to environment variables, checking git history for secret patterns (`AIza...`), and verifying that `.gitignore` prevents uncommitted `.env` files from being tracked.

**Acceptance Scenarios**:

1. **Given** the codebase in `src/` and `electron/`, **When** auditing all environment variable accesses and `@google/genai` imports, **Then** an exhaustive inventory lists every occurrence with file path, line number, and runtime context (Renderer/Client vs Main/Server).
2. **Given** repository commit history, **When** inspecting git logs for `.env*` files and Google API key tokens (`AIza...`), **Then** confirmation verifies that zero real secret values were ever committed to version control.
3. **Given** the root `.gitignore` file, **When** inspecting environment variable rules, **Then** `.env*` is confirmed ignored, with only `.env.example` permitted.

---

### User Story 2 - Server-Side Proxy Safeguard for Gemini API (Priority: P1)

As an application user or developer, I want all Gemini AI API interactions to route through a secure, server-side Node.js/Express proxy or Electron main process handler, so that the `GEMINI_API_KEY` remains strictly protected in a server environment and is never exposed in client bundles or network request headers sent directly from the browser.

**Why this priority**: Calling generative AI APIs directly from client code exposes credentials in network inspection tabs and browser memory. A dedicated server-side proxy ensures requests are authenticated securely using server environment variables.

**Independent Test**: Can be tested by verifying the proxy architecture:
- Start the server proxy: verify it loads `GEMINI_API_KEY` from `.env` via `dotenv` without leaking it to client-accessible bundles.
- Send a request to `/api/generate`: verify the proxy forwards the payload to Gemini using `@google/genai` and returns the response.
- Build production assets (`npm run build`): verify `dist/` contains zero API keys or server credentials.

**Acceptance Scenarios**:

1. **Given** an Express proxy server (`server.js`) configured with `dotenv` and `@google/genai`, **When** client code makes an AI request, **Then** the request targets an internal endpoint (`http://127.0.0.1:3001/api/generate` or `/api/generate`), keeping `GEMINI_API_KEY` isolated on the server.
2. **Given** production build outputs in `dist/assets/`, **When** inspecting bundled JavaScript files, **Then** zero references to `GEMINI_API_KEY` or raw Google API keys are present.
3. **Given** a reading session using existing TTS providers (`browser` or `rvc-local`), **When** reading text, **Then** the reading and sentence highlighting workflow functions identically with zero regressions.

---

### User Story 3 - Authoritative Security Policy Document (`SECURITY.md`) (Priority: P2)

As a contributor or external security researcher, I want a clear, concise `SECURITY.md` file at the root of the repository, so that I understand how local microservices (RVC server) should be secured on localhost (`127.0.0.1`), how API keys must be handled and rotated, and how to responsibly report vulnerabilities.

**Why this priority**: Clear security guidelines prevent dangerous deployment practices (e.g. binding local servers to `0.0.0.0` exposing them to LAN/WAN) and provide standardized procedures for credential hygiene and vulnerability disclosure.

**Independent Test**: Can be tested by reading `SECURITY.md` in repository root: verify that it covers (a) local server loopback binding to `127.0.0.1`, (b) `GEMINI_API_KEY` storage, rotation, and revocation policies, and (c) responsible disclosure contact methods.

**Acceptance Scenarios**:

1. **Given** the repository root, **When** inspecting files, **Then** `SECURITY.md` exists and contains explicit warnings that local servers (`python-backend/server.py` on port `8008`, Express proxy) must strictly bind to `127.0.0.1`.
2. **Given** a developer handling API keys, **When** reviewing `SECURITY.md`, **Then** clear instructions outline how to configure keys in `.env`, verify `.gitignore`, and rotate keys in Google AI Studio if compromised.
3. **Given** a security researcher discovering an issue, **When** consulting `SECURITY.md`, **Then** actionable steps explain how to report vulnerabilities privately.

---

### Edge Cases

- **Client Bundle Secret Leakage via Vite**: Vite automatically injects environment variables prefixed with `VITE_` into client bundles. The project must never define `VITE_GEMINI_API_KEY` or bundle server-side `dotenv` into client code.
- **Local Network Exposure via `0.0.0.0`**: Any server running on the user's machine (Flask RVC microservice, Express proxy) that binds to `0.0.0.0` allows any device on the local Wi-Fi/LAN to send requests. All local servers must bind strictly to `127.0.0.1` (loopback).
- **Graceful Handling of Missing API Keys**: When `GEMINI_API_KEY` is not provided in `.env`, the proxy must return an informative HTTP 401/500 JSON error (`{ error: "GEMINI_API_KEY is not configured" }`) without crashing the server process.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST perform an exhaustive codebase audit for `GEMINI_API_KEY`, `process.env`, `import.meta.env`, and `@google/genai`, classifying each by runtime execution context (Client Renderer vs Main/Server).
- **FR-002**: System MUST verify that `.gitignore` strictly excludes real environment variable files (`.env*`) while preserving `.env.example`.
- **FR-003**: System MUST verify via git history analysis that zero actual API keys (`AIza...`) have ever been committed to the repository.
- **FR-004**: System MUST provide a secure Express server-side proxy (`server.js`) leveraging existing dependencies (`express`, `dotenv`, `@google/genai`) to handle Gemini API requests on localhost, ensuring the API key is never exposed to client bundles.
- **FR-005**: System MUST configure the proxy to bind strictly to `127.0.0.1` with CORS restricted or configured for local development.
- **FR-006**: System MUST author `SECURITY.md` at the repository root covering:
  - Local microservice binding policy (`127.0.0.1` loopback only, never `0.0.0.0`).
  - `GEMINI_API_KEY` handling, environment isolation, and rotation steps.
  - Responsible vulnerability disclosure guidelines.
- **FR-007**: System MUST preserve all existing application functionality, ensuring that `browser` Web Speech and `rvc-local` TTS providers continue to operate without regression.
- **FR-008**: System MUST NOT output, log, or commit any real API key values during execution.

---

### Non-Functional & Scope Constraints

- **NFR-001 (Zero Credential Leakage)**: Client bundle inspection must prove 0 API keys embedded in static assets.
- **NFR-002 (Loopback Security)**: All local network listeners must bind exclusively to `127.0.0.1`.
- **NFR-003 (Behavioral Stability)**: Existing document reading and playback features must remain 100% functional.

---

### Key Entities

- **SecurityAuditReport**: The structured inventory of all credential and API touchpoints across the repository.
- **ExpressGeminiProxy**: A lightweight Node.js Express server (`server.js`) that securely mediates between client requests and Google Gemini API.
- **SecurityPolicyDocument**: The root `SECURITY.md` documentation governing local network exposure and secret management.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of references to `GEMINI_API_KEY`, `process.env`, `import.meta.env`, and `@google/genai` are cataloged with file paths and line numbers.
- **SC-002**: Verification confirms zero real API keys exist in git history or client build outputs.
- **SC-003**: `SECURITY.md` exists at repository root with all required policies.
- **SC-004**: Express server proxy is implemented and verified runnable on `127.0.0.1`.
- **SC-005**: `npm run lint` passes with 0 errors and existing reader functionality remains intact.

---

## Assumptions

- Developers using Gemini features will supply their own API key via a local, untracked `.env` file (`GEMINI_API_KEY=...`).
- The reading application can run in either standalone desktop mode (Electron), browser mode with Web Speech / RVC, or with the optional Express Gemini proxy.
