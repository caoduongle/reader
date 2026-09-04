# Data Model & Configuration Specifications: CI Infrastructure

**Feature**: `018-fix-ci-infrastructure`  
**Date**: 2026-09-04  
**Spec Reference**: [specs/018-fix-ci-infrastructure/spec.md](file:///e:/reader/specs/018-fix-ci-infrastructure/spec.md)

---

## 1. Entities & Configuration Schema

### 1.1 GitHub Actions Workflow Matrix

Represents the targeted workflow configurations in `.github/workflows/`.

| File Path | Job Name | Runtime Step | Configuration | Target State |
|:---|:---|:---|:---|:---|
| `.github/workflows/ci.yml` | `frontend` | `Set up Node.js LTS` | `actions/setup-node@v4` with `node-version` | `22` |
| `.github/workflows/ci.yml` | `backend` | `Install dependencies` | Shell command | `python -m pip install "pip<24.1"` |
| `.github/workflows/security-audit.yml` | `audit-dependencies` | `Setup Node.js` | `actions/setup-node@v4` with `node-version` | `22` |
| `.github/workflows/build-electron.yml` | `build-windows` | `Set up Node.js LTS` | `actions/setup-node@v4` with `node-version` | `22` |

---

## 2. Invariants & Scope Boundaries

```yaml
# Strict Invariants
invariants:
  node_version_synchronization:
    required_version: 22
    workflows:
      - .github/workflows/ci.yml
      - .github/workflows/security-audit.yml
      - .github/workflows/build-electron.yml
  pip_version_constraint:
    required_constraint: '"pip<24.1"'
    workflow: .github/workflows/ci.yml
    job: backend
  untouched_surfaces:
    - package.json
    - .npmrc
    - python-backend/requirements.txt
    - python-backend/requirements-dev.txt
    - src/**
    - server/**
    - electron/**
```
