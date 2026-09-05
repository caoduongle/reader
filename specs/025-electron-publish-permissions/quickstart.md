# Quickstart & Verification Guide: GitHub Actions Workflow Permissions

**Feature**: `025-electron-publish-permissions`  
**Date**: 2026-09-05  
**Status**: Active  

---

## 1. Automated Verification Scenarios

### Scenario 1: Verify YAML Syntax & Permissions Structure
Inspect `.github/workflows/build-electron.yml` to confirm valid YAML syntax and presence of `permissions: contents: write`:

```powershell
python -c "
import yaml
with open('.github/workflows/build-electron.yml', 'r', encoding='utf-8') as f:
    data = yaml.safe_load(f)
job = data['jobs']['build-windows']
assert 'permissions' in job, 'Missing permissions block in build-windows job'
assert job['permissions'].get('contents') == 'write', 'Expected contents: write'
print('PASS: permissions.contents == write verified in build-electron.yml')
"
```

### Scenario 2: Verify GH_TOKEN on electron-builder Step
Confirm that `GH_TOKEN` is mapped to `${{ secrets.GITHUB_TOKEN }}`:

```powershell
python -c "
import yaml
with open('.github/workflows/build-electron.yml', 'r', encoding='utf-8') as f:
    data = yaml.safe_load(f)
steps = data['jobs']['build-windows']['steps']
pkg_step = next((s for s in steps if 'electron:build' in s.get('run', '')), None)
assert pkg_step is not None, 'Packaging step not found'
assert 'env' in pkg_step and 'GH_TOKEN' in pkg_step['env'], 'Missing GH_TOKEN in packaging step'
print('PASS: GH_TOKEN environment mapping verified')
"
```

### Scenario 3: Verify Security Advisory Comment
Verify that the advisory comment regarding fork/pull_request read-only behavior is present:

```powershell
python -c "
with open('.github/workflows/build-electron.yml', 'r', encoding='utf-8') as f:
    content = f.read()
assert 'fork' in content.lower() and 'pat' in content.lower(), 'Missing fork/PAT security advisory comment'
print('PASS: Security advisory comment verified')
"
```

### Scenario 4: Regression Testing
Ensure all existing workflow tests pass without regression:

```powershell
npm test
"
```
