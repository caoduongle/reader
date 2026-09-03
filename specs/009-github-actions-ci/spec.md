# Feature Specification: Automated CI/CD Pipelines with GitHub Actions

**Feature Branch**: `009-github-actions-ci`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "Nhiệm vụ: 1. Tạo .github/workflows/ci.yml, kích hoạt khi push hoặc pull_request vào nhánh main, gồm 2 job chạy song song: Job 'frontend' (checkout -> setup Node LTS -> npm ci -> tuần tự typecheck, lint, test, build - fail sớm ngay khi bước nào lỗi); Job 'backend' (checkout -> setup Python 3.10 -> pip install -r requirements.txt và requirements-dev.txt -> chạy pytest); 2. KHÔNG đưa bước build Electron vào workflow chính, tạo workflow riêng .github/workflows/build-electron.yml chỉ chạy thủ công (workflow_dispatch) hoặc khi tạo git tag dạng release (v*.*.*); 3. Thêm badge trạng thái CI vào đầu README.md; Ràng buộc: Nếu lint hoặc test chưa pass, KHÔNG tự ý làm cho CI xanh giả bằng cách xóa bước hay thêm continue-on-error - báo cáo rõ bước nào đang fail và xử lý gốc rễ; Định nghĩa hoàn thành: CI pass trên thử nghiệm, 2 workflow file tách biệt rõ mục đích, badge CI hiển thị đúng."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Continuous Integration Pipeline (Priority: P1) 🎯 MVP

As a developer or open-source contributor, I want an automated GitHub Actions CI pipeline (`.github/workflows/ci.yml`) triggered on every push and pull request to `main`, so that any type errors, lint regressions, test failures, or build crashes are detected immediately before merging.

**Why this priority**: Continuous Integration is the bedrock of code health, guaranteeing that only validated code enters the `main` branch.

**Independent Test**: Validate the workflow syntax and execute every individual step locally in identical sequence:
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `pytest python-backend/tests`

**Acceptance Scenarios**:

1. **Given** a commit pushed to `main` or a pull request opened targeting `main`, **When** GitHub Actions triggers `ci.yml`, **Then** two parallel jobs (`frontend` and `backend`) spawn independently.
2. **Given** the `frontend` job, **When** executing on `ubuntu-latest`, **Then** it checks out code, configures Node.js LTS (v20), installs dependencies with `npm ci`, and executes `typecheck`, `lint`, `test`, and `build` in sequence.
3. **Given** any step in the `frontend` job (e.g. `typecheck`), **When** an error occurs, **Then** the job halts immediately (fail-fast) without executing subsequent steps.
4. **Given** the `backend` job, **When** executing on `ubuntu-latest`, **Then** it checks out code, configures Python 3.10, installs dependencies from `python-backend/requirements.txt` and `python-backend/requirements-dev.txt`, and executes `pytest python-backend/tests`.

---

### User Story 2 - Dedicated Manual & Release Electron Packaging (Priority: P1)

As a release manager or maintainer, I want a separate workflow file (`.github/workflows/build-electron.yml`) dedicated to compiling and packaging the Windows Electron desktop application, so that regular CI workflows remain lightweight and fast on Linux runners while Windows installer builds can be triggered on demand or on official releases.

**Why this priority**: Electron desktop packaging (`electron-builder --win`) requires Windows runners, takes several minutes to complete, and is unnecessary on routine PR checks.

**Independent Test**: Validate workflow YAML syntax and verify trigger conditions (`workflow_dispatch` and `tags: ['v*.*.*']`).

**Acceptance Scenarios**:

1. **Given** normal pull requests or pushes to `main`, **When** CI triggers, **Then** `build-electron.yml` does NOT run automatically.
2. **Given** a maintainer triggers the action manually via GitHub Actions UI (`workflow_dispatch`) or pushes a git release tag matching `v*.*.*`, **When** GitHub Actions evaluates triggers, **Then** `build-electron.yml` executes on `windows-latest`, compiles Vite assets, runs Electron builder, and packages the Windows `.exe` installer.

---

### User Story 3 - Repository Status Badge & Quality Gate Integrity (Priority: P2)

As a repository visitor or team member, I want to see the current CI build status directly at the top of `README.md`, with zero artificial workarounds or masked errors in the pipeline.

**Why this priority**: Status badges provide transparency into build health, and true quality gate enforcement ensures that green badges represent actual quality.

**Independent Test**: Inspect `README.md` to confirm the presence of the GitHub Actions badge markdown. Verify `ci.yml` contains zero `continue-on-error: true` directives.

**Acceptance Scenarios**:

1. **Given** `README.md`, **When** opened on GitHub, **Then** a visible badge displays the build status of `ci.yml`.
2. **Given** the CI pipeline configuration, **When** any quality gate step fails, **Then** the job fails honestly without using `continue-on-error` or omitted steps.

---

### User Story 4 - True Quality Gate Remediation (Priority: P1)

As a project maintainer, I want all lint warnings and errors resolved at their root cause (e.g., removing unused imports, prefixing unused callback parameters with `_`, narrowing types) without altering application runtime behavior, so that `npm run lint` passes authentically with exit code 0.

**Why this priority**: The user mandate strictly forbids "fake green" CI by deleting steps or ignoring errors. The pre-existing lint issues must be resolved cleanly.

**Independent Test**: Execute `npm run lint` locally; confirm exit code 0 with 0 errors.

**Acceptance Scenarios**:

1. **Given** the 40 cataloged lint items from Prompt 4, **When** unused imports and variables are cleanly removed or prefixed with `_`, **Then** `npm run lint` completes with 0 errors.
2. **Given** the changes, **When** running `npm run typecheck`, `npm test`, and `npm run build`, **Then** all continue to pass with 0 regressions.

---

### Edge Cases

- **Linux Runner Audio Compilation**: GitHub Actions `ubuntu-latest` runner does not have physical audio hardware or proprietary Nvidia drivers. The backend pytest suite was designed to mock `rvc_python` and `edge_tts`, ensuring deterministic execution in CI.
- **Node.js LTS Version**: Using Node 20.x ensures compatibility with modern Vite 6, React 19, and ESLint 9 while utilizing npm package caching.
- **Fail-Fast Behavior**: GitHub Actions default step execution terminates immediately on non-zero exit codes unless overridden. We will strictly preserve this default.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create `.github/workflows/ci.yml` triggering on `push` and `pull_request` to branch `main`.
- **FR-002**: System MUST configure two parallel jobs in `ci.yml`: `frontend` and `backend`.
- **FR-003**: System MUST configure `frontend` job on `ubuntu-latest` running Node.js 20, installing with `npm ci`, and executing sequentially: `typecheck`, `lint`, `test`, `build`.
- **FR-004**: System MUST configure `backend` job on `ubuntu-latest` running Python 3.10, installing dependencies from `requirements.txt` and `requirements-dev.txt`, and running `pytest python-backend/tests`.
- **FR-005**: System MUST create `.github/workflows/build-electron.yml` triggering solely on `workflow_dispatch` and tags matching `v*.*.*` on `windows-latest`.
- **FR-006**: System MUST add the CI workflow status badge at the top of `README.md`.
- **FR-007**: System MUST resolve residual lint errors so that `npm run lint` passes with code 0 without masking errors or adding blanket disables.
- **FR-008**: System MUST verify that `typecheck`, `lint`, `test`, `build`, and `pytest` pass cleanly with exit code 0.

---

### Non-Functional & Scope Constraints

- **NFR-001 (No Fake Green CI)**: Strictly zero use of `continue-on-error: true` or omitted quality steps in `ci.yml`.
- **NFR-002 (Runner Efficiency)**: Main CI must execute on Linux runners and complete within 3–5 minutes.
- **NFR-003 (Separation of Concerns)**: Heavy Windows Electron packaging must be completely isolated in `build-electron.yml`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `.github/workflows/ci.yml` and `.github/workflows/build-electron.yml` are valid YAML files conforming to GitHub Actions schema.
- **SC-002**: Local sequential execution of `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `pytest` all pass with exit code 0.
- **SC-003**: CI status badge is visible at the header of `README.md`.
- **SC-004**: Zero `continue-on-error` directives in `.github/workflows/ci.yml`.
