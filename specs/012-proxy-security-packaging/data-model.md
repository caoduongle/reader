# Data Model & Architecture: Proxy Security & Electron Auto-Spawn

**Feature**: `012-proxy-security-packaging`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. CORS Policy Configuration Model

```typescript
/**
 * Set of authorized origins allowed to perform cross-origin requests.
 */
export const ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'null', // Electron packaged application origin (file:// protocol)
]);

export interface CorsHeaderContext {
  origin: string | undefined;
  method: string;
  isAllowed: boolean;
}
```

### CORS Evaluation State Machine

```
Incoming Request
       │
       ▼
Has 'Origin' header?
   ├── NO  ──► Proceed normally (do not attach Access-Control-Allow-Origin)
   │
   └── YES ──► Origin in ALLOWED_ORIGINS?
                 ├── YES ──► Attach 'Access-Control-Allow-Origin': req.headers.origin
                 │           Attach 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                 │           Attach 'Access-Control-Allow-Headers': 'Content-Type'
                 │           If OPTIONS: sendStatus(204)
                 │           Else: next()
                 │
                 └── NO  ──► Do NOT attach 'Access-Control-Allow-Origin'
                             If OPTIONS: sendStatus(204)
                             Else: next()
                             (Browser automatically blocks response)
```

---

## 2. SSRF Protection & IP Classification Model

```typescript
export interface IPv4Range {
  name: string;
  start: number; // 32-bit integer representation
  end: number;   // 32-bit integer representation
}

export interface HostValidationResult {
  hostname: string;
  resolvedIps: string[];
  isPublic: boolean;
  blockedReason?: string;
}

export class SsrfValidationError extends Error {
  constructor(message: string = 'Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này.') {
    super(message);
    this.name = 'SsrfValidationError';
  }
}
```

### Private IPv4 CIDR Blocks
- `0.0.0.0/8` -> `0.0.0.0` - `0.255.255.255`
- `10.0.0.0/8` -> `10.0.0.0` - `10.255.255.255`
- `100.64.0.0/10` -> `100.64.0.0` - `100.127.255.255`
- `127.0.0.0/8` -> `127.0.0.0` - `127.255.255.255`
- `169.254.0.0/16` -> `169.254.0.0` - `169.254.255.255` (Cloud metadata: `169.254.169.254`)
- `172.16.0.0/12` -> `172.16.0.0` - `172.31.255.255`
- `192.168.0.0/16` -> `192.168.0.0` - `192.168.255.255`
- `224.0.0.0/3` (>= 224.0.0.0) -> Multicast & Reserved (`224.0.0.0` - `255.255.255.255`)

### Private IPv6 Blocks
- `::1` -> Loopback
- `fc00::/7` -> Unique Local Addresses (`fc00:...` to `fdff:...`)
- `fe80::/10` -> Link-local unicast (`fe80:...` to `febf:...`)
- `::ffff:0:0/96` -> IPv4-mapped IPv6 (extracted and tested against IPv4 rules)

---

## 3. Electron Proxy Process Model

```typescript
export interface ProxyProcessState {
  process: ChildProcess | null;
  scriptPath: string;
  port: number;
  healthUrl: string;
  isReady: boolean;
  spawnAttempts: number;
}
```

### Process Lifecycle Flow

```
Electron app.whenReady()
       │
       ├──► startPythonBackend() [port 8008]
       │
       └──► startProxyServer() [port 3001]
                 │
                 ▼
         Resolve proxyScriptPath (dist-electron/server.cjs)
                 │
                 ├── Not found? ──► showPrerequisiteWarning() -> Non-blocking continue
                 │
                 ▼
         spawn(process.execPath, [proxyScriptPath], {
           env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
         })
                 │
                 ▼
         Poll GET http://127.0.0.1:3001/health
                 │
                 ├── 200 { status: 'ok' } ──► isReady = true
                 │
                 └── Timeout after 60s ──► console.warn('Proxy health poll timed out')
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
App 'before-quit'    Tray "Thoát"
       │                   │
       └─────────┬─────────┘
                 ▼
       killChildProcesses()
         ├── taskkill /F /T /PID pythonProcess.pid
         └── taskkill /F /T /PID proxyProcess.pid
```