# Feature Specification: Production Technical SEO & Web Hardening ("De-Vibecode")

**Feature Branch**: `020-production-seo-hardening`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: Comprehensive Technical Lead & SEO review covering 7 categories: Custom Domain & Page Sources, Custom 404 Page, On-Page SEO Foundations, Crawler & AI Indexing (robots.txt, sitemap.xml, llms.txt), Branding & Social Share (Favicons, Open Graph, Twitter Cards, img alt), Structured Data & Breadcrumbs, Performance & Template Cleanup (code-splitting, chunk reduction, source maps disabled, zero placeholder text).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Technical SEO, Search & AI Indexing Foundations (Priority: P1) 🎯 MVP

As a search engine crawler (Googlebot, Bingbot) and AI indexing agent (Perplexity, ClaudeBot, GPTBot), I want standardized crawling directives, an XML sitemap, machine-readable AI context (`llms.txt`), contextual metadata (`<title>`, `<meta name="description">`, `<link rel="canonical">`), and rich social sharing tags (Open Graph, Twitter Cards), so that VoxRead is accurately discovered, ranked, summarized, and shared across search engines and social platforms.

**Why this priority**: Without foundational SEO, sitemap, robots directives, and metadata, the website remains invisible to search engines, displays generic or missing link previews on social networks, and fails AI discovery checks.

**Independent Test**:
1. Request `/robots.txt`: verify HTTP 200, valid user-agent directives, and `Sitemap: https://voxread.app/sitemap.xml`.
2. Request `/sitemap.xml`: verify valid XML format adhering to sitemaps schema 0.9 with canonical routes.
3. Request `/llms.txt`: verify structured markdown summarizing VoxRead's architecture, features, and public endpoints.
4. Inspect HTML head on homepage and active reading sessions:
   - Verify `<title>` reflects app branding or current book title dynamically.
   - Verify unique, non-empty `<meta name="description">` (140-160 characters).
   - Verify `<link rel="canonical" href="...">`.
   - Verify complete Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) and Twitter (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
   - Verify favicon links (`favicon.ico`, `favicon.svg`, apple-touch-icon, and `manifest.webmanifest`).

**Acceptance Scenarios**:
1. **Given** a web crawler visiting `/robots.txt`, **When** the file is parsed, **Then** it allows indexing of public routes, blocks internal API routes (`/api/`), and declares the sitemap location.
2. **Given** an AI agent requesting `/llms.txt`, **When** fetched, **Then** it receives concise markdown documenting VoxRead's purpose, local TTS capabilities, and application structure.
3. **Given** a user or crawler loading any document in VoxRead, **When** the chapter or document changes, **Then** document title updates dynamically (e.g. `[Tiêu đề sách] - VoxRead`) and canonical URL reflects the canonical host.
4. **Given** a link to VoxRead shared on social platforms (Facebook, Zalo, Twitter, LinkedIn), **When** scraped, **Then** a high-resolution preview image (`og-preview.png`), title, and descriptive summary are rendered.

---

### User Story 2 - Semantic Hierarchy, Structured Data & Custom 404 Experience (Priority: P2)

As a site visitor navigating invalid URLs, or a search engine parsing site hierarchy, I want a dedicated 404 error page styled in harmony with the dark ambient theme, clear breadcrumb navigation, single-H1 heading hierarchy, and rich JSON-LD structured data (`WebSite` and `WebApplication`), so that the site provides an intuitive, accessible user experience and clear semantic signals to search engines.

**Why this priority**: Generic or broken 404 pages cause bounce rates and crawler errors. Unstructured headings degrade accessibility (WCAG 2.1) and SEO authority. Schema.org structured data qualifies the application for rich search snippets.

**Independent Test**:
1. Navigate to an unknown route (e.g. `/unknown-path` or `/404`):
   - Verify custom 404 page renders matching VoxRead dark theme (`bg-[#0A0A0B]`).
   - Verify presence of a "Về trang chủ" (Return to Home/Reader) button that restores the active reading view.
   - Verify static `public/404.html` exists for static host fallback.
2. Inspect heading structure on reader view:
   - Verify exactly one `<h1>` tag exists on the page.
   - Verify chapter and section titles utilize `<h2>` and subordinate sections utilize `<h3>`.
3. Inspect DOM for breadcrumb navigation:
   - Verify semantic `<nav aria-label="Breadcrumb">` displays breadcrumb path (e.g. `Trang chủ > [Tên sách] > [Tên chương]`).
4. Validate JSON-LD script in `<head>`:
   - Verify valid schema format for `WebSite` and `WebApplication` / `SoftwareApplication`.
5. Audit visual assets:
   - Verify all `<img>` elements possess descriptive, non-empty `alt` attributes.

**Acceptance Scenarios**:
1. **Given** a user entering an invalid URL path, **When** rendered, **Then** the custom 404 component displays an informative message and a prominent action to return home.
2. **Given** assistive technology (screen reader) reading the page, **When** traversing headings, **Then** a clean hierarchical progression (`h1` $\rightarrow$ `h2` $\rightarrow$ `h3`) is observed without skipping levels.
3. **Given** Google Structured Data Testing Tool / Schema Validator, **When** evaluating the page, **Then** zero schema syntax errors or missing required fields are reported for `WebApplication` and `WebSite`.

---

### User Story 3 - Production Build Optimization, Code-Splitting & Clean Packaging (Priority: P3)

As a web user with varying network speeds, I want the web bundle to be optimized with intelligent code-splitting, lazy loading of heavy components, zero source maps in production, and zero chunk size warnings, so that initial page load is sub-second and resources load cleanly without template residue or console errors.

**Why this priority**: Oversized JavaScript bundles (>500 kB chunks) delay First Contentful Paint (FCP) and Time to Interactive (TTI), hurting Core Web Vitals (LCP, INP, CLS) and SEO search ranking.

**Independent Test**:
1. Execute `npm run build`:
   - Verify zero chunk size warnings (>500 kB) for main application chunks.
   - Verify vendor chunks are separated into discrete caches (`vendor-react`, `vendor-ui`, `vendor-parsers`, `vendor-charts`).
   - Verify `dist/` contains zero `.map` files (source maps strictly disabled).
2. Launch production build (`npm run preview`):
   - Open browser developer console: verify zero errors or unhandled warnings.
   - Verify no template placeholder remnants ("Vite + React", lorem ipsum, TODO strings).
3. Test custom domain base path:
   - Verify relative assets (`./assets/...` or `/assets/...`) resolve without 404s under custom domain hosting.

**Acceptance Scenarios**:
1. **Given** the production build pipeline, **When** `vite build` runs, **Then** heavy libraries (`recharts`, `pdfjs-dist`, `jszip`, `motion`) and auxiliary modals (`UploadModal`, `BookmarksDrawer`, `SearchDrawer`, `TOCDrawer`, `MascotWidget`) are code-split into lazy chunks.
2. **Given** the built output in `dist/`, **When** inspected, **Then** no `.js.map` or `.css.map` files exist.
3. **Given** the runtime browser environment, **When** interacting with all UI features, **Then** console output is clean and free of warnings or failed network calls.

---

### Edge Cases

- How does the application behave when deployed to static hosts (GitHub Pages, Netlify, Vercel, S3) that require single-page routing fallbacks?
  *A standalone `public/404.html` acts as a static redirect fallback to `index.html` while the in-app React router/view renders the themed 404 UI.*
- How does dynamic SEO behave when no book is loaded (empty library state)?
  *The app defaults to the global site metadata (`VoxRead - Đọc Truyện & Tài Liệu Thông Minh Bằng Giọng Nói AI`).*
- How does code-splitting affect the Electron desktop application?
  *Vite's chunk splitting is fully supported by Electron Chromium with file protocol (`base: './'`), maintaining full compatibility.*

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Base URL & Path Compatibility)**: The build configuration MUST allow clean resource resolution under custom domains (`https://voxread.app` or configured base) without hardcoded local paths.
- **FR-002 (Custom 404 Experience)**: The application MUST provide a themed 404 view (`NotFoundPage.tsx`) and static `public/404.html` with return-to-home navigation.
- **FR-003 (Dynamic Title & Meta Description)**: The application MUST update `<title>` and `<meta name="description">` based on current reader state and route.
- **FR-004 (Canonical Tag)**: The application MUST declare a canonical link `<link rel="canonical" href="...">` pointing to the authoritative production URL.
- **FR-005 (Heading Hierarchy)**: The application MUST enforce a single `<h1>` per view, followed by logical `<h2>` and `<h3>` tags.
- **FR-006 (Crawlers & AI Indexing)**: The application MUST provide `public/robots.txt`, `public/sitemap.xml`, and `public/llms.txt`.
- **FR-007 (Branding & Social Sharing)**: The application MUST provide full favicon assets (`favicon.ico`, `favicon.svg`, PNG sizes, `apple-touch-icon.png`), `manifest.webmanifest`, Open Graph tags, and Twitter Cards with preview image `og-preview.png`.
- **FR-008 (Image Alt Attributes)**: All visual assets and `<img>` elements MUST contain descriptive `alt` text.
- **FR-009 (Breadcrumbs Navigation)**: The application MUST provide semantic breadcrumb navigation with schema microdata.
- **FR-010 (Structured Data)**: The application MUST embed Schema.org JSON-LD definitions for `WebSite` and `WebApplication`.
- **FR-011 (Template & Placeholder Cleanup)**: The application MUST remove all default template headers, mock text, and lorem ipsum residue.
- **FR-012 (Production Source Maps)**: The production build MUST strictly disable source maps (`sourcemap: false`).
- **FR-013 (Bundle Optimization & Code Splitting)**: The application MUST split heavy vendor modules and lazy-load secondary drawers/modals, eliminating Vite's >500 kB chunk warning.

---

## Key Entities *(include if feature involves data)*

- **SiteMetadata**: Central configuration object defining site title, description, canonical domain, social preview image, and author details.
- **BreadcrumbItem**: Navigation trail entity consisting of label, path/action, and hierarchy order.
- **SchemaLD**: JSON-LD graph representing `WebSite` and `WebApplication` metadata conforming to Schema.org standards.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of public crawler files (`robots.txt`, `sitemap.xml`, `llms.txt`) return HTTP 200 with valid syntax.
- **SC-002**: 100% of pages contain valid `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph, and Twitter Card tags.
- **SC-003**: 0 missing `alt` attributes on all visual image assets.
- **SC-004**: Exactly 1 `<h1>` tag present on any given view, with zero heading hierarchy level skips.
- **SC-005**: 0 source map files generated in `dist/` production output.
- **SC-006**: Main application chunk size is under 500 kB, with zero Vite chunk size warnings on `npm run build`.
- **SC-007**: 100% of automated unit/integration test suites pass with zero regressions.

---

## Assumptions

- The production custom domain will be `https://voxread.app` (configurable via `VITE_SITE_URL`).
- The application remains an SPA with client-side state and optional hash/path routing, compatible with static host fallbacks.
- Desktop packaging via Electron Builder remains fully supported with relative chunk loading.
