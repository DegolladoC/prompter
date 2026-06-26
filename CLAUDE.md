# Prompter — contexto del proyecto

## Qué es

App de escritorio (Windows 11, 64 bits) tipo teleprompter. Su característica
central: el overlay queda **invisible para la audiencia cuando se comparte
pantalla** en videollamadas, pero sigue visible en el monitor local de quien
lo usa.

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

## Arquitectura actual

```
main.js        — proceso principal. Crea 2 ventanas:
                  - overlay: sin marco, transparente, alwaysOnTop,
                    skipTaskbar, con content protection activa.
                  - config: ventana normal (con marco, en taskbar),
                    SIN content protection (no tiene sentido ocultarla,
                    es solo para quien usa la app).
                  Maneja IPC (get/set de guion, diálogo de carga de
                  archivo .txt, abrir/cerrar ventana de config) y el
                  atajo global Ctrl+Shift+X (salir) y Ctrl+Shift+E
                  (abrir config).
preload.js      — puente de contextBridge, expone window.prompterAPI
                  a ambos renderers (overlay y config).
store.js        — persistencia simple en JSON, vía
                  app.getPath('userData')/prompter-data.json.
                  Por ahora solo guarda { script: string }.

index.html      — estructura del overlay.
renderer.js     — auto-scroll con requestAnimationFrame, controles de
                  teclado (Espacio pausa, ↑↓ velocidad, R reinicia),
                  carga el guion vía IPC (ya no está hardcodeado),
                  se suscribe a script:updated para refrescar en
                  caliente si se edita el guion mientras el overlay
                  está abierto.
styles.css      — panel translúcido, difuminado tipo teleprompter,
                  zonas invisibles de resize en bordes/esquinas,
                  botón ⚙ para abrir config.

config.html     — ventana de configuración: textarea + botón de carga
                  de archivo.
config.js       — guardado automático con debounce (600ms), carga de
                  .txt vía diálogo nativo (dialog.showOpenDialog en main).
config.css      — estilos de la ventana de config.
```

Corre con `npm install` + `npm start`. Todavía vía terminal, no
empaquetado como `.exe`.

## Pendiente para el MVP (orden lógico, de mayor a menor prioridad)

1. ~~Cuadro de texto editable + persistencia~~ ✅ hecho.
2. **Empaquetar como app de escritorio real con `electron-builder`**
   (instalador o portable, sin terminal, doble clic). Siguiente paso.
3. Slider de opacidad y tamaño de fuente del overlay.
4. Click-through toggle (que los clics pasen a la ventana de atrás,
   típicamente con `win.setIgnoreMouseEvents(true/false)`, con cuidado
   de no romper los handles de resize ni el botón de config cuando esté
   activo).
5. Validar también en Google Meet y Microsoft Teams.
6. Pensar en firma de código (certificados Windows/Apple) si se planea
   distribuir — sin firma, Windows SmartScreen va a advertir al usuario
   al primer doble clic, lo cual es mala primera impresión para venta.

## Notas para quien siga desarrollando (humano o Claude Code)

- Cualquier cambio en las flags de creación de `BrowserWindow` del overlay
  (`frame`, `transparent`, `skipTaskbar`, `alwaysOnTop`, etc.) puede
  afectar si Windows sigue excluyendo la ventana de la captura. Probar en
  Zoom real después de tocar esto.
- El guion se separa en párrafos por línea en blanco (estilo `.txt`
  escrito a mano) — ver `renderScript()` en `renderer.js`. Si se cambia
  el formato de entrada (markdown, etc.), hay que ajustar ese parser.
- No hay tests automatizados todavía. Las pruebas son manuales: abrir la
  app, compartir pantalla en Zoom desde un segundo dispositivo, confirmar
  que el overlay no aparece del lado de quien recibe el share.
