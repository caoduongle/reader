# Data Model & Architecture Specification: Codebase Hygiene & Bundle Optimization

**Feature Branch**: `003-cleanup-bundle-optimization`  
**Date**: 2026-09-03  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)  

---

## 1. Bundle & Module Architecture Overview

VoxRead transitions from a monolithic client bundle to an on-demand, multi-chunk architecture. Code paths needed exclusively for document format parsing or on-click modal interactions are decoupled from the critical initial render path.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Primary Entry Chunk (<500 kB)                     │
│  - React 19 Runtime & Dom                                              │
│  - Core App Shell, Navbar, ControlBar, ReaderContent, TOCDrawer        │
│  - Storage & IndexedDB Subsystems                                      │
│  - Lightweight Text / Markdown Parser                                  │
└───────────────┬────────────────────────┬───────────────────────────────┘
                │                        │
       (On Upload Action)         (On User Click)
                │                        │
  ┌─────────────┴────────────┐    ┌──────┴────────────────────┐
  ▼                          ▼    ▼                           ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────────┐ ┌──────────────────┐
│ pdfjs-dist Chunk │ │  jszip   │ │  SettingsModal   │ │ ReadingStats     │
│ (~1,100 kB)      │ │  Chunk   │ │  Chunk (~40 kB)  │ │ Modal Chunk      │
│ + local worker   │ │ (~100kB) │ │  - Voice config  │ │ (~220 kB)        │
│ asset            │ │          │ │  - Health check  │ │ - Recharts engine│
└──────────────────┘ └──────────┘ └──────────────────┘ └──────────────────┘
```

---

## 2. Core Architectural Models & Schemas

### 2.1 Bundle Chunk Descriptor (`BundleChunkDescriptor`)

Models the characteristics, size constraints, and loading policies of build output chunks:

```typescript
export interface BundleChunkDescriptor {
  /** Unique name or pattern of the output chunk */
  name: string;
  /** Purpose of the chunk */
  type: 'core-entry' | 'pdf-parser' | 'epub-parser' | 'settings-modal' | 'stats-modal';
  /** Primary modules bundled inside this chunk */
  modules: string[];
  /** Maximum allowable minified size in kilobytes */
  sizeLimitKb: number;
  /** When this chunk should be loaded by the client runtime */
  loadStrategy: 'initial-sync' | 'on-demand-upload' | 'on-demand-click';
  /** Whether Vite should flag this chunk as oversized */
  triggersViteWarning: false;
}
```

**Target Thresholds:**
- `core-entry`: `index-*.js` $\le 500\text{ kB}$ (initial download)
- `pdf-parser`: `pdfjs-dist-*.js` $\approx 1,100\text{ kB}$ (lazy)
- `epub-parser`: `jszip-*.js` $\approx 100\text{ kB}$ (lazy)
- `settings-modal`: `SettingsModal-*.js` $\approx 40\text{ kB}$ (lazy)
- `stats-modal`: `ReadingStatsModal-*.js` $\approx 220\text{ kB}$ (lazy)

---

### 2.2 Lazy Module Bridge (`LazyModuleBridge<T>`)

Models the in-memory singleton cache and lifecycle of dynamically imported libraries:

```typescript
export type ModuleLoadingState = 'unloaded' | 'loading' | 'ready' | 'error';

export interface LazyModuleBridge<T> {
  /** Current loading state */
  state: ModuleLoadingState;
  /** Resolved module instance when ready */
  instance: T | null;
  /** Stored promise during in-flight load */
  loadPromise: Promise<T> | null;
  /** Getter method ensuring lazy resolution with deduplicated in-flight requests */
  get(): Promise<T>;
}
```

**Lifecycle Invariants:**
1. Initial state is strictly `'unloaded'`, with `instance = null` and `loadPromise = null`.
2. Multiple concurrent calls to `get()` while loading MUST return the identical `loadPromise` to prevent duplicate network/disk requests.
3. Upon error, state transitions to `'error'` and subsequent calls can retry instantiation.
4. Once `'ready'`, `instance` is cached indefinitely for the lifespan of the browser/Electron session.

---

### 2.3 Package Manager Governance Profile (`PackageManagerProfile`)

Defines the project dependency governance model:

```typescript
export interface PackageManagerProfile {
  /** Canonical tool for installing and running scripts */
  authoritativeManager: 'npm';
  /** Supported lockfile version snapshot */
  canonicalLockfile: 'package-lock.json';
  /** Lockfiles explicitly banned from git tracking */
  disallowedLockfiles: string[];
  /** Git ignore patterns enforcing lockfile hygiene */
  gitIgnorePatterns: string[];
}
```

**Concrete Values:**
- `authoritativeManager`: `"npm"`
- `canonicalLockfile`: `"package-lock.json"`
- `disallowedLockfiles`: `["bun.lock", "bun.lockb", "yarn.lock", "pnpm-lock.yaml"]`
- `gitIgnorePatterns`: `["bun.lock", "bun.lockb", "yarn.lock", "pnpm-lock.yaml"]`

---

## 3. Component Interaction & State Transitions

### 3.1 Modal Lazy Loading Flow (`SettingsModal` / `ReadingStatsModal`)

```
[User clicks Settings / Stats icon in Navbar]
                    │
                    ▼
          setIsModalOpen(true)
                    │
                    ▼
   [React evaluates {isModalOpen && <Suspense>}]
                    │
    Is lazy chunk already cached?
        ├── YES ──► Render Modal immediately
        └── NO  ──► Render <Suspense fallback={null}>
                         │
                         ▼
             Trigger dynamic import()
                         │
                         ▼
             Fetch & evaluate chunk JS
                         │
                         ▼
             Re-render Modal smoothly
```

### 3.2 Dynamic Document Parsing Flow (`parsePdfFile` / `parseEpubFile`)

```
[User selects or drops .pdf / .epub file]
                    │
                    ▼
          Check file.size <= 100MB
        ├── Exceeded ──► Reject immediately with toast error
        └── Valid    ──► Begin parse operation
                              │
                              ▼
            Check signal.aborted before import
                              │
                              ▼
         Execute Promise.all([ getModule(), file.arrayBuffer() ])
                              │
                              ▼
            Check signal.aborted post-import
                              │
                              ▼
            Perform document text extraction
```
