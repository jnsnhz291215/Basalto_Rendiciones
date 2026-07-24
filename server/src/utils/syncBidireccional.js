const bcrypt = require('bcryptjs')
const { query } = require('../config/db')
const { queryTurnos } = require('../config/dbTurnos')
const { ROLES } = require('../middlewares/role.middleware')

/** Normaliza RUT para comparación: sin puntos/guión/espacios, mayúsculas. */
function normalizeRut(value) {
  return String(value || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
}

/** Guarda en Rendiciones limpio (sin puntos/guión). */
function rutLimpio(value) {
  return normalizeRut(value)
}

/** Formato típico Turnos workers: 12345678-9 */
function rutConGuion(value) {
  const clean = normalizeRut(value)
  if (clean.length < 2) return clean
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`
}

function splitNombreCompleto(nombreCompleto) {
  const parts = String(nombreCompleto || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) {
    return { nombres: 'Sin', apellido_paterno: 'Nombre', apellido_materno: '' }
  }
  if (parts.length === 1) {
    return { nombres: parts[0], apellido_paterno: '-', apellido_materno: '' }
  }
  if (parts.length === 2) {
    return { nombres: parts[0], apellido_paterno: parts[1], apellido_materno: '' }
  }
  return {
    nombres: parts.slice(0, -2).join(' '),
    apellido_paterno: parts[parts.length - 2],
    apellido_materno: parts[parts.length - 1]
  }
}

function joinNombre(nombres, apP, apM) {
  return [nombres, apP, apM].filter((x) => x && String(x).trim() && x !== '-').join(' ').trim()
}

function mapTurnosAdminToRol(esSuperAdmin) {
  return Number(esSuperAdmin) === 1 ? ROLES.SUPER_ADMIN : ROLES.ADMIN_CAJA
}

function mapRendicionRolToEsSuperAdmin(rol) {
  return rol === ROLES.SUPER_ADMIN_DEV || rol === ROLES.SUPER_ADMIN ? 1 : 0
}

function isAdminRol(rol) {
  return (
    rol === ROLES.SUPER_ADMIN_DEV ||
    rol === ROLES.SUPER_ADMIN ||
    rol === ROLES.ADMIN_CAJA
  )
}

async function fallbackHash(seed) {
  return bcrypt.hash(String(seed || 'changeme').slice(0, 32) || 'changeme', 10)
}

function emptyStats() {
  return {
    usuarios: {
      creados_en_rendiciones: 0,
      creados_en_turnos: 0,
      actualizados_en_rendiciones: 0,
      actualizados_en_turnos: 0
    },
    trabajadores: {
      creados_en_rendiciones: 0,
      creados_en_turnos: 0,
      actualizados_en_rendiciones: 0,
      actualizados_en_turnos: 0
    },
    errores: []
  }
}

async function loadTurnosAdmins() {
  const rows = await queryTurnos(
    `SELECT rut, nombres, apellido_paterno, apellido_materno, email, password,
            es_super_admin, activo
     FROM admin_users`
  )
  return rows.map((r) => ({
    ...r,
    _norm: normalizeRut(r.rut),
    _kind: 'admin'
  }))
}

async function loadTurnosUsers() {
  const rows = await queryTurnos(
    `SELECT rut, nombres, apellido_paterno, apellido_materno, email, password, activo
     FROM users`
  )
  return rows.map((r) => ({
    ...r,
    _norm: normalizeRut(r.rut),
    _kind: 'user'
  }))
}

async function loadTurnosTrabajadores() {
  const rows = await queryTurnos(
    `SELECT RUT AS rut, nombres, apellido_paterno, apellido_materno, email, telefono, activo
     FROM trabajadores`
  )
  return rows.map((r) => ({
    ...r,
    _norm: normalizeRut(r.rut)
  }))
}

async function loadRendicionUsuarios() {
  const rows = await query(
    `SELECT id, trabajador_id, rut, correo, password_hash, rol, estado
     FROM usuarios
     WHERE is_deleted = FALSE`
  )
  return rows.map((r) => ({
    ...r,
    _norm: normalizeRut(r.rut)
  }))
}

async function loadRendicionTrabajadores() {
  const rows = await query(
    `SELECT id, rut, nombre_completo, cargo
     FROM trabajadores
     WHERE is_deleted = FALSE`
  )
  return rows.map((r) => ({
    ...r,
    _norm: normalizeRut(r.rut)
  }))
}

async function ensureTrabajadorRendicion({ rutClean, nombreCompleto, cargo }, stats) {
  const existing = await query(
    `SELECT id FROM trabajadores
     WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
       AND is_deleted = FALSE
     LIMIT 1`,
    [rutClean]
  )
  if (existing[0]) return existing[0].id

  const result = await query(
    `INSERT INTO trabajadores (rut, nombre_completo, cargo)
     VALUES (?, ?, ?)`,
    [rutClean, nombreCompleto || 'Sin nombre', cargo || null]
  )
  stats.trabajadores.creados_en_rendiciones += 1
  return result.insertId
}

async function syncUsuarios(stats) {
  const [admins, users, rendUsuarios] = await Promise.all([
    loadTurnosAdmins(),
    loadTurnosUsers(),
    loadRendicionUsuarios()
  ])

  const rendByNorm = new Map(rendUsuarios.map((u) => [u._norm, u]))
  const turnosAdminByNorm = new Map(admins.map((u) => [u._norm, u]))
  const turnosUserByNorm = new Map(users.map((u) => [u._norm, u]))

  // Turnos admin_users → Rendiciones usuarios
  for (const admin of admins) {
    if (!admin._norm) continue
    const dest = rendByNorm.get(admin._norm)
    const correo = (admin.email || `${admin._norm}@basalto.local`).trim()
    const hash = admin.password || ''
    const rol = mapTurnosAdminToRol(admin.es_super_admin)
    const nombre = joinNombre(admin.nombres, admin.apellido_paterno, admin.apellido_materno)
    const estado = Number(admin.activo) === 0 ? 'inactivo' : 'activo'

    if (!dest) {
      try {
        const passwordHash = hash || (await fallbackHash(admin._norm))
        await query(
          `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
           VALUES (NULL, ?, ?, ?, ?, ?)`,
          [admin._norm, correo, passwordHash, rol, estado]
        )
        stats.usuarios.creados_en_rendiciones += 1
      } catch (err) {
        stats.errores.push(`admin→rendicion ${admin._norm}: ${err.message}`)
      }
      continue
    }

    const needPass = hash && dest.password_hash !== hash
    const needMail = correo && dest.correo !== correo
    if (needPass || needMail) {
      try {
        await query(
          `UPDATE usuarios
           SET correo = ?, password_hash = ?, rol = ?, estado = ?
           WHERE id = ? AND is_deleted = FALSE`,
          [
            needMail ? correo : dest.correo,
            needPass ? hash : dest.password_hash,
            isAdminRol(dest.rol) ? dest.rol : rol,
            estado,
            dest.id
          ]
        )
        stats.usuarios.actualizados_en_rendiciones += 1
      } catch (err) {
        stats.errores.push(`update rendicion admin ${admin._norm}: ${err.message}`)
      }
    }
  }

  // Turnos users → Rendiciones USER_RENDIDOR
  for (const u of users) {
    if (!u._norm) continue
    // Si ya es admin en Turnos, no lo dupliques como user
    if (turnosAdminByNorm.has(u._norm)) continue

    const dest = rendByNorm.get(u._norm)
    const correo = (u.email || `${u._norm}@basalto.local`).trim()
    const hash = u.password || ''
    const nombre = joinNombre(u.nombres, u.apellido_paterno, u.apellido_materno)
    const estado = Number(u.activo) === 0 ? 'inactivo' : 'activo'

    if (!dest) {
      try {
        const trabajadorId = await ensureTrabajadorRendicion(
          { rutClean: u._norm, nombreCompleto: nombre },
          stats
        )
        const passwordHash = hash || (await fallbackHash(u._norm))
        await query(
          `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [trabajadorId, u._norm, correo, passwordHash, ROLES.USER_RENDIDOR, estado]
        )
        stats.usuarios.creados_en_rendiciones += 1
      } catch (err) {
        stats.errores.push(`user→rendicion ${u._norm}: ${err.message}`)
      }
      continue
    }

    const needPass = hash && dest.password_hash !== hash
    const needMail = correo && dest.correo !== correo
    if (needPass || needMail) {
      try {
        await query(
          `UPDATE usuarios SET correo = ?, password_hash = ?, estado = ?
           WHERE id = ? AND is_deleted = FALSE`,
          [
            needMail ? correo : dest.correo,
            needPass ? hash : dest.password_hash,
            estado,
            dest.id
          ]
        )
        stats.usuarios.actualizados_en_rendiciones += 1
      } catch (err) {
        stats.errores.push(`update rendicion user ${u._norm}: ${err.message}`)
      }
    }
  }

  // Recargar mapa Rendiciones tras altas
  const rendUsuarios2 = await loadRendicionUsuarios()
  const rendByNorm2 = new Map(rendUsuarios2.map((u) => [u._norm, u]))

  // Rendiciones → Turnos
  for (const u of rendUsuarios2) {
    if (!u._norm) continue
    const correo = (u.correo || '').trim()
    const hash = u.password_hash || ''

    if (isAdminRol(u.rol)) {
      const existing = turnosAdminByNorm.get(u._norm)
      const esSuper = mapRendicionRolToEsSuperAdmin(u.rol)
      const { nombres, apellido_paterno, apellido_materno } = splitNombreCompleto(
        u.correo?.split('@')[0] || u._norm
      )

      if (!existing) {
        try {
          await queryTurnos(
            `INSERT INTO admin_users
              (rut, nombres, apellido_paterno, apellido_materno, email, password, es_super_admin, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              u._norm,
              nombres,
              apellido_paterno,
              apellido_materno,
              correo || `${u._norm}@basalto.local`,
              hash,
              esSuper,
              u.estado === 'activo' ? 1 : 0
            ]
          )
          stats.usuarios.creados_en_turnos += 1
          turnosAdminByNorm.set(u._norm, { _norm: u._norm })
        } catch (err) {
          // Fallback sin columnas opcionales
          try {
            await queryTurnos(
              `INSERT INTO admin_users
                (rut, nombres, apellido_paterno, apellido_materno, email, password, es_super_admin, activo)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                u._norm,
                nombres,
                apellido_paterno,
                apellido_materno || '',
                correo || `${u._norm}@basalto.local`,
                hash,
                esSuper,
                1
              ]
            )
            stats.usuarios.creados_en_turnos += 1
          } catch (err2) {
            stats.errores.push(`rendicion→admin_users ${u._norm}: ${err2.message}`)
          }
        }
        continue
      }

      if (hash && existing.password !== hash) {
        try {
          await queryTurnos(
            `UPDATE admin_users
             SET password = ?, email = COALESCE(NULLIF(?, ''), email)
             WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = ?`,
            [hash, correo, u._norm]
          )
          stats.usuarios.actualizados_en_turnos += 1
        } catch (err) {
          stats.errores.push(`update admin_users ${u._norm}: ${err.message}`)
        }
      } else if (correo && existing.email !== correo) {
        try {
          await queryTurnos(
            `UPDATE admin_users SET email = ?
             WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = ?`,
            [correo, u._norm]
          )
          stats.usuarios.actualizados_en_turnos += 1
        } catch (err) {
          stats.errores.push(`update admin email ${u._norm}: ${err.message}`)
        }
      }
      continue
    }

    // USER_RENDIDOR → Turnos users
    if (u.rol !== ROLES.USER_RENDIDOR) continue
    if (turnosAdminByNorm.has(u._norm)) continue

    const existingUser = turnosUserByNorm.get(u._norm)
    const trabRows = await query(
      `SELECT nombre_completo FROM trabajadores WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
      [u.trabajador_id || 0]
    )
    const nombreCompleto = trabRows[0]?.nombre_completo || correo.split('@')[0] || u._norm
    const { nombres, apellido_paterno, apellido_materno } = splitNombreCompleto(nombreCompleto)
    const rutTurnos = rutConGuion(u._norm)

    if (!existingUser) {
      try {
        await queryTurnos(
          `INSERT INTO users (rut, nombres, apellido_paterno, apellido_materno, email, password)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            rutTurnos,
            nombres,
            apellido_paterno,
            apellido_materno || '',
            correo || `${u._norm}@basalto.local`,
            hash
          ]
        )
        stats.usuarios.creados_en_turnos += 1
        turnosUserByNorm.set(u._norm, { _norm: u._norm })
      } catch (err) {
        stats.errores.push(`rendicion→users ${u._norm}: ${err.message}`)
      }
      continue
    }

    if (
      (hash && existingUser.password !== hash) ||
      (correo && existingUser.email !== correo)
    ) {
      try {
        await queryTurnos(
          `UPDATE users
           SET password = ?, email = COALESCE(NULLIF(?, ''), email)
           WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = ?`,
          [
            hash && existingUser.password !== hash ? hash : existingUser.password,
            correo,
            u._norm
          ]
        )
        stats.usuarios.actualizados_en_turnos += 1
      } catch (err) {
        stats.errores.push(`update users ${u._norm}: ${err.message}`)
      }
    }
  }

  return rendByNorm2
}

async function syncTrabajadores(stats) {
  const [turnosTrab, rendTrab] = await Promise.all([
    loadTurnosTrabajadores(),
    loadRendicionTrabajadores()
  ])

  const rendByNorm = new Map(rendTrab.map((t) => [t._norm, t]))
  const turnosByNorm = new Map(turnosTrab.map((t) => [t._norm, t]))

  // Turnos → Rendiciones
  for (const t of turnosTrab) {
    if (!t._norm) continue
    const nombre = joinNombre(t.nombres, t.apellido_paterno, t.apellido_materno) || 'Sin nombre'
    const dest = rendByNorm.get(t._norm)
    if (!dest) {
      try {
        await query(
          `INSERT INTO trabajadores (rut, nombre_completo, cargo)
           VALUES (?, ?, NULL)`,
          [t._norm, nombre]
        )
        stats.trabajadores.creados_en_rendiciones += 1
      } catch (err) {
        stats.errores.push(`trab turnos→rend ${t._norm}: ${err.message}`)
      }
      continue
    }
    if (nombre && dest.nombre_completo !== nombre) {
      try {
        await query(
          `UPDATE trabajadores SET nombre_completo = ?
           WHERE id = ? AND is_deleted = FALSE`,
          [nombre, dest.id]
        )
        stats.trabajadores.actualizados_en_rendiciones += 1
      } catch (err) {
        stats.errores.push(`update trab rend ${t._norm}: ${err.message}`)
      }
    }
  }

  // Rendiciones → Turnos
  const rendTrab2 = await loadRendicionTrabajadores()
  for (const t of rendTrab2) {
    if (!t._norm) continue
    if (turnosByNorm.has(t._norm)) continue

    const { nombres, apellido_paterno, apellido_materno } = splitNombreCompleto(t.nombre_completo)
    const rutTurnos = rutConGuion(t._norm)
    try {
      await queryTurnos(
        `INSERT INTO trabajadores
          (nombres, apellido_paterno, apellido_materno, RUT, email, telefono,
           id_grupo, id_cargo, id_ciudad, fecha_nacimiento, id_faena, es_usuario_test, es_residente_local)
         VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0)`,
        [nombres, apellido_paterno, apellido_materno || '', rutTurnos]
      )
      stats.trabajadores.creados_en_turnos += 1
    } catch (err) {
      // Intento mínimo si FKs NOT NULL fallan
      try {
        await queryTurnos(
          `INSERT INTO trabajadores (nombres, apellido_paterno, apellido_materno, RUT)
           VALUES (?, ?, ?, ?)`,
          [nombres, apellido_paterno, apellido_materno || '', rutTurnos]
        )
        stats.trabajadores.creados_en_turnos += 1
      } catch (err2) {
        stats.errores.push(`trab rend→turnos ${t._norm}: ${err2.message}`)
      }
    }
  }
}

/**
 * Sincronización bidireccional Turnos (basalto) ↔ Basalto_Rendiciones.
 */
async function syncBidireccional(options = {}) {
  const dryRun = Boolean(options.dryRun)
  const startedAt = new Date().toISOString()
  const stats = emptyStats()

  if (dryRun) {
    const [admins, users, rendU, tTrab, rTrab] = await Promise.all([
      loadTurnosAdmins(),
      loadTurnosUsers(),
      loadRendicionUsuarios(),
      loadTurnosTrabajadores(),
      loadRendicionTrabajadores()
    ])
    return {
      ok: true,
      dryRun: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      preview: {
        turnos_admins: admins.length,
        turnos_users: users.length,
        turnos_trabajadores: tTrab.length,
        rendiciones_usuarios: rendU.length,
        rendiciones_trabajadores: rTrab.length
      },
      stats
    }
  }

  await syncUsuarios(stats)
  await syncTrabajadores(stats)

  return {
    ok: true,
    dryRun: false,
    startedAt,
    finishedAt: new Date().toISOString(),
    stats
  }
}

module.exports = {
  syncBidireccional,
  normalizeRut,
  rutLimpio,
  rutConGuion
}
