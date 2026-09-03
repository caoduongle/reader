# Data Model & Workflow Schema: GitHub Actions CI/CD

**Feature Branch**: `009-github-actions-ci`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. Workflow Architecture Diagram

```
                    ┌───────────────────────────────┐
                    │ Git Event: push / pull_request│
                    │      (branch: main)           │
                    └───────────────┬───────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  Job 1: frontend             │          │  Job 2: backend              │
├──────────────────────────────┤          ├──────────────────────────────┤
│ Runner: ubuntu-latest        │          │ Runner: ubuntu-latest        │
│ Runtime: Node.js 20 LTS      │          │ Runtime: Python 3.10         │
│ Steps:                       │          │ Steps:                       │
│ 1. Checkout                  │          │ 1. Checkout                  │
│ 2. Setup Node (cache: npm)   │          │ 2. Setup Python (cache: pip) │
│ 3. npm ci                    │          │ 3. pip install reqs          │
│ 4. npm run typecheck         │          │ 4. pytest tests              │
│ 5. npm run lint              │          └──────────────────────────────┘
│ 6. npm test                  │
│ 7. npm run build             │
└──────────────────────────────┘

                    ┌───────────────────────────────┐
                    │ Git Event: workflow_dispatch  │
                    │      or tag: v*.*.*           │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │  Workflow: build-electron    │
                    ├──────────────────────────────┤
                    │ Runner: windows-latest       │
                    │ Steps:                       │
                    │ 1. Checkout                  │
                    │ 2. Setup Node 20 LTS         │
                    │ 3. npm ci                    │
                    │ 4. npm run build             │
                    │ 5. npm run electron:build    │
                    │ 6. Upload release artifact   │
                    └──────────────────────────────┘
```

---

## 2. Workflow Specifications

### 2.1 `ci.yml` Specification
- **Trigger**: `push.branches: [main]`, `pull_request.branches: [main]`
- **Jobs**:
  - `frontend`: Runner `ubuntu-latest`. Steps: `checkout`, `setup-node (20, cache: npm)`, `npm ci`, `typecheck`, `lint`, `test`, `build`.
  - `backend`: Runner `ubuntu-latest`. Steps: `checkout`, `setup-python (3.10, cache: pip)`, `pip install`, `pytest`.

### 2.2 `build-electron.yml` Specification
- **Trigger**: `workflow_dispatch`, `push.tags: ['v*.*.*']`
- **Jobs**:
  - `build-windows`: Runner `windows-latest`. Steps: `checkout`, `setup-node (20)`, `npm ci`, `npm run build`, `npm run electron:build`, `upload-artifact`.
