const bcrypt = require('bcryptjs')
const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { ROLES, SUPER_ADMINS } = require('../middlewares/role.middleware')

/* ——— Trabajadores ——— */

async function listTrabajadores(req, res) {
  try {
    const trabajadores = await query(
      `SELECT * FROM trabajadores WHERE is_deleted = FALSE ORDER BY nombre_completo ASC`
    )
    const cajas = await query(
      `SELECT trabajador_id, clave_interna FROM trabajador_cajas`
    )
    const byTrab = new Map()
    for (const row of cajas) {
      if (!byTrab.has(row.trabajador_id)) byTrab.set(row.trabajador_id, [])
      byTrab.get(row.trabajador_id).push(row.clave_interna)
    }
    return res.json(
      trabajadores.map((t) => ({
        ...t,
        cajas_asignadas: byTrab.get(t.id) || []
      }))
    )
  } catch (err) {
    console.error('[listTrabajadores]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createTrabajador(req, res) {
  try {
    const { rut, nombre_completo, cargo } = req.body || {}
    if (!rut?.trim() || !nombre_completo?.trim()) {
      return res.status(400).json({ error: 'rut y nombre_completo son requeridos' })
    }

    const result = await query(
      `INSERT INTO trabajadores (rut, nombre_completo, cargo) VALUES (?, ?, ?)`,
      [rut.trim(), nombre_completo.trim(), cargo?.trim() || null]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Trabajadores',
      `Trabajador ${nombre_completo.trim()} (${rut.trim()})`
    )

    const created = await query(
      `SELECT * FROM trabajadores WHERE id = ? AND is_deleted = FALSE`,
      [result.insertId]
    )
    return res.status(201).json({ ...created[0], cajas_asignadas: [] })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'RUT ya registrado' })
    }
    console.error('[createTrabajador]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function updateTrabajador(req, res) {
  try {
    const id = Number(req.params.id)
    const { rut, nombre_completo, cargo } = req.body || {}
    const existing = await query(
      `SELECT * FROM trabajadores WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Trabajador no encontrado' })

    await query(
      `UPDATE trabajadores
       SET rut = ?, nombre_completo = ?, cargo = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        rut?.trim() || existing[0].rut,
        nombre_completo?.trim() || existing[0].nombre_completo,
        cargo !== undefined ? cargo : existing[0].cargo,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Trabajadores',
      `Trabajador id=${id} actualizado`
    )

    const updated = await query(
      `SELECT * FROM trabajadores WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    return res.json(updated[0])
  } catch (err) {
    console.error('[updateTrabajador]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteTrabajador(req, res) {
  try {
    const id = Number(req.params.id)
    const result = await query(
      `UPDATE trabajadores SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Trabajador no encontrado' })
    }
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Trabajadores',
      `Soft delete trabajador id=${id}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteTrabajador]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/** Reemplaza las claves internas asignadas al trabajador */
async function setTrabajadorCajas(req, res) {
  try {
    const id = Number(req.params.id)
    const { claves } = req.body || {}
    if (!Array.isArray(claves)) {
      return res.status(400).json({ error: 'claves debe ser un array de strings' })
    }

    const existing = await query(
      `SELECT id FROM trabajadores WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Trabajador no encontrado' })

    // Asignación no es dato contable: se reemplaza el set (hard delete de filas N:M)
    await query(`DELETE FROM trabajador_cajas WHERE trabajador_id = ?`, [id])

    for (const clave of claves) {
      const c = String(clave).trim().toUpperCase()
      if (!c) continue
      await query(
        `INSERT INTO trabajador_cajas (trabajador_id, clave_interna) VALUES (?, ?)`,
        [id, c]
      )
    }

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Trabajadores',
      `Cajas asignadas a trabajador id=${id}: [${claves.join(', ')}]`
    )

    return res.json({ ok: true, cajas_asignadas: claves })
  } catch (err) {
    console.error('[setTrabajadorCajas]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/* ——— Usuarios ——— */

async function listUsuarios(req, res) {
  try {
    const rows = await query(
      `SELECT u.id, u.trabajador_id, u.rut, u.correo, u.rol, u.estado, u.created_at,
              t.nombre_completo AS trabajador_nombre, t.cargo
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id
       WHERE u.is_deleted = FALSE
       ORDER BY u.id DESC`
    )
    return res.json(rows)
  } catch (err) {
    console.error('[listUsuarios]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createUsuario(req, res) {
  try {
    const { trabajador_id, rut, correo, password, rol, estado } = req.body || {}
    if (!rut?.trim() || !correo?.trim() || !password || !rol) {
      return res.status(400).json({ error: 'rut, correo, password y rol son requeridos' })
    }

    // Solo Super Admins crean SUPER_ADMIN*
    if (
      (rol === ROLES.SUPER_ADMIN_DEV || rol === ROLES.SUPER_ADMIN) &&
      !SUPER_ADMINS.includes(req.user.rol)
    ) {
      return res.status(403).json({ error: 'No puedes crear ese rol' })
    }
    if (rol === ROLES.SUPER_ADMIN_DEV && req.user.rol !== ROLES.SUPER_ADMIN_DEV) {
      return res.status(403).json({ error: 'Solo Super Admin - Dev puede crear ese rol' })
    }

    const hash = await bcrypt.hash(password, 10)
    const result = await query(
      `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        trabajador_id || null,
        rut.trim(),
        correo.trim(),
        hash,
        rol,
        estado === 'inactivo' ? 'inactivo' : 'activo'
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Admin Users',
      `Usuario ${correo.trim()} rol=${rol}`
    )

    const created = await query(
      `SELECT u.id, u.trabajador_id, u.rut, u.correo, u.rol, u.estado, u.created_at,
              t.nombre_completo AS trabajador_nombre
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id
       WHERE u.id = ? AND u.is_deleted = FALSE`,
      [result.insertId]
    )
    const row = created[0] || {}
    // password solo en esta respuesta inicial (nunca se vuelve a exponer)
    return res.status(201).json({
      ...row,
      nombre: row.trabajador_nombre || adminFormNombre(req.body) || row.correo,
      password
    })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'RUT o correo ya registrado' })
    }
    console.error('[createUsuario]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

function adminFormNombre(body) {
  return body?.nombre?.trim() || body?.nombre_completo?.trim() || null
}

async function softDeleteUsuario(req, res) {
  try {
    const id = Number(req.params.id)
    if (id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
    }
    const result = await query(
      `UPDATE usuarios SET is_deleted = TRUE, deleted_at = NOW(), estado = 'inactivo'
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Admin Users',
      `Soft delete usuario id=${id}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteUsuario]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/* ——— Tarjetas ——— */

async function listTarjetas(req, res) {
  try {
    const rows = await query(
      `SELECT * FROM tarjetas_empresa WHERE is_deleted = FALSE ORDER BY id DESC`
    )
    return res.json(rows)
  } catch (err) {
    console.error('[listTarjetas]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createTarjeta(req, res) {
  try {
    const { alias, tipo, ultimos_digitos, banco, titular_nombre, estado } = req.body || {}
    if (!alias?.trim() || !tipo || !ultimos_digitos) {
      return res.status(400).json({ error: 'alias, tipo y ultimos_digitos son requeridos' })
    }

    const result = await query(
      `INSERT INTO tarjetas_empresa (alias, tipo, ultimos_digitos, banco, titular_nombre, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        alias.trim(),
        tipo,
        String(ultimos_digitos).slice(-4),
        banco || null,
        titular_nombre || null,
        estado === 'inactiva' ? 'inactiva' : 'activa'
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Tarjetas',
      `Tarjeta ${alias.trim()} (•••• ${String(ultimos_digitos).slice(-4)})`
    )

    const created = await query(
      `SELECT * FROM tarjetas_empresa WHERE id = ? AND is_deleted = FALSE`,
      [result.insertId]
    )
    return res.status(201).json(created[0])
  } catch (err) {
    console.error('[createTarjeta]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function updateTarjeta(req, res) {
  try {
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM tarjetas_empresa WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Tarjeta no encontrada' })

    const { alias, tipo, ultimos_digitos, banco, titular_nombre, estado } = req.body || {}

    await query(
      `UPDATE tarjetas_empresa
       SET alias = ?,
           tipo = ?,
           ultimos_digitos = ?,
           banco = ?,
           titular_nombre = ?,
           estado = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        alias?.trim() || existing[0].alias,
        tipo || existing[0].tipo,
        ultimos_digitos !== undefined
          ? String(ultimos_digitos).slice(-4)
          : existing[0].ultimos_digitos,
        banco !== undefined ? banco : existing[0].banco,
        titular_nombre !== undefined ? titular_nombre : existing[0].titular_nombre,
        estado || existing[0].estado,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Tarjetas',
      `Tarjeta id=${id} actualizada`
    )

    const updated = await query(
      `SELECT * FROM tarjetas_empresa WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    return res.json(updated[0])
  } catch (err) {
    console.error('[updateTarjeta]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteTarjeta(req, res) {
  try {
    const id = Number(req.params.id)
    const result = await query(
      `UPDATE tarjetas_empresa SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tarjeta no encontrada' })
    }
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Tarjetas',
      `Soft delete tarjeta id=${id}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteTarjeta]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/* ——— Audit logs (solo lectura) ——— */

async function listAuditLogs(req, res) {
  try {
    const { modulo, desde, hasta } = req.query
    const params = []
    let sql = `SELECT * FROM audit_logs WHERE 1=1`
    if (modulo) {
      sql += ' AND modulo = ?'
      params.push(modulo)
    }
    if (desde) {
      sql += ' AND created_at >= ?'
      params.push(desde)
    }
    if (hasta) {
      sql += ' AND created_at <= ?'
      params.push(hasta)
    }
    sql += ' ORDER BY created_at DESC LIMIT 500'
    const rows = await query(sql, params)
    return res.json(rows)
  } catch (err) {
    console.error('[listAuditLogs]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/* ——— Sync bidireccional Turnos ↔ Rendiciones ——— */

async function syncBidireccionalHandler(req, res) {
  try {
    const dryRun = Boolean(req.body?.dryRun || req.query?.dryRun)
    const { syncBidireccional } = require('../utils/syncBidireccional')
    const result = await syncBidireccional({ dryRun })

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Sync',
      `Sync bidireccional${dryRun ? ' dry-run' : ''} — errores: ${result.stats?.errores?.length || 0}`
    )

    return res.json(result)
  } catch (err) {
    console.error('[syncBidireccional]', err)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    })
  }
}

module.exports = {
  listTrabajadores,
  createTrabajador,
  updateTrabajador,
  softDeleteTrabajador,
  setTrabajadorCajas,
  listUsuarios,
  createUsuario,
  softDeleteUsuario,
  listTarjetas,
  createTarjeta,
  updateTarjeta,
  softDeleteTarjeta,
  listAuditLogs,
  syncBidireccionalHandler
}
