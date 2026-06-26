// renderer.js — corre dentro del overlay (proceso de render)
// Auto-scroll suave del guion + control por teclado + carga dinámica
// del texto vía IPC (en vez del hardcodeo original en HTML).

const viewport = document.getElementById('viewport');
const content = document.getElementById('content');
const status = document.getElementById('status');
const btnConfig = document.getElementById('btnConfig');

let pxPerSec = 45;     // velocidad de desplazamiento
let paused = false;
let lastTs = null;
let pos = 0;           // desplazamiento acumulado (float, para suavidad)

function maxScroll() {
  return Math.max(0, content.scrollHeight - viewport.clientHeight);
}

function render() {
  content.style.transform = `translateY(${-pos}px)`;
}

function updateStatus() {
  const estado = paused ? '⏸ Pausado' : '▶ Reproduciendo';
  status.textContent =
    `${estado}  ·  ${Math.round(pxPerSec)} px/s  ·  🔒 Invisible en screen-share` +
    `  ·  Espacio: pausa  ·  ↑↓: velocidad  ·  R: reiniciar  ·  Ctrl+Shift+X: salir`;
}

// Convierte el texto plano del guion en párrafos <p>, separando por
// líneas en blanco (igual que un .txt normal escrito a mano).
function renderScript(text) {
  content.innerHTML = '';

  const trimmed = (text || '').trim();
  if (!trimmed) {
    const empty = document.createElement('p');
    empty.id = 'emptyState';
    empty.textContent = 'Sin guion cargado todavía. Abrí la configuración (botón ⚙ o Ctrl+Shift+E) para escribir o cargar tu texto.';
    content.appendChild(empty);
  } else {
    const paragraphs = trimmed.split(/\n\s*\n/); // párrafos separados por línea en blanco
    paragraphs.forEach((paraText) => {
      const p = document.createElement('p');
      // Dentro de un mismo párrafo, los saltos de línea simples se
      // respetan como <br> en lugar de unirse en una sola línea.
      p.innerHTML = paraText
        .split('\n')
        .map((line) => line.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])))
        .join('<br>');
      content.appendChild(p);
    });
  }

  // Reiniciamos el scroll cada vez que cambia el guion, para que el
  // usuario arranque siempre desde el principio del texto nuevo.
  pos = 0;
  paused = false;
  lastTs = null;
  render();
  updateStatus();
}

async function loadInitialScript() {
  const saved = await window.prompterAPI.getScript();
  renderScript(saved);
}

// Si la ventana de configuración guarda cambios mientras el overlay
// está abierto, lo reflejamos en caliente sin reiniciar la app.
window.prompterAPI.onScriptUpdated((text) => {
  renderScript(text);
});

btnConfig.addEventListener('click', () => {
  window.prompterAPI.openConfigWindow();
});

function tick(ts) {
  if (lastTs === null) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  if (!paused) {
    pos += pxPerSec * dt;
    if (pos >= maxScroll()) {
      pos = maxScroll();
      paused = true;       // se detiene al final; R reinicia
      updateStatus();
    }
    render();
  }
  requestAnimationFrame(tick);
}

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'Space':
      paused = !paused;
      lastTs = null;       // evita un salto al reanudar
      e.preventDefault();
      break;
    case 'ArrowUp':
      pxPerSec = Math.min(220, pxPerSec + 10);
      break;
    case 'ArrowDown':
      pxPerSec = Math.max(10, pxPerSec - 10);
      break;
    case 'KeyR':
      pos = 0;
      paused = false;
      lastTs = null;
      render();
      break;
    default:
      return;
  }
  updateStatus();
});

updateStatus();
loadInitialScript();
requestAnimationFrame(tick);
