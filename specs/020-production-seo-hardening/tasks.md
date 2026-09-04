# Tasks: Production Technical SEO & Web Hardening ("De-Vibecode")

**Feature**: `020-production-seo-hardening`  
**Spec**: [specs/020-production-seo-hardening/spec.md](file:///e:/reader/specs/020-production-seo-hardening/spec.md)  
**Plan**: [specs/020-production-seo-hardening/plan.md](file:///e:/reader/specs/020-production-seo-hardening/plan.md)  
**Target Date**: 2026-09-04  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish site configuration constants and automated SEO verification test harness.

- [x] T001 [P] Create site metadata configuration in `src/utils/siteConfig.ts`
- [x] T002 [P] Create automated SEO verification test suite in `tests/seo/technicalSeo.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before user story integration can begin.

**⚠️ CRITICAL**: Must complete foundational SEO management hook before story integration.

- [x] T003 Create dynamic SEO hook in `src/hooks/useDocumentSEO.ts` for managing `<title>`, `<meta name="description">`, `<link rel="canonical">`, and Open Graph tags

**Checkpoint**: Foundation ready — User story implementation can now begin.

---

## Phase 3: User Story 1 - Technical SEO, Search & AI Indexing Foundations (Priority: P1) 🎯 MVP

**Goal**: Deliver search engine discovery files, XML sitemap, machine-readable AI context, branding favicons, manifest, and dynamic on-page metadata.

**Independent Test**:
1. Run `technicalSeo.test.ts`: verifies `robots.txt`, `sitemap.xml`, `llms.txt`, and `manifest.webmanifest`.
2. Inspect `index.html`: verifies static canonical, Open Graph, Twitter cards, and favicon links.
3. Test reader state change: verifies document title updates dynamically.

### Implementation for User Story 1
- [x] T004 [P] [US1] Create search engine crawler directives in `public/robots.txt`
- [x] T005 [P] [US1] Create canonical XML sitemap adhering to Sitemaps 0.9 schema in `public/sitemap.xml`
- [x] T006 [P] [US1] Create AI agent context summary per llms.txt standard in `public/llms.txt`
- [x] T007 [P] [US1] Create PWA Web App Manifest in `public/manifest.webmanifest`
- [x] T008 [P] [US1] Generate comprehensive favicon and icon suite in `public/` (`favicon.ico`, `favicon.svg`, `favicon-192.png`, `favicon-512.png`, `apple-touch-icon.png`) and social preview banner `public/og-preview.png`
- [x] T009 [US1] Update `index.html` with static canonical link, Open Graph, Twitter Cards, manifest link, and favicon link references
- [x] T010 [US1] Integrate `useDocumentSEO` into `src/App.tsx` to dynamically synchronize `<title>` and `<meta name="description">` when active book or chapter changes

**Checkpoint**: User Story 1 complete — Discovery, AI indexing, and foundational SEO operational (MVP Achieved).

---

## Phase 4: User Story 2 - Semantic Hierarchy, Structured Data & Custom 404 Experience (Priority: P2)

**Goal**: Deliver a themed custom 404 page, static host fallback, semantic breadcrumb navigation, single-H1 heading hierarchy, and Schema.org JSON-LD.

**Independent Test**:
1. Navigate to `/404` or unknown path: custom 404 view renders with return-to-home action.
2. Inspect DOM headings: exactly one `<h1>` present on the view, followed by `<h2>` and `<h3>`.
3. Validate Schema.org JSON-LD: `WebSite` and `WebApplication` schemas present and syntactically valid.

### Implementation for User Story 2
- [x] T011 [P] [US2] Create themed custom 404 component in `src/components/NotFoundPage.tsx`
- [x] T012 [P] [US2] Create static host fallback page with automatic SPA redirect in `public/404.html`
- [x] T013 [P] [US2] Create semantic breadcrumb navigation component in `src/components/BreadcrumbNav.tsx`
- [x] T014 [US2] Integrate BreadcrumbNav, single `<h1>` hierarchy audit, and 404 route detection into `src/App.tsx` and `src/components/ReaderNavbar.tsx`
- [x] T015 [US2] Embed Schema.org JSON-LD structured data (`WebSite`, `WebApplication`) into `index.html`
- [x] T016 [P] [US2] Audit all visual image elements across components to guarantee presence of descriptive `alt` attributes

**Checkpoint**: User Story 2 complete — Accessible navigation, semantic headings, custom 404, and rich structured data active.

---

## Phase 5: User Story 3 - Production Build Optimization, Code-Splitting & Clean Packaging (Priority: P3)

**Goal**: Eliminate chunk size warnings, code-split heavy vendor modules, lazy-load auxiliary modals, and verify zero source maps.

**Independent Test**:
1. Execute `npm run build`: all chunks under 500 kB (except pre-bundled worker binaries), with zero Vite chunk size warnings.
2. Verify `dist/` contains 0 `.map` files.
3. Verify browser console is free of runtime errors and placeholder text.

### Implementation for User Story 3
- [x] T017 [US3] Configure `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split vendor dependencies (`vendor-react`, `vendor-ui`, `vendor-charts`, `vendor-parsers`)
- [x] T018 [US3] Implement dynamic `React.lazy` and `Suspense` loading for auxiliary modals and drawers in `src/App.tsx` (`UploadModal`, `BookmarksDrawer`, `SearchDrawer`, `TOCDrawer`, `MascotWidget`)
- [x] T019 [US3] Verify production source maps remain disabled (`sourcemap: false`) and remove any console noise or placeholder text

**Checkpoint**: User Story 3 complete — High-performance bundle compiled cleanly without size warnings.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full verification of all acceptance criteria, regression prevention, and build validation.

- [x] T020 [P] Execute quickstart verification scenarios defined in `specs/020-production-seo-hardening/quickstart.md`
- [x] T021 Run production build (`npm run build`) and verify all chunk sizes are strictly under 500 kB
- [x] T022 Run complete test suite (`npm run test`), lint check (`npm run lint`), and typecheck (`npm run typecheck`)

---

## Dependencies & Execution Order

### Phase Dependencies

```mermaid
flowchart TD
  P1[Phase 1: Setup] --> P2[Phase 2: Foundational]
  P2 --> P3[Phase 3: US1 - SEO & AI Discovery (MVP)]
  P3 --> P4[Phase 4: US2 - Semantic Structure & 404]
  P4 --> P5[Phase 5: US3 - Bundle Optimization]
  P5 --> P6[Phase 6: Polish & Full Verification]
```

- **Setup (Phase 1)**: Independent — site config & test harness.
- **Foundational (Phase 2)**: Dynamic SEO hook blocks US1 integration.
- **User Story 1 (Phase 3 - MVP)**: Discovery assets, favicon suite, metadata tags.
- **User Story 2 (Phase 4)**: Custom 404, breadcrumbs, headings, schema.
- **User Story 3 (Phase 5)**: Vite code-splitting and modal lazy loading.
- **Polish (Phase 6)**: End-to-end regression validation.

---

## Parallel Opportunities

- **Phase 1 (Setup)**: T001 and T002 can run in parallel.
- **Phase 3 (US1)**: T004, T005, T006, T007, T008 can all be authored in parallel.
- **Phase 4 (US2)**: T011, T012, T013, T016 can be authored in parallel.
- **Phase 6 (Polish)**: T020 can run alongside T021.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (T001 - T002).
2. Complete Phase 2: Foundational (T003).
3. Complete Phase 3: User Story 1 (T004 - T010).
4. **STOP & VALIDATE**: Run `technicalSeo.test.ts` to confirm MVP.
5. Proceed to Phase 4 (US2), Phase 5 (US3), and Phase 6 (Polish).
