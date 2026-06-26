# Prompter Spike

Experimento mínimo para validar UNA cosa: que un overlay de teleprompter
quede **invisible en el screen-share** (Zoom, Meet, Teams, OBS) pero siga
visible para ti en tu monitor local.

Toda la apuesta técnica está en una línea de `main.js`:

```js
win.setContentProtection(true);
```

En Windows 11 eso usa `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`.

## Requisitos

- Node.js LTS instalado (https://nodejs.org)

## Cómo correrlo

```bash
npm install     # la primera vez descarga Electron (unos cientos de MB)
npm start
```

Aparecerá un panel arriba al centro de la pantalla con el guion scrolleando.

## Atajos

- **Espacio** — pausa / reanuda
- **↑ / ↓** — sube / baja la velocidad
- **R** — reinicia desde arriba
- **Ctrl + Shift + X** — cerrar (kill-switch global)

Puedes **arrastrar el panel** con el mouse para acercarlo a tu webcam.

## Cómo probar la invisibilidad (importante)

No puedes confirmar esto desde tu propia pantalla: tú SIEMPRE verás el
overlay en tu monitor. Hay que mirar lo que recibe la audiencia.

1. Pon el overlay en el monitor que vas a compartir.
2. En Zoom: **Compartir pantalla → Pantalla / Escritorio** (modo normal).
3. Entra a la MISMA reunión desde el celular como segundo participante.
4. Mira la pantalla compartida en el celular:
   - Si el overlay **NO aparece** → funciona. ✅
   - Si aparece (completo o como recuadro negro) → lo depuramos.

Alternativas para verificar: grabar la reunión y revisar la grabación, o
pedirle a alguien que entre y te mande captura.
