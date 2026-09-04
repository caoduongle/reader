# Implementation Plan: CI Infrastructure Hardening (Node 22 Upgrade & Pip Pinning)

**Branch**: `018-fix-ci-infrastructure` | **Date**: 2026-09-04 | **Spec**: [specs/018-fix-ci-infrastructure/spec.md](file:///e:/reader/specs/018-fix-ci-infrastructure/spec.md)

**Input**: Feature specification from `/specs/018-fix-ci-infrastructure/spec.md`

---

## Summary

This plan addresses two critical CI infrastructure incompatibilities in GitHub Actions:
1. **Node.js 22 Upgrade**: Synchronizing `node-version: 22` across `.github/workflows/ci.yml`, `.github/workflows/security-audit.yml`, and `.github/workflows/build-electron.yml` to satisfy `jsdom@30`'s dependency on Node.js 22+ API `markAsUncloneable`.
2. **Pip Version Pinning**: Modifying the backend job in `.github/workflows/ci.yml` from `python -m pip install --upgrade pip` to `python -m pip install "pip<24.1"` to prevent PEP 440 invalid metadata parsing exceptions on `omegaconf==2.0.6` (dependency of `fairseq==0.12.2`).

The scope is strictly confined to `.github/workflows/*.yml` with zero modifications to application source code, package configurations, or python requirements files.

---

## Technical Context

**Target Environments**:
- GitHub Actions Runners: `ubuntu-latest`, `windows-latest`
- CI Node.js Runtime: Node.js 22 LTS (via `actions/setup-node@v4`)
- CI Python Runtime: Python 3.10 with `pip<24.1` (via `actions/setup-python@v5`)

**Dependencies & Tooling**:
- GitHub Actions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-python@v5`, `actions/upload-artifact@v4`
- Frontend Test Suite: `vitest` with `jsdom@30`
- Backend Test Suite: `pytest`

**Constraints**:
- Strict isolation: zero edits to `package.json`, `.npmrc`, `requirements.txt`, or application code under `src/`, `server/`, `electron/`.
- No modification of the RVC dependency chain.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Assessment | Status |
|:---|:---|:---|
| **I. Library-First & Modularity** | Workflow configurations are clean, modular, and declarative per GitHub Actions standards. | **PASS** |
| **II. CLI & Operational Interfaces** | Verification scenarios execute via standard shell commands (`grep`, `npm test`, `git status`). | **PASS** |
| **III. Test-First (TDD)** | Verification criteria and expected grep outputs are defined in `quickstart.md`. | **PASS** |
| **IV. Integration Testing** | Full CI workflow execution matches runner environment behavior. | **PASS** |
| **V. Simplicity & YAGNI** | Exactly two surgical changes made to CI configuration files without touching any other files. | **PASS** |

*Constitution Gate Result*: **ALL CHECKS PASSED**.

---

## Project Structure

### Documentation (this feature)

```text
specs/018-fix-ci-infrastructure/
├── spec.md              # Feature specification
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output: Node 22 & pip<24.1 analysis
├── data-model.md        # Phase 1 output: Workflow matrix & invariants
├── quickstart.md        # Phase 1 output: Verification commands
└── contracts/
    └── ci-contracts.md  # Phase 1 output: YAML workflow contracts
```

### Source Code (repository root)

```text
.github/workflows/
├── ci.yml                 # FR-001: node-version: 22; FR-002: pip<24.1
├── security-audit.yml     # FR-001: node-version: 22
└── build-electron.yml     # FR-001: node-version: 22
```

---

## Architecture & Configuration Mapping

| Component | Target File | Line / Location | Modification | Verification |
|:---|:---|:---|:---|:---|
| **CI Frontend Node Setup** | `.github/workflows/ci.yml` | Line 20 | Change `node-version: 20` $\rightarrow$ `node-version: 22` | `grep "node-version: 22"` |
| **CI Backend Pip Setup** | `.github/workflows/ci.yml` | Line 54 | Change `python -m pip install --upgrade pip` $\rightarrow$ `python -m pip install "pip<24.1"` | `grep 'python -m pip install "pip<24.1"'` |
| **Security Audit Node Setup** | `.github/workflows/security-audit.yml` | Line 23 | Change `node-version: 20` $\rightarrow$ `node-version: 22` | `grep "node-version: 22"` |
| **Electron Build Node Setup** | `.github/workflows/build-electron.yml` | Line 20 | Change `node-version: 20` $\rightarrow$ `node-version: 22` | `grep "node-version: 22"` |

---

## Complexity Tracking

> **Constitution Check**: All gates passed. Zero unneeded complexity introduced.
