# Tasks: Read from Web URL ("Đọc từ liên kết")

**Feature**: `011-read-from-url`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)  
**Generated**: 2026-09-03  

---

## Phase 1: Setup & Shared Infrastructure (Blocking Prerequisites)

**Purpose**: Install required extraction libraries and extend TypeScript data models.

- [X] T001 Install `@mozilla/readability` and ensure `jsdom` is in `package.json` dependencies.
- [X] T002 Update `src/types.ts` to extend `DocumentItem.format` with `'url'` and add `FetchUrlResponse` interface.

---

## Phase 2: User Story 1 — Backend Extraction Endpoint in `server.js` (Priority: P1) 🎯 MVP

**Goal**: Implement the server-to-server proxy route `POST /api/fetch-url` in `server.js` to fetch web pages, bypass browser CORS, and extract clean article text using Mozilla Readability.

**Independent Test**: Send `POST /api/fetch-url` with `{ url: "https://example.com" }` and assert that `{ ok: true, title: "Example Domain", content: "..." }` is returned.

### Implementation for User Story 1

- [X] T003 [US1] Implement `POST /api/fetch-url` in `server.js` with protocol validation (strict `http:` and `https:`) and 10-second request timeout (`AbortSignal.timeout(10000)`).
- [X] T004 [US1] Integrate `JSDOM` and `@mozilla/readability` in `POST /api/fetch-url` to extract article title, body text, byline, and siteName.
- [X] T005 [US1] Add localized Vietnamese error handling for invalid URLs (400), timeouts (504), non-article or paywalled pages (422), and connection failures (500) in `server.js`.

**Checkpoint**: `POST /api/fetch-url` is fully operational and returns clean article JSON.

---

## Phase 3: User Story 2 — Fourth Tab "Đọc từ liên kết" in `UploadModal.tsx` (Priority: P1)

**Goal**: Add the "Đọc từ liên kết" tab in `UploadModal.tsx`, allowing users to paste article links and automatically parse them into chapters for reading.

**Independent Test**: Mount `UploadModal`, switch to "Đọc từ liên kết", enter an article URL, click "Lấy nội dung", and verify that the document loads into the reader.

### Implementation for User Story 2

- [X] T006 [US2] Add the 4th tab button "Đọc từ liên kết" (Globe icon) to the tab switcher in `src/components/UploadModal.tsx`.
- [X] T007 [US2] Implement the URL input form, submit button ("Lấy nội dung"), and animated loading spinner in `src/components/UploadModal.tsx`.
- [X] T008 [US2] Wire the fetch action to `POST /api/fetch-url`, parse extracted content through existing `parseNovelText(content, title)`, construct a `DocumentItem` with `format: 'url'`, invoke `onDocumentLoaded`, and close the modal.

**Checkpoint**: User can load any online article directly through the "Đọc từ liên kết" tab.

---

## Phase 4: User Story 3 — Automated Unit Tests (Priority: P2)

**Goal**: Verify extraction accuracy, input validation, and timeout handling with automated Vitest tests.

**Independent Test**: Execute `npm test -- tests/unit/fetchUrl.test.ts` and verify 100% pass.

### Implementation for User Story 3

- [X] T009 [US3] Create `tests/unit/fetchUrl.test.ts` testing:
  - Extraction of article title and text from mock HTML.
  - Validation rejection for missing or non-HTTP URLs (400).
  - Proper handling of network timeouts (504).
  - Extraction failure on empty or non-article documents (422).

**Checkpoint**: Unit test suite passing cleanly.

---

## Phase 5: Polish & Gate Enforcement

**Purpose**: Execute full verification ensuring authentic quality pass.

- [X] T010 Run `npm test` and verify 100% pass across all test suites.
- [X] T011 Verify `npm run typecheck`, `npm run lint`, and `npm run build` succeed with 0 errors.

---

## Dependencies & Execution Order

```
Phase 1: Dependencies & Models (T001 - T002)
       │
       ▼
Phase 2: Backend Extraction Route (T003 - T005) 🎯 MVP
       │
       ▼
Phase 3: UploadModal Tab UI (T006 - T008)
       │
       ▼
Phase 4: Automated Tests (T009)
       │
       ▼
Phase 5: Gate Enforcement (T010 - T011)
```
