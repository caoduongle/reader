# Feature Specification: CI Infrastructure Hardening (Node 22 Upgrade & Pip Pinning)

**Feature Branch**: `018-fix-ci-infrastructure`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: User description: "Sửa 2 vấn đề hạ tầng CI sau, KHÔNG đụng vào code feature nào khác: 1. Trong .github/workflows/ci.yml và .github/workflows/security-audit.yml, đổi `node-version: 20` thành `node-version: 22` (jsdom@30 — dependency của Vitest, cũng dùng trong server.js — yêu cầu tối thiểu Node 22.22.2, gọi hàm markAsUncloneable chỉ có từ Node 22.10+). Đổi luôn trong .github/workflows/build-electron.yml để đồng bộ cả 3 file, dù file này hiện chưa chạy npm test nên chưa gặp lỗi trực tiếp. 2. Trong .github/workflows/ci.yml, job 'backend', bước 'Install dependencies', đổi dòng `python -m pip install --upgrade pip` thành `python -m pip install "pip<24.1"`. Lý do: omegaconf==2.0.6 (dependency cứng của fairseq==0.12.2, đến từ rvc-python) có metadata PyYAML (>=5.1.*) sai định dạng PEP 440; pip >=24.1 từ chối cài, pip tự gợi ý dùng pip<24.1. KHÔNG sửa requirements.txt hay cố ép version omegaconf/fairseq khác — chuỗi dependency RVC vốn đã mong manh, chỉ ghim version pip là đủ và an toàn nhất. Sau khi sửa, không cần sửa gì trong package.json (không có 'engines' field, không có .npmrc engine-strict, nên npm ci trên Node 20 trước đây chỉ warning chứ không fail — chỉ riêng bước 'npm test'/'npm run test' mới crash thật)."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CI Workflow Reliability & Runtime Compatibility (Priority: P1) 🎯 MVP

As a developer and continuous integration operator, I want GitHub Actions workflows to execute under Node.js 22 LTS and Python with pip pinned to `<24.1`, so that automated frontend test suites (Vitest with `jsdom@30`), security audit jobs, desktop packaging, and backend pytest suites execute without crashing on unsupported Node APIs or PEP 440 package metadata parsing errors.

**Why this priority**: Without this fix, continuous integration pipelines fail on PRs and main branch pushes: `jsdom@30` throws unhandled runtime errors calling `markAsUncloneable` (only available in Node 22.10+), and pip >=24.1 halts dependency installation due to `omegaconf==2.0.6` PyYAML metadata format.

**Independent Test**:
1. Inspect `.github/workflows/ci.yml`, `.github/workflows/security-audit.yml`, and `.github/workflows/build-electron.yml`: verify `node-version: 22` is specified across all three files.
2. Inspect `.github/workflows/ci.yml` within the `backend` job: verify the pip installation step executes `python -m pip install "pip<24.1"`.
3. Perform a file-level diff check: verify zero changes outside `.github/workflows/` (no changes to `package.json`, `.npmrc`, `requirements.txt`, or application source code).

**Acceptance Scenarios**:
1. **Given** the frontend CI job and security audit workflow, **When** initialized by `actions/setup-node@v4`, **Then** Node.js 22 runtime is installed, ensuring `markAsUncloneable` is available for `jsdom@30` during test runs.
2. **Given** the backend CI job, **When** installing Python dependencies, **Then** pip is configured to `<24.1`, successfully installing `omegaconf==2.0.6` and `fairseq==0.12.2` without triggering PEP 440 metadata rejection.
3. **Given** the desktop application workflow (`build-electron.yml`), **When** setup runs, **Then** Node.js 22 is used consistently across all three workflow files.

---

### Edge Cases

- What happens if `actions/setup-node@v4` pulls Node 22.x minor versions?
  *Specifying `node-version: 22` automatically resolves to the latest Node 22 LTS release (e.g., Node >=22.10.0 / >=22.22.2), fully satisfying the `markAsUncloneable` requirement.*
- What happens if pip cache tries to reuse an incompatible pip version?
  *The explicit `python -m pip install "pip<24.1"` step runs before `pip install -r ...`, guaranteeing the active pip environment complies before package installation starts.*

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Node 22 Upgrade)**: The CI configuration MUST specify `node-version: 22` in:
  - `.github/workflows/ci.yml` (job `frontend`)
  - `.github/workflows/security-audit.yml` (job `audit-dependencies`)
  - `.github/workflows/build-electron.yml` (job `build-windows`)
- **FR-002 (Pip Version Pinning)**: The backend CI job in `.github/workflows/ci.yml` MUST replace `python -m pip install --upgrade pip` with `python -m pip install "pip<24.1"`.
- **FR-003 (Strict Scope Isolation)**: The changes MUST be confined strictly to the specified `.github/workflows/*.yml` files; `package.json`, `.npmrc`, `requirements.txt`, and application source files MUST remain untouched.

---

## Key Entities

- **GitHub Actions Workflow**: Declarative YAML configuration defining runner OS, runtime setup, dependency caching, and step execution commands.
- **Node.js Runtime Specification**: The version tag (`22`) consumed by `actions/setup-node@v4` to provision the execution environment.
- **Python Pip Constraint**: The version constraint (`"pip<24.1"`) ensuring backward-compatible metadata parsing for legacy RVC dependencies.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 3 out of 3 workflow files (`ci.yml`, `security-audit.yml`, `build-electron.yml`) declare `node-version: 22`.
- **SC-002**: `.github/workflows/ci.yml` backend job executes `python -m pip install "pip<24.1"` without using `--upgrade pip`.
- **SC-003**: 0 changes made to `package.json`, `requirements.txt`, or any file under `src/`, `server/`, or `python-backend/`.

---

## Assumptions

- GitHub Actions Ubuntu and Windows hosted runners provide access to Node 22.x LTS distributions.
- Python 3.10 is installed on runner before running `python -m pip install "pip<24.1"`.
- No `engines` field or `.npmrc` `engine-strict` exists in the repository, so local developer installations remain unrestricted.
