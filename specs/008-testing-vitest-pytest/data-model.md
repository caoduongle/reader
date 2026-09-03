# Data Model & Testing Matrix: Vitest & Pytest

**Feature Branch**: `008-testing-vitest-pytest`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. Test Suite Architecture

```
                       ┌─────────────────────────┐
                       │ VoxRead Test Frameworks │
                       └────────────┬────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────┐                          ┌──────────────────────┐
│  Frontend (Vitest)   │                          │   Backend (Pytest)   │
├──────────────────────┤                          ├──────────────────────┤
│ Environment: JSDOM   │                          │ Environment: Python  │
│ Tool: RTL            │                          │ Tool: Flask Client   │
│ Config: vitest.config│                          │ DevReqs: reqs-dev.txt│
└──────────┬───────────┘                          └──────────┬───────────┘
           │                                                 │
   ┌───────┴───────┐                                 ┌───────┴───────┐
   ▼               ▼                                 ▼               ▼
Unit Tests   Component Tests                   Endpoint Tests  Mock Inference
(textParser, (ErrorBoundary)                   (/health, /speak)
 serverProxy)
```

---

## 2. Test Cases Matrix

### 2.1 Frontend Test Suite (`tests/`)

| Test File | Test Case Name | Target Under Test | Expected Behavior |
|---|---|---|---|
| `tests/unit/textParser.test.ts` | `splits standard sentences correctly` | `splitIntoSentences` | Splits on `.`, `!`, `?` into distinct strings. |
| `tests/unit/textParser.test.ts` | `protects abbreviations and decimals` | `splitIntoSentences` | Does not split on `Dr.`, `Mr.`, `TP. HCM`, `v.v.`, `3.14`. |
| `tests/unit/textParser.test.ts` | `handles quotes and Japanese punctuation` | `splitIntoSentences` | Handles `。`, `！`, `？` and trailing quote punctuation. |
| `tests/unit/textParser.test.ts` | `returns empty array for whitespace input` | `splitIntoSentences` | Handles empty string and whitespace with `[]`. |
| `tests/unit/textParser.test.ts` | `parses novel chapters with contiguous sentence indexing` | `parseNovelText` | Detects chapter boundaries and computes contiguous `globalIndex`. |
| `tests/unit/serverProxy.test.ts` | `returns health status with service metadata` | `server.js` (`/health`) | Returns HTTP 200 with `{ status: "ok", service: "voxread-gemini-proxy" }`. |
| `tests/unit/serverProxy.test.ts` | `rejects requests missing prompt with 400` | `server.js` (`/api/generate`) | Returns HTTP 400 when `prompt` is omitted. |
| `tests/unit/serverProxy.test.ts` | `returns 503 when API key is unconfigured` | `server.js` (`/api/generate`) | Returns HTTP 503 when `GEMINI_API_KEY` is not present. |
| `tests/components/ErrorBoundary.test.tsx` | `renders fallback UI when child component crashes` | `ErrorBoundary` | Catches runtime exception and displays fallback error message. |

### 2.2 Backend Test Suite (`python-backend/tests/`)

| Test File | Test Case Name | Target Under Test | Expected Behavior |
|---|---|---|---|
| `test_server.py` | `test_health_endpoint_returns_ok` | `GET /health` | Returns HTTP 200 with `{"ok": True}`. |
| `test_server.py` | `test_speak_endpoint_rejects_missing_text` | `POST /speak` | Returns HTTP 400 with descriptive error message. |
| `test_server.py` | `test_speak_endpoint_rejects_whitespace_text` | `POST /speak` | Returns HTTP 400 when text is all whitespace. |
| `test_server.py` | `test_speak_options_returns_cors_headers` | `OPTIONS /speak` | Returns HTTP 204 with `Access-Control-Allow-Origin: *`. |
| `test_server.py` | `test_speak_valid_request_returns_audio_wav` | `POST /speak` | Returns HTTP 200 with `audio/wav` mimetype and WAV bytes (mocked). |
