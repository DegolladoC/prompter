// store.js — persistencia simple en disco para el proceso main.
//
// Guarda el estado del guion (y, a futuro, otras preferencias como
// opacidad/fuente) en un JSON dentro de la carpeta userData de la app.
// No usamos nada más pesado (sqlite, lowdb, etc.) porque el volumen de
// datos es mínimo: un string de texto y un par de números.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const FILE_NAME = 'prompter-data.json';

const DEFAULTS = {
  script: '',
};

function getFilePath() {
  return path.join(app.getPath('userData'), FILE_NAME);
}

function load() {
  try {
    const raw = fs.readFileSync(getFilePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch (err) {
    // Primer arranque o archivo corrupto/ausente -> devolvemos defaults.
    return { ...DEFAULTS };
  }
}

function save(data) {
  const current = load();
  const merged = { ...current, ...data };
  try {
    fs.writeFileSync(getFilePath(), JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.error('[store] No se pudo guardar el estado:', err);
  }
  return merged;
}

module.exports = { load, save };
