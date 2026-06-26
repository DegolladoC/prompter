// preload.js — corre en un contexto aislado, puente entre los procesos
// de render (overlay y config) y el proceso main.
//
// Con contextIsolation: true y nodeIntegration: false, los renderers no
// tienen acceso directo a Node ni a ipcRenderer. contextBridge expone
// SOLO las funciones puntuales que necesitamos, nada más.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prompterAPI', {
  // --- Guion ---
  // Pide el guion guardado (lo usa tanto el overlay al cargar como config).
  getScript: () => ipcRenderer.invoke('script:get'),
  // Guarda el guion nuevo. Dispara también el evento script:updated
  // hacia el overlay para que se refresque en caliente.
  setScript: (text) => ipcRenderer.invoke('script:set', text),
  // Se suscribe a actualizaciones de guion (lo usa el overlay).
  onScriptUpdated: (callback) => {
    const listener = (_event, text) => callback(text);
    ipcRenderer.on('script:updated', listener);
    return () => ipcRenderer.removeListener('script:updated', listener);
  },

  // --- Diálogo de archivo ---
  // Abre el selector nativo de Windows y devuelve el contenido del .txt
  // elegido (o null si el usuario cancela).
  loadScriptFromFile: () => ipcRenderer.invoke('script:loadFromFile'),

  // --- Ventana de configuración ---
  openConfigWindow: () => ipcRenderer.invoke('config:open'),
  closeConfigWindow: () => ipcRenderer.invoke('config:close'),
});
