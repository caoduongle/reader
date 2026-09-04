# Research: Proxy Security Hardening & Electron Packaging

**Feature**: `012-proxy-security-packaging`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## 1. CORS Middleware Whitelisting (Part A)

### Context & Problem
Currently, `server.js` applies a wildcard header across all routes:
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  ...
});
```
This enables any external website opened in a browser (e.g., `https://evil.com`) to initiate cross-origin background fetch requests to `http://127.0.0.1:3001/api/generate` (burning local Gemini API quota) and `http://127.0.0.1:3001/api/fetch-url` (SSRF/local network probing).

### Decision
- Replace wildcard origin with an exact-match whitelist:
  ```javascript
  const ALLOWED_ORIGINS = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'null', // Electron packaged file:// origin
  ]);
  ```
- **Origin Handling Rules**:
  1. If `req.headers.origin` is present AND in `ALLOWED_ORIGINS` -> Set `Access-Control-Allow-Origin: req.headers.origin`. Also set `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`.
  2. If `req.headers.origin` is present but NOT in `ALLOWED_ORIGINS` -> Do NOT set `Access-Control-Allow-Origin`. Browser automatically aborts the request/preflight without server needing to return 403.
  3. If `req.headers.origin` is absent (non-browser requests such as curl, Electron main process, server-to-server) -> Proceed normally without setting CORS headers.
  4. Preflight `OPTIONS` requests: If origin is whitelisted or absent, return 204 No Content. If origin is untrusted, return 204 without `Access-Control-Allow-Origin` (browser rejects preflight).

### Electron `file://` Origin Verification
- When Electron loads renderer via `loadFile('dist/index.html')` (the `file://` protocol), the browser engine treats this as an opaque origin. Cross-origin `fetch` calls serialize `Origin: null` (the string `"null"`).
- Including `'null'` in `ALLOWED_ORIGINS` satisfies requests from the packaged Electron renderer while blocking external web domains like `https://attacker.site`.

### Alternatives Considered
- *Using third-party `cors` npm package*: Added unnecessary external dependency for a 15-line native Express middleware with explicit whitelist semantics.
- *Returning HTTP 403 explicitly for non-whitelisted origins*: Not recommended for CORS because CORS is an enforcement mechanism implemented by the user agent (browser). Simply withholding `Access-Control-Allow-Origin` allows browsers to enforce the boundary standardly.

---

## 2. SSRF Protection Helper (Part B)

### Context & Problem
`POST /api/fetch-url` accepts an arbitrary URL from the client and fetches it server-side. Without IP validation, users or malicious pages can fetch `http://127.0.0.1:8008` (RVC server), internal router setup pages (`192.168.1.1`), or cloud metadata endpoints (`169.254.169.254`).

### Decision
Create a dedicated helper module `lib/ssrfGuard.js` with two primary functions:
1. `isPrivateOrReservedIp(ip: string): boolean`:
   - Inspects both IPv4 and IPv6 representations.
   - Converts IPv4-mapped IPv6 (`::ffff:a.b.c.d`) to standard IPv4 notation before checking.
   - Evaluates against the following CIDRs/ranges:
     - **IPv4**:
       - `0.0.0.0/8` (Current network)
       - `10.0.0.0/8` (Private network RFC 1918)
       - `100.64.0.0/10` (Carrier-grade NAT RFC 6598)
       - `127.0.0.0/8` (Loopback RFC 1122)
       - `169.254.0.0/16` (Link-local RFC 3927, includes cloud metadata `169.254.169.254`)
       - `172.16.0.0/12` (Private network RFC 1918)
       - `192.168.0.0/16` (Private network RFC 1918)
       - `>= 224.0.0.0` (224.0.0.0/4 Multicast RFC 5771 & 240.0.0.0/4 Reserved RFC 1112)
     - **IPv6**:
       - `::1` or `0:0:0:0:0:0:0:1` (Loopback)
       - `fc00::/7` (Unique local address RFC 4193)
       - `fe80::/10` (Link-local unicast RFC 4291)
       - `::/128` (Unspecified)
2. `assertPublicHost(hostname: string): Promise<void>`:
   - If `hostname === 'localhost'` or ends in `.localhost` / `.local` -> Throw error immediately.
   - If `hostname` is a raw IP literal (IPv4 or IPv6) -> Run `isPrivateOrReservedIp(hostname)`.
   - If `hostname` is a domain name -> Resolve all A/AAAA records using `dns.promises.lookup(hostname, { all: true })`.
   - If any resolved address returns `true` for `isPrivateOrReservedIp` -> Throw error.
3. In `POST /api/fetch-url`, catch validation errors and return HTTP 400 with:
   `"Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này."`

### DNS Rebinding Architectural Note
Pre-fetch DNS resolution cannot completely guarantee protection against TOCTOU (Time-Of-Check to Time-Of-Use) DNS rebinding attacks where an attacker configures a DNS server with a low TTL that resolves to a public IP during `assertPublicHost()`, but resolves to `127.0.0.1` during `fetch()`. Fully mitigating DNS rebinding requires low-level custom `lookup` functions in `http.Agent`/`https.Agent`. A clear architectural note is documented in code comments to explain this known trade-off.

### Alternatives Considered
- *Inlining IP checking in server.js*: `lib/ssrfGuard.js` keeps `server.js` clean, promotes separation of concerns, and facilitates unit testing.
- *Using third-party `ipaddr.js`*: A lightweight pure JavaScript parser in `lib/ssrfGuard.js` using Node's standard `net.isIP` avoids extra npm dependencies while fully covering all required CIDRs.

---

## 3. Bundling & Electron Auto-Spawn (Part C)

### Context & Problem
`server.js` is an ES module using dependencies `express`, `dotenv`, `@google/genai`, `@mozilla/readability`, and `jsdom`.
Electron in production currently only runs `python-backend` (RVC). `server.js` is neither bundled nor executed in packaged `.exe` builds.

### Investigation & Discovery: Bundling JSDOM with esbuild
When bundling `server.js` to `dist-electron/server.cjs` via `esbuild`, three runtime obstacles emerge:
1. `node_modules/jsdom/lib/jsdom/living/css/helpers/computed-style.js` calls `fs.readFileSync(path.resolve(__dirname, "../../../browser/default-stylesheet.css"))`. When bundled, `__dirname` resolves relative to `dist-electron/`, triggering an `ENOENT` error.
2. `node_modules/css-tree/lib/*.js` files call `createRequire(import.meta.url)`. In CommonJS bundles, `import.meta.url` is `undefined`, causing `TypeError [ERR_INVALID_ARG_VALUE]`.
3. `node_modules/jsdom/lib/jsdom/living/xhr/XMLHttpRequest-impl.js` calls `require.resolve("./xhr-sync-worker.js")`, throwing `MODULE_NOT_FOUND` because the worker file is not in `dist-electron/`.

### Bundling Solution: `scripts/bundle-server.mjs`
We created a lightweight esbuild runner with an `onLoad` patch plugin:
- Inlines `default-stylesheet.css` into `computed-style.js`.
- Comments out `const require = createRequire(import.meta.url);` across `css-tree/lib/*.js` (Node's CJS environment provides `require` natively).
- Replaces `require.resolve("./xhr-sync-worker.js")` with `null` (sync XHR is unused by Readability).
Verified: The resulting 14.8MB `dist-electron/server.cjs` loads cleanly without errors.

### Process Spawning & Lifecycle in `electron/main.ts`
1. **Spawn Strategy**:
   ```typescript
   const proxyProcess = spawn(process.execPath, [proxyScriptPath], {
     env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
     cwd: path.dirname(proxyScriptPath),
     detached: false,
     stdio: 'ignore',
   });
   ```
2. **Path Resolution**:
   - Packaged: `path.join(app.getAppPath(), 'dist-electron', 'server.cjs')` or `path.join(__dirname, 'server.cjs')`.
   - Development: `path.join(app.getAppPath(), 'dist-electron', 'server.cjs')`.
3. **Health Check Polling**:
   - Poll `http://127.0.0.1:3001/health` with `fetch()`.
   - Up to 60 attempts with 1000ms delay. Successful when `response.ok && body.status === 'ok'`.
4. **Cleanup Strategy**:
   - Refactor `killPythonBackend()` to `killChildProcesses()` to terminate both `pythonProcess` and `proxyProcess` using Windows `taskkill /F /T /PID ${pid}`.
   - Hooked into `app.on('before-quit')` and Tray "Thoát" menu click.
5. **Fallback & Graceful Degradation**:
   - If script missing or spawn fails, invoke `showPrerequisiteWarning` warning the user that "Đọc từ liên kết" is disabled, without crashing the main window.