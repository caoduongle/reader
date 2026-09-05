# Research: Legacy Cleanup & Dynamic Model Auto-Discovery

## Research 1: Unused Frontend Dependencies
- **Subject**: `@testing-library/user-event`, `autoprefixer`, `tsx`.
- **Findings**:
  - `grep` searches across `src/`, `server/`, `electron/`, `tests/`, and `scripts/` confirm zero imports of `@testing-library/user-event`, `autoprefixer`, or `tsx`.
  - Tailwind CSS v4 in this project is powered by `@tailwindcss/vite` in `vite.config.ts`, which uses the standalone Lightning CSS engine and does not require `autoprefixer` or PostCSS.
  - TypeScript execution in scripts uses `esbuild` or standard Node loaders; `tsx` is unreferenced.
  - Vitest component tests use fireEvent from `@testing-library/react`; `@testing-library/user-event` is not imported.
- **Decision**: Safe to remove all 3 devDependencies from `package.json`.

## Research 2: Gitignore Patterns & Directory Artifacts
- **Subject**: Stale `dist-app/` and unignored toolchain caches.
- **Findings**:
  - `package.json` electron-builder configuration sets `"directories": { "output": "release" }`. There is no `dist-app/` produced by any build script.
  - Cache files from TypeScript (`*.tsbuildinfo`), ESLint (`.eslintcache`), and Pytest (`.pytest_cache/`) can appear during local dev or CI and must be explicitly ignored.
  - Line 54 of `.gitignore` already specifies `!python-backend/model/.gitkeep`, which means adding an empty `python-backend/model/.gitkeep` will be immediately tracked.
- **Decision**: Remove `dist-app/`, add `*.tsbuildinfo`, `.eslintcache`, and `.pytest_cache/` to `.gitignore`. Create `python-backend/model/.gitkeep`.

## Research 3: Dynamic Model Discovery in `python-backend/server.py`
- **Subject**: Replacing hardcoded model filenames and handling missing models without crashing.
- **Findings**:
  - Currently, `MODEL_PATH = os.path.join(BASE_DIR, "model", "Chess_25e_12750s.pth")` and `rvc = RVCInference(...)` run eagerly at top-level. If `Chess_25e_12750s.pth` is missing, `RVCInference` raises an exception at module import time, causing the server process to crash immediately.
  - We can define `discover_model_paths(base_dir)`:
    - Scans `os.path.join(base_dir, "model")` for all `.pth` files. If found, select `sorted(pths)[0]`.
    - Scans for all `.index` files. If found, select `sorted(indexes)[0]`, otherwise `""`.
  - If no `.pth` file exists:
    - Log a clear diagnostic: `[VoxRead] Cảnh báo: Chưa có model giọng RVC (.pth) trong thư mục python-backend/model/...`
    - Set `rvc = None`. Do not instantiate `RVCInference`.
    - When `POST /speak` is called and `rvc is None`: return `jsonify({"error": "Chưa có model giọng RVC (.pth) trong thư mục python-backend/model/. Vui lòng copy file .pth (và .index nếu có) vào thư mục python-backend/model/ rồi restart server."}), 503`.
    - In `GET /health`: return `{"ok": True, "model_loaded": rvc is not None}`.
- **Decision**: Implement `discover_model_paths` and graceful fallback in `server.py`.

## Research 4: Backend CORS Whitelist
- **Subject**: Removing Chrome Extension origins.
- **Findings**:
  - VoxRead is now an Electron desktop application running the UI at `http://localhost:3000` (in dev) or `file://` (null origin in packaged builds).
  - Current `_add_cors_headers()` checks `origin in allowed_origins or origin.startswith("chrome-extension://")`.
  - Extension origins are obsolete and broaden the attack surface if another extension is installed in the user's browser.
- **Decision**: Restrict allowed origins strictly to `{"http://localhost:3000", "http://127.0.0.1:3000", "null"}`.

## Research 5: Documentation Synchronization
- **Subject**: `README.md` and `docs/rvc-voice-setup.md`.
- **Findings**:
  - `README.md`: The Mermaid diagram has already been partially cleaned up in the working copy, but the RVC setup section in `README.md` and `docs/rvc-voice-setup.md` still instructs users to open `server.py` and modify `MODEL_PATH` / `INDEX_PATH`.
  - `docs/rvc-voice-setup.md` still contains Section C2 describing legacy Chrome extension loading.
- **Decision**: Update both documents to describe zero-code model auto-discovery and remove extension usage instructions.
