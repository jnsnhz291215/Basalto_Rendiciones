'use strict'

const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { ensureImportacionesSchema } = require('../utils/ensureImportacionesSchema')
const { calcularArrastreMes, mesActualYYYYMM } = require('../utils/helpers')
const {
  ESTADOS_FLUJO,
  normalizeEstadoFlujo,
  isLoteConfirmado,
  isLoteAnulado,
  isLotePendiente,
  buildContadores
} = require('../utils/importacionLote')
const {
  numeroDocumentoLiberado,
  valorNumeroDocumentoPersistible
} = require('../utils/numeroDocumentoUnico')

function parseJsonField(value, fallback = []) {
  if (value == null || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function countConflictosPendientes(conflictos) {
  if (!Array.isArray(conflictos)) return 0
  return conflictos.filter((c) => String(c?.estado || 'pendiente') === 'pendiente').length
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
  const conflictos = parseJsonField(row.conflictos_json, [])
  const omitidos = parseJsonField(row.omitidos_json, [])
  const conflictosPendientes = countConflictosPendientes(conflictos)
  const conComprobante = await countConComprobante(row.tipo, row.id)
  const contadores = buildContadores({
    creados: row.creados,
    erroresCount: row.errores_count,
    conComprobante,
    omitidosCount: row.omitidos_count ?? omitidos.length,
    conflictosPendientes
  })

  const base = {
    ...row,
    estado,
    errores,
    detalle_creados: detalleCreados,
    conflictos,
    omitidos,
    conflictos_pendientes: conflictosPendientes,
    is_deleted: Boolean(row.is_deleted),
    contadores,
    puede_confirmar:
      estado === ESTADOS_FLUJO.PENDIENTE &&
      !row.is_deleted &&
      Number(row.creados) > 0 &&
      conflictosPendientes === 0,
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
    base.filas_omitidas = Array.isArray(omitidos) ? omitidos : []
    base.filas_conflicto = Array.isArray(conflictos) ? conflictos : []
  }

  return base
}

async function listImportaciones(req, res) {
  try {
    await ensureImportacionesSchema()
    const rows = await query(
      `SELECT id, tipo, archivo_nombre, usuario_id, usuario_nombre, estado,
              confirmado_at, confirmado_por_id, confirmado_por_nombre,
              creados, errores_count, omitidos_count, is_deleted, deleted_at, created_at,
              conflictos_json, omitidos_json
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

    const conflictos = parseJsonField(lote.conflictos_json, [])
    const pendientes = countConflictosPendientes(conflictos)
    if (pendientes > 0) {
      return res.status(400).json({
        error: `Hay ${pendientes} conflicto(s) de N° documento pendientes de resolución`
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
    let anulados = 0

    if (tipo === 'gastos') {
      const movs = await query(
        `SELECT id, numero_documento
         FROM rendiciones_gastos
         WHERE importacion_lote_id = ? AND is_deleted = FALSE`,
        [id]
      )
      for (const m of movs) {
        await query(
          `UPDATE rendiciones_gastos
           SET is_deleted = TRUE, deleted_at = NOW(), numero_documento = ?
           WHERE id = ? AND is_deleted = FALSE`,
          [numeroDocumentoLiberado(m.numero_documento, m.id), m.id]
        )
        anulados += 1
      }
    } else if (tipo === 'asignaciones') {
      const soft = await query(
        `UPDATE anticipos
         SET is_deleted = TRUE, deleted_at = NOW()
         WHERE importacion_lote_id = ? AND is_deleted = FALSE`,
        [id]
      )
      anulados = Number(soft.affectedRows) || 0
    } else {
      return res.status(400).json({ error: `Tipo de lote inválido: ${tipo}` })
    }

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

/**
 * Resuelve un conflicto de N° documento del lote.
 * body: { conflicto_id, accion: 'ignorar' | 'mantener_existente' | 'usar_importado' }
 *
 * - ignorar / mantener_existente: no crea fila; marca resuelto + suma omitido
 * - usar_importado: actualiza el gasto existente con el payload del Excel (soft-replace)
 */
async function resolverConflictoImportacion(req, res) {
  try {
    await ensureImportacionesSchema()
    const loteId = Number(req.params.id)
    const { conflicto_id: conflictoId, accion } = req.body || {}
    const accionNorm = String(accion || '')
      .trim()
      .toLowerCase()

    if (!conflictoId) {
      return res.status(400).json({ error: 'conflicto_id es obligatorio' })
    }
    if (
      !['ignorar', 'mantener_existente', 'usar_importado'].includes(accionNorm)
    ) {
      return res.status(400).json({
        error: 'accion inválida (ignorar | mantener_existente | usar_importado)'
      })
    }

    const rows = await query(`SELECT * FROM importaciones_lotes WHERE id = ? LIMIT 1`, [
      loteId
    ])
    const lote = rows[0]
    if (!lote) {
      return res.status(404).json({ error: 'Lote de importación no encontrado' })
    }
    if (String(lote.tipo) !== 'gastos') {
      return res.status(400).json({ error: 'Solo aplica a lotes de gastos' })
    }
    if (isLoteAnulado(lote) || lote.is_deleted) {
      return res.status(400).json({ error: 'El lote está anulado' })
    }
    if (isLoteConfirmado(lote)) {
      return res.status(400).json({ error: 'El lote ya está confirmado' })
    }
    if (!isLotePendiente(lote)) {
      return res.status(400).json({ error: 'Solo se pueden resolver conflictos en lotes pendientes' })
    }

    const conflictos = parseJsonField(lote.conflictos_json, [])
    const omitidos = parseJsonField(lote.omitidos_json, [])
    const detalleCreados = parseJsonField(lote.detalle_creados_json, [])
    const idx = conflictos.findIndex((c) => String(c.id) === String(conflictoId))
    if (idx < 0) {
      return res.status(404).json({ error: 'Conflicto no encontrado' })
    }
    const conflicto = conflictos[idx]
    if (String(conflicto.estado || 'pendiente') !== 'pendiente') {
      return res.status(400).json({ error: 'El conflicto ya fue resuelto' })
    }

    let creados = Number(lote.creados) || 0
    let omitidosCount = Number(lote.omitidos_count) || omitidos.length

    if (accionNorm === 'usar_importado') {
      const payload = conflicto.payload
      if (!payload || !conflicto.existente_id) {
        return res.status(400).json({ error: 'Conflicto sin payload o existente_id' })
      }

      const existing = await query(
        `SELECT * FROM rendiciones_gastos WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
        [Number(conflicto.existente_id)]
      )
      if (!existing[0]) {
        return res.status(404).json({
          error: 'El gasto existente del conflicto ya no está activo'
        })
      }

      const tipo = payload.tipo_documento
      const num = valorNumeroDocumentoPersistible(tipo, payload.numero_documento)
      const arrastre = calcularArrastreMes(
        payload.fecha_documento,
        mesActualYYYYMM()
      )

      await query(
        `UPDATE rendiciones_gastos
         SET caja_id = ?,
             trabajador_id = ?,
             fecha_documento = ?,
             tipo_documento = ?,
             numero_documento = ?,
             patente = ?,
             monto = ?,
             origen_pago = ?,
             tarjeta_id = ?,
             descripcion = ?,
             arrastre_mes = ?,
             importacion_lote_id = COALESCE(importacion_lote_id, ?)
         WHERE id = ? AND is_deleted = FALSE`,
        [
          payload.caja_id,
          payload.trabajador_id,
          payload.fecha_documento,
          tipo,
          num,
          payload.patente || null,
          Number(payload.monto),
          payload.origen_pago,
          payload.tarjeta_id || null,
          String(payload.descripcion || '').trim(),
          arrastre,
          loteId,
          Number(conflicto.existente_id)
        ]
      )

      // Si el existente no estaba en el lote, contarlo como creado del lote
      const yaEnDetalle = detalleCreados.some(
        (d) => Number(d.id) === Number(conflicto.existente_id)
      )
      if (!yaEnDetalle) {
        detalleCreados.push({
          fila: conflicto.fila,
          id: Number(conflicto.existente_id),
          codigo: existing[0].codigo_rinde,
          via: 'conflicto_usar_importado'
        })
        creados += 1
      }

      conflicto.estado = 'resuelto'
      conflicto.resolucion = 'usar_importado'
      conflicto.resuelto_at = new Date().toISOString()
    } else {
      // ignorar | mantener_existente
      omitidos.push({
        fila: conflicto.fila,
        motivo:
          accionNorm === 'ignorar' ? 'conflicto_ignorado' : 'mantener_existente',
        numero_documento: conflicto.numero_documento,
        existente_id: conflicto.existente_id,
        mensaje:
          accionNorm === 'ignorar'
            ? 'Conflicto omitido: no se importó la fila'
            : 'Se mantuvo el gasto existente; fila de import omitida'
      })
      omitidosCount += 1
      conflicto.estado = 'resuelto'
      conflicto.resolucion = accionNorm
      conflicto.resuelto_at = new Date().toISOString()
    }

    conflictos[idx] = conflicto

    await query(
      `UPDATE importaciones_lotes
       SET creados = ?, omitidos_count = ?,
           conflictos_json = ?, omitidos_json = ?, detalle_creados_json = ?
       WHERE id = ?`,
      [
        creados,
        omitidosCount,
        JSON.stringify(conflictos),
        JSON.stringify(omitidos),
        JSON.stringify(detalleCreados),
        loteId
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Importaciones',
      `Resolver conflicto ${conflictoId} lote=${loteId}: ${accionNorm}`
    )

    const updated = await query(`SELECT * FROM importaciones_lotes WHERE id = ? LIMIT 1`, [
      loteId
    ])
    return res.json(await mapLote(updated[0], { withMovimientos: true }))
  } catch (err) {
    console.error('[resolverConflictoImportacion]', err)
    return res.status(500).json({
      error: err?.message || 'Error al resolver conflicto'
    })
  }
}

module.exports = {
  listImportaciones,
  getImportacion,
  confirmarImportacion,
  anularImportacion,
  resolverConflictoImportacion,
  parseJsonField
}
