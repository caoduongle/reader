# Quickstart Validation Guide: Persistent Python Backend Output Log File

**Feature**: 035-python-backend-server-log | **Date**: 2026-09-05

---

## Scenario 1: TypeScript Build & Typecheck Validation

Verify that `electron/main.ts` compiles cleanly with the new `fs.createWriteStream` logic.

```bash
npm run typecheck
```

**Expected Outcome**: Zero TypeScript errors.

---

## Scenario 2: Development Launch & Log Generation

Verify that launching Electron creates and populates `python-backend/server.log`.

### Steps:
1. Start the application in development mode:
   ```bash
   npm run electron:dev
   ```
2. Check terminal output for the path log line:
   ```text
   [VoxRead] Log server Python duoc ghi tai: <path>/python-backend/server.log
   ```
3. Open `python-backend/server.log` with Notepad or VS Code:
   ```bash
   notepad python-backend/server.log
   ```
4. Verify the file contents contain Python startup output, such as:
   ```text
   [VoxRead] Dang dung thiet bi: ...
   Dang tai model RVC tu: ...
   Model san sang (...). Server dang chay tai http://localhost:8008
   ```

**Expected Outcome**: The log file exists, contains the initialization output, and continues receiving `[VoxRead][Timing]` and `[VoxRead][Debug]` lines during speech synthesis.

---

## Scenario 3: Log Truncation on Subsequent Launch

1. Stop the application.
2. Verify `python-backend/server.log` has logs from the previous session.
3. Relaunch the application.
4. Verify that the previous logs are cleared and replaced by the new session's startup logs (due to `{ flags: 'w' }`).
