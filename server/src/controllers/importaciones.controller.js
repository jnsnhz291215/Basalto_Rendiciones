'use strict'

const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { ensureImportacionesSchema } = require('../utils/ensureImportacionesSchema')

function parseJsonField(value, fallback = []) {
  if (value == null || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function mapLote(row) {
  if (!row) return null
  return {
    ...row,
    errores: parseJsonField(row.errores_json, []),
    detalle_creados: parseJsonField(row.detalle_creados_json, []),
    is_deleted: Boolean(row.is_deleted)
  }
}

async function listImportaciones(req, res) {
  try {
    await ensureImportacionesSchema()
    const rows = await query(
      `SELECT id, tipo, archivo_nombre, usuario_id, usuario_nombre, estado,
              creados, errores_count, is_deleted, deleted_at, created_at
       FROM importaciones_lotes
       ORDER BY id DESC`
    )
    return res.json(rows.map(mapLote))
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
    return res.json(mapLote(rows[0]))
  } catch (err) {
    console.error('[getImportacion]', err)
    return res.status(500).json({ error: err?.message || 'Error al obtener importación' })
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
    if (lote.estado === 'anulado' || lote.is_deleted) {
      return res.status(400).json({ error: 'El lote ya está anulado' })
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
  anularImportacion,
  parseJsonField
}
