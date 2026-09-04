# Phase 0 Research: UI/UX & Responsive Optimization

**Feature**: `015-ui-ux-optimization`  
**Date**: 2026-09-04  
**Author**: Antigravity  

---

## 1. Horizontal Scroll Prevention & Viewport Clamping

### Context
On mobile screens and narrow browser windows (<640px), popovers, full-width fixed bars, or flex layouts with non-shrinking items often induce horizontal scrollbars (`overflow-x`), causing unexpected panning and awkward reader navigation.

### Decision
1. Apply `html, body, #root { overflow-x: hidden; max-width: 100vw; width: 100%; }` in `src/index.css`.
2. In `src/App.tsx`, wrap top-level layout in `min-h-screen max-w-full overflow-x-hidden flex flex-col`.
3. In `ControlBar.tsx`, clamp floating dock to `w-[96%] max-w-3xl left-1/2 -translate-x-1/2` with responsive padding `px-3 sm:px-6`.

### Rationale
- Guaranteed 0px horizontal jitter on any viewport from 320px to 4K.
- Seamless compatibility with both desktop Electron windows and web preview.

---

## 2. Mobile Navigation Drawer Architecture

### Context
`ReaderNavbar.tsx` contains 9 buttons (`Upload`, `TOC`, `Bookmarks`, `Quick Bookmark`, `Search`, `Theme`, `Mascot`, `Stats`, `Settings`). On viewports `< 768px` (iPad mini, smartphones), these buttons crowd each other, wrap onto multiple lines, or hide document title badges.

### Decision
1. On desktop (`>= 768px`): retain full horizontal action bar.
2. On mobile (`< 768px`):
   - Keep primary actions visible: Brand logo, Document badge, and Library Upload button.
   - Collapse secondary actions into a mobile Hamburger menu button (`<Menu className="w-5 h-5" />`).
   - Clicking hamburger opens a responsive slide-down menu / drawer with 2-column touch cards for:
     - Mục lục chương (`TOC`)
     - Dấu trang (`Bookmarks`)
     - Tìm kiếm (`Search`)
     - Thống kê đọc (`Reading Stats`)
     - Cài đặt giọng đọc & Giao diện (`Settings`)
   - Tapping any item or clicking outside immediately executes the action and auto-closes the mobile menu.

### Rationale
- Complies with standard mobile UX conventions.
- Eliminates navbar crowding while keeping all 9 features 1 tap away.

---

## 3. Vector Favicon & Dynamic Page Titles

### Context
- Currently `index.html` lacks a `<link rel="icon">`, showing default empty browser tabs.
- `index.html` has a static `<title>`, failing to inform users which novel or chapter they are reading when switching tabs or viewing window taskbars.

### Decision
1. Embed an SVG data-URI favicon directly in `index.html`:
   ```html
   <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%23d97706'/><text y='70' x='50' text-anchor='middle' font-size='60'>📖</text></svg>" />
   ```
2. In `src/App.tsx`, establish a `useEffect` that listens to `currentDocument` and `currentChapterIndex`:
   ```tsx
   document.title = currentDocument
     ? `${currentDocument.title}${currentDocument.chapters[currentChapterIndex] ? ` - ${currentDocument.chapters[currentChapterIndex].title}` : ''} | VoxRead`
     : 'VoxRead - Trình đọc truyện & Tài liệu giọng AI';
   ```

### Rationale
- SVG data-URI renders crisply at all DPI scales with 0 network latency and 0 external asset dependency.
- Dynamic page title makes multi-tab and taskbar multitasking intuitive.

---

## 4. Custom 404 / Empty Reading State Component

### Context
If a document contains no chapters, is corrupted, or fails to load, `ReaderContent.tsx` currently renders blank white/dark space.

### Decision
Introduce a dedicated `EmptyReaderState` view inside `ReaderContent.tsx` featuring:
- Large friendly book emoji 📚 or mascot graphic.
- Clear title `"Không tìm thấy tài liệu đọc"`.
- Helpful description in Vietnamese.
- Quick action button `"Mở Thư viện / Tải tệp"` and `"Khôi phục truyện mẫu"`.

### Rationale
Provides a graceful fallback matching modern 404/Empty-state UX principles.

---

## 5. Mobile Touch Target Optimization (WCAG 44x44px)

### Context
WCAG 2.1 Success Criterion 2.5.5 (Target Size) requires interactive touch targets to be at least 44x44 CSS pixels on touch devices to prevent misclicks.

### Decision
- Update main control buttons (`Play/Pause`, `SkipBack`, `SkipForward`, `Volume`, `Speed`, `Hamburger`) to include `min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation`.
- Provide adequate gap spacing (`gap-2` to `gap-3`) to avoid accidental neighboring taps.

---

## 6. Footer, Support & Accessibility Links

### Context
The application lacked an About/Support section containing dynamic copyright, clickable `tel:` links, and clickable `mailto:` links.

### Decision
1. In `src/components/ReaderContent.tsx`, add a discreet chapter footer with copyright and guide links.
2. In `src/components/SettingsModal.tsx`, add a footer support row with dynamic year `new Date().getFullYear()`, phone link `<a href="tel:+84987654321">`, and email link `<a href="mailto:support@voxread.app">`.
