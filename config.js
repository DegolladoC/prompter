// config.js — ventana de configuración: guion + ajustes de apariencia.

const textArea       = document.getElementById('scriptText');
const btnLoadFile    = document.getElementById('btnLoadFile');
const saveStatus     = document.getElementById('saveStatus');
const sliderOpacity  = document.getElementById('sliderOpacity');
const valOpacity     = document.getElementById('valOpacity');
const sliderFontSize = document.getElementById('sliderFontSize');
const valFontSize    = document.getElementById('valFontSize');

let scriptTimer   = null;
let settingsTimer = null;
const DEBOUNCE_MS = 600;

// --- Estado del indicador de guardado ---

function setStatus(state) {
  saveStatus.classList.remove('saving', 'saved');
  if (state === 'saving') {
    saveStatus.textContent = 'Guardando…';
    saveStatus.classList.add('saving');
  } else if (state === 'saved') {
    saveStatus.textContent = 'Guardado ✓';
    saveStatus.classList.add('saved');
  } else {
    saveStatus.textContent = 'Sin cambios';
  }
}

// --- Guardado del guion (debounce) ---

function scheduleSaveScript() {
  setStatus('saving');
  if (scriptTimer) clearTimeout(scriptTimer);
  scriptTimer = setTimeout(async () => {
    await window.prompterAPI.setScript(textArea.value);
    setStatus('saved');
  }, DEBOUNCE_MS);
}

// --- Guardado de ajustes (debounce) ---

function scheduleSaveSettings() {
  setStatus('saving');
  if (settingsTimer) clearTimeout(settingsTimer);
  settingsTimer = setTimeout(async () => {
    const opacity  = parseInt(sliderOpacity.value, 10) / 100;
    const fontSize = parseInt(sliderFontSize.value, 10);
    await window.prompterAPI.setSettings({ opacity, fontSize });
    setStatus('saved');
  }, DEBOUNCE_MS);
}

// --- Listeners ---

textArea.addEventListener('input', scheduleSaveScript);

sliderOpacity.addEventListener('input', () => {
  valOpacity.textContent = `${sliderOpacity.value}%`;
  scheduleSaveSettings();
});

sliderFontSize.addEventListener('input', () => {
  valFontSize.textContent = `${sliderFontSize.value}px`;
  scheduleSaveSettings();
});

btnLoadFile.addEventListener('click', async () => {
  const content = await window.prompterAPI.loadScriptFromFile();
  if (content !== null) {
    textArea.value = content;
    scheduleSaveScript();
  }
});

window.addEventListener('beforeunload', () => {
  if (scriptTimer) {
    clearTimeout(scriptTimer);
    window.prompterAPI.setScript(textArea.value);
  }
  if (settingsTimer) {
    clearTimeout(settingsTimer);
    const opacity  = parseInt(sliderOpacity.value, 10) / 100;
    const fontSize = parseInt(sliderFontSize.value, 10);
    window.prompterAPI.setSettings({ opacity, fontSize });
  }
});

// --- Carga inicial ---

async function init() {
  const [saved, settings] = await Promise.all([
    window.prompterAPI.getScript(),
    window.prompterAPI.getSettings(),
  ]);

  textArea.value = saved || '';

  const opacityPct = Math.round((settings.opacity ?? 0.74) * 100);
  sliderOpacity.value    = opacityPct;
  valOpacity.textContent = `${opacityPct}%`;

  const fontSize = settings.fontSize ?? 30;
  sliderFontSize.value    = fontSize;
  valFontSize.textContent = `${fontSize}px`;
}

init();
