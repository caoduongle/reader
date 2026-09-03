# Research: Web Article Extraction Architecture & Readability Pipeline

**Feature**: `011-read-from-url`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## 1. Web Extraction Technology: `@mozilla/readability` & `jsdom`

### Why Readability?
- **Standardized Algorithm**: `@mozilla/readability` is the exact open-source engine powering Firefox Reader Mode. It strips sidebars, advertisements, cookie banners, related links, navigation bars, and comment sections, retaining only high-density article paragraphs and heading elements.
- **Node.js Integration**: Readability expects a standard DOM `document`. In Node.js, `jsdom` constructs the DOM tree from raw HTML strings with zero external browser runtime (no headless Chromium or Puppeteer required).
- **Lightweight & Fast**: Parsing takes ~20–50ms for typical novel chapters or news articles, with minimal memory overhead compared to browser automation.

---

## 2. Server-to-Server Proxy Architecture in `server.js`

- **Port & Host**: `server.js` is already running on `127.0.0.1:3001`, with CORS headers enabled (`Access-Control-Allow-Origin: *`) and Vite dev server proxying `/api` requests.
- **CORS Bypass**: Browser renderers cannot directly fetch arbitrary website HTML due to Cross-Origin Resource Sharing (CORS) security policies enforced by web browsers. Fetching server-side through `server.js` completely bypasses CORS restrictions.
- **Request Headers & User-Agent**: Some web servers return 403 Forbidden to requests without standard desktop User-Agents. We pass a standard Chrome User-Agent and `Accept-Language: vi,en;q=0.9` to ensure Vietnamese web fiction sites return the complete text.
- **Timeout Protection**: All outgoing fetch calls use `AbortSignal.timeout(10000)` to guarantee requests fail fast (within 10s) instead of hanging indefinitely.

---

## 3. UploadModal Integration Pattern

- **Existing Tabs in `UploadModal.tsx`**:
  1. `upload`: File drag-and-drop (.txt, .pdf, .epub).
  2. `paste`: Paste or type raw text.
  3. `samples`: Pre-loaded classic novels.
- **New Tab `url` ("Đọc từ liên kết")**:
  - Input: URL input field with clear button.
  - Action: "Lấy nội dung" button with loading spinner.
  - Processing: When server returns `{ ok: true, title, content }`, `parseNovelText(content, title)` structures the content into chapters and sentences.
  - Output: Passes `DocumentItem` with `format: 'url'` to `onDocumentLoaded(newDoc)` and dismisses the modal.
