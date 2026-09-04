# Feature Specification: UI/UX & Responsive Optimization ("Hoàn thiện 20 Hạng mục Giao diện UI/UX")

**Feature Branch**: `015-ui-ux-optimization`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: User description: "Bạn là một Senior Frontend Developer và chuyên gia UI/UX. Hãy kiểm tra toàn bộ mã nguồn giao diện của dự án này và hoàn thiện 20 hạng mục sau: 1. Remove horizontal scroll, 2. Find broken links, 3. Add mobile menu, 4. Add favicon, 5. Fix page titles, 6. Add meta descriptions, 7. Fix footer links, 8. Custom 404 page, 9. Dynamic copyright year, 10. Compress images, 11. Fix broken buttons, 12. Success messages, 13. Error messages, 14. Remove placeholder text, 15. Remove unused navigation, 16. Fix mobile overflow, 17. Clickable logo, 18. Clickable phone number, 19. Clickable email, 20. Full mobile optimization. Định dạng phản hồi: Liệt kê theo thứ tự từ 1 đến 20, chỉ ra file/dòng code cần sửa và cung cấp đoạn mã thay thế trực tiếp."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mobile-First Responsive Navigation & Overflow Prevention (Priority: P1) 🎯 MVP

As a reader using VoxRead on a smartphone or narrow viewport (320px–768px), I want the navigation bar and audio control bar to adapt smoothly without horizontal scrolling or crowded buttons, with a dedicated mobile hamburger menu drawer, so that I can easily access all features without UI breakage.

**Why this priority**: Mobile readers currently experience button overflow in the top navbar (9 cramped buttons) and potential horizontal scrollbars, severely compromising the primary reading experience.

**Independent Test**:
1. Open the application in responsive mobile view (width: 375px).
2. Verify no horizontal scrollbar exists on any axis.
3. Verify the top navbar shows only Brand, active chapter, and a mobile hamburger menu button.
4. Click hamburger button: verify smooth drawer transition with touch targets ≥ 44x44px.
5. Select any item (e.g. Settings, TOC, Stats): verify action executes and mobile drawer auto-closes.

**Acceptance Scenarios**:
1. **Given** a screen width < 768px, **When** viewing the app, **Then** all secondary navigation controls are neatly tucked into a slide-out hamburger menu drawer.
2. **Given** the mobile drawer is open, **When** any menu item is clicked or the backdrop is tapped, **Then** the drawer closes smoothly.
3. **Given** any screen resolution down to 320px, **When** scrolling vertically, **Then** horizontal scroll is strictly 0px (`overflow-x: hidden`).

---

### User Story 2 - Essential Branding, Favicon, Title & SEO Meta (Priority: P1)

As a user browsing or bookmarking VoxRead in a browser or desktop environment, I want a crisp SVG favicon, contextual document page titles, and complete SEO/social meta tags, so that the application looks professional and can be identified at a glance.

**Why this priority**: Currently `index.html` lacks a favicon link tag and uses a static title that doesn't reflect the active book or chapter.

**Independent Test**:
1. Inspect browser tab: verify crisp book emoji SVG favicon appears.
2. Load a book or chapter: verify the browser tab title updates dynamically to `"{Book Title} - {Chapter Title} | VoxRead"`.
3. Inspect HTML head: verify Open Graph, Twitter cards, and meta description are populated.

**Acceptance Scenarios**:
1. **Given** the application loads, **When** `<head>` is parsed, **Then** valid favicon `<link rel="icon">` tags render correctly.
2. **Given** a document is active in reader, **When** chapter changes, **Then** `document.title` updates dynamically.
3. **Given** the logo in `ReaderNavbar` is displayed, **When** clicked, **Then** it smoothly scrolls reading to top or opens the Library.

---

### User Story 3 - User Feedback, Toast Notifications & Resilient Error States (Priority: P2)

As a reader performing actions (importing files, adding bookmarks, changing settings), I want instant toast confirmations upon success and helpful, localized error messages upon failure, along with an intuitive 404/Empty State screen when no document is active.

**Why this priority**: Users need confirmation that their actions succeeded (e.g. file imported, settings saved) and graceful guidance when errors occur.

**Independent Test**:
1. Upload a file: observe emerald toast `"Đã nạp tài liệu thành công"`.
2. Attempt an invalid URL or corrupt file: observe amber/red error alert with actionable advice.
3. Close/delete all documents: observe friendly 404/Empty reading state with mascot guidance.

**Acceptance Scenarios**:
1. **Given** a successful file load or bookmark action, **When** completed, **Then** a visible toast alert appears for 2.5 seconds.
2. **Given** an invalid input or failure, **When** triggered, **Then** a descriptive Vietnamese error message is presented.
3. **Given** an invalid document state, **When** rendered, **Then** a custom friendly 404/Empty screen is displayed with a "Tải tài liệu mẫu" button.

---

### User Story 4 - App Footer, Support Links & Contact Accessibility (Priority: P2)

As a user seeking help or support, I want an accessible footer or support dialog with dynamic copyright year, clickable phone links (`tel:`), clickable email links (`mailto:`), and verified documentation links.

**Why this priority**: Establishes trust, legal compliance, and easy accessibility for reader assistance.

**Independent Test**:
1. Open the About/Footer modal or scroll to the end of chapter content.
2. Verify copyright reflects the current year dynamically (`new Date().getFullYear()`).
3. Click email link: verify mail client opens.
4. Click phone number: verify phone dialer opens.

**Acceptance Scenarios**:
1. **Given** the support/footer section, **When** rendered, **Then** copyright displays current year dynamically.
2. **Given** email and phone strings, **When** displayed, **Then** they are interactive `mailto:` and `tel:` links with 44x44px touch targets.
3. **Given** all interactive buttons across modals, **When** clicked, **Then** all have active event handlers and no orphaned triggers.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Item 1: Remove horizontal scroll)**: The system MUST apply `overflow-x: hidden` and `max-w-full` across root layout containers to prevent unintended horizontal scrolling.
- **FR-002 (Item 2: Find broken links)**: All internal and external anchor tags MUST have valid, functional `href` targets and secure `rel="noopener noreferrer"` attributes.
- **FR-003 (Item 3: Add mobile menu)**: The navbar MUST provide a mobile hamburger menu drawer below 768px, consolidating secondary actions (TOC, Bookmarks, Search, Stats, Settings).
- **FR-004 (Item 4: Add favicon)**: `index.html` MUST include a high-contrast SVG data-URI favicon in `<head>` depicting the VoxRead book icon.
- **FR-005 (Item 5: Fix page titles)**: The system MUST dynamically update `document.title` to reflect active document and chapter titles.
- **FR-006 (Item 6: Add meta descriptions)**: `index.html` MUST maintain structured SEO meta descriptions and OpenGraph tags.
- **FR-007 (Item 7: Fix footer links)**: All footer links MUST point to valid internal modals, guides, or external GitHub repositories.
- **FR-008 (Item 8: Custom 404 page)**: The application MUST render a friendly Empty/404 reading state component with a quick action to load sample novels.
- **FR-009 (Item 9: Dynamic copyright year)**: Copyright notices MUST dynamically evaluate `new Date().getFullYear()`.
- **FR-010 (Item 10: Compress images)**: All image assets MUST be optimized, utilizing vector SVGs or lazy loading where applicable.
- **FR-011 (Item 11: Fix broken buttons)**: Every `<button>` across all components MUST possess an active `onClick` handler and accessible `aria-label`/`title`.
- **FR-012 (Item 12: Success messages)**: File upload, bookmarking, and settings actions MUST emit visual toast notifications upon completion.
- **FR-013 (Item 13: Error messages)**: Validation failures and server exceptions MUST display clear, localized Vietnamese error dialogs.
- **FR-014 (Item 14: Remove placeholder text)**: The application MUST contain 0 placeholder or template strings (Lorem Ipsum, TBD).
- **FR-015 (Item 15: Remove unused navigation)**: Any redundant or non-functional navigation items MUST be removed or wired to active modals.
- **FR-016 (Item 16: Fix mobile overflow)**: Floating audio control bar and drawers MUST clamp widths and use responsive padding to prevent screen bleed on mobile.
- **FR-017 (Item 17: Clickable logo)**: The brand logo in `ReaderNavbar` MUST be an interactive clickable button that returns the reader to top or opens Library.
- **FR-018 (Item 18: Clickable phone number)**: Support phone numbers in the About/Support section MUST be formatted as clickable `<a href="tel:...">`.
- **FR-019 (Item 19: Clickable email)**: Support emails in the About/Support section MUST be formatted as clickable `<a href="mailto:...">`.
- **FR-020 (Item 20: Full mobile optimization)**: All interactive buttons on touch screens MUST meet WCAG AAA touch target sizing (minimum 44x44px).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0px horizontal scroll on all viewports from 320px to 4K displays.
- **SC-002**: 100% of interactive touch targets on mobile viewports meet or exceed 44x44px bounding boxes.
- **SC-003**: 0 dead links (`href="#"`) or orphaned buttons across the entire codebase.
- **SC-004**: Tab title dynamically reflects reading context within 100ms of chapter change.
- **SC-005**: All 20 audit items are systematically resolved with verified, clean code replacements.

---

## Assumptions

- VoxRead is an Electron desktop app with a React SPA frontend, served via Vite in web/dev preview.
- All 20 items will be addressed within the existing Tailwind CSS and React architecture without requiring external UI libraries.
- The primary language of user-facing UI messages is Vietnamese matching the application's design system.
