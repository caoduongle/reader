# CI Workflow Contracts: Node 22 & Pip Pinning

**Feature**: `018-fix-ci-infrastructure`  
**Date**: 2026-09-04  
**Spec Reference**: [specs/018-fix-ci-infrastructure/spec.md](file:///e:/reader/specs/018-fix-ci-infrastructure/spec.md)

---

## 1. Contract: `.github/workflows/ci.yml`

### Step 1.1: Frontend Node.js Setup
```yaml
      - name: Set up Node.js LTS
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
```

### Step 1.2: Backend Pip Installation
```yaml
      - name: Install dependencies
        run: |
          python -m pip install "pip<24.1"
          pip install -r python-backend/requirements.txt
          pip install -r python-backend/requirements-dev.txt
```

---

## 2. Contract: `.github/workflows/security-audit.yml`

### Step 2.1: Node.js Setup
```yaml
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
```

---

## 3. Contract: `.github/workflows/build-electron.yml`

### Step 3.1: Node.js Setup
```yaml
      - name: Set up Node.js LTS
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
```
