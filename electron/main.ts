import { app, BrowserWindow, Tray, Menu, dialog, nativeImage, clipboard, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, exec, ChildProcess } from 'child_process';
import { createRegionOverlay, closeRegionOverlay } from './screenReader/regionOverlay';
import { captureRegion } from './screenReader/screenCapture';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pythonProcess: ChildProcess | null = null;
let proxyProcess: ChildProcess | null = null;
let isQuitting = false;
let lastCapturedClipboardText = '';

const PORT = 8008;
const HEALTH_URL = `http://127.0.0.1:${PORT}/health`;
const PROXY_PORT = 3001;
const PROXY_HEALTH_URL = `http://127.0.0.1:${PROXY_PORT}/health`;
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
    // 1. Spawn background services (Python backend and Express proxy)
    await Promise.all([startPythonBackend(), startProxyServer()]);

    // 2. Create Window
    createWindow();

    // 3. Create System Tray
    createSystemTray();

    // 4. Register global shortcut for Screen Reader
    registerScreenReaderShortcut();

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

    pythonProcess.on('error', err => {
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
          const data = (await response.json()) as { ok?: boolean };
          if (data.ok) {
            console.log(`Python server ready on attempt ${attempt}`);
            isReady = true;
            break;
          }
        }
      } catch {
        // Retry
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
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
function showPrerequisiteWarning(
  message: string,
  title = 'Thông báo thiết lập VoxRead',
  heading = 'Lưu ý về dịch vụ nền'
) {
  dialog.showMessageBox({
    type: 'info',
    title,
    message: heading,
    detail: message,
    buttons: ['Đã hiểu, mở VoxRead'],
    defaultId: 0,
  });
}

/**
 * Determine proxy script path based on development vs packaged environment
 */
function getProxyPaths() {
  const isPackaged = app.isPackaged;
  const scriptCandidate = path.join(app.getAppPath(), 'dist-electron', 'server.cjs');
  const devFallback = path.join(app.getAppPath(), 'server.js');

  let proxyScript = '';
  if (fs.existsSync(scriptCandidate)) {
    proxyScript = scriptCandidate;
  } else if (!isPackaged && fs.existsSync(devFallback)) {
    proxyScript = devFallback;
  }

  const baseDir = isPackaged ? process.resourcesPath : app.getAppPath();

  return {
    proxyScript,
    baseDir,
  };
}

/**
 * Spawn the Express proxy background server and poll health endpoint
 */
async function startProxyServer(): Promise<void> {
  // 1. Check if server is already running (dev mode terminal or concurrently)
  try {
    const checkRes = await fetch(PROXY_HEALTH_URL);
    if (checkRes.ok) {
      console.log('Express proxy server is already running on port 3001, skipping spawn.');
      return;
    }
  } catch {
    // Port 3001 is unoccupied, proceed with spawn
  }

  const { proxyScript, baseDir } = getProxyPaths();

  if (!proxyScript || !fs.existsSync(proxyScript)) {
    console.warn('Express proxy script not found at:', proxyScript);
    showPrerequisiteWarning(
      'Không tìm thấy file dịch vụ proxy (server.cjs hoặc server.js).\n\n' +
        'Tính năng "Đọc từ liên kết" và các tiện ích kết nối có thể không hoạt động.',
      'Thông báo dịch vụ proxy',
      'Lưu ý về Express Proxy'
    );
    return;
  }

  try {
    console.log(`Spawning Express proxy: ${process.execPath} ${proxyScript}`);
    proxyProcess = spawn(process.execPath, [proxyScript], {
      cwd: baseDir,
      detached: false,
      stdio: 'ignore',
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
    });

    proxyProcess.on('error', err => {
      console.error('Failed to spawn Express proxy process:', err);
      showPrerequisiteWarning(
        `Không thể khởi động dịch vụ proxy: ${err.message}\n\n` +
          'Tính năng "Đọc từ liên kết" có thể không hoạt động.',
        'Lỗi khởi chạy proxy',
        'Không thể khởi động dịch vụ nền'
      );
    });

    proxyProcess.on('exit', (code, signal) => {
      console.log(`Express proxy process exited with code ${code}, signal ${signal}`);
      proxyProcess = null;
    });

    // Poll health endpoint
    let isReady = false;
    for (let attempt = 1; attempt <= MAX_HEALTH_CHECKS; attempt++) {
      try {
        const response = await fetch(PROXY_HEALTH_URL);
        if (response.ok) {
          console.log(`Express proxy server ready on attempt ${attempt}`);
          isReady = true;
          break;
        }
      } catch {
        // Retry
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!isReady) {
      console.warn('Express proxy server health poll timed out after 60s');
    }
  } catch (err) {
    console.error('Error starting Express proxy backend:', err);
  }
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
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load local index.html:', err);
    });
  }

  // Intercept window close (X) to hide into tray instead of exiting
  mainWindow.on('close', event => {
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
    {
      label: '🖥️ Đọc màn hình (Ctrl+Shift+Space)',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
        dialog.showMessageBox({
          type: 'info',
          title: 'Tính năng Đọc màn hình VoxRead',
          message: 'Hướng dẫn Đọc màn hình từ Clipboard',
          detail:
            '1. Bôi đen văn bản ở bất kỳ ứng dụng nào (Word, PDF, trình duyệt, Notepad...)\n' +
            '2. Nhấn Ctrl+C để sao chép vào bộ nhớ tạm\n' +
            '3. Bấm tổ hợp phím tắt Ctrl+Shift+Space để VoxRead tự động nạp và đọc văn bản.',
          buttons: ['Đã hiểu'],
          defaultId: 0,
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Thoát',
      click: () => {
        isQuitting = true;
        killChildProcesses();
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
 * Handles the Ctrl+Shift+Space global shortcut:
 * 1. Checks system clipboard. If non-empty and changed, plays directly via Feature 013 pipeline.
 * 2. If clipboard is empty or unchanged, triggers Feature 014 OCR Screen Reader fallback.
 */
async function handleScreenReaderShortcut(): Promise<void> {
  let rawText = '';
  try {
    rawText = await clipboard.readText();
  } catch (err) {
    console.warn('Failed to read clipboard:', err);
  }

  const trimmed = rawText.trim();
  if (trimmed && trimmed !== lastCapturedClipboardText) {
    lastCapturedClipboardText = trimmed;
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('screen-reader:clipboard-captured', trimmed);
    }
    return;
  }

  // --- OCR Fallback Branch ---
  // Pre-check /health endpoint for GEMINI_API_KEY
  try {
    const healthRes = await fetch(PROXY_HEALTH_URL);
    if (!healthRes.ok) {
      throw new Error(`HTTP ${healthRes.status}`);
    }
    const healthData = (await healthRes.json()) as { geminiConfigured?: boolean };
    if (!healthData.geminiConfigured) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Cần cấu hình API Key cho tính năng OCR',
        message: 'Tính năng nhận diện văn bản từ màn hình yêu cầu Google Gemini API Key',
        detail:
          'Tính năng nhận diện chữ từ vùng màn hình (OCR) yêu cầu cấu hình GEMINI_API_KEY trong file .env và kết nối Internet.\n\n' +
          '(Lưu ý: Tính năng đọc văn bản bôi đen qua Ctrl+C và giọng đọc RVC local vẫn hoạt động offline bình thường).',
        buttons: ['Đã hiểu'],
        defaultId: 0,
      });
      return;
    }
  } catch (err) {
    dialog.showMessageBox({
      type: 'warning',
      title: 'Không thể kết nối máy chủ OCR',
      message: 'Máy chủ xử lý nhận diện chữ (Proxy) chưa sẵn sàng.',
      detail:
        'Vui lòng kiểm tra lại dịch vụ proxy đang chạy trên cổng 3001.\n\n' +
        (err instanceof Error ? err.message : String(err)),
      buttons: ['Đóng'],
    });
    return;
  }

  // Launch the fullscreen interactive region overlay
  createRegionOverlay({
    onRegionSelected: async rect => {
      let base64Image = '';
      try {
        base64Image = await captureRegion(rect);
      } catch (captureErr) {
        closeRegionOverlay();
        dialog.showMessageBox({
          type: 'error',
          title: 'Lỗi chụp màn hình',
          message: 'Không thể chụp vùng màn hình đã chọn',
          detail:
            captureErr instanceof Error
              ? captureErr.message
              : 'Lỗi không xác định khi chụp vùng màn hình.',
          buttons: ['Đóng'],
        });
        return;
      }

      try {
        const ocrRes = await fetch(`http://127.0.0.1:${PROXY_PORT}/api/ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });

        const ocrData = (await ocrRes.json()) as {
          ok?: boolean;
          text?: string;
          error?: string;
        };

        closeRegionOverlay();

        if (!ocrRes.ok || !ocrData.ok) {
          dialog.showMessageBox({
            type: 'error',
            title: 'Lỗi nhận diện văn bản',
            message: 'Không thể nhận diện văn bản từ vùng đã chọn',
            detail: ocrData.error || `Lỗi máy chủ OCR (mã lỗi HTTP ${ocrRes.status}).`,
            buttons: ['Đóng'],
          });
          return;
        }

        const recognizedText = (ocrData.text || '').trim();
        if (!recognizedText) {
          dialog.showMessageBox({
            type: 'info',
            title: 'Nhận diện văn bản',
            message: 'Không tìm thấy văn bản nào trong vùng đã chọn.',
            detail: 'Vui lòng kiểm tra lại vùng chọn có chứa chữ rõ nét và thử lại.',
            buttons: ['Đã hiểu'],
          });
          return;
        }

        // Pipe recognized text to the existing clipboard-captured IPC channel
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('screen-reader:clipboard-captured', recognizedText);
        }
      } catch (netErr) {
        closeRegionOverlay();
        dialog.showMessageBox({
          type: 'error',
          title: 'Lỗi kết nối OCR',
          message: 'Không thể kết nối đến máy chủ nhận diện chữ',
          detail: netErr instanceof Error ? netErr.message : String(netErr),
          buttons: ['Đóng'],
        });
      }
    },
    onCancel: () => {
      // User cancelled via Esc or click without dragging; overlay is already closed
    },
  });
}

/**
 * Register global shortcut for Screen Reader (Clipboard tier + OCR fallback tier)
 */
function registerScreenReaderShortcut(): void {
  const shortcutKey = 'CommandOrControl+Shift+Space';
  const registered = globalShortcut.register(shortcutKey, () => {
    void handleScreenReaderShortcut();
  });

  if (!registered) {
    console.warn(`Failed to register global shortcut: ${shortcutKey}`);
    showPrerequisiteWarning(
      'Không thể đăng ký phím tắt toàn cục "Ctrl+Shift+Space" (hoặc Cmd+Shift+Space).\n\n' +
        'Phím tắt này có thể đang bị ứng dụng khác trong hệ thống chiếm giữ. Bạn vẫn có thể sử dụng các phương thức đọc khác của VoxRead bình thường.',
      'Cảnh báo phím tắt VoxRead',
      'Xung đột phím tắt toàn cục'
    );
  } else {
    console.log(`Global shortcut registered successfully: ${shortcutKey}`);
  }
}

/**
 * Terminate child process trees (Python backend and Express proxy) cleanly on Windows
 */
function killChildProcesses(): void {
  // Kill Python process
  if (pythonProcess && pythonProcess.pid) {
    const pid = pythonProcess.pid;
    console.log(`Terminating Python process tree for PID ${pid}...`);
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /F /T /PID ${pid}`, err => {
          if (err) {
            console.warn(`taskkill failed for Python PID ${pid}:`, err.message);
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

  // Kill Express Proxy process
  if (proxyProcess && proxyProcess.pid) {
    const pid = proxyProcess.pid;
    console.log(`Terminating Express proxy process tree for PID ${pid}...`);
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /F /T /PID ${pid}`, err => {
          if (err) {
            console.warn(`taskkill failed for Proxy PID ${pid}:`, err.message);
          }
        });
      } else {
        proxyProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.warn('Error terminating Proxy process:', err);
    }
    proxyProcess = null;
  }
}

app.on('before-quit', () => {
  isQuitting = true;
  killChildProcesses();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) {
      app.quit();
    }
  }
});
