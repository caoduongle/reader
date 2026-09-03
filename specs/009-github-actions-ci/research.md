# Research: Automated CI/CD Pipelines with GitHub Actions

**Feature**: `009-github-actions-ci`  
**Date**: 2026-09-03  
**Status**: Completed  

---

## 1. GitHub Actions Architecture & Workflow Design

### 1.1 Parallel Job Execution vs Monolithic Runner
- **Parallel Jobs (`frontend` & `backend`)**:
  - By splitting into two independent jobs, GitHub Actions runs them concurrently across separate runner nodes, cutting total CI wait time by ~50%.
  - `frontend` uses Node.js 20 LTS on `ubuntu-latest`.
  - `backend` uses Python 3.10 on `ubuntu-latest`.
- **Fail-Fast Enforcement in Frontend**:
  - In a continuous integration pipeline, each verification gate must execute in strict dependency order:
    1. `npm run typecheck`: Fast static analysis catching invalid types ($~3$s).
    2. `npm run lint`: Code quality and syntax rule validation ($~4$s).
    3. `npm test`: Automated unit & component tests ($~10$s).
    4. `npm run build`: Production bundle compilation ($~25$s).
  - GitHub Actions defaults to stopping a job immediately if any step returns a non-zero exit code. This fail-fast behavior minimizes wasted compute minutes.

---

## 2. Desktop Packaging Separation (`build-electron.yml`)

### Why Separate from Routine CI?
- **Runner Cost & Availability**: `windows-latest` runners consume 2x CI multiplier minutes compared to Linux runners.
- **Duration**: `electron-builder --win` packages a complete NSIS Windows installer, requiring 3–5 minutes. Running this on every push/PR to `main` significantly degrades developer feedback loops.
- **Trigger Strategy**:
  - `workflow_dispatch`: Allows on-demand manual builds from the GitHub Actions web interface.
  - `push.tags: ['v*.*.*']`: Automatically compiles release artifacts when an official version tag is published.

---

## 3. Root-Cause Quality Gate Remediation (Zero Fake Green)

- **Mandate**: No `continue-on-error: true` flags or omitted steps.
- **Action Plan**:
  - Safely eliminate dead imports from `lucide-react`.
  - Prefix intentional callback parameters with `_` to satisfy `@typescript-eslint/no-unused-vars`.
  - Narrow catch error variables from `any` to `unknown`.
  - Wrap `startKeepAlive` inside `useCallback` to resolve `react-hooks/exhaustive-deps`.
  - Confirm `npm run lint` exits cleanly with code 0 before finalizing the workflow.
