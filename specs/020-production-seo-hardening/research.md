# Phase 0 Research: Technical SEO & Production Hardening ("De-Vibecode")

**Feature**: `020-production-seo-hardening`  
**Date**: 2026-09-04  
**Target Area**: Web Frontend, Vite Configuration, Public Static Assets, SEO & Routing

---

## 1. Problem Analysis & Current State

### A. Discovery & Crawler Directives
- Currently, `public/` contains no `robots.txt`, `sitemap.xml`, `llms.txt`, or web manifest.
- Search engine crawlers (Google, Bing) and AI crawlers (Perplexity, Claude, GPT) lack indexing guidelines and structured sitemaps.
- Favicon is currently an inline SVG data URI in `index.html`. No physical `.ico`, `.svg`, or PNG icons (192x192, 512x512, 180x180) exist, degrading bookmarking, PWA installation, and mobile home screen rendering.

### B. On-Page SEO & Metadata
- `index.html` has a generic static `<title>` and `<meta name="description">` that never updates dynamically when books or chapters change.
- No canonical tag `<link rel="canonical" href="...">` exists, risking duplicate content flags across different query parameters or mirrors.
- No Open Graph preview image (`og:image`) is provided, leading to blank or broken social media share cards on Facebook, Twitter, Zalo, etc.
- No JSON-LD structured data (`schema.org`) is embedded to describe the web application or site structure.

### C. 404 & Navigation
- When a user or crawler visits a non-existent URL (e.g. `/404`, `/unknown-path`), the single-page application does not present a styled 404 experience or static host redirect fallback.
- Heading tags require strict hierarchy validation: ensure exactly 1 `<h1>` per view (`ReaderNavbar` brand title), followed by `<h2>` (chapters) and `<h3>` (subordinate sections).
- Breadcrumbs are missing from the reading view to indicate location hierarchy (`Trang chủ > [Tên sách] > [Tên chương]`).

### D. Performance & Code-Splitting
- Running `vite build` emits a warning:
  `(!) Some chunks are larger than 500 kB after minification: dist/assets/index-CjRvuQIa.js (513.48 kB)`.
- `UploadModal`, `BookmarksDrawer`, `SearchDrawer`, `TOCDrawer`, and `MascotWidget` are statically imported into `App.tsx`, inflating the critical bundle.
- Third-party libraries (`recharts`, `pdfjs-dist`, `jszip`, `motion`, `lucide-react`) are not partitioned into discrete cacheable vendor chunks.

---

## 2. Technical Decisions

### Decision 1: Lightweight Native `useDocumentSEO` Hook
- **Choice**: Implement `src/hooks/useDocumentSEO.ts` to manage dynamic document title, description, canonical link, and Open Graph tags directly via standard DOM APIs, without adding external third-party dependencies (`react-helmet-async`).
- **Rationale**: React 19 and modern browser DOM APIs allow efficient, zero-overhead updates. Avoids package compatibility friction and keeps bundle size minimal.
- **Alternatives Considered**:
  - *`react-helmet-async`*: Heavyweight, adds extra runtime overhead and React 19 peer-dependency warnings.

### Decision 2: Resilient SPA 404 Routing & Static Host Fallback
- **Choice**:
  1. Create `src/components/NotFoundPage.tsx` matching VoxRead's dark amber visual theme (`#0A0A0B`, `#16161A`, amber highlights, Lucide `Compass` icon).
  2. Implement client-side path checking in `App.tsx` (detect non-root paths or explicit 404 state).
  3. Create `public/404.html` with instant redirection logic for static hosts (GitHub Pages, Netlify, Vercel, S3).
- **Rationale**: Guarantees zero broken screens whether hosted on an SPA-aware server, an Express reverse proxy, or a static CDN.

### Decision 3: Standard Public Assets for Discovery & AI Crawlers
- **Choice**:
  - `public/robots.txt`: Disallow internal API (`/api/`) and electron binaries (`/dist-electron/`), allow public pages, link to sitemap.
  - `public/sitemap.xml`: Valid Sitemaps 0.9 XML schema with canonical URLs, change frequency, and priority.
  - `public/llms.txt`: Curated markdown summarizing VoxRead's capabilities (AI TTS, RVC voice conversion, synchronized highlighting, OCR, offline IndexedDB) for AI search engines.
  - `public/manifest.webmanifest`: PWA-compliant manifest declaring theme colors, display modes, and icon references.
  - `public/favicon.ico`, `public/favicon.svg`, PNG icons, and `public/og-preview.png` (1200x630px social banner).
- **Rationale**: Meets all 2026 search engine and AI agent indexing standards.

### Decision 4: Vite Chunk Code-Splitting & Lazy Loading
- **Choice**:
  - In `vite.config.ts`, configure `build.rollupOptions.output.manualChunks`:
    - `vendor-react`: `['react', 'react-dom']`
    - `vendor-ui`: `['lucide-react', 'motion', 'canvas-confetti']`
    - `vendor-charts`: `['recharts']`
    - `vendor-parsers`: `['pdfjs-dist', 'jszip']`
  - In `App.tsx`, convert auxiliary dialogs to `React.lazy` (`UploadModal`, `BookmarksDrawer`, `SearchDrawer`, `TOCDrawer`, `MascotWidget`).
  - Maintain `build.sourcemap: false`.
- **Rationale**: Slices the primary `index.js` chunk from >500 kB down to ~150-200 kB, completely eliminating Vite's bundle warning and accelerating initial page paint.
