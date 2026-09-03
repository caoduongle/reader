# CI Contracts & Pipeline Invariants

**Feature**: `009-github-actions-ci`  
**Date**: 2026-09-03  

---

## 1. Quality Gate Invariants

1. **Strict Fail-Fast**: If any frontend check fails (`typecheck`, `lint`, `test`), the subsequent steps MUST NOT run.
2. **Zero Continue-On-Error**: No step in `.github/workflows/ci.yml` may contain `continue-on-error: true`.
3. **Hermetic Execution**: Neither job relies on private external credentials or physical GPU devices to pass.
4. **Deterministic Dependencies**: Dependencies must be installed via `npm ci` rather than `npm install` to enforce exact `package-lock.json` lockfile trees.

---

## 2. GitHub Status Badge Contract

- **Badge URL**: `https://github.com/caoduongle/reader/actions/workflows/ci.yml/badge.svg`
- **Link Target**: `https://github.com/caoduongle/reader/actions/workflows/ci.yml`
- **Location**: Top of `README.md` immediately following title.
