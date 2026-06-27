// main.js — proceso principal de Electron
//
// Objetivo original del spike: probar UNA sola cosa de forma aislada ->
// que la ventana quede EXCLUIDA de la captura de pantalla (screen-share)
// pero siga visible para nosotros en el monitor local.
//
// La magia está en win.setContentProtection(true). En Windows eso usa
// SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE) por debajo, soportado
// en Windows 10 2004+ y Windows 11. Zoom captura por la ruta estándar,
// así que la ventana debería desaparecer del lado de la audiencia.
//
// A partir de esta versión, se suma:
// - Ventana de configuración (con marco, normal) para editar el guion.
// - Persistencia en disco vía store.js.
// - IPC para comunicar overlay <-> config <-> main.

const { app, BrowserWindow, globalShortcut, screen, ipcMain, dialog } = require('electron');

let clickThroughActive = false;
const path = require('path');
const fs = require('fs');
const store = require('./store');

let overlayWin;
let configWin = null; // null cuando está cerrada; así evitamos duplicados.

function createOverlayWindow() {
  const { width: screenW } = screen.getPrimaryDisplay().workAreaSize;

  const winW = 760;
  const winH = 340;

  overlayWin = new BrowserWindow({
    width: winW,
    height: winH,
    // Centrado horizontal y pegado arriba: ahí suele estar la webcam,
    // así la línea de visión (eye-line) queda natural.
    x: Math.round((screenW - winW) / 2),
    y: 28,
    frame: false,           // sin marco -> overlay limpio
    transparent: true,      // fondo transparente -> sólo se ve el panel
    alwaysOnTop: true,      // siempre por encima
    skipTaskbar: true,      // no aparece en la barra de tareas
    resizable: true,        // permite arrastrar esquinas/bordes para cambiar tamaño
    minWidth: 320,
    minHeight: 160,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // === LA LÍNEA QUE LO HACE TODO ===
  // Excluye la ventana de cualquier captura de pantalla / grabación / screen-share.
  overlayWin.setContentProtection(true);

  // Que se mantenga por encima incluso de apps en pantalla completa.
  overlayWin.setAlwaysOnTop(true, 'screen-saver');

  overlayWin.loadFile('index.html');

  overlayWin.on('closed', () => {
    overlayWin = null;
  });
}

function createConfigWindow() {
  // Si ya está abierta, solo la enfocamos en lugar de crear otra.
  if (configWin) {
    configWin.focus();
    return;
  }

  configWin = new BrowserWindow({
    width: 560,
    height: 520,
    title: 'Configuración del guion',
    resizable: true,
    minimizable: true,
    maximizable: true,
    // Ventana normal: con marco, en la barra de tareas, SIN content
    // protection. No tiene sentido ocultarla: es solo para nosotros,
    // nunca se comparte en la videollamada.
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  configWin.setMenuBarVisibility(false);
  configWin.loadFile('config.html');

  configWin.on('closed', () => {
    configWin = null;
  });
}

// ---------- IPC handlers ----------

ipcMain.handle('script:get', () => {
  const data = store.load();
  return data.script;
});

ipcMain.handle('script:set', (_event, text) => {
  store.save({ script: text });
  // Avisamos al overlay para que recargue el guion sin reiniciar la app.
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.webContents.send('script:updated', text);
  }
  return true;
});

ipcMain.handle('script:loadFromFile', async () => {
  const focusedWin = configWin || overlayWin;
  const result = await dialog.showOpenDialog(focusedWin, {
    title: 'Cargar guion desde archivo de texto',
    filters: [{ name: 'Texto', extensions: ['txt'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return content;
  } catch (err) {
    console.error('[main] Error leyendo archivo de guion:', err);
    return null;
  }
});

ipcMain.handle('config:open', () => {
  createConfigWindow();
  return true;
});

ipcMain.handle('config:close', () => {
  if (configWin) configWin.close();
  return true;
});

ipcMain.handle('settings:get', () => {
  const data = store.load();
  return { opacity: data.opacity, fontSize: data.fontSize };
});

ipcMain.handle('settings:set', (_event, settings) => {
  store.save(settings);
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.webContents.send('settings:updated', settings);
  }
  return true;
});

// ---------- Ciclo de vida de la app ----------

app.whenReady().then(() => {
  createOverlayWindow();

  // Kill-switch global. Como el overlay no tiene marco ni botón de cerrar,
  // necesitamos una salida garantizada que funcione aunque no tenga foco.
  globalShortcut.register('CommandOrControl+Shift+X', () => {
    app.quit();
  });

  // Atajo global para abrir/enfocar la ventana de configuración.
  globalShortcut.register('CommandOrControl+Shift+E', () => {
    createConfigWindow();
  });

  // Click-through: los clics pasan a la ventana de atrás pero el overlay
  // sigue visible. Se activa/desactiva con Ctrl+Shift+C (global, funciona
  // sin importar qué ventana tenga el foco).
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    clickThroughActive = !clickThroughActive;
    if (overlayWin && !overlayWin.isDestroyed()) {
      overlayWin.setIgnoreMouseEvents(clickThroughActive, { forward: true });
      if (!clickThroughActive) overlayWin.focus();
      overlayWin.webContents.send('overlay:clickThroughChanged', clickThroughActive);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOverlayWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});
