# Quickstart: Production Technical SEO & Web Hardening Verification Guide

**Feature**: `020-production-seo-hardening`  
**Date**: 2026-09-04  

---

## 1. Static SEO Assets Verification

Verify that all public crawler, sitemap, and AI agent discovery files exist and conform to schema:

```powershell
# 1. Verify robots.txt contains directives and sitemap reference
Get-Content public/robots.txt

# 2. Verify sitemap.xml is valid XML
Get-Content public/sitemap.xml

# 3. Verify llms.txt exists and contains context
Get-Content public/llms.txt

# 4. Verify web app manifest
Get-Content public/manifest.webmanifest
```

---

## 2. On-Page Metadata & HTML Head Verification

Inspect `index.html` to confirm metadata presence:

```powershell
# Verify canonical tag
Select-String -Path index.html -Pattern 'rel="canonical"'

# Verify Open Graph and Twitter Card tags
Select-String -Path index.html -Pattern 'og:image'
Select-String -Path index.html -Pattern 'twitter:card'

# Verify JSON-LD Schema.org script
Select-String -Path index.html -Pattern 'application/ld\+json'
```

---

## 3. Production Build & Code-Splitting Verification

Run the production Vite build to verify chunk size reduction and disabled source maps:

```powershell
npm run build
```

**Expected Outcome**:
- `dist/` is generated cleanly.
- Zero chunk warnings: no chunk exceeds 500 kB (except specialized minified worker libraries like `pdf.worker.min.mjs` which are external modules).
- No `.map` files created:
  ```powershell
  Get-ChildItem -Path dist/ -Recurse -Filter *.map
  ```
  *(Expected: empty output, 0 files found)*

---

## 4. Automated Tests & Lint Verification

Run the test suite and static analysis to guarantee zero regressions:

```powershell
npm run test
npm run lint
npm run typecheck
```
