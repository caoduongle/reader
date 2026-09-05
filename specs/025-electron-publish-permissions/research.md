# Research: GitHub Actions Release Publishing Permissions & Token Security

**Feature**: `025-electron-publish-permissions`  
**Date**: 2026-09-05  

---

## 1. Root Cause Analysis: HTTP 403 "Resource not accessible by integration"

### Background
When `electron-builder` packages an Electron app with a publish configuration (or when triggered by a git tag like `v1.0.0`), it attempts to interact with GitHub Releases API via:
`POST /repos/{owner}/{repo}/releases`

### Cause
In modern GitHub Actions configurations, repositories default to **Read repository contents permission** for `GITHUB_TOKEN` to protect against unauthorized modifications by third-party actions.
When no `permissions:` block is defined in `.github/workflows/build-electron.yml`, the job runs with the default token permissions (Read-only). Attempting to create a release or upload an asset to GitHub Releases results in:
`HTTP 403 Forbidden: "Resource not accessible by integration"`

### Decision
Add explicit `permissions: contents: write` to the workflow.

---

## 2. Placement: Workflow-Level vs Job-Level Permissions

### Evaluation
- **Workflow-Level**: Placing `permissions:` at the top of the workflow gives all jobs in that file the specified permissions.
- **Job-Level**: Placing `permissions:` directly inside `jobs.build-windows:` restricts the write token scope strictly to the Windows packaging job.

### Decision
Declare `permissions: contents: write` at the job level (`jobs.build-windows.permissions`), or top-level. Since `build-electron.yml` contains exactly one job (`build-windows`), declaring it at the job level (or top-level with comment) adheres to the GitHub security principle of least privilege.
Declaring it under `jobs.build-windows` explicitly scopes the permission:
```yaml
jobs:
  build-windows:
    name: Build Windows Installer (.exe)
    runs-on: windows-latest
    permissions:
      contents: write
```

---

## 3. GH_TOKEN Environment Variable Verification

### Analysis of Current Step
Inspecting lines 54-58 of `.github/workflows/build-electron.yml`:
```yaml
      - name: Package Desktop Installer (Electron Builder)
        run: npm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
`GH_TOKEN` is already mapped to `${{ secrets.GITHUB_TOKEN }}`.
Once `contents: write` is granted to `GITHUB_TOKEN`, `electron-builder` will use this token with full release creation and asset upload authorization.

---

## 4. Fork & Pull Request Token Security Model

### Security Analysis
GitHub enforces strict boundaries on `GITHUB_TOKEN` when workflows are triggered from repository forks or external pull requests:
- Workflows triggered by `pull_request` from a fork **always** receive a read-only `GITHUB_TOKEN`, regardless of any `permissions: contents: write` block defined in the workflow YAML.
- This prevents untrusted PR authors from publishing malicious releases or tampering with repository assets.

### Decision
Add an explicit inline comment above the `permissions:` block documenting this restriction:
```yaml
    # Note: 'contents: write' is required for electron-builder to create GitHub Releases.
    # If this workflow is ever triggered from a fork or pull_request, GITHUB_TOKEN is
    # restricted to read-only by GitHub security policy; publishing from a fork requires a custom PAT.
    permissions:
      contents: write
```
