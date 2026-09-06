# Quickstart Validation Guide: Synchronous File Descriptor Redirection for Python Backend Spawn

**Feature**: 037-sync-log-fd-spawn | **Date**: 2026-09-06

---

## Scenario 1: TypeScript & Build Validation

Ensure that `electron/main.ts` compiles cleanly and bundles into `dist-electron/`:

```bash
npm run typecheck
npm run build:electron:main
```

### Expected Outcome:
- `tsc --noEmit` exits with code 0.
- `esbuild` completes in < 100ms with code 0.

---

## Scenario 2: Development Runtime Validation (No ERR_INVALID_ARG_VALUE)

Launch Electron in development mode and verify Python backend spawn:

```bash
npm run electron:dev
```

### Expected Outcome:
1. No `ERR_INVALID_ARG_VALUE` error in console.
2. Console outputs:
   ```text
   Spawning Python server: ...
   [VoxRead] Log server Python duoc ghi tai: <path>/python-backend/server.log
   ```
3. `python-backend/server.log` exists and contains logs from `server.py`:
   ```text
   [VoxRead] Dang dung thiet bi: ...
   ```
4. Application runs normally with TTS ready.
