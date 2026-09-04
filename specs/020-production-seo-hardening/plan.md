# Implementation Plan: Production Technical SEO & Web Hardening ("De-Vibecode")

**Branch**: `020-production-seo-hardening` | **Date**: 2026-09-04 | **Spec**: [specs/020-production-seo-hardening/spec.md](file:///e:/reader/specs/020-production-seo-hardening/spec.md)

**Input**: Feature specification from `/specs/020-production-seo-hardening/spec.md`

---

## Summary

This plan elevates the VoxRead web application to production-grade technical SEO standards through systematic de-vibecoding:
1. **Discovery & Crawlers**: Provisioning `robots.txt`, `sitemap.xml`, `llms.txt`, and web app manifest in `public/`.
2. **Metadata & Branding**: Implementing dynamic `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph & Twitter Cards, and high-resolution multi-format favicons (`ico`, `svg`, `png`).
3. **Semantic Hierarchy & Navigation**: Enforcing a single `<h1>` per view, semantic `<h2>`/`<h3>` chapter nesting, semantic Breadcrumbs navigation, and Schema.org JSON-LD structured data (`WebSite`, `WebApplication`).
4. **Resilient 404 Experience**: Creating a themed custom 404 component (`NotFoundPage.tsx`) and static host fallback (`public/404.html`).
5. **Build & Bundle Optimization**: Configuring Vite `manualChunks` to isolate vendor libraries (`vendor-react`, `vendor-ui`, `vendor-charts`, `vendor-parsers`), lazy-loading auxiliary drawers/modals, ensuring chunks are under 500 kB, and maintaining disabled source maps.

---

## Technical Context

**Language/Version**: TypeScript 5.8, HTML5, React 19  
**Primary Dependencies**: Vite 6, Tailwind CSS 4, Lucide React, Canvas-Confetti, Recharts, Motion  
**Target Platform**: Modern Web Browsers (Chrome, Firefox, Safari, Edge) & Electron Desktop Wrapper  
**Domain URL**: `https://voxread.app` (configurable via `VITE_SITE_URL`)  
**Performance Goals**:
- Main bundle chunk < 500 kB (eliminating Vite chunk size warnings)
- Initial paint under 1 second
- Zero console errors or warnings in production
- 100% test suite and linter pass rate

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Assessment | Status |
|:---|:---|:---|
| **I. Library-First & Modularity** | SEO hooks, breadcrumbs, and 404 components are modular, reusable, and cleanly separated. | **PASS** |
| **II. CLI & Operational Interfaces** | Verification scenarios execute via standard shell commands (`npm run build`, `npm run test`, `Select-String`). | **PASS** |
| **III. Test-First (TDD)** | Comprehensive verification criteria and contracts are defined in `quickstart.md` and `contracts/`. | **PASS** |
| **IV. Integration Testing** | Full test suite validates metadata rendering, route handling, and chunk compilation. | **PASS** |
| **V. Simplicity & YAGNI** | Lightweight native DOM hook (`useDocumentSEO`) eliminates unnecessary npm dependencies like `react-helmet-async`. | **PASS** |

*Constitution Gate Result*: **ALL CHECKS PASSED**.

---

## Project Structure

### Documentation (this feature)

```text
specs/020-production-seo-hardening/
├── spec.md              # Feature specification
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output: Analysis & architectural choices
├── data-model.md        # Phase 1 output: Entity definitions & metadata schemas
├── quickstart.md        # Phase 1 output: Validation & verification commands
├── contracts/
│   └── seo-contracts.md # Phase 1 output: Robots, Sitemap, Manifest, Breadcrumb contracts
└── checklists/
    └── requirements.md  # Requirements quality checklist
```

### Source Code (repository root)

```text
public/
├── robots.txt           # Crawler indexing rules & sitemap pointer
├── sitemap.xml          # XML sitemap schema
├── llms.txt             # AI agent / LLM machine-readable summary
├── manifest.webmanifest # PWA Web App Manifest
├── 404.html             # Static host SPA redirect fallback
├── favicon.ico          # Multi-size standard favicon
├── favicon.svg          # Crisp vector SVG favicon
├── favicon-192.png      # 192x192 PWA icon
├── favicon-512.png      # 512x512 PWA splash icon
├── apple-touch-icon.png # 180x180 iOS icon
└── og-preview.png       # 1200x630 Open Graph social share banner

src/
├── components/
│   ├── BreadcrumbNav.tsx  # Semantic breadcrumb trail component
│   └── NotFoundPage.tsx   # Themed custom 404 view
├── hooks/
│   └── useDocumentSEO.ts  # Dynamic title, description & canonical manager
├── utils/
│   └── siteConfig.ts      # Authoritative site metadata constants
└── App.tsx                # 404 routing check, breadcrumbs integration, lazy modals

index.html               # Semantic <head>, JSON-LD, Open Graph, Canonical defaults
vite.config.ts           # Vendor manualChunks splitting, sourcemap: false
```

---

## Architecture & Configuration Mapping

| Component | Target File | Modification | Verification |
|:---|:---|:---|:---|
| **Crawler & Discovery** | `public/robots.txt`, `sitemap.xml`, `llms.txt` | Create standardized files | File existence & schema validation |
| **PWA & Branding** | `public/manifest.webmanifest`, favicons, `og-preview.png` | Create icon set & manifest | Manifest validation & asset loading |
| **HTML Head & Structured Data** | `index.html` | Add canonical, Open Graph, Twitter, and JSON-LD | DOM inspection |
| **Dynamic SEO Hook** | `src/hooks/useDocumentSEO.ts` | Dynamic `<title>`, `<meta>`, and `<link>` updates | State transitions in Reader |
| **Custom 404 Experience** | `src/components/NotFoundPage.tsx`, `public/404.html` | Themed 404 component & static redirect | Navigation to `/unknown-path` |
| **Breadcrumbs & Heading** | `src/components/BreadcrumbNav.tsx`, `ReaderNavbar.tsx` | Single `<h1>`, `<nav aria-label="Breadcrumb">` | Accessibility tree inspection |
| **Vite Chunk Optimization** | `vite.config.ts`, `src/App.tsx` | `manualChunks` + `React.lazy` modal loading | `npm run build` (<500 kB per chunk) |

---

## Complexity Tracking

> **Constitution Check**: All gates passed. Zero unnecessary dependencies added.
