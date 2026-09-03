# Quickstart & Local CI Emulation Guide

**Feature Branch**: `009-github-actions-ci`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Emulating Frontend CI Locally

Run each step in exact workflow sequence:

```bash
# 1. Clean deterministic install
npm ci

# 2. Type checking
npm run typecheck

# 3. Code linting
npm run lint

# 4. Automated tests
npm test

# 5. Production build
npm run build
```

Expected exit code for all commands: `0`.

---

## 2. Emulating Backend CI Locally

```bash
# 1. Install dependencies
pip install -r python-backend/requirements.txt
pip install -r python-backend/requirements-dev.txt

# 2. Run pytest suite
pytest python-backend/tests -v
```

Expected exit code: `0`.
