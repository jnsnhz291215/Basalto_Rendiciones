'use strict'

const { query } = require('../config/db')
const {
  normalizeNumeroDocumento,
  resolveNumeroDocumentoForTipo,
  cellToString
} = require('./excelImport')

const MSG_DUPLICADO =
  'ya existe un gasto con el mismo numero de documento, imposible guardar'

/** Campos usados para decidir si dos movimientos son idénticos (import vs BD). */
const CAMPOS_IGUALDAD_GASTO = [
  'fecha_documento',
  'tipo_documento',
  'trabajador_id',
  'caja_id',
  'monto',
  'origen_pago',
  'descripcion',
  'patente',
  'tarjeta_id'
]

function fechaIsoOnly(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return s
}

function montoNorm(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

function descNorm(value) {
  return cellToString(value).replace(/\s+/g, ' ').trim().toLowerCase()
}

function patenteNorm(value) {
  const p = cellToString(value)
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
  return p || null
}

/**
 * Snapshot comparable de un gasto (fila BD o payload de import).
 */
function snapshotIgualdadGasto(row) {
  return {
    fecha_documento: fechaIsoOnly(row.fecha_documento ?? row.fecha),
    tipo_documento: String(row.tipo_documento || '').trim(),
    trabajador_id: row.trabajador_id != null ? Number(row.trabajador_id) : null,
    caja_id: row.caja_id != null ? Number(row.caja_id) : null,
    monto: montoNorm(row.monto),
    origen_pago: String(row.origen_pago || '').trim(),
    descripcion: descNorm(row.descripcion),
    patente: patenteNorm(row.patente),
    tarjeta_id:
      row.tarjeta_id != null && row.tarjeta_id !== ''
        ? Number(row.tarjeta_id)
        : null
  }
}

/**
 * Igualdad de movimientos: mismo monto, fecha, tipo, trabajador, caja,
 * forma de pago (origen_pago), descripción, patente y tarjeta.
 * No compara comprobante, estado, código ni lote.
 */
function gastosSonIdenticos(a, b) {
  const sa = snapshotIgualdadGasto(a)
  const sb = snapshotIgualdadGasto(b)
  return CAMPOS_IGUALDAD_GASTO.every((k) => sa[k] === sb[k])
}

function listarDiferenciasGasto(a, b) {
  const sa = snapshotIgualdadGasto(a)
  const sb = snapshotIgualdadGasto(b)
  return CAMPOS_IGUALDAD_GASTO.filter((k) => sa[k] !== sb[k])
}

/**
 * Valor a persistir: normalizado o NULL (vacío no participa del UNIQUE).
 */
function valorNumeroDocumentoPersistible(tipo, value) {
  return resolveNumeroDocumentoForTipo(tipo, value)
}

/**
 * Busca gasto activo con el mismo N° (normalizado). excludeId = mismo registro en update.
 * Compara contra el valor persistido (siempre normalizado al guardar).
 */
async function findGastoActivoByNumeroDocumento(numeroDocumento, excludeId = null) {
  const num = normalizeNumeroDocumento(numeroDocumento)
  if (!num) return null

  const params = [num]
  let sql = `
    SELECT *
    FROM rendiciones_gastos
    WHERE is_deleted = FALSE
      AND numero_documento = ?
  `
  if (excludeId != null) {
    sql += ' AND id <> ?'
    params.push(Number(excludeId))
  }
  sql += ' ORDER BY id ASC LIMIT 1'

  const rows = await query(sql, params)
  if (rows[0]) return rows[0]

  // Legacy: valores no normalizados aún (pre-UNIQUE)
  const legacyParams = []
  let legacySql = `
    SELECT *
    FROM rendiciones_gastos
    WHERE is_deleted = FALSE
      AND numero_documento IS NOT NULL
      AND TRIM(numero_documento) <> ''
      AND numero_documento <> ?
  `
  legacyParams.push(num)
  if (excludeId != null) {
    legacySql += ' AND id <> ?'
    legacyParams.push(Number(excludeId))
  }
  const legacy = await query(legacySql, legacyParams)
  return (
    legacy.find((r) => normalizeNumeroDocumento(r.numero_documento) === num) || null
  )
}

/**
 * @returns {null | { status: 400, error: string, existente_id?: number }}
 */
async function assertNumeroDocumentoUnico(numeroDocumento, excludeId = null) {
  const num = normalizeNumeroDocumento(numeroDocumento)
  if (!num) return null
  const existing = await findGastoActivoByNumeroDocumento(num, excludeId)
  if (!existing) return null
  return {
    status: 400,
    error: MSG_DUPLICADO,
    existente_id: Number(existing.id)
  }
}

/** Libera el UNIQUE al soft-delete (mismo patrón que cuentas_banco). */
function numeroDocumentoLiberado(numeroDocumento, id) {
  const raw = cellToString(numeroDocumento)
  if (!raw) return null
  if (raw.includes('#DEL')) return raw.slice(0, 50)
  return `${raw}#DEL${id}`.slice(0, 50)
}

function snapshotParaUi(row, extras = {}) {
  const s = snapshotIgualdadGasto(row)
  return {
    id: row.id != null ? Number(row.id) : null,
    codigo_rinde: row.codigo_rinde || null,
    numero_documento: row.numero_documento || null,
    fecha_documento: s.fecha_documento,
    tipo_documento: s.tipo_documento,
    trabajador_id: s.trabajador_id,
    trabajador_rut: extras.trabajador_rut || row.trabajador_rut || null,
    trabajador_nombre: extras.trabajador_nombre || row.trabajador_nombre || null,
    caja_id: s.caja_id,
    caja: extras.caja || row.clave_interna || row.caja || null,
    cc: extras.cc || row.cc_nombre || row.cc || null,
    monto: s.monto,
    origen_pago: s.origen_pago,
    descripcion: cellToString(row.descripcion).replace(/\s+/g, ' ').trim(),
    patente: s.patente,
    tarjeta_id: s.tarjeta_id,
    tarjeta_ultimos4: extras.tarjeta_ultimos4 || row.tarjeta_ultimos4 || null
  }
}

module.exports = {
  MSG_DUPLICADO,
  CAMPOS_IGUALDAD_GASTO,
  snapshotIgualdadGasto,
  gastosSonIdenticos,
  listarDiferenciasGasto,
  valorNumeroDocumentoPersistible,
  findGastoActivoByNumeroDocumento,
  assertNumeroDocumentoUnico,
  numeroDocumentoLiberado,
  snapshotParaUi,
  normalizeNumeroDocumento
}
