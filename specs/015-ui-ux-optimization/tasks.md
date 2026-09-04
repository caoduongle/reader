# Tasks: UI/UX & Responsive Optimization

**Feature**: `015-ui-ux-optimization`  
**Generated**: 2026-09-04  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## Phase 1: Setup & Foundational (Viewport Clamping & HTML Meta)

**Purpose**: Establish base viewport safety and meta tags in HTML/CSS.

- [x] T001 Update `src/index.css` to add `html, body, #root { overflow-x: hidden; max-width: 100vw; width: 100%; }` to eliminate horizontal scrolling (Item 1, FR-001)
- [x] T002 In `index.html`, add inline SVG favicon link (`data:image/svg+xml,...`), enrich SEO meta description, keywords, theme-color `#0D0D0F`, and robots tags (Item 4, 6, FR-004, FR-006)

---

## Phase 2: User Story 1 – Mobile-First Responsive Navigation & Overflow Prevention (Priority: P1) 🎯 MVP

**Goal**: Transform navbar and control bar for flawless mobile reading without button crowding or layout breakage.

**Independent Test**: Resize viewport to 375px; verify 0px horizontal scroll, clickable logo smoothly scrolls to top, secondary navbar buttons collapse into an animated hamburger menu with 44x44px touch cards that auto-close on selection.

### Implementation for User Story 1

- [x] T003 [US1] In `src/components/ReaderNavbar.tsx`, wrap the brand logo in an interactive button with `onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}`, cursor-pointer styling, and hover feedback (Item 17, FR-017)
- [x] T004 [US1] In `src/components/ReaderNavbar.tsx`, refactor secondary navbar buttons to hide on screens `< md` (768px), add mobile hamburger button with `<Menu />` / `<X />` icons, implement mobile slide-down drawer with 44x44px touch cards for TOC, Bookmarks, Search, Stats, and Settings that auto-closes upon selecting any action or clicking outside (Item 3, 15, 16, FR-003, FR-015, FR-016)
- [x] T005 [US1] In `src/components/ControlBar.tsx`, optimize mobile layout and touch targets: clamp floating dock to `w-[96%] max-w-3xl px-3 sm:px-6 py-2`, add `min-w-[44px] min-h-[44px]` touch targets on playback controls, add `touch-manipulation` class to eliminate mobile tap latency (Item 16, 20, FR-016, FR-020)

**Checkpoint**: Mobile navigation and playback dock are fully responsive and touch-optimized down to 320px.

---

## Phase 3: User Story 2 – Dynamic Page Titles, Toast Confirmations & App Layout (Priority: P1)

**Goal**: Keep document context visible in tab titles and provide immediate visual feedback upon user actions.

**Independent Test**: Load document and change chapters: observe browser tab title updates to `"{Title} - {Chapter} | VoxRead"`. Upload book: observe toast notification `"Đã nạp thành công..."`.

### Implementation for User Story 2

- [x] T006 [US2] In `src/App.tsx`, add `useEffect` to dynamically update `document.title` to `"{Book Title} - {Chapter Title} | VoxRead"` upon document and chapter changes (Item 5, FR-005)
- [x] T007 [US2] In `src/App.tsx`, ensure root container has `min-h-screen max-w-full overflow-x-hidden flex flex-col`, connect `onDocumentLoaded` to trigger `showToast('Đã nạp thành công: ...')` (Item 1, 12, FR-001, FR-012)

**Checkpoint**: Page title updates dynamically and actions produce visible feedback.

---

## Phase 4: User Story 3 – Empty State 404 Recovery & Localized Feedback (Priority: P2)

**Goal**: Provide resilient error states, 404 fallback, and clear Vietnamese input placeholders.

**Independent Test**: Unload or corrupt document: observe friendly 404/Empty reading screen with mascot and "Mở Thư viện / Tải tệp" button. Open upload modal: observe natural Vietnamese placeholders.

### Implementation for User Story 3

- [x] T008 [US3] In `src/components/ReaderContent.tsx`, implement friendly Empty/404 reading state view rendered when `!currentDocument` or chapters are empty, with book emoji/mascot, Vietnamese guidance, and quick action buttons to open Library or restore sample novel (Item 8, FR-008)
- [x] T009 [US3] In `src/components/UploadModal.tsx`, replace English placeholders with natural Vietnamese hint text, enhance error alert banners with explicit dismiss button and clear guidance (Item 13, 14, FR-013, FR-014)

**Checkpoint**: Empty/404 states and modal inputs provide graceful, localized guidance.

---

## Phase 5: User Story 4 – Footer, Support & Accessibility Links (Priority: P2)

**Goal**: Expose accessible contact links (`tel:`, `mailto:`), dynamic copyright, and verified documentation links.

**Independent Test**: Click email: mail client opens. Click phone: phone dialer opens. Verify copyright year displays current year dynamically.

### Implementation for User Story 4

- [x] T010 [US4] In `src/components/ReaderContent.tsx`, add footer navigation and support section with dynamic copyright year `new Date().getFullYear()`, links to Settings, TOC, and GitHub documentation with `target="_blank" rel="noopener noreferrer"` (Item 2, 7, 9, FR-002, FR-007, FR-009)
- [x] T011 [US4] In `src/components/SettingsModal.tsx`, add support & contact row in footer containing dynamic copyright, clickable phone link `<a href="tel:+84987654321">`, and clickable email link `<a href="mailto:support@voxread.app">` with accessible touch targets (Item 9, 18, 19, FR-009, FR-018, FR-019)
- [x] T012 [US4] In `src/components/ControlBar.tsx` and `src/components/ReaderNavbar.tsx`, audit all interactive `<button>` elements to ensure valid `type="button"`, `aria-label`, and active event handlers (Item 11, FR-011)

**Checkpoint**: All footer, support, and contact links are accessible and functional.

---

## Phase 6: Polish & Quality Gates

**Purpose**: Quality gates, build verification, and final validation.

- [x] T013 Run `npm test` and verify all unit and component tests pass
- [x] T014 [P] Run `npx tsc --noEmit` and verify 0 TypeScript errors across the entire project
- [x] T015 [P] Run `npx eslint .` and verify 0 lint errors
- [x] T016 Run `npm run build` and verify Vite production bundle completes successfully
- [x] T017 Run manual verification scenarios from [quickstart.md](./quickstart.md): Scenario 1 (horizontal scroll), Scenario 2 (hamburger menu), Scenario 3 (clickable logo), Scenario 4 (dynamic title & favicon), Scenario 5 (contact links & copyright)
- [x] T018 Git commit all changes with descriptive message referencing `specs/015-ui-ux-optimization`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **User Story 1 (Phase 2)**: Depends on Phase 1
- **User Story 2 (Phase 3)**: Can run in parallel with or after Phase 2
- **User Story 3 (Phase 4)**: Can run after Phase 2
- **User Story 4 (Phase 5)**: Can run after Phase 2
- **Polish (Phase 6)**: Depends on all Phases 1–5

---

## Notes

- All 20 items from user prompt are explicitly mapped to tasks T001–T012.
- Touch targets on mobile must adhere to WCAG 44x44px.
- Commit after completing each phase.
