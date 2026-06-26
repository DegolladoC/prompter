// config.js — corre dentro de la ventana de configuración.
// Carga el guion guardado, permite editarlo o reemplazarlo desde un
// archivo .txt, y lo guarda en disco automáticamente (con debounce
// para no escribir a disco en cada tecla).

const textArea = document.getElementById('scriptText');
const btnLoadFile = document.getElementById('btnLoadFile');
const saveStatus = document.getElementById('saveStatus');

let saveTimer = null;
const SAVE_DEBOUNCE_MS = 600;

async function init() {
  const saved = await window.prompterAPI.getScript();
  textArea.value = saved || '';
}

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

function scheduleSave() {
  setStatus('saving');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await window.prompterAPI.setScript(textArea.value);
    setStatus('saved');
  }, SAVE_DEBOUNCE_MS);
}

textArea.addEventListener('input', scheduleSave);

btnLoadFile.addEventListener('click', async () => {
  const content = await window.prompterAPI.loadScriptFromFile();
  if (content !== null) {
    textArea.value = content;
    scheduleSave();
  }
});

// Por si el usuario cierra la ventana justo después de tipear, antes de
// que dispare el debounce: guardamos de inmediato al perder el foco.
window.addEventListener('beforeunload', () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    window.prompterAPI.setScript(textArea.value);
  }
});

init();
