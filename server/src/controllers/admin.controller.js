const bcrypt = require('bcryptjs')
const { pool, query } = require('../config/db')
const {
  registrarAuditoria,
  identificarEntidad,
  pushCambio,
  pushPasswordReset,
  formatearDetalleCambio
} = require('../utils/audit')
const { ROLES, SUPER_ADMINS, ADMINS } = require('../middlewares/role.middleware')
const {
  ensureTarjetaFechaDesactivacion,
  toDateOnly
} = require('../utils/tarjetaPago')
const {
  ensureCuentasBancoSchema,
  upsertCuentaBanco,
  resolveCentroCobro,
  normalizeNumeroCuenta,
  normalizeBancoNombre
} = require('../utils/ensureCuentasBancoSchema')
const { syncPasswordHashToCentral } = require('../utils/centralPasswordSync')
const {
  provisionCentralUsuario,
  syncActivoToCentral,
  syncProfileToCentral,
  deactivateCentralUsuario,
} = require('../utils/centralIdentitySync')
const { blocksLocalUsuarioCrud, identityCentralOnlyResponse } = require('../utils/identityCentralGuard')

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

    const nextRut = rut?.trim() || existing[0].rut
    const nextNombre = nombre_completo?.trim() || existing[0].nombre_completo
    const nextCargo = cargo !== undefined ? cargo : existing[0].cargo

    const cambios = []
    pushCambio(cambios, 'rut', existing[0].rut, nextRut)
    pushCambio(cambios, 'nombre', existing[0].nombre_completo, nextNombre)
    pushCambio(cambios, 'cargo', existing[0].cargo, nextCargo)

    await query(
      `UPDATE trabajadores
       SET rut = ?, nombre_completo = ?, cargo = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [nextRut, nextNombre, nextCargo, id]
    )

    const identidad = identificarEntidad('Trabajador', {
      nombre: nextNombre,
      rut: nextRut,
      id
    })
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Trabajadores',
      formatearDetalleCambio(identidad, cambios)
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
    const rows = await query(
      `SELECT id, rut, nombre_completo FROM trabajadores WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!rows[0]) {
      return res.status(404).json({ error: 'Trabajador no encontrado' })
    }
    await query(
      `UPDATE trabajadores SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    const identidad = identificarEntidad('Trabajador', {
      nombre: rows[0].nombre_completo,
      rut: rows[0].rut,
      id
    })
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Trabajadores',
      `Soft delete: ${identidad}`
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
      `SELECT id, rut, nombre_completo FROM trabajadores WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Trabajador no encontrado' })

    const prevRows = await query(
      `SELECT clave_interna FROM trabajador_cajas WHERE trabajador_id = ?`,
      [id]
    )
    const prevClaves = prevRows.map((r) => r.clave_interna)
    const nextClaves = claves
      .map((clave) => String(clave).trim().toUpperCase())
      .filter(Boolean)

    // Asignación no es dato contable: se reemplaza el set (hard delete de filas N:M)
    await query(`DELETE FROM trabajador_cajas WHERE trabajador_id = ?`, [id])

    for (const c of nextClaves) {
      await query(
        `INSERT INTO trabajador_cajas (trabajador_id, clave_interna) VALUES (?, ?)`,
        [id, c]
      )
    }

    const cambios = []
    pushCambio(cambios, 'cajas', prevClaves, nextClaves)
    const identidad = identificarEntidad('Trabajador', {
      nombre: existing[0].nombre_completo,
      rut: existing[0].rut,
      id
    })
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Trabajadores',
      formatearDetalleCambio(identidad, cambios)
    )

    return res.json({ ok: true, cajas_asignadas: nextClaves })
  } catch (err) {
    console.error('[setTrabajadorCajas]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/* --- Usuarios --- */

async function listUsuarios(req, res) {
  try {
    const params = []
    let sql = `SELECT u.id, u.trabajador_id, u.rut, u.correo, u.rol, u.estado, u.persona_confianza, u.created_at,
              t.nombre_completo AS trabajador_nombre, t.cargo
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id
       WHERE u.is_deleted = FALSE`
    // Solo Super Admins pueden listar cuentas de administradores
    if (!SUPER_ADMINS.includes(req.user.rol)) {
      sql += ' AND u.rol = ?'
      params.push(ROLES.USER_RENDIDOR)
    }
    sql += ' ORDER BY u.id DESC'
    const rows = await query(sql, params)
    return res.json(rows)
  } catch (err) {
    console.error('[listUsuarios]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createUsuario(req, res) {
  if (blocksLocalUsuarioCrud()) return identityCentralOnlyResponse(res)
  try {
    const { trabajador_id, rut, correo, password, rol, estado, persona_confianza } = req.body || {}
    if (!rut?.trim() || !correo?.trim() || !password || !rol) {
      return res.status(400).json({ error: 'rut, correo, password y rol son requeridos' })
    }

    // Super Admin - Dev es único y no se puede crear vía API
    if (rol === ROLES.SUPER_ADMIN_DEV) {
      return res.status(403).json({
        error: 'No se puede crear el rol Super Admin - Dev'
      })
    }
    // Solo Super Admins pueden crear cuentas de administrador
    if (ADMINS.includes(rol) && !SUPER_ADMINS.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No puedes crear administradores' })
    }
    // Solo Super Admin - Dev crea SUPER_ADMIN; Super Admin crea ADMIN_CAJA
    if (rol === ROLES.SUPER_ADMIN && req.user.rol !== ROLES.SUPER_ADMIN_DEV) {
      return res.status(403).json({ error: 'No puedes crear ese rol' })
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

    const personaConfianza =
      SUPER_ADMINS.includes(req.user.rol) &&
      (persona_confianza === true || persona_confianza === 1 || persona_confianza === '1')
        ? 1
        : 0

    const hash = await bcrypt.hash(password, 10)
    const result = await query(
      `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado, persona_confianza)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        trabajadorId,
        rut.trim(),
        correo.trim(),
        hash,
        rol,
        estado === 'inactivo' ? 'inactivo' : 'activo',
        personaConfianza
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Admin Users',
      `${identificarEntidad('Usuario', {
        correo: correo.trim(),
        nombre,
        rut: rut.trim()
      })} rol=${rol} estado=${estado === 'inactivo' ? 'inactivo' : 'activo'}`
    )

    const created = await query(
      `SELECT u.id, u.trabajador_id, u.rut, u.correo, u.rol, u.estado, u.persona_confianza, u.created_at,
              t.nombre_completo AS trabajador_nombre
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id
       WHERE u.id = ? AND u.is_deleted = FALSE`,
      [result.insertId]
    )
    const row = created[0] || {}
    await provisionCentralUsuario({
      rutLimpio: rut.trim(),
      nombre: nombre || row.trabajador_nombre || correo.trim(),
      correo: correo.trim(),
      passwordHash: hash,
      rendRol: rol,
      mustChangePassword: false,
      activo: estado !== 'inactivo',
    })
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
  if (blocksLocalUsuarioCrud()) return identityCentralOnlyResponse(res)
  try {
    const id = Number(req.params.id)
    const { correo, rol, estado, password, persona_confianza } = req.body || {}
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
      // Super Admin - Dev es único: no promover ni degradar ese rol vía API
      if (nextRol === ROLES.SUPER_ADMIN_DEV || row.rol === ROLES.SUPER_ADMIN_DEV) {
        return res.status(403).json({
          error: 'El rol Super Admin - Dev no se puede asignar ni modificar'
        })
      }
      if (nextRol === ROLES.SUPER_ADMIN && req.user.rol !== ROLES.SUPER_ADMIN_DEV) {
        return res.status(403).json({ error: 'No puedes asignar ese rol' })
      }
      if (
        [ROLES.SUPER_ADMIN, ROLES.ADMIN_CAJA].includes(nextRol) &&
        !SUPER_ADMINS.includes(req.user.rol)
      ) {
        return res.status(403).json({ error: 'No puedes cambiar roles de administrador' })
      }
    }

    let trabajadorId = row.trabajador_id
    const prevNombre = row.trabajador_nombre || null
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
    const passwordChanged = Boolean(password && String(password).trim())
    if (passwordChanged) {
      passwordHash = await bcrypt.hash(String(password).trim(), 10)
    }

    const nextCorreo = correo?.trim() || row.correo
    const nextEstado =
      estado === 'inactivo' || estado === 'activo'
        ? estado
        : row.estado
    const nextNombre = nombre || prevNombre
    let nextPersonaConfianza = row.persona_confianza ? 1 : 0
    if (persona_confianza !== undefined) {
      if (!SUPER_ADMINS.includes(req.user.rol)) {
        return res.status(403).json({ error: 'No puedes asignar el permiso de persona de confianza' })
      }
      nextPersonaConfianza =
        persona_confianza === true || persona_confianza === 1 || persona_confianza === '1'
          ? 1
          : 0
    }

    const cambios = []
    pushCambio(cambios, 'correo', row.correo, nextCorreo)
    pushCambio(cambios, 'rol', row.rol, nextRol)
    pushCambio(cambios, 'estado', row.estado, nextEstado)
    pushCambio(cambios, 'nombre', prevNombre, nextNombre)
    pushCambio(
      cambios,
      'persona_confianza',
      row.persona_confianza ? 1 : 0,
      nextPersonaConfianza
    )
    if (passwordChanged) pushPasswordReset(cambios)

    await query(
      `UPDATE usuarios
       SET correo = ?, rol = ?, estado = ?, password_hash = ?, trabajador_id = ?, persona_confianza = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        nextCorreo,
        nextRol,
        nextEstado,
        passwordHash,
        trabajadorId,
        nextPersonaConfianza,
        id
      ]
    )

    const identidad = identificarEntidad('Usuario', {
      correo: nextCorreo,
      nombre: nextNombre,
      rut: row.rut,
      id
    })
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Admin Users',
      formatearDetalleCambio(identidad, cambios)
    )

    const updated = await query(
      `SELECT u.id, u.trabajador_id, u.rut, u.correo, u.rol, u.estado, u.persona_confianza, u.created_at,
              t.nombre_completo AS trabajador_nombre, t.cargo
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id
       WHERE u.id = ? AND u.is_deleted = FALSE`,
      [id]
    )
    const out = updated[0] || {}
    await syncProfileToCentral({
      rutLimpio: row.rut,
      nombre: out.trabajador_nombre || nombre || out.correo,
      correo: nextCorreo,
    })
    if (passwordChanged) {
      await syncPasswordHashToCentral({
        rutLimpio: row.rut,
        passwordHash,
        mustChangePassword: false,
        clearGrace: true,
      })
    }
    if (nextEstado !== row.estado) {
      await syncActivoToCentral({ rutLimpio: row.rut, activo: nextEstado === 'activo' })
    }
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
  if (blocksLocalUsuarioCrud()) return identityCentralOnlyResponse(res)
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
    const rows = await query(
      `SELECT u.id, u.rut, u.correo, u.rol,
              t.nombre_completo AS trabajador_nombre
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id AND t.is_deleted = FALSE
       WHERE u.id = ? AND u.is_deleted = FALSE`,
      [id]
    )
    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    await query(
      `UPDATE usuarios SET is_deleted = TRUE, deleted_at = NOW(), estado = 'inactivo'
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    const identidad = identificarEntidad('Usuario', {
      correo: rows[0].correo,
      nombre: rows[0].trabajador_nombre,
      rut: rows[0].rut,
      id
    })
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Admin Users',
      `Soft delete: ${identidad} (rol=${rows[0].rol})`
    )
    await deactivateCentralUsuario({ rutLimpio: rows[0].rut })
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
  if (blocksLocalUsuarioCrud()) return identityCentralOnlyResponse(res)
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
      `UPDATE usuarios
       SET password_hash = ?,
           must_change_password = 1,
           temp_password_grace_started_at = NULL
       WHERE id = ? AND is_deleted = FALSE`,
      [hash, id]
    )

    await syncPasswordHashToCentral({
      rutLimpio: rows[0].rut,
      passwordHash: hash,
      mustChangePassword: true,
      clearGrace: true,
    })

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Usuarios',
      formatearDetalleCambio(
        identificarEntidad('Usuario', {
          correo: rows[0].correo,
          nombre: rows[0].trabajador_nombre,
          rut: rows[0].rut,
          id
        }),
        [{ texto: 'contraseña restablecida' }]
      )
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
    if (crearUsuario && blocksLocalUsuarioCrud()) {
      return identityCentralOnlyResponse(res)
    }
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
    let passwordHashForCentral = null
    if (crearUsuario) {
      passwordHashForCentral = await bcrypt.hash(passwordPlain, 10)
      const [userResult] = await conn.execute(
        `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          trabajadorId,
          rutClean,
          String(body.correo).trim(),
          passwordHashForCentral,
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

    if (crearUsuario && usuarioRow) {
      await provisionCentralUsuario({
        rutLimpio: rutClean,
        nombre,
        correo: String(body.correo).trim(),
        passwordHash: passwordHashForCentral,
        rendRol: rolUsuario,
        mustChangePassword: false,
        activo: body.estado !== 'inactivo',
      })
    }

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
    if (crearUsuario && blocksLocalUsuarioCrud()) {
      return identityCentralOnlyResponse(res)
    }
    const wantsUserUpdate =
      body.correo !== undefined ||
      body.rol !== undefined ||
      body.estado !== undefined ||
      (body.password && String(body.password).trim())

    if (wantsUserUpdate && blocksLocalUsuarioCrud()) {
      return identityCentralOnlyResponse(res)
    }

    if (!nextNombre) {
      return res.status(400).json({ error: 'nombre_completo es requerido' })
    }

    const prevCajasRows = await query(
      `SELECT clave_interna FROM trabajador_cajas WHERE trabajador_id = ?`,
      [existing.id]
    )
    const prevCajas = prevCajasRows.map((r) => r.clave_interna)
    let linkedUser = await findRendidorForTrabajador(existing)

    const cambios = []
    pushCambio(cambios, 'rut', existing.rut, nextRut)
    pushCambio(cambios, 'nombre', existing.nombre_completo, nextNombre)
    pushCambio(cambios, 'cargo', existing.cargo, nextCargo)

    await conn.beginTransaction()

    await conn.execute(
      `UPDATE trabajadores
       SET rut = ?, nombre_completo = ?, cargo = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [nextRut, nextNombre, nextCargo, existing.id]
    )

    if (cajaClaves) {
      await replaceTrabajadorCajas(conn, existing.id, cajaClaves)
      pushCambio(cambios, 'cajas', prevCajas, cajaClaves)
    }

    let passwordPlain = null
    let nextCorreo = linkedUser?.correo || null
    let createdNewUser = false
    let passwordHashForCentral = null
    let nextEstadoForCentral = null
    const hadLinkedUserAtStart = Boolean(linkedUser)

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
      passwordHashForCentral = await bcrypt.hash(passwordPlain, 10)
      const estadoNuevo = body.estado === 'inactivo' ? 'inactivo' : 'activo'
      nextEstadoForCentral = estadoNuevo
      await conn.execute(
        `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          existing.id,
          nextRut,
          correo,
          passwordHashForCentral,
          ROLES.USER_RENDIDOR,
          estadoNuevo
        ]
      )
      createdNewUser = true
      nextCorreo = correo
      cambios.push({
        texto: `usuario creado correo=${correo} rol=${ROLES.USER_RENDIDOR} estado=${estadoNuevo}`
      })
    } else if (linkedUser && (crearUsuario || wantsUserUpdate)) {
      // Switch off no borra el usuario; solo actualiza si envían campos de acceso
      const passwordChanged = Boolean(body.password && String(body.password).trim())
      if (passwordChanged) {
        passwordPlain = String(body.password).trim()
        passwordHashForCentral = await bcrypt.hash(passwordPlain, 10)
      }
      const nextEstado =
        body.estado === 'inactivo' || body.estado === 'activo'
          ? body.estado
          : linkedUser.estado
      nextEstadoForCentral = nextEstado
      nextCorreo =
        body.correo !== undefined ? String(body.correo).trim() || linkedUser.correo : linkedUser.correo

      pushCambio(cambios, 'correo', linkedUser.correo, nextCorreo)
      pushCambio(cambios, 'estado', linkedUser.estado, nextEstado)
      pushCambio(cambios, 'rut_usuario', linkedUser.rut, nextRut)
      if (passwordChanged) pushPasswordReset(cambios)

      await conn.execute(
        `UPDATE usuarios
         SET correo = ?, estado = ?, password_hash = ?, trabajador_id = ?, rut = ?
         WHERE id = ? AND is_deleted = FALSE`,
        [
          nextCorreo,
          nextEstado,
          passwordHashForCentral || linkedUser.password_hash,
          existing.id,
          nextRut,
          linkedUser.id
        ]
      )
    }

    await conn.commit()

    await syncProfileToCentral({
      rutLimpio: nextRut,
      nombre: nextNombre,
      correo: nextCorreo !== undefined ? nextCorreo : undefined,
    })
    if (createdNewUser) {
      await provisionCentralUsuario({
        rutLimpio: nextRut,
        nombre: nextNombre,
        correo: nextCorreo,
        passwordHash: passwordHashForCentral,
        rendRol: ROLES.USER_RENDIDOR,
        mustChangePassword: false,
        activo: nextEstadoForCentral !== 'inactivo',
      })
    } else if (hadLinkedUserAtStart && wantsUserUpdate) {
      if (nextEstadoForCentral != null) {
        await syncActivoToCentral({
          rutLimpio: nextRut,
          activo: nextEstadoForCentral === 'activo',
        })
      }
      if (passwordHashForCentral) {
        await syncPasswordHashToCentral({
          rutLimpio: nextRut,
          passwordHash: passwordHashForCentral,
        })
      }
    }

    const identidad = identificarEntidad('Personal', {
      correo: nextCorreo,
      nombre: nextNombre,
      rut: nextRut,
      id: existing.id
    })
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Personal',
      formatearDetalleCambio(identidad, cambios)
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

/* --- Cuentas de Banco (catálogo 1:1 número ↔ banco + CC) --- */

const CUENTA_BANCO_SELECT = `SELECT cb.id, cb.numero_cuenta, cb.banco, cb.centro_cobro_id,
              cc.nombre AS centro_cobro_nombre,
              cb.created_at, cb.updated_at
       FROM cuentas_banco cb
       LEFT JOIN centros_costo cc ON cc.id = cb.centro_cobro_id AND cc.is_deleted = FALSE`

async function listCuentasBanco(req, res) {
  try {
    await ensureCuentasBancoSchema()
    const q = normalizeNumeroCuenta(req.query.q || '')
    const ccFilter = Number(req.query.centro_cobro_id)
    const hasCc = Number.isFinite(ccFilter) && ccFilter > 0
    let rows
    if (q && hasCc) {
      rows = await query(
        `${CUENTA_BANCO_SELECT}
         WHERE cb.is_deleted = FALSE
           AND cb.numero_cuenta LIKE ?
           AND cb.centro_cobro_id = ?
         ORDER BY cb.banco ASC, cb.numero_cuenta ASC
         LIMIT 100`,
        [`%${q}%`, ccFilter]
      )
    } else if (q) {
      rows = await query(
        `${CUENTA_BANCO_SELECT}
         WHERE cb.is_deleted = FALSE AND cb.numero_cuenta LIKE ?
         ORDER BY cb.banco ASC, cb.numero_cuenta ASC
         LIMIT 100`,
        [`%${q}%`]
      )
    } else if (hasCc) {
      rows = await query(
        `${CUENTA_BANCO_SELECT}
         WHERE cb.is_deleted = FALSE AND cb.centro_cobro_id = ?
         ORDER BY cb.banco ASC, cb.numero_cuenta ASC`,
        [ccFilter]
      )
    } else {
      rows = await query(
        `${CUENTA_BANCO_SELECT}
         WHERE cb.is_deleted = FALSE
         ORDER BY cc.nombre ASC, cb.banco ASC, cb.numero_cuenta ASC`
      )
    }
    return res.json(rows)
  } catch (err) {
    console.error('[listCuentasBanco]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createCuentaBanco(req, res) {
  try {
    await ensureCuentasBancoSchema()
    const { numero_cuenta, banco, centro_cobro_id } = req.body || {}
    const numero = normalizeNumeroCuenta(numero_cuenta)
    const bancoNorm = normalizeBancoNombre(banco)
    if (!numero) {
      return res.status(400).json({ error: 'Número de cuenta es obligatorio' })
    }
    if (!bancoNorm) {
      return res.status(400).json({ error: 'Banco es obligatorio' })
    }
    const cc = await resolveCentroCobro(centro_cobro_id)
    if (!cc) {
      return res.status(400).json({ error: 'Centro de cobro (CC) es obligatorio' })
    }

    const existing = await query(
      `SELECT id, numero_cuenta, banco, centro_cobro_id FROM cuentas_banco
       WHERE numero_cuenta = ? AND is_deleted = FALSE LIMIT 1`,
      [numero]
    )
    if (existing[0]) {
      return res.status(409).json({
        error: `El número de cuenta ${numero} ya está registrado (${existing[0].banco})`
      })
    }

    const result = await upsertCuentaBanco(numero, bancoNorm, cc.id)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Cuentas Banco',
      `Cuenta ${result.cuenta.numero_cuenta} · ${result.cuenta.banco} · CC ${cc.nombre}`
    )
    return res.status(201).json(result.cuenta)
  } catch (err) {
    console.error('[createCuentaBanco]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function updateCuentaBanco(req, res) {
  try {
    await ensureCuentasBancoSchema()
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM cuentas_banco WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Cuenta de banco no encontrada' })

    const prev = existing[0]
    const nextNumero =
      req.body?.numero_cuenta !== undefined
        ? normalizeNumeroCuenta(req.body.numero_cuenta)
        : prev.numero_cuenta
    const nextBanco =
      req.body?.banco !== undefined
        ? normalizeBancoNombre(req.body.banco)
        : normalizeBancoNombre(prev.banco)
    const nextCcRaw =
      req.body?.centro_cobro_id !== undefined
        ? req.body.centro_cobro_id
        : prev.centro_cobro_id
    const cc = await resolveCentroCobro(nextCcRaw)
    if (!cc) {
      return res.status(400).json({ error: 'Centro de cobro (CC) es obligatorio' })
    }

    if (!nextNumero) {
      return res.status(400).json({ error: 'Número de cuenta es obligatorio' })
    }
    if (!nextBanco) {
      return res.status(400).json({ error: 'Banco es obligatorio' })
    }

    if (nextNumero !== prev.numero_cuenta) {
      const dup = await query(
        `SELECT id, banco FROM cuentas_banco
         WHERE numero_cuenta = ? AND is_deleted = FALSE AND id <> ?
         LIMIT 1`,
        [nextNumero, id]
      )
      if (dup[0]) {
        return res.status(409).json({
          error: `El número de cuenta ${nextNumero} ya está registrado`
        })
      }
    }

    try {
      await query(
        `UPDATE cuentas_banco
         SET numero_cuenta = ?, banco = ?, centro_cobro_id = ?
         WHERE id = ? AND is_deleted = FALSE`,
        [nextNumero, nextBanco, cc.id, id]
      )
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: `El número de cuenta ${nextNumero} ya está registrado`
        })
      }
      throw err
    }

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Cuentas Banco',
      `Cuenta id=${id}: ${nextNumero} · ${nextBanco} · CC ${cc.nombre}`
    )

    const updated = await query(
      `${CUENTA_BANCO_SELECT}
       WHERE cb.id = ? AND cb.is_deleted = FALSE`,
      [id]
    )
    return res.json(updated[0])
  } catch (err) {
    console.error('[updateCuentaBanco]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteCuentaBanco(req, res) {
  try {
    if (!SUPER_ADMINS.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Solo Super Admin puede eliminar cuentas de banco'
      })
    }
    await ensureCuentasBancoSchema()
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM cuentas_banco WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Cuenta de banco no encontrada' })

    // Liberar UNIQUE para poder re-registrar el mismo número
    const freedNumero = `${existing[0].numero_cuenta}#DEL${id}`.slice(0, 40)
    const result = await query(
      `UPDATE cuentas_banco
       SET is_deleted = TRUE, deleted_at = NOW(), numero_cuenta = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [freedNumero, id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cuenta de banco no encontrada' })
    }
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Cuentas Banco',
      `Soft delete cuenta id=${id} (${existing[0].numero_cuenta})`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteCuentaBanco]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/* --- Audit logs (solo lectura) --- */

async function listAuditLogs(req, res) {
  try {
    if (!SUPER_ADMINS.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Solo Super Admin puede consultar auditoría'
      })
    }
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
  const {
    isSyncBidireccionalEnabled,
    SYNC_BIDIRECCIONAL_DISABLED_MSG
  } = require('../config/devFlags')
  if (!isSyncBidireccionalEnabled()) {
    return res.status(503).json({ error: SYNC_BIDIRECCIONAL_DISABLED_MSG })
  }

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
  listCuentasBanco,
  createCuentaBanco,
  updateCuentaBanco,
  softDeleteCuentaBanco,
  listAuditLogs,
  syncBidireccionalHandler
}
