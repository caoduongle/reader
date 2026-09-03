# Implementation Plan: Read from Web URL ("Đọc từ liên kết")

**Branch**: `011-read-from-url` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/011-read-from-url/spec.md`  

---

## Summary

Implement direct web article reading in VoxRead by adding a server-side extraction proxy endpoint and a dedicated 4th tab in the document loader modal:
1. **Dependency Setup (`package.json`)**: Install `@mozilla/readability` and ensure `jsdom` is accessible to the Express server in production and development.
2. **Server Extraction Route (`server.js`)**: Add `POST /api/fetch-url` to the existing Express proxy (`127.0.0.1:3001`), fetching HTML server-side to bypass CORS, with a 10-second timeout, extracting clean article title/text via `@mozilla/readability`, and returning clear localized Vietnamese errors.
3. **Modal Tab Integration (`src/components/UploadModal.tsx`)**: Add tab "Đọc từ liên kết" with a URL input field, "Lấy nội dung" button, loading state, and seamless parsing through `parseNovelText()`.
4. **Document Model Extension (`src/types.ts`)**: Add `'url'` to `DocumentItem.format` and declare `FetchUrlResponse`.
5. **Automated Unit Testing**: Author tests in `tests/unit/fetchUrl.test.ts` verifying extraction, input validation, and timeout handling.

---

## Technical Context

**Language/Format**: TypeScript / JavaScript (Node.js ESM) / React 19 (TSX)  
**Target Files**:
- `package.json` [MODIFY] (Add `@mozilla/readability` and `jsdom` dependencies)
- `server.js` [MODIFY] (Implement `POST /api/fetch-url`)
- `src/types.ts` [MODIFY] (Add `'url'` format and `FetchUrlResponse` interface)
- `src/components/UploadModal.tsx` [MODIFY] (Add 4th tab "Đọc từ liên kết")
- `tests/unit/fetchUrl.test.ts` [NEW] (Unit tests for extraction route)
**Testing & Verification**: Vitest unit tests, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`  
**Constraints**:
- Zero changes to `python-backend/` (keep Python focused purely on RVC)
- Request timeout strictly capped at 10 seconds
- No duplicate chapter parsing logic (re-use `parseNovelText`)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Notes |
|---|---|---|
| I. Dual-Stack Integrity | ✅ Passed | Python RVC backend untouched; uses existing Express server proxy. |
| II. True Quality Gates | ✅ Passed | Fully tested with Vitest without skipping or fake passes. |
| III. Resource Conservation | ✅ Passed | Lightweight DOM parsing with JSDOM; 10s strict timeout prevents hanging sockets. |
| IV. Build & Type Integrity | ✅ Passed | Preserves TypeScript strict mode; typecheck and lint pass cleanly. |

---

## Project Structure

### Documentation (this feature)

```text
specs/011-read-from-url/
├── plan.md              # Implementation Plan (this file)
├── research.md          # Readability & proxy architecture research
├── data-model.md        # Data models and request/response flow
├── quickstart.md        # Verification and manual walkthrough guide
├── contracts/           # Contracts
│   └── fetch-url-contract.md
├── checklists/
│   └── requirements.md  # Requirements quality checklist
└── spec.md              # Feature specification
```

### Source Code Changes

```text
reader/
├── package.json                         # [MODIFY] Add @mozilla/readability
├── server.js                            # [MODIFY] Add POST /api/fetch-url
├── src/
│   ├── types.ts                         # [MODIFY] Add 'url' format & interfaces
│   └── components/
│       └── UploadModal.tsx              # [MODIFY] Add 4th tab "Đọc từ liên kết"
└── tests/
    └── unit/
        └── fetchUrl.test.ts             # [NEW] Vitest suite for URL extraction
```

---

## Phases & Deliverables

### Phase 1: Dependencies & Extraction Route in `server.js`
1. Install `@mozilla/readability` and ensure `jsdom` is in `dependencies`.
2. Implement `POST /api/fetch-url` in `server.js` with validation, 10s timeout, JSDOM, and Readability extraction.
3. Test route with mock/test requests.

### Phase 2: Document Model & UploadModal UI Integration
1. Extend `DocumentItem.format` in `src/types.ts` to include `'url'`.
2. Add tab "Đọc từ liên kết" in `src/components/UploadModal.tsx`.
3. Wire submit handler to `POST /api/fetch-url`, handle loading and error states, and invoke `parseNovelText()` to load document.

### Phase 3: Automated Unit Testing
1. Create `tests/unit/fetchUrl.test.ts` testing extraction, invalid URLs, timeouts, and unextractable pages.

### Phase 4: Polish & Gate Enforcement
1. Run `npm test` to verify all suites pass.
2. Run `npm run typecheck`, `npm run lint`, and `npm run build` to confirm zero errors.

---

## Complexity Tracking

> **Constitution Check passed with 0 violations. No special complexity waivers required.**
