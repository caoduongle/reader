# Quickstart Validation Guide: Auto-Rebuild Electron Main & Preload in Development

**Feature**: 036-electron-dev-auto-build | **Date**: 2026-09-06

---

## Scenario 1: Validate Lightweight Dev Build Command

Test that `build:electron:main` compiles cleanly and generates both bundles:

```bash
npm run build:electron:main
```

### Expected Outcome:
- Process completes in under 1 second.
- `dist-electron/main.cjs` and `dist-electron/preload.cjs` exist with updated timestamps.
- Terminal exits with code 0.

---

## Scenario 2: Development Rebuild Verification

Test that edits in `electron/main.ts` take effect on the next `npm run electron:dev` without manual compilation:

1. Add a temporary unique log in `electron/main.ts`:
   ```typescript
   console.log('[DevTest] Electron auto-rebuild test');
   ```
2. Run development launch:
   ```bash
   npm run electron:dev
   ```
3. Verify in the terminal that:
   - `build:electron:main` executes first.
   - Electron outputs `[DevTest] Electron auto-rebuild test`.
4. Revert the temporary log.

---

## Scenario 3: Verify Production Build Script Unaffected

Verify that `npm run build:electron` still executes the full production build pipeline including `bundle-server.mjs`.

```bash
npm run build:electron
```

### Expected Outcome:
- Bundles both TypeScript files and runs `node scripts/bundle-server.mjs`.
