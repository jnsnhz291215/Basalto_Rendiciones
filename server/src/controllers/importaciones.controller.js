'use strict'

const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { ensureImportacionesSchema } = require('../utils/ensureImportacionesSchema')
const {
  ESTADOS_FLUJO,
  normalizeEstadoFlujo,
  isLoteConfirmado,
  isLoteAnulado,
  isLotePendiente,
  buildContadores
} = require('../utils/importacionLote')

function parseJsonField(value, fallback = []) {
  if (value == null || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

async function countConComprobante(tipo, loteId) {
  if (tipo === 'gastos') {
    const rows = await query(
      `SELECT COUNT(*) AS n
       FROM rendiciones_gastos
       WHERE importacion_lote_id = ?
         AND is_deleted = FALSE
         AND comprobante_url IS NOT NULL
         AND TRIM(comprobante_url) <> ''`,
      [loteId]
    )
    return Number(rows[0]?.n) || 0
  }
  if (tipo === 'asignaciones') {
    const rows = await query(
      `SELECT COUNT(*) AS n
       FROM anticipos
       WHERE importacion_lote_id = ?
         AND is_deleted = FALSE
         AND comprobante_url IS NOT NULL
         AND TRIM(comprobante_url) <> ''`,
      [loteId]
    )
    return Number(rows[0]?.n) || 0
  }
  return 0
}

async function fetchMovimientosLote(lote) {
  const id = Number(lote.id)
  const tipo = String(lote.tipo || '')

  if (tipo === 'gastos') {
    const rows = await query(
      `SELECT r.id, r.codigo_rinde, r.caja_id, r.trabajador_id, r.fecha_documento,
              r.tipo_documento, r.numero_documento, r.patente, r.monto, r.origen_pago,
              r.tarjeta_id, r.comprobante_url, r.descripcion, r.estado, r.es_legacy,
              r.importacion_lote_id, r.created_at,
              c.clave_interna, c.nombre_exterior,
              COALESCE(cc.nombre, '') AS cc_nombre,
              COALESCE(
                NULLIF(TRIM(t.nombre_completo), ''),
                CONCAT('Trabajador #', r.trabajador_id)
              ) AS trabajador_nombre,
              t.rut AS trabajador_rut,
              CASE
                WHEN r.comprobante_url IS NOT NULL AND TRIM(r.comprobante_url) <> ''
                THEN 'correcto'
                ELSE 'parcial'
              END AS calidad
       FROM rendiciones_gastos r
       INNER JOIN cajas_chicas c ON c.id = r.caja_id AND c.is_deleted = FALSE
       LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id AND cc.is_deleted = FALSE
       LEFT JOIN trabajadores t ON t.id = r.trabajador_id
       WHERE r.importacion_lote_id = ? AND r.is_deleted = FALSE
       ORDER BY r.id ASC`,
      [id]
    )
    return rows
  }

  if (tipo === 'asignaciones') {
    const rows = await query(
      `SELECT a.id, a.codigo_vale, a.caja_id, a.trabajador_id, a.fecha, a.monto,
              a.numero_cuenta, a.banco_origen, a.observacion, a.comprobante_url,
              a.es_legacy, a.importacion_lote_id, a.created_at,
              c.clave_interna, c.nombre_exterior,
              COALESCE(cc.nombre, '') AS cc_nombre,
              COALESCE(
                NULLIF(TRIM(t.nombre_completo), ''),
                CONCAT('Trabajador #', a.trabajador_id)
              ) AS trabajador_nombre,
              t.rut AS trabajador_rut,
              CASE
                WHEN a.comprobante_url IS NOT NULL AND TRIM(a.comprobante_url) <> ''
                THEN 'correcto'
                ELSE 'parcial'
              END AS calidad
       FROM anticipos a
       INNER JOIN cajas_chicas c ON c.id = a.caja_id AND c.is_deleted = FALSE
       LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id AND cc.is_deleted = FALSE
       LEFT JOIN trabajadores t ON t.id = a.trabajador_id
       WHERE a.importacion_lote_id = ? AND a.is_deleted = FALSE
       ORDER BY a.id ASC`,
      [id]
    )
    return rows
  }

  return []
}

async function mapLote(row, { withMovimientos = false } = {}) {
  if (!row) return null
  const estado = normalizeEstadoFlujo(row.estado)
  const errores = parseJsonField(row.errores_json, [])
  const detalleCreados = parseJsonField(row.detalle_creados_json, [])
  const conComprobante = await countConComprobante(row.tipo, row.id)
  const contadores = buildContadores({
    creados: row.creados,
    erroresCount: row.errores_count,
    conComprobante
  })

  const base = {
    ...row,
    estado,
    errores,
    detalle_creados: detalleCreados,
    is_deleted: Boolean(row.is_deleted),
    contadores,
    puede_confirmar: estado === ESTADOS_FLUJO.PENDIENTE && !row.is_deleted && Number(row.creados) > 0,
    puede_anular: estado === ESTADOS_FLUJO.PENDIENTE && !row.is_deleted
  }

  if (withMovimientos) {
    const movimientos = await fetchMovimientosLote(row)
    const invalidos = (Array.isArray(errores) ? errores : []).map((e) => ({
      tipo_fila: 'invalido',
      fila: e.fila,
      error: e.error,
      calidad: 'invalido'
    }))
    base.movimientos = movimientos
    base.filas_invalidas = invalidos
  }

  return base
}

async function listImportaciones(req, res) {
  try {
    await ensureImportacionesSchema()
    const rows = await query(
      `SELECT id, tipo, archivo_nombre, usuario_id, usuario_nombre, estado,
              confirmado_at, confirmado_por_id, confirmado_por_nombre,
              creados, errores_count, is_deleted, deleted_at, created_at
       FROM importaciones_lotes
       ORDER BY id DESC`
    )
    const mapped = []
    for (const row of rows) {
      mapped.push(await mapLote(row))
    }
    return res.json(mapped)
  } catch (err) {
    console.error('[listImportaciones]', err)
    return res.status(500).json({ error: err?.message || 'Error al listar importaciones' })
  }
}

async function getImportacion(req, res) {
  try {
    await ensureImportacionesSchema()
    const id = Number(req.params.id)
    const rows = await query(`SELECT * FROM importaciones_lotes WHERE id = ? LIMIT 1`, [id])
    if (!rows[0]) {
      return res.status(404).json({ error: 'Lote de importación no encontrado' })
    }
    return res.json(await mapLote(rows[0], { withMovimientos: true }))
  } catch (err) {
    console.error('[getImportacion]', err)
    return res.status(500).json({ error: err?.message || 'Error al obtener importación' })
  }
}

async function confirmarImportacion(req, res) {
  try {
    await ensureImportacionesSchema()
    const id = Number(req.params.id)
    const rows = await query(`SELECT * FROM importaciones_lotes WHERE id = ? LIMIT 1`, [id])
    const lote = rows[0]
    if (!lote) {
      return res.status(404).json({ error: 'Lote de importación no encontrado' })
    }
    if (isLoteAnulado(lote)) {
      return res.status(400).json({ error: 'No se puede confirmar un lote anulado' })
    }
    if (isLoteConfirmado(lote)) {
      return res.status(400).json({ error: 'El lote ya está confirmado' })
    }
    if (!isLotePendiente(lote)) {
      return res.status(400).json({ error: 'Solo se pueden confirmar lotes pendientes' })
    }
    if (!(Number(lote.creados) > 0)) {
      return res.status(400).json({
        error: 'No hay movimientos creados para confirmar'
      })
    }

    await query(
      `UPDATE importaciones_lotes
       SET estado = ?,
           confirmado_at = NOW(),
           confirmado_por_id = ?,
           confirmado_por_nombre = ?
       WHERE id = ?`,
      [
        ESTADOS_FLUJO.CONFIRMADO,
        req.user.id ?? null,
        req.user.nombre ?? null,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Importaciones',
      `Confirmar lote id=${id} tipo=${lote.tipo}: ${lote.creados} movimiento(s)`
    )

    const updated = await query(`SELECT * FROM importaciones_lotes WHERE id = ? LIMIT 1`, [id])
    return res.json(await mapLote(updated[0], { withMovimientos: true }))
  } catch (err) {
    console.error('[confirmarImportacion]', err)
    return res.status(500).json({ error: err?.message || 'Error al confirmar importación' })
  }
}

async function anularImportacion(req, res) {
  try {
    await ensureImportacionesSchema()
    const id = Number(req.params.id)
    const rows = await query(`SELECT * FROM importaciones_lotes WHERE id = ? LIMIT 1`, [id])
    const lote = rows[0]
    if (!lote) {
      return res.status(404).json({ error: 'Lote de importación no encontrado' })
    }
    if (isLoteAnulado(lote)) {
      return res.status(400).json({ error: 'El lote ya está anulado' })
    }
    if (isLoteConfirmado(lote)) {
      return res.status(400).json({
        error: 'El lote está confirmado: no se puede anular ni borrar'
      })
    }

    const tipo = String(lote.tipo || '')
    let tabla = null
    if (tipo === 'gastos') tabla = 'rendiciones_gastos'
    else if (tipo === 'asignaciones') tabla = 'anticipos'
    else {
      return res.status(400).json({ error: `Tipo de lote inválido: ${tipo}` })
    }

    const soft = await query(
      `UPDATE ${tabla}
       SET is_deleted = TRUE, deleted_at = NOW()
       WHERE importacion_lote_id = ? AND is_deleted = FALSE`,
      [id]
    )
    const anulados = Number(soft.affectedRows) || 0

    await query(
      `UPDATE importaciones_lotes
       SET estado = 'anulado', is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ?`,
      [id]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Importaciones',
      `Anular lote id=${id} tipo=${tipo}: ${anulados} registro(s)`
    )

    return res.json({ ok: true, id, tipo, anulados })
  } catch (err) {
    console.error('[anularImportacion]', err)
    return res.status(500).json({ error: err?.message || 'Error al anular importación' })
  }
}

module.exports = {
  listImportaciones,
  getImportacion,
  confirmarImportacion,
  anularImportacion,
  parseJsonField
}
