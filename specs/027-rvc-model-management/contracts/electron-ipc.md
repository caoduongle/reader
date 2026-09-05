# Contract: Electron IPC Model Management Channels

**Renderer Bridge**: `window.voxreadDesktop.models`  
**Security Model**: Context Isolation enabled, `nodeIntegration: false`, typed via `contextBridge.exposeInMainWorld`.

---

## 1. Channel: `models:get-dir`

### Direction
Renderer → Main (`ipcRenderer.invoke` → `ipcMain.handle`)

### Request Parameters
None.

### Return Type
`Promise<string>` - Absolute path to `python-backend/model` resolved via `getBackendPaths().baseDir`.

---

## 2. Channel: `models:open-folder`

### Direction
Renderer → Main (`ipcRenderer.invoke` → `ipcMain.handle`)

### Request Parameters
None.

### Return Type
`Promise<{ success: boolean; error?: string }>`

### Main Process Behavior
1. Ensures directory exists via `fs.mkdirSync(dir, { recursive: true })`.
2. Calls Electron `shell.openPath(dir)`.
3. Returns `{ success: true }` if successfully opened, or `{ success: false, error: string }` if shell fails.

---

## 3. Channel: `models:import`

### Direction
Renderer → Main (`ipcRenderer.invoke` → `ipcMain.handle`)

### Request Parameters
None.

### Return Type
`Promise<ModelImportResult>`

```typescript
export interface ModelImportResult {
  success: boolean;
  canceled?: boolean;
  importedFiles?: string[];
  targetDir?: string;
  error?: string;
}
```

### Main Process Behavior
1. Opens native file selector:
   ```typescript
   dialog.showOpenDialog(mainWindow, {
     title: 'Chọn file model RVC (.pth, .index)',
     properties: ['openFile', 'multiSelections'],
     filters: [
       { name: 'RVC Voice Models (*.pth, *.index)', extensions: ['pth', 'index'] }
     ]
   });
   ```
2. If canceled by user, returns `{ success: false, canceled: true }`.
3. Resolves target directory `python-backend/model` and ensures directory exists.
4. For each selected file path:
   - Validates extension is `.pth` or `.index`.
   - Copies file to `path.join(targetDir, path.basename(sourcePath))` via `fs.copyFileSync`.
5. Returns `{ success: true, importedFiles: [...], targetDir }`.
