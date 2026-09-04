# Research & Technical Decisions: CI Infrastructure Hardening

**Feature**: `018-fix-ci-infrastructure`  
**Date**: 2026-09-04  
**Spec Reference**: [specs/018-fix-ci-infrastructure/spec.md](file:///e:/reader/specs/018-fix-ci-infrastructure/spec.md)

---

## 1. Node.js 22 LTS in GitHub Actions Workflows

### Context & Problem
In `.github/workflows/ci.yml` and `.github/workflows/security-audit.yml`, the runner environment was configured with `node-version: 20`. Vitest test suites and the Express server gateway utilize `jsdom@30`. In `jsdom@30`, environment initialization invokes `markAsUncloneable`, a Node.js V8 binding API introduced in Node.js v22.10.0 and standardized in Node.js v22.22.2+. When executed on Node 20, Vitest test execution crashes with `TypeError: markAsUncloneable is not a function`.

### Decision
Update `node-version: 20` to `node-version: 22` across all three workflow files:
- `.github/workflows/ci.yml`
- `.github/workflows/security-audit.yml`
- `.github/workflows/build-electron.yml` (synchronized for consistency across all jobs)

### Rationale
- `actions/setup-node@v4` with `node-version: 22` automatically pulls the latest stable Node 22.x LTS release, which includes `markAsUncloneable`.
- Avoids modifying `package.json` or pinning local developer environments with `engines`, keeping developer workflows flexible.

### Alternatives Considered
- *Downgrading `jsdom`*: Rejected because newer testing library bindings and DOM features in React 19 require modern JSDOM releases.
- *Polyfilling `markAsUncloneable` in user code*: Rejected as fragile and complex when upgrading the runner environment resolves the root cause cleanly.

---

## 2. Pip Version Pinning (`pip<24.1`) in Backend CI Job

### Context & Problem
In `.github/workflows/ci.yml`, the `backend` job runs:
```bash
python -m pip install --upgrade pip
pip install -r python-backend/requirements.txt
```
Upgrading pip to latest (pip >= 24.1) causes pip to enforce strict PEP 440 version specifier validation. The package `omegaconf==2.0.6` (a hard dependency of `fairseq==0.12.2` within the RVC voice conversion pipeline) specifies `PyYAML (>=5.1.*)` in its metadata. The trailing wildcard `.*` with `>=` is invalid under PEP 440. Consequently, pip >= 24.1 aborts with:
```text
ERROR: Exception: ... Invalid specifier: '>=5.1.*'
hint: You can use pip<24.1 to install this package.
```

### Decision
Replace `python -m pip install --upgrade pip` with:
```bash
python -m pip install "pip<24.1"
```
strictly in `.github/workflows/ci.yml` under the `backend` job.

### Rationale
- Pip itself suggests `pip<24.1` as the official fallback workaround for packages with legacy PEP 440 formatting issues.
- Modifying `requirements.txt` to force higher `omegaconf` or `fairseq` versions risks breaking the RVC model weight loading, torch compatibility, and voice inference pipeline.
- Pinning pip in CI preserves the exact known-working Python dependency graph.

### Alternatives Considered
- *Patching `requirements.txt`*: Rejected because upgrading `omegaconf` breaks `fairseq==0.12.2` imports.
- *Vendorizing PyYAML wheels*: Unnecessary overhead when pinning pip resolves the install step in 1 line.

---

## 3. Strict Boundary & Scope Constraints

- Zero changes to `package.json` (no `"engines"` block, no `.npmrc` file added).
- Zero changes to `python-backend/requirements.txt` or `requirements-dev.txt`.
- Zero changes to application source code under `src/`, `server/`, or `python-backend/`.
