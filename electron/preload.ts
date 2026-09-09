import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Minimal and secure preload script
contextBridge.exposeInMainWorld('voxreadDesktop', {
  isDesktop: true,
  platform: process.platform,
  screenReader: {
    onClipboardCaptured: (callback: (text: string) => void) => {
      const handler = (_event: IpcRendererEvent, text: string) => callback(text);
      ipcRenderer.on('screen-reader:clipboard-captured', handler);
      return () => {
        ipcRenderer.removeListener('screen-reader:clipboard-captured', handler);
      };
    },
    removeClipboardListener: () => {
      ipcRenderer.removeAllListeners('screen-reader:clipboard-captured');
    },
  },
  // Feature 048-desktop-tts-migration: thay the "models" (import .pth/.index cho
  // RVC) - viec tai audio mau len de nhan ban giong VieNeu gio do renderer tu
  // goi fetch()/FormData thang toi python-backend, khong can qua IPC nua.
  voiceClone: {
    openVoicesFolder: () => ipcRenderer.invoke('voiceClone:open-folder'),
  },
});
