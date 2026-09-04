# UI Interface Contracts: UI/UX & Responsive Optimization

**Feature**: `015-ui-ux-optimization`  
**Layers**: App ↔ ReaderNavbar ↔ ControlBar ↔ ReaderContent  

---

## 1. Toast Notification Contract

```typescript
export interface ToastNotificationPayload {
  message: string;
  type?: 'success' | 'info' | 'error';
  durationMs?: number; // Defaults to 2400ms
}

export type ShowToastFunction = (message: string, type?: 'success' | 'info' | 'error') => void;
```

---

## 2. Mobile Menu Navigation Contract

In `ReaderNavbarProps`:
- Adds support for mobile drawer toggling with automatic close on selection of any action:
  ```typescript
  interface ReaderNavbarProps {
    // ... existing props ...
    // Mobile actions trigger their respective modals/drawers and guarantee drawer collapse
  }
  ```

---

## 3. Empty State & 404 Recovery Contract

In `ReaderContentProps`:
```typescript
interface ReaderContentProps {
  currentDocument: DocumentItem | null;
  // ... existing props ...
  onOpenUpload?: () => void;
  onResetToSample?: () => void;
}
```
When `currentDocument === null || currentDocument.chapters.length === 0`:
Renders the interactive recovery UI without crashing or leaving blank screens.
