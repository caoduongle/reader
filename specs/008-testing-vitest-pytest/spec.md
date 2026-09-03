# Feature Specification: Automated Testing Suite with Vitest & Pytest

**Feature Branch**: `008-testing-vitest-pytest`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "Nhiệm vụ: 1. Thêm Vitest + React Testing Library cho phần frontend (src/) — chọn Vitest vì tích hợp tự nhiên với Vite; 2. Thêm pytest cho phần Python (python-backend/) — thêm pytest vào requirements-dev.txt riêng để tách dev khỏi runtime; 3. Trước khi viết test, đọc code thực tế và xác định 4–6 đơn vị logic quan trọng nhất cần test trước (ưu tiên phần dễ vỡ khi refactor): trích xuất/chia nhỏ văn bản, dựng request Gemini proxy, endpoint /speak (WAV khi hợp lệ, lỗi rõ ràng khi thiếu/sai tham số), endpoint /health; 4. Viết test cho các đơn vị đã chọn với tên mô tả rõ hành vi đang kiểm tra; 5. Thêm script 'test': 'vitest run' vào package.json. Ghi rõ trong README cách chạy test cả 2 phía; Ràng buộc: Không viết test giả, mỗi test phải thực sự fail nếu logic bị sửa sai; Định nghĩa hoàn thành: Có ít nhất 4 test frontend và 4 test backend pass; README có hướng dẫn; PR description liệt kê rõ những phần quan trọng chưa có test."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Frontend Unit Testing with Vitest & React Testing Library (Priority: P1)

As a developer and code maintainer, I want a fast, automated frontend testing suite powered by Vitest and React Testing Library, so that core text parsing algorithms, proxy API validation, and React components can be verified reliably before shipping.

**Why this priority**: Text parsing (`splitIntoSentences`, `parseNovelText`) is the fundamental data pipeline feeding TTS speech synthesis. Breaking text segmentation degrades audio pacing, sentence highlighting, and user navigation.

**Independent Test**: Execute `npm test` in the terminal:
- Vitest executes all test files in `tests/` or `src/**/*.test.ts(x)`.
- Verifies at least 4 independent frontend tests with meaningful assertions.

**Acceptance Scenarios**:

1. **Given** complex multilingual text with abbreviations and decimal numbers, **When** `splitIntoSentences` is executed, **Then** sentences are split correctly on genuine sentence boundaries while protecting titles (`Dr.`, `Mr.`, `TP. HCM`) and decimals (`3.14`).
2. **Given** novel text with chapter headings and paragraphs, **When** `parseNovelText` is executed, **Then** it generates sequential `Chapter` models with correct word counts and contiguous sentence `globalIndex` values.
3. **Given** the Gemini Express proxy (`server.js`), **When** sending requests to `/health` and `/api/generate`, **Then** the health endpoint confirms service availability, and missing `prompt` or missing API keys produce explicit HTTP 400 / 503 error responses.
4. **Given** the `ErrorBoundary` React component, **When** a child component throws an unhandled error, **Then** the boundary catches the error and renders user-friendly fallback UI instead of crashing the app.

---

### User Story 2 - Backend Unit Testing with Pytest (Priority: P1)

As a backend maintainer, I want automated unit and API contract tests for the local Python TTS microservice using `pytest`, so that endpoint behavior (`/speak`, `/health`), input validation, and CORS responses are guaranteed stable across runtime updates.

**Why this priority**: The RVC microservice runs as an independent local HTTP daemon. Malformed client requests must receive clear, structured error responses rather than crashing Python workers or hanging audio players.

**Independent Test**: Execute `pytest python-backend/` in the virtual environment:
- Pytest discovers and runs test cases in `python-backend/tests/`.
- Verifies at least 4 independent backend test cases with meaningful assertions.

**Acceptance Scenarios**:

1. **Given** the Flask server in `python-backend/server.py`, **When** sending a `GET /health` request, **Then** it returns HTTP 200 with JSON payload `{"ok": true, "model_loaded": ...}`.
2. **Given** a `POST /speak` request with an empty body or missing `"text"` field, **When** the server processes the request, **Then** it returns HTTP 400 with a descriptive JSON error message (`{"error": "Thieu 'text' trong request"}`).
3. **Given** a `POST /speak` request with whitespace-only text (`{"text": "   "}`), **When** the server processes the request, **Then** it returns HTTP 400.
4. **Given** an `OPTIONS /speak` preflight request, **When** the server responds, **Then** it returns HTTP 204 with required `Access-Control-Allow-*` headers.
5. **Given** a valid `POST /speak` request with mocked synthesis, **When** processing succeeds, **Then** it returns HTTP 200 with `audio/wav` mimetype and binary audio data.

---

### User Story 3 - Test Documentation & Uncovered Backlog Identification (Priority: P2)

As a contributor or reviewer, I want explicit test running instructions in `README.md` and a transparent backlog of components not yet covered by automated tests, so that test coverage can be progressively expanded in future sprints.

**Why this priority**: Transparent documentation empowers developers to run test suites locally and prevents false assumptions about test coverage boundaries.

**Independent Test**: Inspect `README.md`: verify dual test instructions for npm and pytest. Inspect PR description: verify itemized backlog of untested modules.

**Acceptance Scenarios**:

1. **Given** `README.md`, **When** navigating to the test instructions section, **Then** step-by-step commands explain how to run `npm test` and `pytest python-backend/`.
2. **Given** the PR documentation, **When** reviewing test coverage, **Then** an explicit backlog enumerates untested critical areas (e.g. `useTTS` audio buffering, IndexedDB persistence, Mascot canvas animations).

---

### Edge Cases

- **Native Audio & DOM APIs in JSDOM**: JSDOM lacks native implementations for `window.speechSynthesis`, `AudioContext`, and `HTMLCanvasElement.getContext('2d')`. Tests must mock these interfaces or isolate pure unit functions.
- **Python ML Dependencies in CI / Dev**: `python-backend/server.py` relies on `RVCInference` and PyTorch, which may not have GPU acceleration or model checkpoints during automated testing. Backend tests must mock model inference and `edge_tts` to test endpoint logic reliably on any machine.
- **No Dummy Tests**: Tests asserting trivial truths (e.g. `expect(true).toBe(true)`) are strictly disallowed. Every test must be capable of failing if underlying logic is broken.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom` as devDependencies in `package.json`.
- **FR-002**: System MUST configure Vitest with `jsdom` environment and test setup in `vitest.config.ts`.
- **FR-003**: System MUST create `python-backend/requirements-dev.txt` specifying `pytest` and required test helpers.
- **FR-004**: System MUST implement at least 4 unit tests for frontend logic covering text segmentation, novel parsing, proxy validation, and error boundary rendering.
- **FR-005**: System MUST implement at least 4 backend unit tests for `python-backend/server.py` covering `/health`, `/speak` input validation, and OPTIONS CORS.
- **FR-006**: System MUST add `"test": "vitest run"` script to `package.json`.
- **FR-007**: System MUST update `README.md` documenting test execution for both frontend and backend suites.
- **FR-008**: System MUST catalog untested modules in the PR documentation for future test development.

---

### Non-Functional & Scope Constraints

- **NFR-001 (Speed & Reliability)**: All unit tests must execute and complete in under 15 seconds.
- **NFR-002 (Hermetic Execution)**: Tests must run offline without requiring external network access to Google Cloud or Edge-TTS servers.
- **NFR-003 (Zero Logic Regressions)**: Existing reader functionality, TypeScript types, and lint rules must remain 100% compliant.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 4 frontend unit tests pass cleanly via `npm test`.
- **SC-002**: At least 4 backend unit tests pass cleanly via `pytest`.
- **SC-003**: `npm run typecheck`, `npm run lint`, and `npm run build` pass with 0 errors.
- **SC-004**: `README.md` contains clear execution instructions for both test suites.
- **SC-005**: Itemized backlog of untested modules is documented transparently.

---

## Assumptions

- Frontend unit tests run in Node.js with JSDOM emulation.
- Backend tests execute using the `python-backend/venv` Python environment where Flask is installed.
