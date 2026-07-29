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

function readVersionFromDisk() {
  try {
    if (!fs.existsSync(VERSION_FILE)) return null
    const raw = fs.readFileSync(VERSION_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    const v = parsed?.version
    return v != null && String(v).trim() !== '' ? String(v) : null
  } catch {
    return null
  }
}

/**
 * Carga SYSTEM_VERSION en memoria (archivo o Date.now() inicial).
 */
function initSystemVersion() {
  const fromDisk = readVersionFromDisk()
  if (fromDisk) {
    cachedVersion = fromDisk
    return cachedVersion
  }
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
