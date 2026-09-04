import { BrowserWindow, screen, ipcMain } from 'electron';

export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

let overlayWindow: BrowserWindow | null = null;

const OVERLAY_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.25);
      cursor: crosshair;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #selection {
      position: absolute;
      display: none;
      border: 2px solid #10b981;
      background: rgba(16, 185, 129, 0.1);
      box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0.4);
      pointer-events: none;
      z-index: 10;
    }
    #hint {
      position: fixed;
      top: 32px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 15, 20, 0.92);
      color: #f3f4f6;
      padding: 10px 24px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      z-index: 20;
      letter-spacing: 0.2px;
    }
    #loading {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: none;
      align-items: center;
      gap: 12px;
      background: rgba(15, 15, 20, 0.95);
      color: #10b981;
      padding: 16px 28px;
      border-radius: 9999px;
      font-size: 15px;
      font-weight: 600;
      border: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      pointer-events: none;
      z-index: 30;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 3px solid rgba(16, 185, 129, 0.3);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="hint">Kéo chuột để chọn vùng văn bản cần đọc • Nhấn Esc để hủy</div>
  <div id="selection"></div>
  <div id="loading">
    <div class="spinner"></div>
    <span>Đang nhận diện văn bản...</span>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    const selection = document.getElementById('selection');
    const hint = document.getElementById('hint');
    const loading = document.getElementById('loading');

    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ipcRenderer.send('screen-reader:overlay:cancel');
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (loading.style.display === 'flex') return;
      isDrawing = true;
      startX = e.clientX;
      startY = e.clientY;
      selection.style.left = startX + 'px';
      selection.style.top = startY + 'px';
      selection.style.width = '0px';
      selection.style.height = '0px';
      selection.style.display = 'block';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selection.style.left = left + 'px';
      selection.style.top = top + 'px';
      selection.style.width = width + 'px';
      selection.style.height = height + 'px';
    });

    window.addEventListener('mouseup', (e) => {
      if (!isDrawing) return;
      isDrawing = false;

      const currentX = e.clientX;
      const currentY = e.clientY;
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      if (width <= 5 || height <= 5) {
        selection.style.display = 'none';
        ipcRenderer.send('screen-reader:overlay:cancel');
        return;
      }

      // Transition to loading feedback state
      selection.style.display = 'none';
      hint.style.display = 'none';
      document.body.style.background = 'rgba(0, 0, 0, 0.4)';
      loading.style.display = 'flex';

      ipcRenderer.send('screen-reader:overlay:region-selected', { x, y, width, height });
    });
  </script>
</body>
</html>`;

export interface RegionOverlayCallbacks {
  onRegionSelected: (rect: RegionRect) => void;
  onCancel: () => void;
}

/**
 * Creates and displays a transparent fullscreen overlay for snipping screen regions.
 */
export function createRegionOverlay(callbacks: RegionOverlayCallbacks): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus();
    return overlayWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  const encodedHtml = `data:text/html;charset=utf-8,${encodeURIComponent(OVERLAY_HTML)}`;
  overlayWindow.loadURL(encodedHtml);

  const cleanupIpc = () => {
    ipcMain.removeListener('screen-reader:overlay:region-selected', onRegionSelectedHandler);
    ipcMain.removeListener('screen-reader:overlay:cancel', onCancelHandler);
  };

  const onRegionSelectedHandler = (_event: Electron.IpcMainEvent, rect: RegionRect) => {
    cleanupIpc();
    callbacks.onRegionSelected(rect);
  };

  const onCancelHandler = () => {
    cleanupIpc();
    closeRegionOverlay();
    callbacks.onCancel();
  };

  ipcMain.once('screen-reader:overlay:region-selected', onRegionSelectedHandler);
  ipcMain.once('screen-reader:overlay:cancel', onCancelHandler);

  overlayWindow.on('closed', () => {
    cleanupIpc();
    overlayWindow = null;
  });

  return overlayWindow;
}

/**
 * Closes and destroys the active region overlay window if present.
 */
export function closeRegionOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  overlayWindow = null;
}
