const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

function mesActualYYYYMM() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Compara fecha_documento (Date|string YYYY-MM-DD) con mes de referencia (YYYY-MM).
 * Si el documento es de un mes anterior → "Arrastre (Mes)"; si no → null.
 */
function calcularArrastreMes(fechaDocumento, mesReferencia) {
  if (!fechaDocumento || !mesReferencia) return null

  const fecha =
    fechaDocumento instanceof Date
      ? fechaDocumento
      : new Date(`${String(fechaDocumento).slice(0, 10)}T12:00:00Z`)

  if (Number.isNaN(fecha.getTime())) return null

  const [yRef, mRef] = String(mesReferencia).split('-').map(Number)
  const yDoc = fecha.getUTCFullYear()
  const mDoc = fecha.getUTCMonth() + 1

  const docKey = yDoc * 12 + mDoc
  const refKey = yRef * 12 + mRef

  if (docKey < refKey) {
    return `Arrastre (${MESES_ES[mDoc - 1]})`
  }
  return null
}

function nextCodigo(prefix, maxNum) {
  const n = Number.isFinite(maxNum) ? maxNum + 1 : 1
  return `${prefix}-${n}`
}

/** Ventana en horas para que ADMINS editen datos o soft-deleteen un movimiento. */
const VENTANA_EDICION_HORAS = 24

/**
 * ¿Está `createdAt` dentro de la ventana de edición/borrado?
 * @param {Date|string|number|null|undefined} createdAt
 * @param {number} [hours=24]
 */
function estaDentroVentanaEdicion(createdAt, hours = VENTANA_EDICION_HORAS) {
  if (createdAt == null || createdAt === '') return false
  const t =
    createdAt instanceof Date
      ? createdAt.getTime()
      : typeof createdAt === 'number'
        ? createdAt
        : new Date(createdAt).getTime()
  if (!Number.isFinite(t)) return false
  const h = Number(hours)
  const ms = (Number.isFinite(h) && h > 0 ? h : VENTANA_EDICION_HORAS) * 60 * 60 * 1000
  return Date.now() - t <= ms
}

function mensajeFueraVentanaEdicion(accion = 'editar') {
  const verb = accion === 'eliminar' ? 'eliminar' : 'editar'
  return `Fuera de la ventana de 24 horas: no se puede ${verb}`
}

/**
 * @returns {{ status: number, error: string } | null}
 */
function assertDentroVentanaEdicion(createdAt, accion = 'editar') {
  if (estaDentroVentanaEdicion(createdAt)) return null
  return { status: 403, error: mensajeFueraVentanaEdicion(accion) }
}

/** Campos de datos de gasto (no workflow ni solo comprobante). */
const CAMPOS_DATOS_RENDICION = [
  'fecha_documento',
  'tipo_documento',
  'numero_documento',
  'patente',
  'monto',
  'origen_pago',
  'tarjeta_id'
]

/** Campos de datos de asignación (no solo comprobante). */
const CAMPOS_DATOS_ANTICIPO = [
  'fecha',
  'monto',
  'observacion',
  'trabajador_id',
  'caja_id',
  'numero_cuenta',
  'banco_origen'
]

function bodyTocaCampos(body, keys) {
  if (!body || typeof body !== 'object') return false
  return keys.some((k) => Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined)
}

function adminUpdateTocaDatosRendicion(body) {
  return bodyTocaCampos(body, CAMPOS_DATOS_RENDICION)
}

function adminUpdateTocaDatosAnticipo(body) {
  return bodyTocaCampos(body, CAMPOS_DATOS_ANTICIPO)
}

module.exports = {
  calcularArrastreMes,
  nextCodigo,
  MESES_ES,
  mesActualYYYYMM,
  VENTANA_EDICION_HORAS,
  estaDentroVentanaEdicion,
  mensajeFueraVentanaEdicion,
  assertDentroVentanaEdicion,
  adminUpdateTocaDatosRendicion,
  adminUpdateTocaDatosAnticipo
}
