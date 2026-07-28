/**
 * Flags temporales de desarrollo / pruebas.
 * Poné cada flag en `false` para restaurar el comportamiento estricto.
 *
 * Buscar en el repo: DEV_FLAGS
 */
export const DEV_FLAGS = {
  /**
   * Acepta el RUT del Super Admin Dev aunque venga incompleto o sin DV.
   * Completo: 21.191.911-6 → 211919116
   */
  RUT_BYPASS_ENABLED: true,
  DEV_RUT_CLEAN: '211919116',

  /**
   * Super Admin - Dev puede hard-delete (DELETE real) rendiciones, anticipos,
   * y saltar bloqueos de “tiene datos” en cajas/CC.
   */
  HARD_DELETE_ENABLED: true,

  /**
   * Super Admin - Dev: al rendir, salta la IA de comprobante
   * (no valida coincidencia de monto ni N° de documento).
   * Sigue siendo obligatorio adjuntar el archivo.
   */
  COMPROBANTE_VERIFY_BYPASS: true
}

function isSuperAdminDev(rolOrNivel) {
  const v = String(rolOrNivel || '')
  return (
    v === 'SUPER_ADMIN_DEV' ||
    v === 'Super Admin - Dev' ||
    v === 'ROLE_DEV'
  )
}

export function isDevRutBypass(rut) {
  if (!DEV_FLAGS.RUT_BYPASS_ENABLED) return false
  const cleaned = String(rut || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
  if (!cleaned) return false

  const full = String(DEV_FLAGS.DEV_RUT_CLEAN || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
  if (!full) return false

  const body = full.length > 1 ? full.slice(0, -1) : full
  return (
    cleaned === full ||
    cleaned === body ||
    (cleaned.length >= 6 && (full.startsWith(cleaned) || body.startsWith(cleaned)))
  )
}

/** Normaliza el RUT bypass a la forma completa con DV para guardar/comparar. */
export function normalizeDevRut(rut) {
  if (!isDevRutBypass(rut)) return null
  return String(DEV_FLAGS.DEV_RUT_CLEAN || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
}

export function canDevHardDelete(rolOrNivel) {
  if (!DEV_FLAGS.HARD_DELETE_ENABLED) return false
  return isSuperAdminDev(rolOrNivel)
}

/** Salta validación IA de monto / N° documento en comprobante. */
export function canSkipComprobanteVerify(rolOrNivel) {
  if (!DEV_FLAGS.COMPROBANTE_VERIFY_BYPASS) return false
  return isSuperAdminDev(rolOrNivel)
}
