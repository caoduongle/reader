# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Copilot, Codex, etc.) working in this repository. Read this before making changes.

## What this project is

VoxRead is a **local-first, single-user** AI reading app (Web + Electron desktop) for TXT / EPUB / PDF files. Its core differentiator is on-device text-to-speech with **RVC voice cloning**: text is synthesized with Edge-TTS and then converted through a locally trained RVC model, so the app can "read" in a specific person's voice.

There is no backend database and no multi-user account system, by design. Everything the user owns — documents, bookmarks, settings, reading stats — lives in the browser's IndexedDB / localStorage. Don't assume a server-side database, authentication, or a multi-book library UI exist — they don't yet (see "Known gaps" below).

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19 + TypeScript + Vite 6, Tailwind CSS v4 (`@tailwindcss/vite`) |
| State | No router, no Redux/Zustand — component state (`useState`) + custom hooks. Persistence via IndexedDB (`src/utils/indexedDB.ts`) and `localStorage` (`src/utils/storage.ts`) |
| Node proxy | Express 4 + Helmet + `express-rate-limit` + Zod validation (`server.js`, `server/`) — proxies Gemini API calls and URL fetches so no API key ever reaches the browser |
| Voice backend | Python 3 + Flask (`python-backend/server.py`) — Edge-TTS → RVC (fairseq/PyTorch) voice conversion, runs locally, on demand |
| Desktop | Electron 44, bundled with esbuild (`electron/main.ts`, `electron/preload.ts`), packaged with `electron-builder` — **Windows only for now** (`nsis` + `portable`) |
| Tests | Vitest 4 + Testing Library + jsdom (frontend), `pytest` (`python-backend/tests/`) |
| Lint/format | ESLint 9 flat config (`eslint.config.js`) + `typescript-eslint`, Prettier (`.prettierrc`) |

Note: `tsconfig.json` does not enable `"strict"`. Be careful about introducing implicit `any` in new code even though the compiler won't flag it.

## Repo layout

- `src/components/` — UI components. Some are large (`SettingsModal.tsx` ~1,570 lines, `MascotWidget.tsx` ~780 lines) — see "Working on existing code" before adding to them.
- `src/hooks/useTTS.ts` (~1,025 lines) — the most complex file in the repo. Owns playback state, RVC fetch/cache, prefetching, and error handling for TTS. Read it fully before touching playback behavior.
- `src/utils/fileParser.ts` — EPUB/PDF/TXT → plain text conversion (images and original formatting are discarded; chapter titles are inferred from the first `h1`/`h2`/`h3`, not from `toc.ncx`/`nav.xhtml`).
- `src/utils/indexedDB.ts` — client storage. Currently tracks one **active** document; there's no `getAll`/list function yet.
- `src/utils/clientSanitizer.ts` — DOMPurify wrapper for anything rendered as HTML on the client.
- `server.js` + `server/` — the local Express proxy (binds to `127.0.0.1` only). `server/middleware/uploadGuard.js` does magic-byte validation on uploads; `server/validators/apiSchemas.js` holds the Zod schemas every route body is checked against.
- `lib/ssrfGuard.js`, `lib/safeFetch.js` — SSRF protection for the "fetch URL" feature. Any new outbound fetch from the server must go through these, not a raw `fetch`.
- `python-backend/` — the RVC/TTS Flask service. `model/` holds user-trained `.pth` voice models (git-ignored); `server.py`'s `discover_model_paths()` currently just picks the first `.pth` alphabetically — there's no "select active voice" endpoint yet. `wheels/` ships a **Windows-only** prebuilt `fairseq` wheel.
- `electron/` — desktop shell: window/tray management, single-instance lock, screen-capture OCR overlay (`screenReader/`).
- `specs/` + `.specify/` — this project follows [Spec-Kit](https://github.com/github/spec-kit): every feature or fix gets `specs/NNN-slug/spec.md` (+ `plan.md`, `tasks.md`) before implementation, with user stories tagged P1/P2 and explicit acceptance criteria. **Follow this workflow for non-trivial changes** — check a recent folder under `specs/` for the expected format before writing a new one. `.specify/memory/constitution.md` is still the unfilled template — don't treat it as the source of truth yet.
- `.agents/skills/` — Spec-Kit's own slash-command definitions (`speckit-specify`, `speckit-plan`, `speckit-tasks`, …). These are generic Spec-Kit tooling, **not** project-specific guidance — this file (`AGENTS.md`) is.
- `docs/security.md`, `docs/rvc-voice-setup.md`, `SECURITY.md` — read before touching anything security- or voice-model-related.

## Commands

```bash
npm run dev              # Vite dev server (port 3000)
npm run proxy             # Express proxy (port 3001) — needed for AI/URL-fetch features in dev
npm run electron:dev      # build electron main/preload, then launch Vite + Electron together
npm run build             # production web build
npm run electron:build    # web build + electron bundle + electron-builder (Windows installer)
npm run typecheck         # tsc --noEmit
npm run lint / lint:fix
npm run format             # prettier --write .
npm run test / test:watch  # vitest
```

Python backend: create a venv inside `python-backend/`, `pip install -r requirements.txt` (`requirements-dev.txt` adds test deps), then run `pytest` from `python-backend/`.

Copy `.env.example` to `.env` before running anything that touches Gemini or the proxy. Never commit a real `GEMINI_API_KEY`.

## Rules that must not be broken

1. **Never call Gemini (or any external API) directly from `src/`.** All calls go through `server.js` / `server/`, which holds the key server-side and enforces rate limiting + schema validation.
2. **The Express server binds to `127.0.0.1` only** (see `SECURITY.md`). Don't widen this without a spec and a stated reason.
3. **Any new server-side outbound fetch must go through `lib/ssrfGuard.js` / `lib/safeFetch.js`.** Don't add a raw fetch to a user-supplied URL.
4. **Uploaded files are validated by content (magic bytes via `file-type`), not by extension or MIME header alone** — follow the existing pattern in `server/middleware/uploadGuard.js`.
5. **Run `npm run test` (and `pytest` for Python changes) before considering a change done.** The `tests/security/` suite exists specifically to catch regressions in the points above — don't weaken or skip it to make a change pass.
6. Non-trivial features/fixes go through the Spec-Kit flow in `specs/`, not straight to code.

## Working on existing code

- `SettingsModal.tsx` and `useTTS.ts` are past the point where they should keep growing. If a change would add more than ~30–40 lines to either, prefer extracting a sub-component / sub-hook instead of appending.
- Guideline for **new** components/hooks: keep them under ~300–400 lines; split by responsibility once a file crosses that.
- Path alias `@/*` in `tsconfig.json` maps to the **repo root**, not `src/` — double-check imports when reusing patterns from other Vite projects.
- There are two HTML sanitizers in the codebase: `dompurify` (client, `src/utils/clientSanitizer.ts`) and `sanitize-html` (server, `server/lib/sanitizer.js`). Use whichever matches where the untrusted HTML is rendered — don't introduce a third.
- UI strings are hardcoded directly in components (mostly Vietnamese, e.g. `aria-label="Tốc độ giọng đọc"`) — there is no i18n layer. Match the existing language/style in the file you're editing rather than mixing languages within one component.

## Known gaps (don't assume these exist)

- No multi-book library/bookshelf — only one "active" document at a time in IndexedDB. The "Library" button in `ReaderNavbar.tsx` opens the upload dialog; it does not list saved books.
- No way to switch between multiple trained RVC voice models from the UI (the backend always loads the first `.pth` alphabetically).
- No auto-update mechanism in the Electron app.
- No i18n framework.
- No macOS/Linux desktop build — and note the Windows-only `fairseq` wheel in `python-backend/wheels/` means cross-platform RVC support is a bigger lift than just adding a build target.
- No test-coverage reporting (`vitest.config.ts` has no coverage provider configured).

If a task asks you to build one of the above, treat it as new scope that needs its own spec under `specs/` — don't assume partial support already exists elsewhere in the code.
