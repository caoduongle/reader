# Feature Specification: GitHub Actions Workflow Permissions for Electron Release Publishing

**Feature Branch**: `025-electron-publish-permissions`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "Repo Electron của tôi dùng electron-builder để build & publish lên GitHub Releases qua GitHub Actions. Khi push git tag, job bị lỗi 403 'Resource not accessible by integration' lúc gọi POST /repos/{owner}/{repo}/releases — GitHub báo cần quyền 'contents: write'. Hãy giúp tôi: 1. Tìm file .yml trong .github/workflows/ có chứa lệnh build electron (electron-builder, npm run electron:build, hoặc tương tự). 2. Thêm khối permissions: contents: write ở cấp workflow hoặc cấp job build (nếu chưa có khối permissions nào). 3. Kiểm tra bước chạy electron-builder có biến môi trường GH_TOKEN chưa; nếu chưa, thêm env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} vào đúng step đó. 4. Kiểm tra workflow được trigger bởi sự kiện gì (push tag, pull_request...). Nếu có thể chạy từ fork/pull_request, thêm comment cảnh báo trong file là cần PAT riêng cho trường hợp đó vì GITHUB_TOKEN từ fork luôn bị giới hạn read-only. 5. Không đổi logic build/test khác, chỉ sửa phần liên quan đến permissions và publish. 6. Sau khi sửa xong, in ra diff và giải thích ngắn gọn từng thay đổi."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - GitHub Release Publishing Permissions (Priority: P1) 🎯 MVP

As a repository maintainer releasing new desktop versions of VoxRead by pushing a version tag (e.g. `v1.0.0`), I want the GitHub Actions workflow to grant `contents: write` permissions to `GITHUB_TOKEN`, so that `electron-builder` can successfully invoke the GitHub REST API (`POST /repos/{owner}/{repo}/releases`) to create releases and publish installer binaries without failing with HTTP 403 "Resource not accessible by integration".

**Why this priority**: Without `contents: write` permissions, modern GitHub repositories default to read-only tokens, completely blocking the automated desktop release pipeline and preventing distribution of Windows installers (`.exe`).

**Independent Test**:
1. Inspect `.github/workflows/build-electron.yml` and verify that `permissions: contents: write` is declared at the workflow or job level.
2. Trigger the workflow via tag push or `workflow_dispatch`. Verify that the runner receives elevated write tokens and does not abort at the release creation step with HTTP 403.

**Acceptance Scenarios**:
1. **Given** the desktop build workflow (`.github/workflows/build-electron.yml`), **When** the workflow is parsed by GitHub Actions, **Then** the job has explicit permission to write repository contents (`contents: write`).
2. **Given** a git tag push matching `v*.*.*`, **When** the `build-windows` job runs, **Then** `GITHUB_TOKEN` is granted write access to the GitHub Releases API.

---

### User Story 2 - Packaging Environment & Token Wiring Verification (Priority: P2)

As a maintainer inspecting the packaging pipeline, I want the `Package Desktop Installer (Electron Builder)` step in the workflow to guarantee that `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` is passed into its execution environment, so that electron-builder automatically detects the authentication credential required to communicate with GitHub.

**Why this priority**: Electron-builder looks for `GH_TOKEN` or `GITHUB_TOKEN` in its environment to authenticate GitHub API calls. Explicit declaration ensures reliable and deterministic publishing.

**Independent Test**:
1. Inspect the `Package Desktop Installer (Electron Builder)` step in `.github/workflows/build-electron.yml`.
2. Confirm `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` is explicitly mapped to the step.

**Acceptance Scenarios**:
1. **Given** the `Package Desktop Installer (Electron Builder)` step, **When** `npm run electron:build` executes, **Then** `GH_TOKEN` is available in the environment containing the token reference `${{ secrets.GITHUB_TOKEN }}`.

---

### User Story 3 - Fork & PR Security Advisory Documentation (Priority: P3)

As a contributor or maintainer reviewing the workflow triggers and security boundaries, I want clear inline documentation in `.github/workflows/build-electron.yml` explaining token behavior when workflows run from forks or pull requests, so that developers understand why publishing from forks requires a dedicated Personal Access Token (PAT) due to GitHub's read-only fork security model.

**Why this priority**: Prevents confusion if a pull request or external fork trigger is added in the future, as default `GITHUB_TOKEN` in pull requests from forks is strictly read-only regardless of workflow permissions blocks.

**Independent Test**:
1. Read `.github/workflows/build-electron.yml`.
2. Verify that an inline comment clearly warns that `GITHUB_TOKEN` from fork-triggered workflows has read-only restrictions and requires a PAT secret for cross-repository publishing.

**Acceptance Scenarios**:
1. **Given** the workflow configuration file, **When** inspected by developers, **Then** it contains informative comments documenting the trigger events (`workflow_dispatch`, `push tags`) and security constraints regarding fork/pull_request token scoping.

---

### Edge Cases

- **What if permissions block overrides other default scopes?**  
  Declaring `permissions: contents: write` at the workflow or job level sets all unspecified permissions to `none` (least-privilege principle). In this workflow, only repository checkout (`contents: read`, satisfied by `contents: write`) and release creation (`contents: write`) plus artifact upload (uses actions storage, no extra permission needed) are performed. Thus, `contents: write` is fully sufficient and adheres to security best practices.
- **What if the workflow is run manually via `workflow_dispatch` without pushing a tag?**  
  Electron-builder inspects the environment and git state. For non-tag runs or draft builds, it packages the `.exe` artifact without attempting to publish to a nonexistent release tag unless configured. `actions/upload-artifact@v4` will still upload the installer regardless of release status.
- **What if another workflow in `.github/workflows/` also needs write permissions?**  
  Only `build-electron.yml` packages desktop releases. `ci.yml` and `security-audit.yml` are read-only validation jobs and MUST retain strict default or read-only permissions.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Workflow Discovery)**: The workflow file responsible for building the Electron desktop application and running electron-builder MUST be identified as `.github/workflows/build-electron.yml`.
- **FR-002 (Explicit Contents Write Permission)**: `.github/workflows/build-electron.yml` MUST define `permissions:` with `contents: write` at the workflow level or job level (`build-windows`).
- **FR-003 (Token Environment Mapping)**: The packaging step (`npm run electron:build`) MUST explicitly map `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in its `env:` block.
- **FR-004 (Fork & Pull Request Security Advisory)**: An informative inline comment MUST be added to `.github/workflows/build-electron.yml` near the trigger/permission section documenting that `GITHUB_TOKEN` in fork pull requests is read-only and external publish requires a custom PAT.
- **FR-005 (Scope Preservation)**: No build commands, dependencies, Python setup steps, artifact upload configurations, or other CI/CD workflows MUST be altered.
- **FR-006 (Regression Prevention)**: Existing automated workflow tests (`tests/ci/verifyWorkflows.test.ts`) and test suites (`npm test`) MUST continue to pass 100%.

---

### Key Entities

- **Release Workflow (`.github/workflows/build-electron.yml`)**: GitHub Actions automation pipeline that builds web assets, provisions Python runtime, and packages the desktop installer for Windows.
- **GitHub Token (`GITHUB_TOKEN`)**: Automatically generated authentication secret provided by GitHub Actions for API interaction, scoped via workflow `permissions`.
- **Electron Builder**: Desktop packaging utility responsible for compiling binaries and publishing release assets to GitHub Releases.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of desktop packaging jobs on tag push have `contents: write` access, eliminating HTTP 403 "Resource not accessible by integration" errors during release creation.
- **SC-002**: `GH_TOKEN` environment variable is verified present in the electron-builder execution step.
- **SC-003**: 0 alterations to build logic, dependencies, or unrelated CI workflows.
- **SC-004**: 100% of automated tests pass without regression on `npm test`.

---

## Assumptions

- The target repository has GitHub Actions enabled and allows `GITHUB_TOKEN` to take `contents: write` when declared in workflow YAML.
- Publishing releases occurs primarily on git tag pushes matching `v*.*.*` or manual `workflow_dispatch`.
- Release asset uploads target the repository's GitHub Releases page.
