const { query } = require('../config/db')

let fechaDesactivacionReady = false

async function ensureTarjetaFechaDesactivacion() {
  if (fechaDesactivacionReady) return
  try {
    await query(
      `ALTER TABLE tarjetas_empresa
       ADD COLUMN fecha_desactivacion DATE NULL AFTER estado`
    )
  } catch (err) {
    if (err.errno !== 1060 && err.code !== 'ER_DUP_FIELDNAME') throw err
  }
  fechaDesactivacionReady = true
}

function toDateOnly(value) {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

/** Origen API → tipo en tarjetas_empresa (Credito | Debito). */
function tipoFromOrigenPago(origenPago) {
  const o = String(origenPago || '').trim()
  if (o === 'Debito' || o === 'Débito') return 'Debito'
  if (o === 'Credito' || o === 'Crédito') return 'Credito'
  return null
}

function tarjetaPermiteFecha(card, fechaPago) {
  if (!card || card.estado !== 'inactiva') return true
  const fechaOff = toDateOnly(card.fecha_desactivacion)
  // Inactiva: solo pagos estrictamente anteriores a la desactivación
  return Boolean(fechaPago && fechaOff && fechaPago < fechaOff)
}

/**
 * Valida pago contra tarjetas de empresa guardadas.
 * - Si viene tarjeta_id: valida esa tarjeta.
 * - Si origen es Debito/Credito: busca tarjetas empresa de ese tipo.
 *   Si hay coincidencia y ninguna permite la fecha → error.
 *   Si no hay tarjetas de ese tipo → no aplica (no hay match empresa).
 */
async function assertTarjetaPermitePago({ tarjetaId, origenPago, fechaDocumento } = {}) {
  await ensureTarjetaFechaDesactivacion()

  const fechaPago = toDateOnly(fechaDocumento)
  const msg = {
    status: 400,
    error: 'Tarjeta desactivada, no se le puede asignar pagos'
  }

  if (tarjetaId != null && tarjetaId !== '') {
    const id = Number(tarjetaId)
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, error: 'tarjeta_id inválido' }
    }
    const rows = await query(
      `SELECT id, alias, tipo, estado, fecha_desactivacion
       FROM tarjetas_empresa
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    const card = rows[0]
    if (!card) return { status: 404, error: 'Tarjeta no encontrada' }
    if (!tarjetaPermiteFecha(card, fechaPago)) return msg
    return null
  }

  const tipo = tipoFromOrigenPago(origenPago)
  if (!tipo) return null

  const cards = await query(
    `SELECT id, alias, tipo, estado, fecha_desactivacion
     FROM tarjetas_empresa
     WHERE is_deleted = FALSE AND tipo = ?`,
    [tipo]
  )

  // Sin tarjetas empresa de ese tipo → no hay coincidencia que validar
  if (!cards.length) return null

  const algunaPermite = cards.some((c) => tarjetaPermiteFecha(c, fechaPago))
  if (!algunaPermite) return msg

  return null
}

module.exports = {
  assertTarjetaPermitePago,
  ensureTarjetaFechaDesactivacion,
  toDateOnly,
  tipoFromOrigenPago,
  tarjetaPermiteFecha
}
