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
});
