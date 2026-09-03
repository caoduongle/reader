# Research: Gemini API Key Security Audit, Server-Side Proxy & SECURITY.md

**Feature**: `006-security-gemini-proxy`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## 1. Static Analysis & Credential Audit

A complete audit of the codebase was conducted to identify all environment variable usages, API key references, and `@google/genai` touchpoints:

### A. Environment Variable References
| Pattern | File | Line | Runtime Context | Findings & Analysis |
|---|---|---|---|---|
| `GEMINI_API_KEY` | `.env.example` | 1, 4 | Example Template | Non-secret placeholder documentation (`GEMINI_API_KEY="MY_GEMINI_API_KEY"`). |
| `process.env` | `electron/main.ts` | 171 | Main Process (Node) | Used strictly for `NODE_ENV === 'development'`. Safe. |
| `process.env` | `vite.config.ts` | 18, 20 | Build Config (Node) | Used strictly for `DISABLE_HMR !== 'true'`. Safe. |
| `import.meta.env` | *(Global)* | - | - | **Zero occurrences across entire repository.** |

### B. Library Imports: `@google/genai`
| Package | File | Line | Context | Findings & Analysis |
|---|---|---|---|---|
| `@google/genai` | `package.json` | 49 | Dependency Manifest | Declared as dependency (`^2.4.0`), but **never imported** anywhere in `src/` or `electron/`. |

### C. Git History & Secret Leaks Audit
- `.gitignore` verification: Lines 19-21 contain `.env*` and `!.env.example`. Real `.env` files are strictly excluded from git tracking.
- Git commit inspection:
  - `git log -p --all -- "**.env*"`: Confirmed only `.env.example` was ever committed.
  - `git log -S "AIzaSy" --all`: **Zero results.** No active Google API keys have ever been committed in the history of the repository.

---

## 2. Server-Side Proxy Architecture for Gemini API

### Problem
If frontend client code calls `https://generativelanguage.googleapis.com` directly, the API key must either be entered by the user in the browser or bundled into the client code. Bundling any key into client assets (`dist/assets/index-*.js`) exposes it immediately to anyone inspecting network traffic or dev tools.

### Solution: Express Proxy (`server.js`)
An Express server (`server.js`) provides an authenticated backend bridge:
1. Loads `GEMINI_API_KEY` from `.env` via `dotenv` in a secure Node.js runtime.
2. Strictly binds to `127.0.0.1:3001` (loopback only, never `0.0.0.0`).
3. Exposes:
   - `GET /health`: Checks server and API key status.
   - `POST /api/generate`: Receives `{ prompt, model }` from client, invokes Google GenAI SDK (`@google/genai`), and streams or returns the generated text.
4. Vite dev server proxies `/api` requests to `http://127.0.0.1:3001`, enabling seamless relative `fetch('/api/generate')` calls from React.

```mermaid
flowchart LR
    Client["React Frontend (Renderer:3000)"]
    Proxy["Express Proxy (Node.js 127.0.0.1:3001)"]
    Cloud["Google Gemini API (Cloud)"]

    Client -->|1. POST /api/generate (No Key Exposed)| Proxy
    Proxy -->|2. Reads GEMINI_API_KEY from .env| Proxy
    Proxy -->|3. Authenticated Request with SDK| Cloud
    Cloud -->|4. Response Data| Proxy
    Proxy -->|5. Forward Clean Response| Client
```

---

## 3. Local Server Binding Security Policy

### Vulnerability of `0.0.0.0`
Binding to `0.0.0.0` tells the operating system to listen on all available network interfaces, including Ethernet, Wi-Fi, and public IP addresses. On untrusted local networks (coffee shops, shared offices), any device on the same subnet could send arbitrary requests to local microservices.

### Loopback Binding Requirement
- All local servers (`python-backend/server.py` on port 8008, Express proxy on port 3001) must explicitly bind to `127.0.0.1`.
- `127.0.0.1` ensures network packets never leave the host operating system's internal networking stack.
