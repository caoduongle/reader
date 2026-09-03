# Data Model & Architecture Specification: Gemini Proxy & Security Policy

**Feature Branch**: `006-security-gemini-proxy`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. Proxy Component Architecture

```
[Browser / Desktop Client]
       │
       ▼ (Internal HTTP: /api/generate)
[Express Server Proxy: 127.0.0.1:3001]
       │ ├── dotenv reads GEMINI_API_KEY from local .env
       │ └── @google/genai SDK initializes with secure key
       ▼ (External HTTPS: generativelanguage.googleapis.com)
[Google Gemini Cloud Service]
```

---

## 2. Interface Models & Contracts

### 2.1 Proxy Generation Request (`GeminiProxyRequest`)

```typescript
export interface GeminiProxyRequest {
  prompt: string;
  model?: string; // Defaults to 'gemini-2.5-flash'
  temperature?: number;
  systemInstruction?: string;
}
```

### 2.2 Proxy Generation Response (`GeminiProxyResponse`)

```typescript
export interface GeminiProxyResponse {
  ok: boolean;
  text?: string;
  error?: string;
  modelUsed?: string;
}
```

### 2.3 Health Status Response (`ProxyHealthResponse`)

```typescript
export interface ProxyHealthResponse {
  status: 'ok';
  service: 'voxread-gemini-proxy';
  geminiConfigured: boolean;
  timestamp: string;
}
```

---

## 3. Security Boundary Rules

| Boundary Component | Allowed Bindings | Disallowed Bindings | Credential Exposure |
|---|---|---|---|
| Python RVC Microservice (`python-backend/server.py`) | `127.0.0.1:8008` | `0.0.0.0:*` | None |
| Express Gemini Proxy (`server.js`) | `127.0.0.1:3001` | `0.0.0.0:*` | Reads `process.env.GEMINI_API_KEY` |
| Vite Development Server | `0.0.0.0:3000` (LAN test) | - | Proxies `/api` $\rightarrow$ `127.0.0.1:3001` without exposing secret |
| Client Static Bundle (`dist/assets/`) | N/A | N/A | Zero credentials embedded |
