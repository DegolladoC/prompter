// preload.js — puente entre renderers y proceso main via contextBridge.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prompterAPI', {
  // --- Guion ---
  getScript: () => ipcRenderer.invoke('script:get'),
  setScript: (text) => ipcRenderer.invoke('script:set', text),
  onScriptUpdated: (callback) => {
    const listener = (_event, text) => callback(text);
    ipcRenderer.on('script:updated', listener);
    return () => ipcRenderer.removeListener('script:updated', listener);
  },

  // --- Ajustes de apariencia (opacidad, fuente) ---
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
  onSettingsUpdated: (callback) => {
    const listener = (_event, s) => callback(s);
    ipcRenderer.on('settings:updated', listener);
    return () => ipcRenderer.removeListener('settings:updated', listener);
  },

  // --- Diálogo de archivo ---
  loadScriptFromFile: () => ipcRenderer.invoke('script:loadFromFile'),

  // --- Ventana de configuración ---
  openConfigWindow: () => ipcRenderer.invoke('config:open'),
  closeConfigWindow: () => ipcRenderer.invoke('config:close'),

  // --- Click-through ---
  onClickThroughChanged: (callback) => {
    const listener = (_event, active) => callback(active);
    ipcRenderer.on('overlay:clickThroughChanged', listener);
    return () => ipcRenderer.removeListener('overlay:clickThroughChanged', listener);
  },
});
