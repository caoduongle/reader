# Quickstart & Verification Guide: UI/UX & Responsive Optimization

**Feature**: `015-ui-ux-optimization`  
**Date**: 2026-09-04  

---

## 1. Automated Verification Commands

Run full test suite and quality gates:
```bash
npm test
npx tsc --noEmit
npx eslint .
npm run build
```

---

## 2. Responsive & UI/UX Verification Scenarios

### Scenario 1: Horizontal Scroll & Viewport Clamping
1. Open Chrome DevTools in responsive mode.
2. Select mobile devices: iPhone SE (375px), Pixel 7 (412px), and iPhone 14 Pro Max (430px).
3. Scroll through document and open audio popovers (Volume, Speed).
4. **Expected Outcome**: Horizontal scrollbar is 0px (`window.innerWidth === document.documentElement.clientWidth`).

### Scenario 2: Mobile Hamburger Menu Drawer
1. Resize viewport to 390px (mobile).
2. Observe `ReaderNavbar`: primary brand logo and Library button remain visible; secondary buttons collapse into a hamburger menu button.
3. Tap hamburger button: mobile navigation drawer opens smoothly with large touch targets (>= 44x44px).
4. Tap "Mục lục chương" (TOC): TOC drawer opens and mobile menu auto-closes.

### Scenario 3: Clickable Logo
1. Scroll down several paragraphs into any novel chapter.
2. Click the `📖 VoxRead` brand logo at top-left.
3. **Expected Outcome**: Screen smoothly scrolls to top (`behavior: 'smooth'`).

### Scenario 4: Dynamic Title & Favicon
1. Observe browser tab: crisp book SVG icon displays as favicon.
2. Switch chapters or documents.
3. **Expected Outcome**: Browser tab title updates to `"{Title} - {Chapter} | VoxRead"`.

### Scenario 5: Contact Links & Dynamic Copyright
1. Open Settings or scroll to the chapter footer.
2. Verify copyright displays the current year (e.g. `2026`).
3. Click phone number: triggers `tel:+84987654321`.
4. Click email: triggers `mailto:support@voxread.app`.
