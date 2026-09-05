# Quickstart & Verification Guide: Feature 026

Follow these steps to verify all three parts of the implementation:

## Task 1: Dependency & Gitignore Hygiene

```powershell
# Verify package.json clean and lockfile updated
npm install

# Verify frontend types, linter, and tests
npm run typecheck
npm run lint
npm test
```

## Task 2: Python Backend Legacy Cleanup & Model Auto-Discovery

```powershell
# Run backend tests
python-backend\venv\Scripts\python.exe -m pytest python-backend/tests -v
```

Verification scenarios tested by pytest:
1. `test_speak_options_preflight_chrome_extension_rejected`: Verifies Chrome extension origins are rejected.
2. `test_speak_without_model_returns_503`: Verifies that if `rvc is None`, `/speak` gracefully returns 503 instead of crashing.
3. `test_discover_model_paths`: Verifies directory scanning properly selects sorted `.pth` and `.index` files.

## Task 3: Documentation Alignment

- Inspect `README.md` to ensure the Mermaid diagram has no Chrome Extension branch and the RVC section instructs copying files to `python-backend/model/` with zero code edits.
- Inspect `docs/rvc-voice-setup.md` to ensure `MODEL_PATH` manual editing instructions and legacy extension sections are cleaned up.
