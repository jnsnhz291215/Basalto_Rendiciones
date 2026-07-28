const bcrypt = require('bcryptjs')
const { pool, query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { ROLES, SUPER_ADMINS, ADMINS } = require('../middlewares/role.middleware')
const {
  ensureTarjetaFechaDesactivacion,
  toDateOnly
} = require('../utils/tarjetaPago')

/** Normaliza RUT para comparar (sin puntos/guión). */
function cleanRutValue(rut) {
  return String(rut || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
}

async function loadCajasByTrabajador() {
  const cajas = await query(`SELECT trabajador_id, clave_interna FROM trabajador_cajas`)
  const byTrab = new Map()
  for (const row of cajas) {
    if (!byTrab.has(row.trabajador_id)) byTrab.set(row.trabajador_id, [])
    byTrab.get(row.trabajador_id).push(row.clave_interna)
  }
  return byTrab
}

/**
 * Resuelve claves de cajas desde body: acepta `caja_ids`, `claves` o `cajas`
 * (todas son claves_internas / groupKeys, no ids numéricos de filas caja).
 */
function parseCajaClaves(body) {
  const raw = body?.caja_ids ?? body?.claves ?? body?.cajas
  if (!Array.isArray(raw)) return null
  return raw
    .map((c) => String(c).trim().toUpperCase())
    .filter(Boolean)
}

async function replaceTrabajadorCajas(connOrNull, trabajadorId, claves) {
  const exec = connOrNull
    ? (sql, params) => connOrNull.execute(sql, params)
    : async (sql, params) => {
        await query(sql, params)
      }
  await exec(`DELETE FROM trabajador_cajas WHERE trabajador_id = ?`, [trabajadorId])
  for (const clave of claves) {
    await exec(
      `INSERT INTO trabajador_cajas (trabajador_id, clave_interna) VALUES (?, ?)`,
      [trabajadorId, clave]
    )
  }
}

/**
 * Personal = fichas de trabajadores + LEFT JOIN solo usuarios USER_RENDIDOR
 * (roles admin se gestionan en pestaña Admins; no mezclar aquí).
 * Preferencia de match: trabajador_id, fallback RUT normalizado.
 * `es_admin` indica ficha ligada a cuenta admin (mismo trabajador_id o RUT).
 */
async function buildPersonalList() {
  const trabajadores = await query(
    `SELECT * FROM trabajadores WHERE is_deleted = FALSE ORDER BY nombre_completo ASC`
  )
  const usuarios = await query(
    `SELECT id, trabajador_id, rut, correo, rol, estado
     FROM usuarios
     WHERE is_deleted = FALSE AND rol = ?`,
    [ROLES.USER_RENDIDOR]
  )
  const admins = await query(
    `SELECT id, trabajador_id, rut, rol
     FROM usuarios
     WHERE is_deleted = FALSE AND rol IN (?, ?, ?)`,
    [ROLES.SUPER_ADMIN_DEV, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAJA]
  )
  const byTrabId = new Map()
  const byRut = new Map()
  for (const u of usuarios) {
    if (u.trabajador_id != null) byTrabId.set(Number(u.trabajador_id), u)
    const r = cleanRutValue(u.rut)
    if (r && !byRut.has(r)) byRut.set(r, u)
  }
  const adminByTrabId = new Map()
  const adminByRut = new Map()
  for (const a of admins) {
    if (a.trabajador_id != null) adminByTrabId.set(Number(a.trabajador_id), a.rol)
    const r = cleanRutValue(a.rut)
    if (r && !adminByRut.has(r)) adminByRut.set(r, a.rol)
  }
  const byTrabCajas = await loadCajasByTrabajador()

  return trabajadores.map((t) => {
    const u = byTrabId.get(Number(t.id)) || byRut.get(cleanRutValue(t.rut)) || null
    const rutClean = cleanRutValue(t.rut)
    const adminRol = adminByTrabId.get(Number(t.id)) || adminByRut.get(rutClean) || null
    const esAdmin = Boolean(adminRol)
    return {
      id: t.id,
      rut: t.rut,
      nombre_completo: t.nombre_completo,
      cargo: t.cargo,
      created_at: t.created_at,
      cajas_asignadas: byTrabCajas.get(t.id) || [],
      usuario_id: u?.id ?? null,
      correo: u?.correo ?? null,
      usuario_rol: u?.rol ?? null,
      usuario_estado: u?.estado ?? null,
      // Acceso sistema: activo | inactivo | null (sin usuario rendidor)
      acceso_sistema: u ? (u.estado === 'inactivo' ? 'inactivo' : 'activo') : null,
      es_admin: esAdmin,
      admin_rol: adminRol
    }
  })
}

async function findAdminForTrabajador(trabajador) {
  const byId = await query(
    `SELECT id, rol FROM usuarios
     WHERE is_deleted = FALSE AND rol IN (?, ?, ?) AND trabajador_id = ?
     LIMIT 1`,
    [ROLES.SUPER_ADMIN_DEV, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAJA, trabajador.id]
  )
  if (byId[0]) return byId[0]
  const rutClean = cleanRutValue(trabajador.rut)
  if (!rutClean) return null
  const byRut = await query(
    `SELECT id, rol FROM usuarios
     WHERE is_deleted = FALSE AND rol IN (?, ?, ?)
       AND REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
     LIMIT 1`,
    [ROLES.SUPER_ADMIN_DEV, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAJA, rutClean]
  )
  return byRut[0] || null
}

async function getPersonalByTrabajadorId(id) {
  const list = await buildPersonalList()
  return list.find((p) => Number(p.id) === Number(id)) || null
}

/* --- Trabajadores --- */

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
    if (!SUPER_ADMINS.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Solo Super Admin puede eliminar fichas'
      })
    }
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

/* --- Usuarios --- */

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

    let trabajadorId = trabajador_id || null
    const nombre = adminFormNombre(req.body)
    // Nombre en UI vive en trabajadores; si crean admin con nombre y sin ficha, asegurarla
    if (!trabajadorId && nombre && rut?.trim()) {
      const rutClean = String(rut).replace(/[^0-9kK]/g, '').toUpperCase()
      const existingTrab = await query(
        `SELECT id FROM trabajadores
         WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
           AND is_deleted = FALSE
         LIMIT 1`,
        [rutClean]
      )
      if (existingTrab[0]) {
        trabajadorId = existingTrab[0].id
      } else {
        const trabResult = await query(
          `INSERT INTO trabajadores (rut, nombre_completo, cargo) VALUES (?, ?, ?)`,
          [rutClean || rut.trim(), nombre, null]
        )
        trabajadorId = trabResult.insertId
      }
    }

    const hash = await bcrypt.hash(password, 10)
    const result = await query(
      `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        trabajadorId,
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
      nombre: row.trabajador_nombre || nombre || row.correo,
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

async function updateUsuario(req, res) {
  try {
    const id = Number(req.params.id)
    const { correo, rol, estado, password } = req.body || {}
    const nombre = adminFormNombre(req.body)

    const existing = await query(
      `SELECT u.*, t.nombre_completo AS trabajador_nombre
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id
       WHERE u.id = ? AND u.is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Usuario no encontrado' })

    const row = existing[0]
    const nextRol = rol || row.rol
    const isTargetAdmin = [
      ROLES.SUPER_ADMIN_DEV,
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN_CAJA
    ].includes(row.rol)

    // Solo Super Admins pueden editar cuentas de administradores
    if (isTargetAdmin && !SUPER_ADMINS.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No puedes modificar administradores' })
    }

    // No permitir desactivarse a sí mismo
    if (
      id === Number(req.user.id) &&
      estado === 'inactivo' &&
      row.estado === 'activo'
    ) {
      return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' })
    }

    // Mismas restricciones de creación al asignar roles admin
    if (nextRol !== row.rol) {
      if (
        (nextRol === ROLES.SUPER_ADMIN_DEV || nextRol === ROLES.SUPER_ADMIN) &&
        !SUPER_ADMINS.includes(req.user.rol)
      ) {
        return res.status(403).json({ error: 'No puedes asignar ese rol' })
      }
      if (nextRol === ROLES.SUPER_ADMIN_DEV && req.user.rol !== ROLES.SUPER_ADMIN_DEV) {
        return res.status(403).json({ error: 'Solo Super Admin - Dev puede asignar ese rol' })
      }
      if (
        [ROLES.SUPER_ADMIN_DEV, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAJA].includes(nextRol) &&
        !SUPER_ADMINS.includes(req.user.rol)
      ) {
        return res.status(403).json({ error: 'No puedes cambiar roles de administrador' })
      }
    }

    let trabajadorId = row.trabajador_id
    if (nombre) {
      if (trabajadorId) {
        await query(
          `UPDATE trabajadores SET nombre_completo = ? WHERE id = ? AND is_deleted = FALSE`,
          [nombre, trabajadorId]
        )
      } else if (row.rut) {
        const rutClean = String(row.rut).replace(/[^0-9kK]/g, '').toUpperCase()
        const existingTrab = await query(
          `SELECT id FROM trabajadores
           WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
             AND is_deleted = FALSE
           LIMIT 1`,
          [rutClean]
        )
        if (existingTrab[0]) {
          trabajadorId = existingTrab[0].id
          await query(
            `UPDATE trabajadores SET nombre_completo = ? WHERE id = ? AND is_deleted = FALSE`,
            [nombre, trabajadorId]
          )
        } else {
          const trabResult = await query(
            `INSERT INTO trabajadores (rut, nombre_completo, cargo) VALUES (?, ?, ?)`,
            [rutClean || row.rut, nombre, null]
          )
          trabajadorId = trabResult.insertId
        }
      }
    }

    let passwordHash = row.password_hash
    if (password && String(password).trim()) {
      passwordHash = await bcrypt.hash(String(password).trim(), 10)
    }

    const nextEstado =
      estado === 'inactivo' || estado === 'activo'
        ? estado
        : row.estado

    await query(
      `UPDATE usuarios
       SET correo = ?, rol = ?, estado = ?, password_hash = ?, trabajador_id = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        correo?.trim() || row.correo,
        nextRol,
        nextEstado,
        passwordHash,
        trabajadorId,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Admin Users',
      `Usuario id=${id} actualizado`
    )

    const updated = await query(
      `SELECT u.id, u.trabajador_id, u.rut, u.correo, u.rol, u.estado, u.created_at,
              t.nombre_completo AS trabajador_nombre, t.cargo
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id
       WHERE u.id = ? AND u.is_deleted = FALSE`,
      [id]
    )
    const out = updated[0] || {}
    return res.json({
      ...out,
      nombre: out.trabajador_nombre || nombre || out.correo
    })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Correo ya registrado' })
    }
    console.error('[updateUsuario]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteUsuario(req, res) {
  try {
    if (!SUPER_ADMINS.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Solo Super Admin puede eliminar usuarios'
      })
    }
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

/**
 * Reinicia contraseña (solo Super Admin / Super Admin Dev).
 * Body opcional: { password?, mode?: 'rut'|'manual' }
 */
async function resetPasswordUsuario(req, res) {
  try {
    if (!SUPER_ADMINS.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Solo Super Admin puede reiniciar contraseñas'
      })
    }
    const id = Number(req.params.id)
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'No puedes reiniciar tu propia contraseña desde este endpoint'
      })
    }

    const rows = await query(
      `SELECT u.id, u.rut, u.correo, u.rol, u.password_hash,
              t.nombre_completo AS trabajador_nombre
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id AND t.is_deleted = FALSE
       WHERE u.id = ? AND u.is_deleted = FALSE`,
      [id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })

    const body = req.body || {}
    let passwordPlain = String(body.password || '').trim()
    if (!passwordPlain) {
      // Por defecto: clave temporal = RUT limpio
      passwordPlain = cleanRutValue(rows[0].rut)
    }
    if (!passwordPlain || passwordPlain.length < 4) {
      return res.status(400).json({ error: 'No se pudo generar una contraseña válida' })
    }

    const hash = await bcrypt.hash(passwordPlain, 10)
    await query(
      `UPDATE usuarios SET password_hash = ? WHERE id = ? AND is_deleted = FALSE`,
      [hash, id]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Usuarios',
      `Reinicio de contraseña usuario id=${id}`
    )

    return res.json({
      ok: true,
      id: rows[0].id,
      rut: rows[0].rut,
      correo: rows[0].correo,
      rol: rows[0].rol,
      nombre: rows[0].trabajador_nombre || rows[0].correo,
      password: passwordPlain
    })
  } catch (err) {
    console.error('[resetPasswordUsuario]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/* --- Personal (trabajadores + usuarios rendidores unificados) --- */

async function listPersonal(req, res) {
  try {
    return res.json(await buildPersonalList())
  } catch (err) {
    console.error('[listPersonal]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createPersonal(req, res) {
  const conn = await pool.getConnection()
  try {
    const body = req.body || {}
    const rutClean = cleanRutValue(body.rut)
    const nombre = sanitizeTextoLibre(body.nombre_completo || body.nombre) || ''
    const cargo = sanitizeTextoLibre(body.cargo)
    const crearUsuario = Boolean(body.crear_usuario)
    const cajaClaves = parseCajaClaves(body)

    if (!rutClean || !nombre) {
      return res.status(400).json({ error: 'rut y nombre_completo son requeridos' })
    }

    let passwordPlain = null
    let rolUsuario = ROLES.USER_RENDIDOR
    if (crearUsuario) {
      const correo = String(body.correo || '').trim()
      const password = body.password
      rolUsuario = body.rol || ROLES.USER_RENDIDOR
      if (!correo || !password) {
        return res.status(400).json({ error: 'correo y password son requeridos para crear usuario' })
      }
      // En Personal solo se crean rendidores (admins van a pestaña Admins)
      if (ADMINS.includes(rolUsuario)) {
        return res.status(400).json({
          error: 'No se pueden crear roles admin desde Personal; use Admins'
        })
      }
      if (rolUsuario !== ROLES.USER_RENDIDOR) {
        return res.status(400).json({ error: 'Rol no permitido en Personal' })
      }
      const adminExistente = await findAdminForTrabajador({ id: null, rut: rutClean })
      if (adminExistente) {
        return res.status(400).json({
          error:
            'Esta persona ya tiene cuenta de administrador; el acceso se gestiona en Admins'
        })
      }
      passwordPlain = String(password)
    }

    await conn.beginTransaction()

    const [trabResult] = await conn.execute(
      `INSERT INTO trabajadores (rut, nombre_completo, cargo) VALUES (?, ?, ?)`,
      [rutClean, nombre, cargo]
    )
    const trabajadorId = trabResult.insertId

    if (cajaClaves) {
      await replaceTrabajadorCajas(conn, trabajadorId, cajaClaves)
    }

    let usuarioRow = null
    if (crearUsuario) {
      const hash = await bcrypt.hash(passwordPlain, 10)
      const [userResult] = await conn.execute(
        `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          trabajadorId,
          rutClean,
          String(body.correo).trim(),
          hash,
          rolUsuario,
          body.estado === 'inactivo' ? 'inactivo' : 'activo'
        ]
      )
      const [createdUsers] = await conn.execute(
        `SELECT id, trabajador_id, rut, correo, rol, estado, created_at
         FROM usuarios WHERE id = ? AND is_deleted = FALSE`,
        [userResult.insertId]
      )
      usuarioRow = createdUsers[0] || null
    }

    await conn.commit()

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Personal',
      `Personal ${nombre} (${rutClean})${crearUsuario ? ' + usuario' : ''}`
    )

    const personal = await getPersonalByTrabajadorId(trabajadorId)
    return res.status(201).json({
      ...personal,
      ...(usuarioRow && passwordPlain
        ? { password: passwordPlain, usuario: { ...usuarioRow, password: passwordPlain } }
        : {})
    })
  } catch (err) {
    try {
      await conn.rollback()
    } catch (_) {
      /* ignore */
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'RUT o correo ya registrado' })
    }
    console.error('[createPersonal]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  } finally {
    conn.release()
  }
}

async function findTrabajadorByIdOrRut(idOrRut) {
  const raw = String(idOrRut || '').trim()
  if (!raw) return null
  if (/^\d+$/.test(raw)) {
    const byId = await query(
      `SELECT * FROM trabajadores WHERE id = ? AND is_deleted = FALSE`,
      [Number(raw)]
    )
    if (byId[0]) return byId[0]
  }
  const rutClean = cleanRutValue(raw)
  if (!rutClean) return null
  const byRut = await query(
    `SELECT * FROM trabajadores
     WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
       AND is_deleted = FALSE
     LIMIT 1`,
    [rutClean]
  )
  return byRut[0] || null
}

async function findRendidorForTrabajador(trabajador) {
  const byId = await query(
    `SELECT * FROM usuarios
     WHERE is_deleted = FALSE AND rol = ? AND trabajador_id = ?
     LIMIT 1`,
    [ROLES.USER_RENDIDOR, trabajador.id]
  )
  if (byId[0]) return byId[0]
  const rutClean = cleanRutValue(trabajador.rut)
  if (!rutClean) return null
  const byRut = await query(
    `SELECT * FROM usuarios
     WHERE is_deleted = FALSE AND rol = ?
       AND REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
     LIMIT 1`,
    [ROLES.USER_RENDIDOR, rutClean]
  )
  return byRut[0] || null
}

async function updatePersonal(req, res) {
  const conn = await pool.getConnection()
  try {
    const existing = await findTrabajadorByIdOrRut(req.params.idOrRut)
    if (!existing) return res.status(404).json({ error: 'Personal no encontrado' })

    const body = req.body || {}
    const nextRut =
      body.rut !== undefined ? cleanRutValue(body.rut) || existing.rut : cleanRutValue(existing.rut)
    const nextNombre =
      body.nombre_completo !== undefined || body.nombre !== undefined
        ? sanitizeTextoLibre(body.nombre_completo || body.nombre) || ''
        : existing.nombre_completo
    const nextCargo =
      body.cargo !== undefined
        ? sanitizeTextoLibre(body.cargo)
        : existing.cargo
    const cajaClaves = parseCajaClaves(body)
    const crearUsuario = Boolean(body.crear_usuario)
    const wantsUserUpdate =
      body.correo !== undefined ||
      body.rol !== undefined ||
      body.estado !== undefined ||
      (body.password && String(body.password).trim())

    if (!nextNombre) {
      return res.status(400).json({ error: 'nombre_completo es requerido' })
    }

    await conn.beginTransaction()

    await conn.execute(
      `UPDATE trabajadores
       SET rut = ?, nombre_completo = ?, cargo = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [nextRut, nextNombre, nextCargo, existing.id]
    )

    if (cajaClaves) {
      await replaceTrabajadorCajas(conn, existing.id, cajaClaves)
    }

    let linkedUser = await findRendidorForTrabajador({ ...existing, rut: nextRut })
    let passwordPlain = null

    if (!linkedUser && crearUsuario) {
      const adminExistente = await findAdminForTrabajador({ ...existing, rut: nextRut })
      if (adminExistente) {
        await conn.rollback()
        return res.status(400).json({
          error:
            'Esta persona ya tiene cuenta de administrador; el acceso se gestiona en Admins'
        })
      }
      const correo = String(body.correo || '').trim()
      const password = body.password
      if (!correo || !password) {
        await conn.rollback()
        return res.status(400).json({ error: 'correo y password son requeridos para crear usuario' })
      }
      const rolUsuario = body.rol || ROLES.USER_RENDIDOR
      if (ADMINS.includes(rolUsuario) || rolUsuario !== ROLES.USER_RENDIDOR) {
        await conn.rollback()
        return res.status(400).json({ error: 'Rol no permitido en Personal' })
      }
      passwordPlain = String(password)
      const hash = await bcrypt.hash(passwordPlain, 10)
      await conn.execute(
        `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          existing.id,
          nextRut,
          correo,
          hash,
          ROLES.USER_RENDIDOR,
          body.estado === 'inactivo' ? 'inactivo' : 'activo'
        ]
      )
    } else if (linkedUser && (crearUsuario || wantsUserUpdate)) {
      // Switch off no borra el usuario; solo actualiza si envían campos de acceso
      let passwordHash = linkedUser.password_hash
      if (body.password && String(body.password).trim()) {
        passwordPlain = String(body.password).trim()
        passwordHash = await bcrypt.hash(passwordPlain, 10)
      }
      const nextEstado =
        body.estado === 'inactivo' || body.estado === 'activo'
          ? body.estado
          : linkedUser.estado
      const nextCorreo =
        body.correo !== undefined ? String(body.correo).trim() || linkedUser.correo : linkedUser.correo

      await conn.execute(
        `UPDATE usuarios
         SET correo = ?, estado = ?, password_hash = ?, trabajador_id = ?, rut = ?
         WHERE id = ? AND is_deleted = FALSE`,
        [nextCorreo, nextEstado, passwordHash, existing.id, nextRut, linkedUser.id]
      )
    }

    await conn.commit()

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Personal',
      `Personal id=${existing.id} actualizado`
    )

    const personal = await getPersonalByTrabajadorId(existing.id)
    return res.json({
      ...personal,
      ...(passwordPlain ? { password: passwordPlain } : {})
    })
  } catch (err) {
    try {
      await conn.rollback()
    } catch (_) {
      /* ignore */
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'RUT o correo ya registrado' })
    }
    console.error('[updatePersonal]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  } finally {
    conn.release()
  }
}

/* --- Tarjetas --- */

function todayLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Texto libre: letras, números, espacios, / y - ; máx. 100. */
function sanitizeTextoLibre(value) {
  if (value == null) return null
  const cleaned = String(value)
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9 /\-]/g, '')
    .slice(0, 100)
    .trim()
  return cleaned || null
}

function sanitizeTitularNombre(value) {
  return sanitizeTextoLibre(value)
}

async function listTarjetas(req, res) {
  try {
    await ensureTarjetaFechaDesactivacion()
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
    await ensureTarjetaFechaDesactivacion()
    const { alias, tipo, ultimos_digitos, banco, titular_nombre, estado } = req.body || {}
    if (!alias?.trim() || !tipo || !ultimos_digitos) {
      return res.status(400).json({ error: 'alias, tipo y ultimos_digitos son requeridos' })
    }

    const nextEstado = estado === 'inactiva' ? 'inactiva' : 'activa'
    const fechaDesactivacion = nextEstado === 'inactiva' ? todayLocalISO() : null

    const result = await query(
      `INSERT INTO tarjetas_empresa
        (alias, tipo, ultimos_digitos, banco, titular_nombre, estado, fecha_desactivacion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        alias.trim(),
        tipo,
        String(ultimos_digitos).slice(-4),
        banco || null,
        sanitizeTitularNombre(titular_nombre),
        nextEstado,
        fechaDesactivacion
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
    await ensureTarjetaFechaDesactivacion()
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM tarjetas_empresa WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Tarjeta no encontrada' })

    const { alias, tipo, ultimos_digitos, banco, titular_nombre, estado } = req.body || {}
    const prev = existing[0]
    const nextEstado =
      estado === 'inactiva' || estado === 'activa' ? estado : prev.estado

    let fechaDesactivacion = toDateOnly(prev.fecha_desactivacion)
    if (nextEstado === 'inactiva' && prev.estado !== 'inactiva') {
      fechaDesactivacion = todayLocalISO()
    } else if (nextEstado === 'activa') {
      fechaDesactivacion = null
    }

    await query(
      `UPDATE tarjetas_empresa
       SET alias = ?,
           tipo = ?,
           ultimos_digitos = ?,
           banco = ?,
           titular_nombre = ?,
           estado = ?,
           fecha_desactivacion = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        alias?.trim() || prev.alias,
        tipo || prev.tipo,
        ultimos_digitos !== undefined
          ? String(ultimos_digitos).slice(-4)
          : prev.ultimos_digitos,
        banco !== undefined ? banco : prev.banco,
        titular_nombre !== undefined
          ? sanitizeTitularNombre(titular_nombre)
          : prev.titular_nombre,
        nextEstado,
        fechaDesactivacion,
        id
      ]
    )

    const accion =
      nextEstado !== prev.estado
        ? nextEstado === 'inactiva'
          ? `Tarjeta id=${id} desactivada (${fechaDesactivacion})`
          : `Tarjeta id=${id} reactivada`
        : `Tarjeta id=${id} actualizada`

    await registrarAuditoria(req.user.id, req.user.nombre, 'MODIFICAR', 'Tarjetas', accion)

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
    if (!SUPER_ADMINS.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Solo Super Admin puede eliminar tarjetas'
      })
    }
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

/* --- Audit logs (solo lectura) --- */

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

/* --- Sync bidireccional Turnos ↔ Rendiciones --- */

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
      `Sync bidireccional${dryRun ? ' dry-run' : ''} - errores: ${result.stats?.errores?.length || 0}`
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
  updateUsuario,
  softDeleteUsuario,
  resetPasswordUsuario,
  listPersonal,
  createPersonal,
  updatePersonal,
  listTarjetas,
  createTarjeta,
  updateTarjeta,
  softDeleteTarjeta,
  listAuditLogs,
  syncBidireccionalHandler
}
