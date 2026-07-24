const fs = require('fs')
const path = require('path')

/**
 * Carpeta de archivos fuera del git.
 * Prod (host): /home/basalto/apps/Basalto_rendiciones/Rendiciones_Storage
 * Override: STORAGE_PATH o RENDICIONES_STORAGE en server/.env
 */
const DEFAULT_PROD_STORAGE =
  '/home/basalto/apps/Basalto_rendiciones/Rendiciones_Storage'

function resolveStorageRoot() {
  const fromEnv =
    process.env.STORAGE_PATH ||
    process.env.RENDICIONES_STORAGE ||
    ''
  if (fromEnv.trim()) return path.resolve(fromEnv.trim())
  if (fs.existsSync(DEFAULT_PROD_STORAGE)) return DEFAULT_PROD_STORAGE
  // Dev local: carpeta hermana ignorada por git
  return path.resolve(__dirname, '..', '..', '..', 'Rendiciones_Storage')
}

const STORAGE_ROOT = resolveStorageRoot()

const SUBDIRS = ['comprobantes', 'anticipos', 'exports', 'tmp']

function ensureStorageDirs() {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true })
  for (const name of SUBDIRS) {
    fs.mkdirSync(path.join(STORAGE_ROOT, name), { recursive: true })
  }
}

function storagePath(...parts) {
  return path.join(STORAGE_ROOT, ...parts)
}

module.exports = {
  STORAGE_ROOT,
  SUBDIRS,
  ensureStorageDirs,
  storagePath,
  DEFAULT_PROD_STORAGE
}
