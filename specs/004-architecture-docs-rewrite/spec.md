# Feature Specification: Architecture Documentation Rewrite & RVC Guide Extraction

**Feature Branch**: `004-architecture-docs-rewrite`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "Nhiệm vụ: 1. Đọc toàn bộ cấu trúc thư mục, đặc biệt: package.json, electron/main.ts, python-backend/server.py, server.py (root), local-voice-server/, tts-extension/manifest.json, .specify/ và specs/001-rvc-tts-desktop/; 2. Xác định chính xác: python-backend/server.py và server.py (root) / local-voice-server/ có phải cùng một server hay hai server khác nhau cho hai mục đích khác nhau? Ghi lại phát hiện rõ ràng, kèm trích dẫn đường dẫn/đoạn code cụ thể, TRƯỚC KHI viết tài liệu ở bước 3; 3. Viết lại README.md ở root gồm sơ đồ kiến trúc mermaid, bảng thư mục con (1 dòng/thư mục), Bắt đầu nhanh tách theo 2 nhóm người dùng (chạy app React/Electron vs setup giọng RVC), di chuyển hướng dẫn RVC cũ sang docs/rvc-voice-setup.md giữ nguyên tiếng Việt 100%; 4. Không tự ý sửa code, ghi chú rõ ràng; Commit riêng."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Understanding of System Architecture & Data Flow (Priority: P1)

As a new developer, contributor, or evaluator exploring the VoxRead repository, I want to view a concise root README with a visual architecture diagram and directory mapping table, so that I immediately understand how the user interface (React web / Electron desktop / Chrome extension), text-to-speech engines (Gemini API / local RVC server / browser Web Speech), and data storage pipelines interact without having to reverse-engineer source code.

**Why this priority**: The legacy root `README.md` only described RVC voice training for an extension, leaving newcomers completely unaware of the main React 19 / Electron 44 desktop reader app, reading analytics, and storage architecture.

**Independent Test**: Can be tested by opening the repository root on GitHub or local preview: verify that the Mermaid diagram renders cleanly without syntax errors, clearly illustrating user flows across all input interfaces, backend processing layers, and audio output channels, and verify that the directory table explains every top-level folder in 1 clear sentence.

**Acceptance Scenarios**:

1. **Given** a visitor lands on the repository homepage on GitHub, **When** they view `README.md`, **Then** a valid Mermaid flowchart renders visually, depicting the end-to-end data flow: `User -> [React Web / Electron App / Chrome Extension] -> [Gemini TTS API | Local RVC Server | Web Speech API] -> Audio Playback & Text Highlighting`.
2. **Given** a developer inspecting repository organization, **When** they review the Directory Structure section, **Then** an unambiguous markdown table lists each top-level directory (e.g. `src/`, `electron/`, `python-backend/`, `specs/`, `public/`, `docs/`, `model/`) alongside its exact role in exactly one concise sentence.
3. **Given** a maintainer reviewing technical history, **When** they read the architecture overview, **Then** the relationship between `python-backend/server.py` (canonical Flask RVC server) and legacy alternative servers (`local-voice-server/` viXTTS) is documented objectively with specific code citations and network ports.

---

### User Story 2 - Clear Dual-Track Quickstart Guide (Priority: P1)

As a user or developer coming to the repository with a specific goal, I want the "Bắt đầu nhanh" (Quickstart) section separated into two distinct tracks: (a) Running/developing the main reading app (React/Electron) and (b) Setting up a personalized cloned voice (RVC), so that I can immediately follow the relevant instructions without wading through irrelevant steps.

**Why this priority**: Different audiences visit the repo for different purposes. Web/desktop readers only need Node.js and npm to run the app, while voice practitioners need Python, PyTorch, and model checkpoints. Conflating these tracks creates unnecessary setup friction.

**Independent Test**: Can be independently tested by executing each quickstart track in isolation on a clean environment:
- Track A: Running `npm install` followed by `npm run dev` or `npm run electron:dev` successfully launches the reader.
- Track B: Following the RVC quickstart summary provides immediate commands to start the backend microservice or points to the deep training guide.

**Acceptance Scenarios**:

1. **Given** a developer interested in running the reading application, **When** they read Quickstart Track A ("Dành cho người muốn chạy / phát triển app đọc sách"), **Then** they see direct, copy-pasteable terminal commands (`npm install`, `npm run dev`, `npm run electron:dev`) and required prerequisites (Node.js $\ge 18$) without needing Python or GPU setup.
2. **Given** a user interested in using their own cloned voice, **When** they read Quickstart Track B ("Dành cho người muốn cấu hình giọng đọc cá nhân RVC"), **Then** they see exact prerequisites (Python 3.10+, PyTorch/CUDA, RVC `.pth`/`.index` weights in `python-backend/model/`), launch instructions, and a clear link to the comprehensive guide in `docs/rvc-voice-setup.md`.

---

### User Story 3 - Lossless Preservation of RVC Setup & Colab Guide (Priority: P1)

As a creator training a personalized Vietnamese voice model, I want the complete, detailed original Vietnamese guide (Applio Google Colab dataset preparation, preprocessing, training, audio enhancement, model export, and local configuration) preserved losslessly in `docs/rvc-voice-setup.md`, so that zero technical nuances, parameters, or advice are lost during documentation reorganization.

**Why this priority**: The original RVC guide contains valuable domain-specific technical instructions (audio dataset duration, sample rates, Colab notebook links, Resemble-Enhance denoise commands, pitch shift settings). This knowledge must be preserved intact without truncation.

**Independent Test**: Can be tested by performing a diff and content audit between the original `README.md` RVC sections and `docs/rvc-voice-setup.md`: all sections (Phần A, Phần B, Phần C, Colab notebooks, troubleshooting, model parameters) must be present in Vietnamese with 100% fidelity.

**Acceptance Scenarios**:

1. **Given** the repository file tree, **When** checking the `docs/` directory, **Then** `docs/rvc-voice-setup.md` exists and contains the full verbatim content of the original RVC guide without truncation, omission, or language translation.
2. **Given** the new root `README.md`, **When** a user reaches the RVC section, **Then** a concise summary is provided accompanied by an explicit, working relative markdown link (`[Xem hướng dẫn chi tiết tại docs/rvc-voice-setup.md](docs/rvc-voice-setup.md)`).

---

### User Story 4 - Historical Server & Extension Clarification (Priority: P2)

As a project maintainer or open-source contributor auditing the codebase history, I want an explicit architectural breakdown comparing `python-backend/server.py`, root `server.py`, `local-voice-server/`, and `tts-extension/`, so that I understand why multiple servers existed and what architectural decisions govern current and future releases.

**Why this priority**: Resolves ambiguity regarding why multiple server implementations existed and provides clear facts (ports, frameworks, TTS models) so that repo owners have all context needed to make future architectural decisions.

**Independent Test**: Can be verified by reviewing the architecture notes section in `README.md`: confirms that framework differences (Flask vs FastAPI), TTS engines (Edge-TTS + RVC vs viXTTS zero-shot), endpoints, and client bindings are documented with citations.

**Acceptance Scenarios**:

1. **Given** the technical architecture notes in `README.md`, **When** reading the backend section, **Then** the role of `python-backend/server.py` is clearly identified as the canonical RVC backend for VoxRead desktop, while `local-voice-server/` (viXTTS) and `tts-extension/` are documented as historical alternative implementations.
2. **Given** any potential overlap in functionality, **When** reviewing documentation, **Then** all facts are recorded objectively with file citations without unsolicited code modifications.

---

### Edge Cases

- **GitHub Markdown Rendering of Mermaid**: Diagrams must strictly use standard GitHub-supported Mermaid syntax (`graph TD` or `flowchart TD`), quote labels containing special characters (parentheses, colons, arrows), and avoid raw HTML tags to prevent rendering errors.
- **Relative Path Resolution**: Links between `README.md` and `docs/rvc-voice-setup.md` must be relative (`docs/rvc-voice-setup.md`) so they work seamlessly in web browsers, GitHub, and local offline markdown viewers.
- **Encoding & Accents**: All Vietnamese content must use standard UTF-8 encoding without corrupted diacritics.
- **Zero Code Modification Constraint**: The feature must strictly touch documentation files (`README.md`, `docs/rvc-voice-setup.md`, `specs/004-architecture-docs-rewrite/*`) and must NOT edit application logic in `src/`, `electron/`, or `python-backend/`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create directory `docs/` and extract the complete original RVC voice setup guide from root `README.md` into `docs/rvc-voice-setup.md`, preserving 100% of the Vietnamese text, Colab links, and technical instructions.
- **FR-002**: System MUST rewrite the root `README.md` to introduce the project as **VoxRead** — an AI-powered desktop and web reader with local voice cloning and text-to-speech.
- **FR-003**: System MUST embed a GitHub-renderable Mermaid diagram in root `README.md` mapping:
  - User interactions $\rightarrow$ Client interfaces (React Web, Electron Desktop, Chrome Extension).
  - Client interfaces $\rightarrow$ Speech engines (Gemini TTS API, Local RVC Server via Edge-TTS + PyTorch, Web Speech API).
  - Engine outputs $\rightarrow$ Synchronized audio playback and real-time sentence highlighting.
- **FR-004**: System MUST include a directory overview table in `README.md` listing each primary folder and a 1-line description of its responsibility.
- **FR-005**: System MUST divide the Quickstart section into two dedicated tracks:
  - Track A: Running the main React/Electron reading application.
  - Track B: Setting up and running the local RVC voice cloning server.
- **FR-006**: System MUST link root `README.md` prominently to `docs/rvc-voice-setup.md`.
- **FR-007**: System MUST record the exact historical technical analysis of `python-backend/server.py` vs root `server.py` vs `local-voice-server/` with code citations, highlighting frameworks, ports, and capabilities.
- **FR-008**: System MUST preserve all application source code without any logical modifications.

---

### Non-Functional & Scope Constraints

- **NFR-001 (Documentation Integrity)**: The RVC guide extraction MUST be 100% lossless with zero omission of technical instructions or Colab setup steps.
- **NFR-002 (Visual Clarity)**: The Mermaid diagram MUST render cleanly on GitHub without syntax errors or overflowing text.
- **NFR-003 (Strict Scope Boundary)**: No application logic, dependencies in `package.json`, or backend scripts shall be modified.

---

### Key Entities

- **DocumentationSuite**: The set of project documentation artifacts consisting of root `README.md` and detailed topic guides in `docs/`.
- **SystemArchitectureModel**: The structural depiction of VoxRead components comprising client hosts, presentation layers, TTS service providers, and local persistence stores.
- **UserTrackProfile**: The targeted onboarding persona (`AppDeveloper` vs `VoiceCloner`) mapping to specific installation and runtime prerequisites.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Root `README.md` renders a valid Mermaid architecture diagram on GitHub with 0 parsing errors.
- **SC-002**: 100% of original RVC training instructions from the initial `README.md` are preserved in `docs/rvc-voice-setup.md`.
- **SC-003**: All active top-level directories in the repository are cataloged in the directory table with 1-line descriptions.
- **SC-004**: A new developer can execute Quickstart Track A in under 3 commands (`npm install`, `npm run dev`) to start the application.
- **SC-005**: Zero changes are introduced into `src/`, `electron/`, or `python-backend/` source code.

---

## Assumptions

- Readers and contributors view documentation primarily on GitHub or within modern markdown editors with Mermaid support.
- The repository's primary focus is VoxRead (React + Electron), while RVC voice cloning operates as an optional personalized backend capability.
- The original Vietnamese language of the RVC guide is preferred by the user and must be retained without translation.
