import { contextBridge } from 'electron';

// Minimal and secure preload script
contextBridge.exposeInMainWorld('voxreadDesktop', {
  isDesktop: true,
  platform: process.platform,
});
