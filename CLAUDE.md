# Prompter — contexto del proyecto

## Qué es

App de escritorio (Windows 11, 64 bits) tipo teleprompter. Su característica
central: el overlay queda **invisible para la audiencia cuando se comparte
pantalla** en videollamadas, pero sigue visible en el monitor local de quien
lo usa.

## Ramas y versiones

- `master` → **v1.0.0**: MVP original. Overlay funcional, persistencia de
  guion, empaquetado con electron-builder. Validado en Zoom.
- `v2` → **v2.0.0**: versión actual. Suma marcadores, sliders de apariencia,
  click-through y salto manual de posición.

## Mecanismo central (no tocar sin entender bien el porqué)

`win.setContentProtection(true)` en el proceso principal. En Windows esto
usa `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` por debajo, soportado
desde Windows 10 2004+ y Windows 11. Excluye la ventana de cualquier
captura de pantalla, grabación o screen-share que pase por la ruta estándar
de captura de Windows.

**Estado de validación:**
- ✅ Zoom — validado en real, con un segundo dispositivo viendo el screen-share.
- ❌ Google Meet — falta validar.
- ❌ Microsoft Teams — falta validar.

Si se toca este mecanismo (la ventana del overlay, sus flags de creación,
o el manejo de `setContentProtection`), hay que volver a validar contra
Zoom como mínimo antes de dar por buena la app.

## Posicionamiento de venta (importante para cualquier copy/UI/términos)

Se vende como herramienta de **presentaciones, ventas y accesibilidad**
(ej. personas con dificultad para memorizar o leer en público), **no**
como "trampa para videollamadas" o herramienta para engañar en entrevistas/
exámenes. Esto no es solo marketing: afecta términos de servicio de
plataformas de distribución y posible legalidad según el contexto de uso.
Cualquier texto visible al usuario, README, landing page, o nombre de
producto debe respetar este encuadre.

## Stack y decisiones ya tomadas

- **Electron** para el MVP, priorizando velocidad de desarrollo sobre peso
  del binario. Posible migración a **Tauri** más adelante si el tamaño del
  instalador se vuelve un problema para la venta — no migrar sin que se
  pida explícitamente.
- Resize de la ventana overlay: arrastrando bordes/esquinas como una
  ventana normal de Windows. No agregar botones ni atajos de resize.
- `contextIsolation: true` y `nodeIntegration: false` en todos los
  `BrowserWindow`. Toda comunicación entre renderer y main pasa por
  `preload.js` con `contextBridge`. No desactivar este aislamiento para
  "simplificar" algo — es la forma correcta de hacerlo en Electron moderno.
- Click-through (`setIgnoreMouseEvents`) se activa solo por atajo global
  (`Ctrl+Shift+C`), nunca por botón en el overlay — cuando click-through
  está activo, los botones del overlay tampoco responden, así que un botón
  de toggle sería inutilizable.

## Arquitectura actual (v2)

```
main.js        — proceso principal. Crea 2 ventanas:
                  - overlay: sin marco, transparente, alwaysOnTop,
                    skipTaskbar, con content protection activa.
                  - config: ventana normal (con marco, en taskbar),
                    SIN content protection.
                  Maneja IPC (guion, settings, diálogo de archivo,
                  abrir/cerrar config) y atajos globales:
                    Ctrl+Shift+X → salir
                    Ctrl+Shift+E → abrir config
                    Ctrl+Shift+C → toggle click-through
                  Estado de click-through en variable clickThroughActive.

preload.js      — puente de contextBridge, expone window.prompterAPI:
                  getScript/setScript/onScriptUpdated,
                  getSettings/setSettings/onSettingsUpdated,
                  loadScriptFromFile,
                  openConfigWindow/closeConfigWindow,
                  onClickThroughChanged.

store.js        — persistencia en JSON (userData/prompter-data.json).
                  Guarda { script, opacity, fontSize }.
                  Defaults: opacity=0.74, fontSize=30.

index.html      — estructura del overlay. Contiene .main-area (fila flex
                  con #viewport y #markerStrip) + #status + #btnConfig
                  + resize edges.

renderer.js     — auto-scroll con requestAnimationFrame.
                  Controles de teclado:
                    Espacio → pausa/reanuda
                    ↑↓ → velocidad (+/-10 px/s)
                    Shift+↑↓ → salto manual de 150px
                    R → reiniciar desde el principio
                  Detecta marcadores (párrafos que empiezan con "- ")
                  y construye los dots en #markerStrip via buildMarkerStrip().
                  Aplica opacity y fontSize en caliente vía applySettings().
                  Escucha onClickThroughChanged para mostrar borde ámbar.

styles.css      — panel translúcido, CSS variable --font-size, .main-area
                  en fila flex, #markerStrip (14px) con .marker-dot y
                  tooltip via ::before, .panel.click-through con borde ámbar,
                  zonas de resize, botón ⚙.

config.html     — textarea de guion + botón cargar .txt + dos sliders
                  (opacidad 25-100%, fuente 16-56px).
config.js       — guardado con debounce (600ms) para guion y settings
                  por separado. Carga initial con Promise.all.
config.css      — estilos incluyendo .settings-group con .slider-row.
```

Corre con `npm install` + `npm start`.
Empaquetado: `npm run build` (NSIS installer + portable, en `/dist`).
Nota: el primer `npm run build` en una máquina nueva puede fallar por
permisos de symlinks al extraer winCodeSign. Solución: activar Modo
Desarrollador en Windows (Settings → Privacy & Security → For developers)
o extraer manualmente con `7za x archivo.7z -o<destino> -x!darwin`.

## Marcadores — formato del guion

Los párrafos cuya primera línea empieza con `- ` (guión + espacio) se
detectan como marcadores de sección. Ejemplo:

```
- Introducción

Bienvenidos a la presentación...

- Problema

El mercado actual tiene un problema...
```

Cada marcador genera un dot azul en la tira derecha del overlay.
Clickearlo salta a esa sección. El `- ` se muestra tal cual en el texto
del overlay (no se oculta), pero el label del tooltip usa solo el texto
después del `- `.

## Pendiente (orden lógico)

1. ~~Cuadro de texto editable + persistencia~~ ✅
2. ~~Empaquetar con electron-builder~~ ✅
3. ~~Slider de opacidad y tamaño de fuente~~ ✅
4. ~~Click-through toggle (Ctrl+Shift+C)~~ ✅
5. Validar en Google Meet y Microsoft Teams.
6. Firma de código (certificado EV Windows) antes de distribución masiva —
   sin firma, SmartScreen advierte al instalar, mala primera impresión.

## Notas para quien siga desarrollando (humano o Claude Code)

- Cualquier cambio en las flags de `BrowserWindow` del overlay (`frame`,
  `transparent`, `skipTaskbar`, `alwaysOnTop`, etc.) puede romper la
  exclusión de captura. Validar en Zoom después de tocarlo.
- El guion se parsea por líneas en blanco (párrafos estilo `.txt`). Ver
  `renderScript()` en `renderer.js`. Si se cambia el formato de entrada
  (markdown, etc.), ajustar el parser Y la detección de marcadores.
- No hay tests automatizados. Las pruebas son manuales.
- La opacidad del panel se aplica como `rgba(10, 12, 16, ${opacity})` en
  `panel.style.background` desde JS — el valor en `styles.css` es solo
  el default inicial antes de que carguen los settings.
