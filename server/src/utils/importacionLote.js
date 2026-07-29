'use strict'

const { query } = require('../config/db')
const { ensureImportacionesSchema } = require('./ensureImportacionesSchema')

/** Estados de flujo del lote (no confundir con calidad de filas). */
const ESTADOS_FLUJO = {
  PENDIENTE: 'pendiente',
  CONFIRMADO: 'confirmado',
  ANULADO: 'anulado'
}

/** Estados legacy de calidad de import → se tratan como pendientes. */
const ESTADOS_LEGACY_PENDIENTES = new Set([
  'completo',
  'parcial',
  'fallido',
  'borrador',
  'sin_confirmar'
])

function normalizeEstadoFlujo(estado) {
  const e = String(estado || '')
    .trim()
    .toLowerCase()
  if (e === ESTADOS_FLUJO.CONFIRMADO) return ESTADOS_FLUJO.CONFIRMADO
  if (e === ESTADOS_FLUJO.ANULADO) return ESTADOS_FLUJO.ANULADO
  if (e === ESTADOS_FLUJO.PENDIENTE || ESTADOS_LEGACY_PENDIENTES.has(e) || !e) {
    return ESTADOS_FLUJO.PENDIENTE
  }
  return e
}

function isLoteConfirmado(lote) {
  return normalizeEstadoFlujo(lote?.estado) === ESTADOS_FLUJO.CONFIRMADO
}

function isLoteAnulado(lote) {
  return (
    normalizeEstadoFlujo(lote?.estado) === ESTADOS_FLUJO.ANULADO ||
    Boolean(lote?.is_deleted)
  )
}

function isLotePendiente(lote) {
  return normalizeEstadoFlujo(lote?.estado) === ESTADOS_FLUJO.PENDIENTE && !lote?.is_deleted
}

async function getImportacionLoteById(id) {
  await ensureImportacionesSchema()
  const rows = await query(`SELECT * FROM importaciones_lotes WHERE id = ? LIMIT 1`, [
    Number(id)
  ])
  return rows[0] || null
}

/**
 * Si el movimiento pertenece a un lote confirmado:
 * - no se pueden editar datos
 * - comprobante solo si aún no tenía
 * Devuelve null si OK, o { status, error }.
 */
async function assertEdicionMovimientoImportado(row, { comprobanteUrl } = {}) {
  const loteId = row?.importacion_lote_id
  if (!loteId) return null

  const lote = await getImportacionLoteById(loteId)
  if (!lote || !isLoteConfirmado(lote)) return null

  const tieneComprobante = Boolean(String(row.comprobante_url || '').trim())
  const nuevaUrl = String(comprobanteUrl || '').trim()

  if (tieneComprobante) {
    return {
      status: 403,
      error:
        'El lote está confirmado: no se puede editar ni reemplazar el comprobante. Solo descarga.'
    }
  }

  if (!nuevaUrl) {
    return {
      status: 403,
      error: 'El lote está confirmado: solo se puede subir el comprobante faltante.'
    }
  }

  return null
}

async function assertPuedeBorrarMovimientoImportado(row) {
  const loteId = row?.importacion_lote_id
  if (!loteId) return null
  const lote = await getImportacionLoteById(loteId)
  if (!lote || !isLoteConfirmado(lote)) return null
  return {
    status: 403,
    error: 'El lote está confirmado: no se pueden eliminar movimientos.'
  }
}

/**
 * Contadores de calidad:
 * - inválidos: filas que fallaron en el Excel (errores_json)
 * - parcial: creados sin comprobante
 * - correctos: creados con comprobante
 */
function buildContadores({ creados = 0, erroresCount = 0, conComprobante = 0 } = {}) {
  const creadosN = Number(creados) || 0
  const invalidos = Number(erroresCount) || 0
  const correctos = Math.min(Number(conComprobante) || 0, creadosN)
  const parcial = Math.max(0, creadosN - correctos)
  return {
    movimientos: creadosN + invalidos,
    correctos,
    parcial,
    invalidos
  }
}

module.exports = {
  ESTADOS_FLUJO,
  normalizeEstadoFlujo,
  isLoteConfirmado,
  isLoteAnulado,
  isLotePendiente,
  getImportacionLoteById,
  assertEdicionMovimientoImportado,
  assertPuedeBorrarMovimientoImportado,
  buildContadores
}
