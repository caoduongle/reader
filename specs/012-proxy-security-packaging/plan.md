# Implementation Plan: Proxy Server Security Hardening & Electron Auto-Spawn

**Branch**: `012-proxy-security-packaging` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/012-proxy-security-packaging/spec.md`  

---

## Summary

This feature resolves 3 critical security and packaging issues in the Express proxy server (`server.js`) in strict sequential order (Part A → Part B → Part C), committed separately:

1. **Part A: Restrict CORS in `server.js`**: Replace `Access-Control-Allow-Origin: '*'` with an explicit origin whitelist (`http://localhost:3000`, `http://127.0.0.1:3000`, and verified Electron packaged `'null'`). Untrusted web origins receive no CORS header, blocking malicious sites from consuming Gemini quota or probing internal networks.
2. **Part B: Prevent SSRF in `POST /api/fetch-url`**: Create `lib/ssrfGuard.js` to validate target hostnames against private/reserved IPv4 (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, CGNAT, multicast) and IPv6 ranges (loopback, unique local, link-local, IPv4-mapped) via pre-fetch DNS lookup. Return HTTP 400 with clear Vietnamese error message. Add comprehensive Vitest test coverage in `tests/unit/fetchUrl.test.ts`.
3. **Part C: Auto-spawn Express Proxy in Packaged Electron App**: Bundle `server.js` into `dist-electron/server.cjs` via `esbuild` (using `scripts/bundle-server.mjs` with runtime patches for jsdom/css-tree). Update `electron/main.ts` to spawn the proxy using `process.execPath` with `ELECTRON_RUN_AS_NODE: '1'`, poll health on `127.0.0.1:3001/health`, clean up all child processes on exit via Windows `taskkill /F /T /PID`, and show localized warning if spawn fails.

---

## Technical Context

**Language/Format**: TypeScript / Node.js JavaScript (ESM & CommonJS) / Electron  
**Target Files**:
- `server.js` [MODIFY] (CORS whitelist middleware + SSRF guard integration)
- `lib/ssrfGuard.js` [NEW] (IP classification & asynchronous DNS host resolution)
- `tests/unit/fetchUrl.test.ts` [MODIFY] (Unit test cases for SSRF blocking and public URL access)
- `scripts/bundle-server.mjs` [NEW] (Esbuild bundling script with jsdom CSS & CSS-tree patches)
- `package.json` [MODIFY] (Update `build:electron` script to include `bundle-server.mjs`)
- `electron/main.ts` [MODIFY] (Implement `startProxyServer()`, `killChildProcesses()`, warning dialog)

**Testing & Verification**:
- Vitest unit test suite: `npm test -- tests/unit/fetchUrl.test.ts`
- TypeScript compiler verification: `npx tsc --noEmit`
- ESLint syntax & style: `npx eslint .`
- Manual curl verification for CORS and SSRF
- Full packaged build test: `npm run build && npm run build:electron && npx electron-builder --win --dir`

**Constraints**:
- Zero modifications to `python-backend/` (keep Python dedicated strictly to RVC voice synthesis).
- Existing JSON response contracts must remain intact.
- Preserved Vietnamese tone across all error banners, logs, and dialogs.
- Sequential execution: Part A → Part B → Part C with independent git commits for each part.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Dual-Stack Integrity | ✅ Passed | Python RVC backend untouched; Express proxy server cleanly managed alongside Python backend without conflicts. |
| II. True Quality Gates | ✅ Passed | Fully verified with automated Vitest suites and manual curl/build verification without mocking bypasses. |
| III. Resource Conservation | ✅ Passed | Bundled standalone proxy starts via existing Electron binary with `ELECTRON_RUN_AS_NODE: '1'`; process tree reliably killed on exit preventing orphan leaks. |
| IV. Build & Type Integrity | ✅ Passed | Preserves TypeScript strict mode; bundling verified to eliminate all jsdom dynamic require/ENOENT issues. |

---

## Project Structure

### Documentation (this feature)

```text
specs/012-proxy-security-packaging/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Phase 0: CORS, SSRF CIDRs & esbuild jsdom research
├── data-model.md        # Phase 1: Models, state diagrams & CIDR definitions
├── quickstart.md        # Phase 1: Automated tests, curl & packaging verification
├── contracts/           # Phase 1: Endpoint & lifecycle contracts
│   ├── cors-policy.md
│   ├── fetch-url-ssrf.md
│   └── proxy-lifecycle.md
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── package.json                         # [MODIFY] Update "build:electron"
├── server.js                            # [MODIFY] CORS whitelist + SSRF check
├── lib/
│   └── ssrfGuard.js                     # [NEW] IP classification & DNS validation
├── tests/
│   └── unit/
│       └── fetchUrl.test.ts             # [MODIFY] Unit tests for SSRF
├── scripts/
│   └── bundle-server.mjs                # [NEW] Esbuild bundler for server.js
└── electron/
    └── main.ts                          # [MODIFY] startProxyServer & cleanup
```

---

## Phases & Deliverables

### Phase 1: Part A — CORS Whitelist in `server.js`
1. Replace `res.header('Access-Control-Allow-Origin', '*')` in `server.js` with whitelist logic (`http://localhost:3000`, `http://127.0.0.1:3000`, `'null'`).
2. Implement preflight OPTIONS handling (return 204 No Content).
3. Test using `curl` with untrusted origin (`https://trang-doc-hai.evil`) and trusted origin (`http://localhost:3000`).
4. Commit Part A independently: `git commit -m "feat(proxy): restrict CORS to authorized origins"`.

### Phase 2: Part B — SSRF Protection in `POST /api/fetch-url`
1. Create `lib/ssrfGuard.js` implementing `isPrivateOrReservedIp(ip)` and `assertPublicHost(hostname)`.
2. Add DNS rebinding limitation commentary in `lib/ssrfGuard.js`.
3. Integrate `await assertPublicHost(parsedUrl.hostname)` in `server.js` inside `POST /api/fetch-url`, returning HTTP 400 with `"Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."` upon rejection.
4. Add unit test cases in `tests/unit/fetchUrl.test.ts` for loopback, private IP, and public URL.
5. Verify with `curl -X POST http://127.0.0.1:3001/api/fetch-url -d '{"url":"http://127.0.0.1:3001/health"}'`.
6. Run `npm test -- tests/unit/fetchUrl.test.ts`.
7. Commit Part B independently: `git commit -m "feat(proxy): block SSRF requests in /api/fetch-url"`.

### Phase 3: Part C — Electron Auto-Spawn & Bundling
1. Create `scripts/bundle-server.mjs` to bundle `server.js` into `dist-electron/server.cjs` with patches for jsdom `computed-style.js`, `css-tree`, and `XMLHttpRequest-impl.js`.
2. Update `"build:electron"` script in `package.json` to execute `node scripts/bundle-server.mjs`.
3. In `electron/main.ts`, implement `startProxyServer()`:
   - Resolve `dist-electron/server.cjs` across dev and packaged modes.
   - Spawn using `process.execPath` with `{ ELECTRON_RUN_AS_NODE: '1' }`.
   - Poll `http://127.0.0.1:3001/health` (up to 60 attempts, 1s interval).
   - Display `showPrerequisiteWarning` if missing/fails to spawn.
4. Update exit cleanup (`before-quit` and Tray "Thoát") to terminate both `pythonProcess` and `proxyProcess` using Windows `taskkill /F /T /PID`.
5. Verify packaged build with `npm run build && npm run build:electron && npx electron-builder --win --dir`.
6. Run `release/win-unpacked/VoxRead.exe` and test URL article extraction without manual terminal execution.
7. Verify process termination in Task Manager after clicking "Thoát".
8. Commit Part C independently: `git commit -m "feat(electron): auto-spawn Express proxy in packaged app"`.

### Phase 4: Final Quality Gates
1. Run `npm test` -> 100% pass.
2. Run `npx tsc --noEmit` -> 0 errors.
3. Run `npx eslint .` -> 0 errors.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**

