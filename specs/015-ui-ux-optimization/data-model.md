# Data Model & UI Architecture: UI/UX & Responsive Optimization

**Feature**: `015-ui-ux-optimization`  
**Date**: 2026-09-04  

---

## 1. UI State Entities

### 1.1 Mobile Menu State
Controls the visibility and interaction flow of the mobile hamburger navigation drawer in `ReaderNavbar.tsx`.

| Field | Type | Default | Description |
|---|---|---|---|
| `isMobileMenuOpen` | `boolean` | `false` | Whether the mobile navigation slide-down drawer is currently active. |

### 1.2 Toast Notification State
Controls user feedback alerts across the app in `App.tsx`.

| Field | Type | Default | Description |
|---|---|---|---|
| `toastMessage` | `string \| null` | `null` | Active text message to display. Auto-dismisses after 2400ms. |
| `toastType` | `'info' \| 'success' \| 'error'` | `'success'` | Visual style and accent color of the toast pill. |

### 1.3 Empty / 404 Reader State
Renders when `!currentDocument` or `currentDocument.chapters.length === 0`.

| Field | Type | Required | Description |
|---|---|---|---|
| `onOpenUpload` | `() => void` | Yes | Callback to prompt file upload modal. |
| `onResetToSample` | `() => void` | Yes | Callback to reload default sample novel. |

---

## 2. Component Hierarchy & Layout Tree

```mermaid
graph TD
    A[App.tsx Root Layout: overflow-x-hidden, max-w-full] --> B[ReaderNavbar]
    B --> B1[Clickable Brand Logo: Scroll to top]
    B --> B2[Active Document Badge]
    B --> B3[Desktop Action Toolbar: hidden md:flex]
    B --> B4[Mobile Hamburger Button: md:hidden min-w-44px]
    B4 --> B5[Mobile Drawer Menu: TOC, Bookmarks, Search, Stats, Settings]
    
    A --> C[Toast Notification: Fixed top-20 animate-fade-in]
    
    A --> D[ReaderContent Canvas]
    D --> D1[Active Chapter Text Content]
    D --> D2[EmptyReaderState / 404 Fallback View]
    D --> D3[Chapter Footer: Navigation & Dynamic Copyright]
    
    A --> E[ControlBar: Floating dock w-96% max-w-3xl]
    E --> E1[Touch Targets >= 44x44px]
    E --> E2[Responsive Timeline & Popovers]
    
    A --> F[Modals & Drawers]
    F --> F1[SettingsModal: Dynamic Copyright, tel:, mailto: links]
    F --> F2[UploadModal: Actionable Vietnamese Error Alerts]
```
