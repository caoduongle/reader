# Contract: Workflow Permissions & Publishing Environment

**Feature**: `025-electron-publish-permissions`  
**Target File**: `.github/workflows/build-electron.yml`  

---

## 1. Job Permissions Contract

The `build-windows` job in `.github/workflows/build-electron.yml` MUST conform to the following schema:

```yaml
jobs:
  build-windows:
    name: Build Windows Installer (.exe)
    runs-on: windows-latest
    # Note: 'contents: write' is required for electron-builder to create GitHub Releases.
    # If this workflow is ever triggered from a fork or pull_request, GITHUB_TOKEN is
    # restricted to read-only by GitHub security policy; publishing from a fork requires a custom PAT.
    permissions:
      contents: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      # ... subsequent steps ...
```

### Invariants:
1. `permissions.contents` MUST be set to `write`.
2. Indentation MUST align under `jobs.build-windows`.
3. Unrelated permissions MUST NOT be granted.

---

## 2. Electron Builder Environment Contract

The step running `npm run electron:build` MUST conform to:

```yaml
      - name: Package Desktop Installer (Electron Builder)
        run: npm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Invariants:
1. `env.GH_TOKEN` MUST reference `${{ secrets.GITHUB_TOKEN }}`.
2. Step name and command MUST remain unaltered.
