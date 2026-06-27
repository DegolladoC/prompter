// renderer.js — overlay: auto-scroll, controles de teclado, marcadores, settings.

const viewport  = document.getElementById('viewport');
const content   = document.getElementById('content');
const status    = document.getElementById('status');
const btnConfig = document.getElementById('btnConfig');
const panel     = document.querySelector('.panel');
const markerStrip = document.getElementById('markerStrip');

let pxPerSec = 45;
let paused   = false;
let lastTs   = null;
let pos      = 0;
let clickThrough = false;

// Marcadores detectados al parsear el guion: { element, label }
let markers = [];

function maxScroll() {
  return Math.max(0, content.scrollHeight - viewport.clientHeight);
}

function render() {
  content.style.transform = `translateY(${-pos}px)`;
}

// --- Apariencia ---

function applySettings({ opacity, fontSize }) {
  if (opacity !== undefined) {
    panel.style.background = `rgba(10, 12, 16, ${opacity})`;
  }
  if (fontSize !== undefined) {
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
  }
}

// --- Status ---

function updateStatus() {
  const estado = paused ? '⏸ Pausado' : '▶ Reproduciendo';
  const ct = clickThrough ? '  ·  🖱 Click-through ON' : '';
  status.textContent =
    `${estado}  ·  ${Math.round(pxPerSec)} px/s  ·  🔒 Invisible${ct}` +
    `  ·  Espacio: pausa  ·  ↑↓: velocidad  ·  Shift+↑↓: saltar  ·  R: reiniciar`;
}

// --- Parseo del guion y detección de marcadores ---

function escape(line) {
  return line.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function renderScript(text) {
  content.innerHTML = '';
  markers = [];

  const trimmed = (text || '').trim();
  if (!trimmed) {
    const empty = document.createElement('p');
    empty.id = 'emptyState';
    empty.textContent = 'Sin guion cargado todavía. Abrí la configuración (botón ⚙ o Ctrl+Shift+E) para escribir o cargar tu texto.';
    content.appendChild(empty);
  } else {
    trimmed.split(/\n\s*\n/).forEach((paraText) => {
      const p = document.createElement('p');
      const firstLine = paraText.trimStart().split('\n')[0];

      if (firstLine.startsWith('- ')) {
        const label = firstLine.slice(2).trim();
        p.dataset.markerLabel = label;
        markers.push({ element: p, label });
      }

      p.innerHTML = paraText.split('\n').map(escape).join('<br>');
      content.appendChild(p);
    });
  }

  pos = 0;
  paused = false;
  lastTs = null;
  render();
  updateStatus();
  // Espera un frame para que el DOM haya calculado offsetTop antes de posicionar los dots.
  requestAnimationFrame(buildMarkerStrip);
}

// --- Tira de marcadores ---

function buildMarkerStrip() {
  markerStrip.innerHTML = '';
  if (!markers.length) return;

  const totalH = content.scrollHeight;
  if (!totalH) return;

  const stripH = markerStrip.clientHeight;

  markers.forEach(({ element, label }) => {
    const ratio = element.offsetTop / totalH;
    const dot = document.createElement('div');
    dot.className = 'marker-dot';
    dot.dataset.label = label;
    dot.style.top = `${Math.round(ratio * stripH)}px`;

    dot.addEventListener('click', () => {
      // Posiciona el marcador justo por encima de la zona de lectura (15% desde arriba)
      pos = Math.max(0, Math.min(maxScroll(), element.offsetTop - viewport.clientHeight * 0.15));
      paused = true;
      lastTs = null;
      render();
      updateStatus();
    });

    markerStrip.appendChild(dot);
  });
}

// --- Carga inicial ---

async function loadInitialScript() {
  const [saved, settings] = await Promise.all([
    window.prompterAPI.getScript(),
    window.prompterAPI.getSettings(),
  ]);
  applySettings(settings);
  renderScript(saved);
}

// Recarga en caliente del guion cuando la config lo guarda
window.prompterAPI.onScriptUpdated((text) => renderScript(text));

// Settings en caliente (sliders de opacidad/fuente desde la config)
window.prompterAPI.onSettingsUpdated((s) => applySettings(s));

// Click-through: visual indicator + estado
window.prompterAPI.onClickThroughChanged((active) => {
  clickThrough = active;
  panel.classList.toggle('click-through', active);
  updateStatus();
});

btnConfig.addEventListener('click', () => window.prompterAPI.openConfigWindow());

// --- Loop de animación ---

function tick(ts) {
  if (lastTs === null) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  if (!paused) {
    pos += pxPerSec * dt;
    if (pos >= maxScroll()) {
      pos = maxScroll();
      paused = true;
      updateStatus();
    }
    render();
  }
  requestAnimationFrame(tick);
}

// --- Teclado ---

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'Space':
      paused = !paused;
      lastTs = null;
      e.preventDefault();
      break;

    case 'ArrowUp':
      if (e.shiftKey) {
        // Shift+↑: saltar atrás ~150px (retroceder en el guion)
        pos = Math.max(0, pos - 150);
        render();
      } else {
        pxPerSec = Math.min(220, pxPerSec + 10);
      }
      e.preventDefault();
      break;

    case 'ArrowDown':
      if (e.shiftKey) {
        // Shift+↓: saltar adelante ~150px (avanzar en el guion)
        pos = Math.min(maxScroll(), pos + 150);
        render();
      } else {
        pxPerSec = Math.max(10, pxPerSec - 10);
      }
      e.preventDefault();
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

// Cuando la ventana cambia de tamaño, recalculamos los dots de marcadores
window.addEventListener('resize', () => requestAnimationFrame(buildMarkerStrip));

updateStatus();
loadInitialScript();
requestAnimationFrame(tick);
