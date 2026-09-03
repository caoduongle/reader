# Research: Automated Testing Suite with Vitest & Pytest

**Feature**: `008-testing-vitest-pytest`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## 1. Frontend Testing Architecture: Vitest & React Testing Library

### Why Vitest?
- **Native Vite Alignment**: Vitest reuses the existing Vite configuration (`resolve.alias`, plugins, transforms), providing instant execution without redundant babel/webpack bundling.
- **Fast In-Memory JSDOM**: Emulates browser DOM APIs with minimal startup overhead.
- **Jest Compatible API**: Familiar `describe`, `it`, `expect`, `vi.mock` APIs.

### Key Logic Units in Scope for Frontend Tests
1. **`splitIntoSentences` (`src/utils/textParser.ts`)**:
   - The primary tokenizer feeding TTS audio synthesis.
   - Vulnerable to improper splits on abbreviations (`Mr.`, `Dr.`, `TP. HCM`) and decimals (`3.14`).
   - Must support international punctuation (`.`, `!`, `?`, `。`, `！`, `？`).
2. **`parseNovelText` (`src/utils/textParser.ts`)**:
   - Parses multi-chapter novels, generates sentence IDs, and maintains contiguous `globalIndex`.
   - Essential for accurate bookmarking and sentence navigation.
3. **Gemini Express Proxy (`server.js`)**:
   - Validates input schemas before invoking external APIs.
   - Ensures robust error status codes (400 for missing prompt, 503 for unconfigured key).
4. **`ErrorBoundary` (`src/components/ErrorBoundary.tsx`)**:
   - Top-level application guard preventing total crash when render fails.

---

## 2. Backend Testing Architecture: Pytest & Flask TestClient

### Why Pytest?
- **Standard Python Testing**: Lightweight, fixture-based, zero boilerplate.
- **Flask Test Client**: Flask includes an in-memory `test_client()` that executes HTTP requests against application routes without binding to a physical network socket.

### Key Logic Units in Scope for Backend Tests
1. **`GET /health` (`python-backend/server.py`)**:
   - Verifies API server health check and model loading flag.
2. **`POST /speak` Input Validation**:
   - Rejects empty payload `{}` with HTTP 400.
   - Rejects whitespace payload `{"text": "   "}` with HTTP 400.
3. **`OPTIONS /speak` CORS Preflight**:
   - Returns HTTP 204 with required headers (`Access-Control-Allow-Origin: *`).
4. **`POST /speak` Audio Pipeline**:
   - Mocks `_synthesize_base` and `rvc.infer_file` to assert HTTP 200 and `audio/wav` mimetype.

---

## 3. Test Isolation & Reliability

- **No Network Flakiness**: Neither test suite relies on live external servers (Google Gemini API, Edge-TTS cloud, or physical GPU).
- **Non-Trivial Assertions**: Every test case tests specific boundary conditions and fails if logic is deliberately altered.
