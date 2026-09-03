const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', '..', 'data')
const VERSION_FILE = path.join(DATA_DIR, 'system-version.json')

/** @type {string} */
let cachedVersion = ''

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function writeVersion(version) {
  ensureDataDir()
  const payload = { version: String(version), updatedAt: new Date().toISOString() }
  fs.writeFileSync(VERSION_FILE, JSON.stringify(payload, null, 2), 'utf8')
  cachedVersion = String(version)
  return cachedVersion
}

/**
 * Bumpea SYSTEM_VERSION en cada arranque del proceso (deploy/reinicio), para
 * que los clientes detecten la actualización solos sin depender de un
 * trigger manual. `bumpSystemVersion()` sigue disponible para forzar un
 * refresh en caliente (ej. cambios de configuración sin reiniciar).
 */
function initSystemVersion() {
  return writeVersion(String(Date.now()))
}

function getSystemVersion() {
  if (!cachedVersion) initSystemVersion()
  return cachedVersion
}

/**
 * Actualiza SYSTEM_VERSION a Date.now() (string comparable numéricamente).
 */
function bumpSystemVersion() {
  return writeVersion(String(Date.now()))
}

module.exports = {
  initSystemVersion,
  getSystemVersion,
  bumpSystemVersion,
  VERSION_FILE
}
