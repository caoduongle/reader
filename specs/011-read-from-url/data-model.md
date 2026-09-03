# Data Model: Web Article Fetch & Document Pipeline

**Feature Branch**: `011-read-from-url`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. Request / Response Interfaces

```typescript
// Request to POST /api/fetch-url
export interface FetchUrlRequestBody {
  url: string;
}

// Successful Response
export interface FetchUrlSuccessResponse {
  ok: true;
  title: string;
  content: string;
  byline?: string;
  siteName?: string;
}

// Error Response
export interface FetchUrlErrorResponse {
  ok: false;
  error: string;
}

export type FetchUrlResponse = FetchUrlSuccessResponse | FetchUrlErrorResponse;
```

---

## 2. Updated DocumentItem Model (`src/types.ts`)

```typescript
export interface DocumentItem {
  id: string;
  title: string;
  author?: string;
  format: 'txt' | 'pdf' | 'epub' | 'pasted' | 'url'; // Added 'url'
  chapters: Chapter[];
  createdAt: number;
  lastRead: ReadingProgress;
  totalWords: number;
  totalSentences: number;
}
```

---

## 3. Data Flow Diagram

```
User pastes URL in UploadModal
               │
               ▼
   POST /api/fetch-url { url }
               │
               ▼
   server.js (Node 18+ fetch)
         ├── timeout: 10s
         └── User-Agent header
               │
               ▼
   HTML response text
               │
               ▼
   JSDOM (constructs DOM tree)
               │
               ▼
   Mozilla Readability (extracts title & clean text)
               │
               ▼
   JSON { ok: true, title, content }
               │
               ▼
   UploadModal: parseNovelText(content, title)
               │
               ▼
   DocumentItem (format: 'url')
               │
               ▼
   onDocumentLoaded() -> Reader UI (TTS ready)
```
