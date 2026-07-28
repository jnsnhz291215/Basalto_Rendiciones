'use strict'

const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { nextCodigo } = require('../utils/helpers')
const { canDevHardDelete } = require('../config/devFlags')
const {
  ensureAsignacionesSchema,
  normalizeBancoNombre,
  upsertBancoOrigen
} = require('../utils/ensureAsignacionesSchema')

function normalizeNumeroCuenta(value) {
  return String(value || '')
    .replace(/[^0-9]/g, '')
    .slice(0, 40)
}

async function listAnticipos(req, res) {
  try {
    await ensureAsignacionesSchema()
    const { caja_id, trabajador_id, mes, q } = req.query
    const params = []
    let sql = `
      SELECT a.*,
             c.clave_interna, c.nombre_exterior,
             COALESCE(
               NULLIF(TRIM(t.nombre_completo), ''),
               CONCAT('Trabajador #', a.trabajador_id)
             ) AS trabajador_nombre
      FROM anticipos a
      INNER JOIN cajas_chicas c ON c.id = a.caja_id AND c.is_deleted = FALSE
      LEFT JOIN trabajadores t ON t.id = a.trabajador_id
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

async function listBancosOrigen(req, res) {
  try {
    await ensureAsignacionesSchema()
    const q = normalizeBancoNombre(req.query.q || '')
    let rows
    if (q) {
      rows = await query(
        `SELECT id, nombre FROM bancos_origen
         WHERE nombre LIKE ?
         ORDER BY nombre ASC
         LIMIT 30`,
        [`%${q}%`]
      )
    } else {
      rows = await query(
        `SELECT id, nombre FROM bancos_origen ORDER BY nombre ASC LIMIT 100`
      )
    }
    return res.json(rows)
  } catch (err) {
    console.error('[listBancosOrigen]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createAnticipo(req, res) {
  try {
    await ensureAsignacionesSchema()
    const {
      caja_id,
      trabajador_id,
      fecha,
      monto,
      observacion,
      comprobante_url,
      codigo_vale,
      numero_cuenta,
      banco_origen
    } = req.body || {}

    if (!caja_id || !trabajador_id || !fecha || monto === undefined) {
      return res.status(400).json({ error: 'caja_id, trabajador_id, fecha y monto son requeridos' })
    }

    if (!String(comprobante_url || '').trim()) {
      return res.status(400).json({
        error: 'El comprobante es obligatorio. Ninguna asignación puede guardarse sin documento.'
      })
    }

    const cuenta = normalizeNumeroCuenta(numero_cuenta)
    const banco = await upsertBancoOrigen(banco_origen)
    if (!cuenta) {
      return res.status(400).json({ error: 'Número de cuenta es obligatorio' })
    }
    if (!banco) {
      return res.status(400).json({ error: 'Banco origen es obligatorio' })
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
        (codigo_vale, caja_id, trabajador_id, fecha, monto, numero_cuenta, banco_origen,
         observacion, comprobante_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        caja_id,
        trabajador_id,
        fecha,
        Number(monto),
        cuenta,
        banco,
        observacion || null,
        comprobante_url || null
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Asignaciones',
      `Asignación ${codigo} a trabajador_id=${trabajador_id} ($${monto}) · ${banco}`
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
    await ensureAsignacionesSchema()
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Asignación no encontrada' })

    const {
      fecha,
      monto,
      observacion,
      comprobante_url,
      trabajador_id,
      caja_id,
      numero_cuenta,
      banco_origen
    } = req.body || {}

    let nextCuenta = existing[0].numero_cuenta
    if (numero_cuenta !== undefined) {
      nextCuenta = normalizeNumeroCuenta(numero_cuenta)
      if (!nextCuenta) {
        return res.status(400).json({ error: 'Número de cuenta es obligatorio' })
      }
    }

    let nextBanco = existing[0].banco_origen
    if (banco_origen !== undefined) {
      nextBanco = await upsertBancoOrigen(banco_origen)
      if (!nextBanco) {
        return res.status(400).json({ error: 'Banco origen es obligatorio' })
      }
    } else if (nextBanco) {
      nextBanco = normalizeBancoNombre(nextBanco)
    }

    await query(
      `UPDATE anticipos
       SET caja_id = ?,
           trabajador_id = ?,
           fecha = ?,
           monto = ?,
           numero_cuenta = ?,
           banco_origen = ?,
           observacion = ?,
           comprobante_url = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        caja_id || existing[0].caja_id,
        trabajador_id || existing[0].trabajador_id,
        fecha || existing[0].fecha,
        monto !== undefined ? Number(monto) : existing[0].monto,
        nextCuenta,
        nextBanco,
        observacion !== undefined ? observacion : existing[0].observacion,
        comprobante_url !== undefined ? comprobante_url : existing[0].comprobante_url,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Asignaciones',
      `Asignación ${existing[0].codigo_vale} modificada`
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
    if (!existing[0]) return res.status(404).json({ error: 'Asignación no encontrada' })

    const allowHard = canDevHardDelete(req.user)
    if (allowHard) {
      await query(`DELETE FROM anticipos WHERE id = ?`, [id])
      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'ELIMINAR',
        'Asignaciones',
        `HARD delete asignación ${existing[0].codigo_vale}`
      )
      return res.json({ ok: true, hard: true })
    }

    await query(
      `UPDATE anticipos SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Asignaciones',
      `Soft delete asignación ${existing[0].codigo_vale}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteAnticipo]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = {
  listAnticipos,
  listBancosOrigen,
  createAnticipo,
  updateAnticipo,
  softDeleteAnticipo
}
