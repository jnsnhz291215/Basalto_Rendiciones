const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { nextCodigo } = require('../utils/helpers')

async function listAnticipos(req, res) {
  try {
    const { caja_id, trabajador_id, mes, q } = req.query
    const params = []
    let sql = `
      SELECT a.*,
             c.clave_interna, c.nombre_exterior, c.mes_asignado,
             t.nombre_completo AS trabajador_nombre
      FROM anticipos a
      INNER JOIN cajas_chicas c ON c.id = a.caja_id AND c.is_deleted = FALSE
      INNER JOIN trabajadores t ON t.id = a.trabajador_id AND t.is_deleted = FALSE
      WHERE a.is_deleted = FALSE`

    if (caja_id) {
      sql += ' AND a.caja_id = ?'
      params.push(Number(caja_id))
    }
    if (trabajador_id) {
      sql += ' AND a.trabajador_id = ?'
      params.push(Number(trabajador_id))
    }
    if (mes) {
      sql += ' AND DATE_FORMAT(a.fecha, "%Y-%m") = ?'
      params.push(mes)
    }
    if (q?.trim()) {
      sql += ' AND t.nombre_completo LIKE ?'
      params.push(`%${q.trim()}%`)
    }

    sql += ' ORDER BY a.fecha DESC, a.id DESC'
    const rows = await query(sql, params)
    return res.json(rows)
  } catch (err) {
    console.error('[listAnticipos]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createAnticipo(req, res) {
  try {
    const { caja_id, trabajador_id, fecha, monto, observacion, comprobante_url, codigo_vale } =
      req.body || {}

    if (!caja_id || !trabajador_id || !fecha || monto === undefined) {
      return res.status(400).json({ error: 'caja_id, trabajador_id, fecha y monto son requeridos' })
    }

    let codigo = codigo_vale?.trim()
    if (!codigo) {
      const maxRows = await query(
        `SELECT MAX(CAST(SUBSTRING_INDEX(codigo_vale, '-', -1) AS UNSIGNED)) AS max_num
         FROM anticipos`
      )
      codigo = nextCodigo('V', Number(maxRows[0]?.max_num) || 5500)
    }

    const result = await query(
      `INSERT INTO anticipos
        (codigo_vale, caja_id, trabajador_id, fecha, monto, observacion, comprobante_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        caja_id,
        trabajador_id,
        fecha,
        Number(monto),
        observacion || null,
        comprobante_url || null
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Anticipos',
      `Anticipo ${codigo} a trabajador_id=${trabajador_id} ($${monto})`
    )

    const created = await query(
      `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
      [result.insertId]
    )
    return res.status(201).json(created[0])
  } catch (err) {
    console.error('[createAnticipo]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function updateAnticipo(req, res) {
  try {
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Anticipo no encontrado' })

    const { fecha, monto, observacion, comprobante_url, trabajador_id, caja_id } = req.body || {}

    await query(
      `UPDATE anticipos
       SET caja_id = ?,
           trabajador_id = ?,
           fecha = ?,
           monto = ?,
           observacion = ?,
           comprobante_url = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        caja_id || existing[0].caja_id,
        trabajador_id || existing[0].trabajador_id,
        fecha || existing[0].fecha,
        monto !== undefined ? Number(monto) : existing[0].monto,
        observacion !== undefined ? observacion : existing[0].observacion,
        comprobante_url !== undefined ? comprobante_url : existing[0].comprobante_url,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Anticipos',
      `Anticipo ${existing[0].codigo_vale} modificado`
    )

    const updated = await query(
      `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    return res.json(updated[0])
  } catch (err) {
    console.error('[updateAnticipo]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteAnticipo(req, res) {
  try {
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Anticipo no encontrado' })

    await query(
      `UPDATE anticipos SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Anticipos',
      `Soft delete anticipo ${existing[0].codigo_vale}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteAnticipo]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = {
  listAnticipos,
  createAnticipo,
  updateAnticipo,
  softDeleteAnticipo
}
