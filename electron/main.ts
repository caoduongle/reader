import { app, BrowserWindow, Tray, Menu, dialog, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, exec, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pythonProcess: ChildProcess | null = null;
let isQuitting = false;

const PORT = 8008;
const HEALTH_URL = `http://127.0.0.1:${PORT}/health`;
const MAX_HEALTH_CHECKS = 60; // 60 seconds max

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // 1. Spawn Python backend
    await startPythonBackend();

    // 2. Create Window
    createWindow();

    // 3. Create System Tray
    createSystemTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  });
}

/**
 * Determine paths based on development vs packaged environment
 */
function getBackendPaths() {
  const isPackaged = app.isPackaged;
  const baseDir = isPackaged
    ? path.join(process.resourcesPath, 'python-backend')
    : path.join(app.getAppPath(), 'python-backend');

  const pythonwCandidate = path.join(baseDir, 'venv', 'Scripts', 'pythonw.exe');
  const pythonCandidate = path.join(baseDir, 'venv', 'Scripts', 'python.exe');
  const serverScript = path.join(baseDir, 'server.py');

  let pythonExe = '';
  if (fs.existsSync(pythonwCandidate)) {
    pythonExe = pythonwCandidate;
  } else if (fs.existsSync(pythonCandidate)) {
    pythonExe = pythonCandidate;
  }

  return {
    baseDir,
    pythonExe,
    serverScript,
  };
}

/**
 * Spawn the Python background server and poll health endpoint
 */
async function startPythonBackend(): Promise<void> {
  const { pythonExe, serverScript, baseDir } = getBackendPaths();

  if (!pythonExe || !fs.existsSync(serverScript)) {
    console.warn('Python executable or server.py not found at:', { pythonExe, serverScript });
    showPrerequisiteWarning(
      'Chưa tìm thấy môi trường Python (python-backend/venv) hoặc server.py.\n\n' +
        'Bạn vẫn có thể sử dụng VoxRead với "Giọng máy (mặc định)".\n' +
        'Để dùng "Giọng của tôi (RVC local)", vui lòng cài đặt venv và model theo hướng dẫn.'
    );
    return;
  }

  try {
    console.log(`Spawning Python server: ${pythonExe} ${serverScript}`);
    pythonProcess = spawn(pythonExe, [serverScript], {
      cwd: baseDir,
      detached: false,
      stdio: 'ignore',
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to spawn Python process:', err);
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`Python process exited with code ${code}, signal ${signal}`);
      pythonProcess = null;
    });

    // Poll health endpoint
    let isReady = false;
    for (let attempt = 1; attempt <= MAX_HEALTH_CHECKS; attempt++) {
      try {
        const response = await fetch(HEALTH_URL);
        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            console.log(`Python server ready on attempt ${attempt}`);
            isReady = true;
            break;
          }
        }
      } catch {
        // Retry
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!isReady) {
      console.warn('Python server health poll timed out after 60s');
    }
  } catch (err) {
    console.error('Error starting Python backend:', err);
  }
}

/**
 * Display non-blocking information dialog
 */
function showPrerequisiteWarning(message: string) {
  dialog.showMessageBox({
    type: 'info',
    title: 'Thông báo thiết lập VoxRead',
    message: 'Lưu ý về giọng đọc RVC local',
    detail: message,
    buttons: ['Đã hiểu, mở VoxRead'],
    defaultId: 0,
  });
}

/**
 * Create the main application window
 */
function createWindow(): void {
  const preloadPath = path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0D0D0F',
    title: 'VoxRead',
    autoHideMenuBar: true,
    webPreferences: {
      preload: fs.existsSync(preloadPath) ? preloadPath : undefined,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    // Development mode: load Vite dev server
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      // If Vite isn't immediately ready, retry shortly
      setTimeout(() => {
        mainWindow?.loadURL('http://localhost:3000');
      }, 1500);
    });
  } else {
    // Production mode: load compiled dist/index.html
    const primaryPath = path.join(__dirname, '..', 'dist', 'index.html');
    const appPath = path.join(app.getAppPath(), 'dist', 'index.html');
    const indexPath = fs.existsSync(primaryPath) ? primaryPath : appPath;
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load local index.html:', err);
    });
  }

  // Intercept window close (X) to hide into tray instead of exiting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create System Tray icon & context menu
 */
function createSystemTray(): void {
  // 16x16 icon bitmap for tray
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('VoxRead - Trình đọc sách & Giọng nói RVC');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở VoxRead',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Thoát',
      click: () => {
        isQuitting = true;
        killPythonBackend();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/**
 * Terminate the Python backend process tree cleanly on Windows
 */
function killPythonBackend(): void {
  if (pythonProcess && pythonProcess.pid) {
    const pid = pythonProcess.pid;
    console.log(`Terminating Python process tree for PID ${pid}...`);
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /F /T /PID ${pid}`, (err) => {
          if (err) {
            console.warn(`taskkill failed for PID ${pid}:`, err.message);
          }
        });
      } else {
        pythonProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.warn('Error terminating Python process:', err);
    }
    pythonProcess = null;
  }
}

app.on('before-quit', () => {
  isQuitting = true;
  killPythonBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) {
      app.quit();
    }
  }
});
