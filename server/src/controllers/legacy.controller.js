const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')

async function listLegacy(req, res) {
  try {
    const { q } = req.query
    const params = []
    let sql = `SELECT * FROM rendiciones_legacy WHERE is_deleted = FALSE`
    if (q?.trim()) {
      sql += ` AND (
        COALESCE(trabajador_nombre_legacy, '') LIKE ?
        OR COALESCE(codigo_original, '') LIKE ?
        OR COALESCE(caja_nombre_legacy, '') LIKE ?
      )`
      const like = `%${q.trim()}%`
      params.push(like, like, like)
    }
    sql += ' ORDER BY COALESCE(fecha_documento, created_at) DESC, id DESC'
    const rows = await query(sql, params)
    return res.json(rows)
  } catch (err) {
    console.error('[listLegacy]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createLegacy(req, res) {
  try {
    const body = req.body || {}
    const result = await query(
      `INSERT INTO rendiciones_legacy
        (codigo_original, caja_id, caja_nombre_legacy, trabajador_id, trabajador_nombre_legacy,
         fecha_documento, tipo_documento, numero_documento, monto, origen_pago, descripcion, estado, datos_extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.codigo_original || null,
        body.caja_id || null,
        body.caja_nombre_legacy || null,
        body.trabajador_id || null,
        body.trabajador_nombre_legacy || null,
        body.fecha_documento || null,
        body.tipo_documento || null,
        body.numero_documento || null,
        body.monto !== undefined && body.monto !== null ? Number(body.monto) : null,
        body.origen_pago || null,
        body.descripcion || null,
        body.estado || null,
        body.datos_extra ? JSON.stringify(body.datos_extra) : null
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Legacy',
      `Registro legacy id=${result.insertId}`
    )

    const created = await query(
      `SELECT * FROM rendiciones_legacy WHERE id = ? AND is_deleted = FALSE`,
      [result.insertId]
    )
    return res.status(201).json(created[0])
  } catch (err) {
    console.error('[createLegacy]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteLegacy(req, res) {
  try {
    const id = Number(req.params.id)
    const result = await query(
      `UPDATE rendiciones_legacy SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro legacy no encontrado' })
    }
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Legacy',
      `Soft delete legacy id=${id}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteLegacy]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = { listLegacy, createLegacy, softDeleteLegacy }
