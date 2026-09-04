'use strict'

const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const {
  nextCodigo,
  assertDentroVentanaEdicion
} = require('../utils/helpers')
const { canDevHardDelete } = require('../config/devFlags')
const { ROLES, ADMINS } = require('../middlewares/role.middleware')
const { ensureDevolucionesSchema } = require('../utils/ensureDevolucionesSchema')
const { cellToString } = require('../utils/excelImport')

function normalizeSentido(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (raw === 'trabajador' || raw === 'trabajador_empresa' || raw === 't') {
    return 'trabajador'
  }
  if (raw === 'empresa' || raw === 'empresa_trabajador' || raw === 'e') {
    return 'empresa'
  }
  return null
}

function isAdminUser(user) {
  return ADMINS.includes(user?.rol)
}

async function nextCodigoDevolucion() {
  const rows = await query(
    `SELECT MAX(CAST(SUBSTRING_INDEX(codigo, '-', -1) AS UNSIGNED)) AS max_num
     FROM devoluciones
     WHERE codigo LIKE 'D-%'`
  )
  return nextCodigo('D', Number(rows[0]?.max_num) || 1000)
}

async function listDevoluciones(req, res) {
  try {
    await ensureDevolucionesSchema()
    const { caja_id, trabajador_id, mes, q } = req.query
    const params = []
    let sql = `
      SELECT d.*,
             c.clave_interna, c.nombre_exterior,
             COALESCE(
               NULLIF(TRIM(t.nombre_completo), ''),
               CONCAT('Trabajador #', d.trabajador_id)
             ) AS trabajador_nombre
      FROM devoluciones d
      INNER JOIN cajas_chicas c ON c.id = d.caja_id AND c.is_deleted = FALSE
      LEFT JOIN trabajadores t ON t.id = d.trabajador_id
      WHERE d.is_deleted = FALSE`

    if (trabajador_id) {
      sql += ' AND d.trabajador_id = ?'
      params.push(Number(trabajador_id))
    }

    if (caja_id) {
      sql += ' AND d.caja_id = ?'
      params.push(Number(caja_id))
    }
    if (mes) {
      sql += ' AND DATE_FORMAT(d.fecha, "%Y-%m") = ?'
      params.push(mes)
    }
    if (q?.trim()) {
      sql += ' AND (t.nombre_completo LIKE ? OR d.observacion LIKE ? OR d.codigo LIKE ?)'
      const like = `%${q.trim()}%`
      params.push(like, like, like)
    }

    sql += ' ORDER BY d.fecha DESC, d.id DESC'
    const rows = await query(sql, params)
    return res.json(rows)
  } catch (err) {
    console.error('[listDevoluciones]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createDevolucion(req, res) {
  try {
    await ensureDevolucionesSchema()
    const {
      caja_id,
      trabajador_id,
      fecha,
      monto,
      sentido,
      observacion,
      comprobante_url
    } = req.body || {}

    if (!caja_id || !fecha || monto === undefined) {
      return res.status(400).json({ error: 'caja_id, fecha y monto son requeridos' })
    }

    let trabajadorId = Number(trabajador_id)
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: 'Solo administradores pueden registrar devoluciones' })
    }
    if (!trabajadorId) {
      return res.status(400).json({ error: 'trabajador_id es requerido' })
    }

    const sentidoNorm = normalizeSentido(sentido)
    if (!sentidoNorm) {
      return res.status(400).json({
        error: 'sentido inválido (use trabajador o empresa)'
      })
    }

    const montoNum = Number(monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' })
    }

    if (!String(comprobante_url || '').trim()) {
      return res.status(400).json({
        error: 'El comprobante es obligatorio. Ninguna devolución puede guardarse sin documento.'
      })
    }

    const obs = cellToString(observacion) || ''
    if (!obs.trim()) {
      return res.status(400).json({ error: 'Las observaciones / motivo son obligatorias' })
    }
    if (obs.length > 500) {
      return res.status(400).json({ error: 'Las observaciones no pueden superar 500 caracteres' })
    }

    const cajas = await query(
      `SELECT id FROM cajas_chicas WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
      [Number(caja_id)]
    )
    if (!cajas[0]) {
      return res.status(400).json({ error: 'Caja no encontrada' })
    }

    const codigo = await nextCodigoDevolucion()
    const result = await query(
      `INSERT INTO devoluciones
        (codigo, caja_id, trabajador_id, fecha, monto, sentido, observacion, comprobante_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        Number(caja_id),
        trabajadorId,
        fecha,
        montoNum,
        sentidoNorm,
        obs.trim(),
        String(comprobante_url).trim()
      ]
    )

    const sentidoLabel =
      sentidoNorm === 'trabajador' ? 'trabajador→empresa' : 'empresa→trabajador'
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Devoluciones',
      `Devolución ${codigo} (${sentidoLabel}) trabajador_id=${trabajadorId} ($${montoNum})`
    )

    const created = await query(
      `SELECT * FROM devoluciones WHERE id = ? AND is_deleted = FALSE`,
      [result.insertId]
    )
    return res.status(201).json(created[0])
  } catch (err) {
    console.error('[createDevolucion]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function updateDevolucion(req, res) {
  try {
    await ensureDevolucionesSchema()
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM devoluciones WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Devolución no encontrada' })

    if (!isAdminUser(req.user) && Number(existing[0].trabajador_id) !== Number(req.user.trabajador_id)) {
      return res.status(403).json({ error: 'No puedes modificar esta devolución' })
    }

    const { comprobante_url, observacion, fecha, monto, sentido, caja_id, trabajador_id } =
      req.body || {}

    const tocaDatos =
      observacion !== undefined ||
      fecha !== undefined ||
      monto !== undefined ||
      sentido !== undefined ||
      caja_id !== undefined ||
      trabajador_id !== undefined

    if (tocaDatos) {
      if (!isAdminUser(req.user)) {
        return res.status(403).json({ error: 'No puedes editar los datos de la devolución' })
      }
      const bloqueo = assertDentroVentanaEdicion(existing[0].created_at, 'editar')
      if (bloqueo) {
        return res.status(bloqueo.status).json({ error: bloqueo.error })
      }
    }

    let nextSentido = existing[0].sentido
    if (sentido !== undefined) {
      const s = normalizeSentido(sentido)
      if (!s) return res.status(400).json({ error: 'sentido inválido' })
      nextSentido = s
    }

    await query(
      `UPDATE devoluciones
       SET caja_id = ?,
           trabajador_id = ?,
           fecha = ?,
           monto = ?,
           sentido = ?,
           observacion = ?,
           comprobante_url = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        caja_id || existing[0].caja_id,
        trabajador_id || existing[0].trabajador_id,
        fecha || existing[0].fecha,
        monto !== undefined ? Number(monto) : existing[0].monto,
        nextSentido,
        observacion !== undefined ? observacion : existing[0].observacion,
        comprobante_url !== undefined ? comprobante_url : existing[0].comprobante_url,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Devoluciones',
      `Devolución ${existing[0].codigo} actualizada`
    )

    const updated = await query(
      `SELECT * FROM devoluciones WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    return res.json(updated[0])
  } catch (err) {
    console.error('[updateDevolucion]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteDevolucion(req, res) {
  try {
    await ensureDevolucionesSchema()
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM devoluciones WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Devolución no encontrada' })

    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar devoluciones' })
    }

    if (!canDevHardDelete(req.user)) {
      const bloqueo = assertDentroVentanaEdicion(existing[0].created_at, 'eliminar')
      if (bloqueo) {
        return res.status(bloqueo.status).json({ error: bloqueo.error })
      }
    }

    await query(
      `UPDATE devoluciones
       SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Devoluciones',
      `Devolución ${existing[0].codigo} eliminada`
    )

    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteDevolucion]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = {
  listDevoluciones,
  createDevolucion,
  updateDevolucion,
  softDeleteDevolucion
}
