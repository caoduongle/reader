# Quickstart: CI Infrastructure Verification Guide

**Feature**: `018-fix-ci-infrastructure`  
**Date**: 2026-09-04  
**Spec Reference**: [specs/018-fix-ci-infrastructure/spec.md](file:///e:/reader/specs/018-fix-ci-infrastructure/spec.md)

---

## 1. Automated Verification Scenarios

Execute the following commands to verify that all CI workflow configurations satisfy requirements:

### Scenario 1: Verify Node.js 22 Specification Across All Workflows
```bash
# Check that all 3 workflow files specify node-version: 22
grep -Hn "node-version: 22" .github/workflows/*.yml
```
**Expected Outcome**: 3 matches returned:
- `.github/workflows/ci.yml:20:          node-version: 22`
- `.github/workflows/security-audit.yml:23:          node-version: 22`
- `.github/workflows/build-electron.yml:20:          node-version: 22`

And verify no remnants of `node-version: 20` remain:
```bash
grep -Hn "node-version: 20" .github/workflows/*.yml || echo "PASS: No node-version 20 found"
```

---

### Scenario 2: Verify Pip Version Pinning in Backend CI Job
```bash
# Check that pip is pinned to <24.1 in backend CI
grep -Hn 'python -m pip install "pip<24.1"' .github/workflows/ci.yml
```
**Expected Outcome**:
- `.github/workflows/ci.yml:54:          python -m pip install "pip<24.1"`

And verify `--upgrade pip` is completely removed:
```bash
grep -Hn 'python -m pip install --upgrade pip' .github/workflows/ci.yml || echo "PASS: No unpinned pip upgrade found"
```

---

### Scenario 3: Verify Strict Scope Isolation (No Feature Code Modified)
```bash
# Verify that git modifications are confined strictly to .github/workflows/
git status --short
```
**Expected Outcome**:
Only files under `.github/workflows/` (and `.specify/`, `specs/018-fix-ci-infrastructure/`) are modified.
Zero changes to `package.json`, `requirements.txt`, or application code.

---

### Scenario 4: Verify Zero Local Regressions
```bash
npm run test
npm run lint
npm run typecheck
```
**Expected Outcome**: All tests pass, linting reports 0 errors, typecheck reports 0 errors.
