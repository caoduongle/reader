# Tasks: Proxy Server Security Hardening & Electron Auto-Spawn

**Feature**: `012-proxy-security-packaging`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Environment Inspection

**Purpose**: Verify clean workspace and ports before making modifications.

- [X] T001 Inspect git branch state and verify local ports 3001 and 8008 are unoccupied in repo root

---

## Phase 2: Foundational Prerequisites

**Purpose**: Baseline existing test and compilation suites to ensure zero pre-existing failures.

- [X] T002 Verify baseline automated tests pass with `npm test` and TypeScript check passes with `npx tsc --noEmit`

---

## Phase 3: User Story 1 — Restrict Proxy CORS to Authorized Origins (Part A) [US1] 🎯 MVP Part A

**Goal**: Replace wildcard `Access-Control-Allow-Origin: '*'` with an explicit whitelist (`http://localhost:3000`, `http://127.0.0.1:3000`, `'null'`). Set matching origin on valid requests, handle preflight `OPTIONS` returning HTTP 204, and omit CORS headers for unknown origins (letting browsers block them automatically).

**Independent Test**:
1. `curl -i -X POST http://127.0.0.1:3001/api/fetch-url -H "Origin: https://trang-doc-hai.evil" -H "Content-Type: application/json" -d '{"url":"https://example.com"}'` -> `Access-Control-Allow-Origin` is NOT present.
2. `curl -i -X POST http://127.0.0.1:3001/api/fetch-url -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"url":"https://example.com"}'` -> Returns `Access-Control-Allow-Origin: http://localhost:3000`.

### Implementation for User Story 1

- [X] T003 [US1] Update CORS middleware in `server.js` to whitelist `http://localhost:3000`, `http://127.0.0.1:3000`, and `'null'`, set exact origin header when matched, omit header for non-browser or unlisted origins, and handle preflight `OPTIONS` returning 204.
- [X] T004 [US1] Verify Part A CORS behavior using manual curl commands against `server.js` for untrusted origin (`https://trang-doc-hai.evil`), trusted dev origin (`http://localhost:3000`), and non-browser client without origin header.
- [X] T005 [US1] Commit Part A independently with git commit message `feat(proxy): restrict CORS to authorized origins`.

**Checkpoint**: CORS is restricted to trusted origins only; Part A is cleanly committed.

---

## Phase 4: User Story 2 — Prevent Server-Side Request Forgery (SSRF) in URL Fetching (Part B) [US2] 🎯 MVP Part B

**Goal**: Prevent `POST /api/fetch-url` from accessing internal network addresses (loopback, private ranges, cloud metadata, link-local, carrier-grade NAT, multicast/reserved) in IPv4 and IPv6 via a dedicated helper and pre-fetch DNS inspection. Return HTTP 400 with a localized Vietnamese error message.

**Independent Test**:
1. `curl -i -X POST http://127.0.0.1:3001/api/fetch-url -H "Content-Type: application/json" -d '{"url":"http://127.0.0.1:3001/health"}'` -> Returns HTTP 400 with `{"ok":false,"error":"Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."}`.
2. `curl -i -X POST http://127.0.0.1:3001/api/fetch-url -H "Content-Type: application/json" -d '{"url":"https://example.com"}'` -> Returns HTTP 200 with extracted article content.
3. Run `npm test -- tests/unit/fetchUrl.test.ts` verifying all new and existing unit tests pass.

### Implementation for User Story 2

- [X] T006 [P] [US2] Create helper module `lib/ssrfGuard.js` implementing `isPrivateOrReservedIp(ip: string): boolean` (covering IPv4 `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `>= 224.0.0.0`, IPv6 `::1`, `fc00::/7`, `fe80::/10`, and IPv4-mapped IPv6) and `assertPublicHost(hostname: string): Promise<void>` via `dns.promises.lookup`, with documented commentary on DNS rebinding limitations.
- [X] T007 [US2] Integrate `await assertPublicHost(parsedUrl.hostname)` in `server.js` inside `POST /api/fetch-url` prior to `fetch()`, returning HTTP 400 with message `"Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."` when rejected.
- [X] T008 [P] [US2] Add unit test cases to `tests/unit/fetchUrl.test.ts` verifying rejection of loopback/private URLs (e.g. `http://127.0.0.1:3001/health`, `http://localhost:8008`) and successful extraction of public URLs.
- [X] T009 [US2] Run automated tests via `npm test -- tests/unit/fetchUrl.test.ts` and verify curl request against `http://127.0.0.1:3001/health`.
- [X] T010 [US2] Commit Part B independently with git commit message `feat(proxy): block SSRF requests in /api/fetch-url`.

**Checkpoint**: SSRF protection is active and verified with automated tests; Part B is cleanly committed.

---

## Phase 5: User Story 3 — Automatic Bundling and Lifecycle Management in Packaged Electron App (Part C) [US3] 🎯 MVP Part C

**Goal**: Bundle `server.js` into `dist-electron/server.cjs` and configure `electron/main.ts` to spawn it in the background using `process.execPath` with `ELECTRON_RUN_AS_NODE: '1'`, poll health on port 3001, terminate process trees cleanly on exit via Windows `taskkill /F /T /PID`, and show prerequisite warning dialog on error.

**Independent Test**:
1. Run `npm run build && npm run build:electron && npx electron-builder --win --dir`.
2. Launch `release/win-unpacked/VoxRead.exe` without starting any terminal server.
3. Open "Đọc từ liên kết", enter a web URL, and verify article content loads successfully.
4. Exit via Tray "Thoát" and verify in Task Manager that no node/electron/python orphan processes remain.

### Implementation for User Story 3

- [ ] T011 [P] [US3] Ensure `scripts/bundle-server.mjs` is configured with esbuild plugins to patch `computed-style.js` (inline `default-stylesheet.css`), `css-tree` (neutralize `createRequire(import.meta.url)` in CJS), and `XMLHttpRequest-impl.js` (worker file resolution).
- [ ] T012 [US3] Update npm script `"build:electron"` in `package.json` to bundle `server.js` using `node scripts/bundle-server.mjs`.
- [ ] T013 [US3] Implement `startProxyServer()` in `electron/main.ts` resolving `dist-electron/server.cjs` across dev and packaged modes, spawning via `process.execPath` with `ELECTRON_RUN_AS_NODE: '1'`, polling `http://127.0.0.1:3001/health` (60 attempts, 1s interval), and displaying `showPrerequisiteWarning()` if missing or failed.
- [ ] T014 [US3] Implement unified child process termination in `electron/main.ts` (`killChildProcesses()`) to cleanly terminate both `pythonProcess` and `proxyProcess` using Windows `taskkill /F /T /PID` in `app.on('before-quit')` and Tray "Thoát".
- [ ] T015 [US3] Build unpacked application with `npm run build && npm run build:electron && npx electron-builder --win --dir`, launch `release/win-unpacked/VoxRead.exe`, verify "Đọc từ liên kết" functions without manual server startup, and verify clean process exit from Tray.
- [ ] T016 [US3] Commit Part C independently with git commit message `feat(electron): auto-spawn Express proxy in packaged app`.

**Checkpoint**: Packaged application automatically spawns and manages proxy server; Part C is cleanly committed.

---

## Phase 6: Polish & Quality Gate Enforcement

**Purpose**: Execute full verification across all lint, typecheck, and test suites.

- [ ] T017 [P] Run full unit test suite with `npm test` and verify 100% pass across all tests
- [ ] T018 [P] Run TypeScript type checking with `npx tsc --noEmit` and confirm zero errors
- [ ] T019 [P] Run ESLint validation with `npx eslint .` and confirm zero lint errors
- [ ] T020 Validate final quickstart verification checklist in `specs/012-proxy-security-packaging/quickstart.md`

---

## Dependencies & Execution Order

```
Phase 1: Setup (T001)
       │
       ▼
Phase 2: Baseline Quality Check (T002)
       │
       ▼
Phase 3: Part A — CORS Whitelist in server.js (T003 - T005) ──► Commit A
       │
       ▼
Phase 4: Part B — SSRF Guard & Unit Tests (T006 - T010) ─────► Commit B
       │
       ▼
Phase 5: Part C — Electron Bundling & Auto-Spawn (T011 - T016) ─► Commit C
       │
       ▼
Phase 6: Polish & Final Quality Gates (T017 - T020)
```

---

## Implementation Strategy

### Sequential Delivery by Part (A → B → C)

1. **Part A (T003 - T005)**:
   - Smallest blast radius; modifies only the CORS middleware in `server.js`.
   - Verified via curl.
   - Separate commit: `feat(proxy): restrict CORS to authorized origins`.

2. **Part B (T006 - T010)**:
   - Adds `lib/ssrfGuard.js`, secures `POST /api/fetch-url`, adds unit tests.
   - Verified via curl and `npm test`.
   - Separate commit: `feat(proxy): block SSRF requests in /api/fetch-url`.

3. **Part C (T011 - T016)**:
   - Updates build script, bundles with patches, spawns in `electron/main.ts`, cleans up child processes.
   - Verified via `electron-builder --win --dir` and executing `VoxRead.exe`.
   - Separate commit: `feat(electron): auto-spawn Express proxy in packaged app`.

4. **Quality Gates (T017 - T020)**:
   - Re-run `npm test`, `npx tsc --noEmit`, and `npx eslint .` to guarantee complete integrity.