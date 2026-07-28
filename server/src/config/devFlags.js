/**
 * Flags temporales de desarrollo / pruebas (API).
 * Alinear con `src/devFlags.js` del frontend.
 *
 * Env (opcionales, default = habilitado si no se define):
 *   DEV_RUT_BYPASS=0              → desactiva bypass de RUT
 *   DEV_HARD_DELETE=0             → desactiva hard delete
 *   DEV_COMPROBANTE_VERIFY_BYPASS=0 → exige IA monto/N° documento
 *
 * Buscar: DEV_FLAGS
 */

function envEnabled(name, defaultOn = true) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return defaultOn
  return !['0', 'false', 'off', 'no'].includes(String(raw).trim().toLowerCase())
}

const DEV_FLAGS = {
  RUT_BYPASS_ENABLED: envEnabled('DEV_RUT_BYPASS', true),
  DEV_RUT_CLEAN: String(process.env.DEV_RUT_CLEAN || '211919116')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase(),
  HARD_DELETE_ENABLED: envEnabled('DEV_HARD_DELETE', true),
  COMPROBANTE_VERIFY_BYPASS: envEnabled('DEV_COMPROBANTE_VERIFY_BYPASS', true)
}

function cleanRut(rut) {
  return String(rut || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
}

function isSuperAdminDev(user) {
  return user?.rol === 'SUPER_ADMIN_DEV'
}

function isDevRutBypass(rut) {
  if (!DEV_FLAGS.RUT_BYPASS_ENABLED) return false
  const cleaned = cleanRut(rut)
  if (!cleaned) return false
  const full = DEV_FLAGS.DEV_RUT_CLEAN
  if (!full) return false
  const body = full.length > 1 ? full.slice(0, -1) : full
  return (
    cleaned === full ||
    cleaned === body ||
    (cleaned.length >= 6 && (full.startsWith(cleaned) || body.startsWith(cleaned)))
  )
}

function normalizeDevRut(rut) {
  if (!isDevRutBypass(rut)) return null
  return DEV_FLAGS.DEV_RUT_CLEAN
}

function canDevHardDelete(user) {
  if (!DEV_FLAGS.HARD_DELETE_ENABLED) return false
  return isSuperAdminDev(user)
}

function canSkipComprobanteVerify(user) {
  if (!DEV_FLAGS.COMPROBANTE_VERIFY_BYPASS) return false
  return isSuperAdminDev(user)
}

module.exports = {
  DEV_FLAGS,
  isDevRutBypass,
  normalizeDevRut,
  canDevHardDelete,
  canSkipComprobanteVerify,
  cleanRut
}
