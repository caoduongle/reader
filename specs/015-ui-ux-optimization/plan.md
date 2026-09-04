# Implementation Plan: UI/UX & Responsive Optimization

**Branch**: `015-ui-ux-optimization` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/015-ui-ux-optimization/spec.md`  

---

## Summary

Audit and upgrade the entire frontend user experience across 20 targeted UI/UX categories. Key improvements include: eliminating horizontal scroll via strict viewport clamping (`overflow-x: hidden`), introducing a dedicated mobile hamburger menu drawer in `ReaderNavbar.tsx` for viewports <768px, embedding an SVG vector favicon and dynamic document/chapter page titles, adding an empty/404 state reader view with recovery actions, formatting clickable `tel:` and `mailto:` contact links with dynamic copyright years, enforcing WCAG 44x44px mobile touch targets, and refining toast notifications for user actions.

---

## Technical Context

**Language/Version**: TypeScript 5.8+ (React 19, Vite 6)  
**Primary Dependencies**: Tailwind CSS 4, Lucide React (`lucide-react`), Framer Motion / CSS keyframes  
**Storage**: IndexedDB & LocalStorage for reading state persistence  
**Testing**: Vitest 4.x (Unit & component tests)  
**Target Platform**: Electron Desktop (Windows/macOS/Linux) and Responsive Modern Browsers (Mobile & Desktop)  
**Project Type**: Desktop Application (Electron) & Web Single Page App (React)  
**Performance Goals**: 60fps animations, 0px horizontal jitter, <100ms drawer transitions, touch target sizes ≥ 44x44px  
**Constraints**:
- Zero external UI component library dependencies (strictly leverage existing Tailwind CSS + Lucide icons).
- Preserve existing reading state, TTS playback synchronization, and RVC server polling.
- All quality gates (`npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build`) must pass cleanly.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Constitution file `.specify/memory/constitution.md` is an unfilled template; checks skipped gracefully.
- Architecture maintains zero regressions on `python-backend/`, existing API proxy routes, and Electron IPC.

---

## Project Structure

### Documentation (this feature)

```text
specs/015-ui-ux-optimization/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research & decisions
├── data-model.md        # UI state models & component hierarchy
├── quickstart.md        # Responsive & visual validation scenarios
├── contracts/
│   └── ui-contracts.md  # UI component interface contracts
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Changes

```text
index.html                                    # Vector SVG favicon, enriched SEO meta, theme color
src/
├── index.css                                 # Viewport clamping, overflow-x hidden, custom animations
├── App.tsx                                   # Dynamic document.title, top-level layout clamping, toast triggers
└── components/
    ├── ReaderNavbar.tsx                      # Mobile hamburger drawer, clickable logo, responsive grouping
    ├── ControlBar.tsx                        # 44x44px touch targets, mobile width clamping, responsive popovers
    ├── ReaderContent.tsx                     # 404/Empty reading state view, footer links & dynamic copyright
    ├── SettingsModal.tsx                     # Dynamic copyright year, tel: and mailto: contact links
    └── UploadModal.tsx                       # Localized Vietnamese error alerts, input placeholders
```

---

## Implementation Phases

### Phase 1: Layout, Viewport Clamping & HTML Meta (`index.html`, `src/index.css`)
1. In `src/index.css`, enforce `html, body, #root { overflow-x: hidden; max-width: 100vw; width: 100%; }`.
2. In `index.html`:
   - Add inline SVG book favicon `<link rel="icon">`.
   - Enrich SEO meta description, keywords, theme-color `#0D0D0F`, and OpenGraph properties.

### Phase 2: Mobile Navigation Drawer & Clickable Logo (`src/components/ReaderNavbar.tsx`)
1. In `src/components/ReaderNavbar.tsx`:
   - Wrap brand logo in a clickable button with smooth scroll-to-top behavior.
   - Hide secondary action buttons on screens `< md` (768px).
   - Add mobile hamburger menu button with animated `<Menu />` / `<X />` icons.
   - Implement mobile slide-down drawer with 44x44px touch buttons for TOC, Bookmarks, Search, Stats, and Settings.
   - Auto-close mobile drawer upon selecting any action or clicking outside.

### Phase 3: Dynamic Page Title, Toast Feedback & App Layout (`src/App.tsx`)
1. In `src/App.tsx`:
   - Add `useEffect` updating `document.title` to `"{Book Title} - {Chapter Title} | VoxRead"`.
   - Ensure top-level container has `max-w-full overflow-x-hidden`.
   - Connect file upload completion to `showToast('Đã nạp tài liệu thành công!')`.

### Phase 4: Touch Targets & Responsive Control Bar (`src/components/ControlBar.tsx`)
1. In `src/components/ControlBar.tsx`:
   - Ensure main buttons (`Play/Pause`, `SkipBack`, `SkipForward`, `Volume`, `Speed`) have minimum 44x44px touch targets.
   - Add `touch-manipulation` to prevent 300ms mobile tap delay.
   - Adapt dock width to `w-[96%] max-w-3xl` with responsive padding `px-3 sm:px-6`.

### Phase 5: 404/Empty State, Footer & Contact Links (`ReaderContent.tsx`, `SettingsModal.tsx`, `UploadModal.tsx`)
1. In `src/components/ReaderContent.tsx`:
   - Add friendly `EmptyReaderState` when `!currentDocument` or no chapters exist, offering "Tải tệp" and "Khôi phục mẫu".
   - Add chapter footer with dynamic copyright `new Date().getFullYear()` and guide links.
2. In `src/components/SettingsModal.tsx`:
   - Add support row in footer with dynamic copyright, clickable phone link (`tel:+84987654321`), and clickable email link (`mailto:support@voxread.app`).
3. In `src/components/UploadModal.tsx`:
   - Replace any remaining placeholder text with natural Vietnamese.
   - Ensure clear Vietnamese error banners with dismiss button.

### Phase 6: Quality Gates & Verification
1. Run `npm test` verifying all unit and component tests pass.
2. Run `npx tsc --noEmit` verifying 0 TypeScript errors.
3. Run `npx eslint .` verifying 0 lint errors.
4. Run `npm run build` verifying Vite bundle generation.
