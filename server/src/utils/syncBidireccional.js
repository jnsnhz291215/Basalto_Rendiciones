const bcrypt = require('bcryptjs')
const { query } = require('../config/db')
const { queryTurnos } = require('../config/dbTurnos')
const { ROLES } = require('../middlewares/role.middleware')

/**
 * Esquema real (dumps SQL en ../bd/ + ALTER updated_at en Turnos):
 *
 * Turnos (basalto):
 *   admin_users: RUT (PK), nombres, apellido_*, email, password,
 *                es_super_admin, activo, updated_at, …
 *   users:       rut (UK), nombres, apellido_*, email, password, activo,
 *                updated_at, FK rut → trabajadores(RUT)
 *   trabajadores: RUT (PK), nombres, apellido_*, email, telefono,
 *                 id_ciudad NOT NULL, id_faena DEFAULT 1, activo, updated_at, …
 *
 * Rendiciones:
 *   usuarios:     rut, correo, password_hash, rol, estado, updated_at, …
 *   trabajadores: rut, nombre_completo, cargo, updated_at, … (sin activo/email)
 *
 * Política sync:
 *   - NO sincronizar activo ↔ estado (desactivaciones no se propagan).
 *   - UPDATE comunes usuarios: email↔correo, password↔password_hash (RUT = clave).
 *   - UPDATE comunes trabajadores: nombre (nombres+apellidos ↔ nombre_completo).
 *   - Alta Turnos→Rendiciones: usuario siempre con estado='inactivo'; si ya existe, no tocar estado.
 *   - Conflictos: gana updated_at más reciente; empate → Turnos.
 *   - Modelo de roles:
 *       Rendiciones: `trabajadores` = ficha de persona; `usuarios` añade rol
 *       (ADMIN_* o USER_RENDIDOR). Admin y rendidor no coexisten.
 *       Turnos: admin (`admin_users`) XOR trabajador+login (`trabajadores`+`users`).
 *       Un admin de Rendiciones NO se materializa como `trabajadores`/`users` en Turnos.
 */

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

/** Formato típico Turnos: 12345678-9 */
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

/** NULL / ausente → epoch (0): pierde frente a un timestamp real. */
function toUpdatedAtMs(value) {
  if (value == null || value === '') return 0
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(ms) ? ms : 0
}

/**
 * El más reciente gana. Empate de timestamp → Turnos (fallback determinista).
 * @returns {'turnos'|'rendiciones'}
 */
function resolveWinner(turnosUpdatedAt, rendUpdatedAt) {
  const tMs = toUpdatedAtMs(turnosUpdatedAt)
  const rMs = toUpdatedAtMs(rendUpdatedAt)
  if (tMs === rMs) return 'turnos'
  return tMs > rMs ? 'turnos' : 'rendiciones'
}

const RUT_EQ_TURNOS_RUT =
  "REPLACE(REPLACE(REPLACE(UPPER(RUT), '.', ''), '-', ''), ' ', '') = ?"
const RUT_EQ_TURNOS_rut =
  "REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = ?"

let cachedCiudadId = null

/** Primer id_ciudad válido (FK obligatoria en trabajadores Turnos). */
async function getDefaultCiudadId() {
  if (cachedCiudadId != null) return cachedCiudadId
  const rows = await queryTurnos(
    `SELECT id_ciudad FROM ciudades ORDER BY id_ciudad ASC LIMIT 1`
  )
  if (!rows[0]?.id_ciudad) {
    throw new Error('Turnos: no hay filas en ciudades (id_ciudad NOT NULL en trabajadores)')
  }
  cachedCiudadId = rows[0].id_ciudad
  return cachedCiudadId
}

async function loadTurnosAdmins() {
  const rows = await queryTurnos(
    `SELECT RUT AS rut, nombres, apellido_paterno, apellido_materno, email, password,
            es_super_admin, activo, updated_at
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
    `SELECT rut, nombres, apellido_paterno, apellido_materno, email, password, activo, updated_at
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
    `SELECT RUT AS rut, nombres, apellido_paterno, apellido_materno, email, telefono, activo, updated_at
     FROM trabajadores`
  )
  return rows.map((r) => ({
    ...r,
    _norm: normalizeRut(r.rut)
  }))
}

async function loadRendicionUsuarios() {
  const rows = await query(
    `SELECT id, trabajador_id, rut, correo, password_hash, rol, estado, updated_at
     FROM usuarios
     WHERE is_deleted = FALSE`
  )
  return rows.map((r) => ({
    ...r,
    _norm: normalizeRut(r.rut)
  }))
}

async function loadRendicionTrabajadores() {
  // Sin activo/email; comunes con Turnos = nombre (+ existencia por RUT)
  const rows = await query(
    `SELECT id, rut, nombre_completo, cargo, updated_at
     FROM trabajadores
     WHERE is_deleted = FALSE`
  )
  return rows.map((r) => ({
    ...r,
    _norm: normalizeRut(r.rut)
  }))
}

async function ensureTrabajadorRendicion({ rutClean, nombreCompleto, cargo }, stats) {
  const nombre = String(nombreCompleto || '').trim() || 'Sin nombre'
  const existing = await query(
    `SELECT id, nombre_completo FROM trabajadores
     WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
       AND is_deleted = FALSE
     LIMIT 1`,
    [rutClean]
  )
  if (existing[0]) {
    const actual = String(existing[0].nombre_completo || '').trim()
    if (
      nombre &&
      nombre !== 'Sin nombre' &&
      (!actual || actual === 'Sin nombre')
    ) {
      try {
        await query(
          `UPDATE trabajadores SET nombre_completo = ?
           WHERE id = ? AND is_deleted = FALSE`,
          [nombre, existing[0].id]
        )
        stats.trabajadores.actualizados_en_rendiciones += 1
      } catch (err) {
        stats.errores.push(`fill nombre trab ${rutClean}: ${err.message}`)
      }
    }
    return existing[0].id
  }

  const result = await query(
    `INSERT INTO trabajadores (rut, nombre_completo, cargo)
     VALUES (?, ?, ?)`,
    [rutClean, nombre, cargo || null]
  )
  stats.trabajadores.creados_en_rendiciones += 1
  return result.insertId
}

/**
 * Vincula usuarios.trabajador_id con un trabajador que tenga el nombre de Turnos.
 * No toca estado. Sirve para altas y repair de admins/users ya syncados sin nombre.
 */
async function linkOrRepairTrabajadorUsuario(rendRow, turnosPerson, stats) {
  if (!rendRow?._norm || !turnosPerson) return

  const nombre =
    joinNombre(
      turnosPerson.nombres,
      turnosPerson.apellido_paterno,
      turnosPerson.apellido_materno
    ) || 'Sin nombre'

  try {
    if (!rendRow.trabajador_id) {
      const trabajadorId = await ensureTrabajadorRendicion(
        { rutClean: rendRow._norm, nombreCompleto: nombre },
        stats
      )
      await query(
        `UPDATE usuarios SET trabajador_id = ?
         WHERE id = ? AND is_deleted = FALSE`,
        [trabajadorId, rendRow.id]
      )
      rendRow.trabajador_id = trabajadorId
      stats.usuarios.actualizados_en_rendiciones += 1
      return
    }

    const trab = await query(
      `SELECT id, nombre_completo FROM trabajadores
       WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
      [rendRow.trabajador_id]
    )
    if (!trab[0]) {
      const trabajadorId = await ensureTrabajadorRendicion(
        { rutClean: rendRow._norm, nombreCompleto: nombre },
        stats
      )
      await query(
        `UPDATE usuarios SET trabajador_id = ?
         WHERE id = ? AND is_deleted = FALSE`,
        [trabajadorId, rendRow.id]
      )
      rendRow.trabajador_id = trabajadorId
      stats.usuarios.actualizados_en_rendiciones += 1
      return
    }

    const actual = String(trab[0].nombre_completo || '').trim()
    if (
      nombre &&
      nombre !== 'Sin nombre' &&
      (!actual || actual === 'Sin nombre')
    ) {
      await query(
        `UPDATE trabajadores SET nombre_completo = ?
         WHERE id = ? AND is_deleted = FALSE`,
        [nombre, trab[0].id]
      )
      stats.trabajadores.actualizados_en_rendiciones += 1
    }
  } catch (err) {
    stats.errores.push(`link/repair trabajador ${rendRow._norm}: ${err.message}`)
  }
}

/**
 * Asegura fila en Turnos.trabajadores (FK de users + INSERT desde Rendiciones).
 * Requiere id_ciudad NOT NULL; id_faena DEFAULT 1; id_grupo/id_cargo opcionales.
 * activo=1 al crear (no se propaga estado de Rendiciones).
 */
async function ensureTrabajadorTurnos(
  { rutNorm, nombres, apellido_paterno, apellido_materno, email },
  stats
) {
  const existing = await queryTurnos(
    `SELECT RUT FROM trabajadores WHERE ${RUT_EQ_TURNOS_RUT} LIMIT 1`,
    [rutNorm]
  )
  if (existing[0]) return existing[0].RUT

  const rutTurnos = rutConGuion(rutNorm)
  const ciudadId = await getDefaultCiudadId()
  await queryTurnos(
    `INSERT INTO trabajadores
      (RUT, nombres, apellido_paterno, apellido_materno, email, telefono,
       id_grupo, id_cargo, id_ciudad, id_faena, fecha_nacimiento,
       es_usuario_test, es_residente_local, activo)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 1, NULL, 0, 0, 1)`,
    [
      rutTurnos,
      nombres || 'Sin',
      apellido_paterno || 'Nombre',
      apellido_materno || null,
      email || null,
      ciudadId
    ]
  )
  stats.trabajadores.creados_en_turnos += 1
  return rutTurnos
}

/** Campos comunes UPDATE usuarios: correo/email, password_hash/password (NO estado/activo). */
function usuarioCommonDiffers(turnosRow, rendRow) {
  const correoT = String(turnosRow.email || '').trim()
  const correoR = String(rendRow.correo || '').trim()
  const passT = turnosRow.password || ''
  const passR = rendRow.password_hash || ''
  return {
    differs: (correoT && correoT !== correoR) || (passT && passT !== passR),
    correoT,
    correoR,
    passT,
    passR
  }
}

async function updateUsuarioEnRendiciones(dest, { correo, passwordHash }, stats, label) {
  try {
    await query(
      `UPDATE usuarios
       SET correo = ?, password_hash = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [correo, passwordHash, dest.id]
    )
    stats.usuarios.actualizados_en_rendiciones += 1
  } catch (err) {
    stats.errores.push(`update rendicion ${label} ${dest._norm}: ${err.message}`)
  }
}

async function updateAdminEnTurnos(norm, { email, password }, stats) {
  try {
    await queryTurnos(
      `UPDATE admin_users
       SET email = ?, password = ?
       WHERE ${RUT_EQ_TURNOS_RUT}`,
      [email, password, norm]
    )
    stats.usuarios.actualizados_en_turnos += 1
  } catch (err) {
    stats.errores.push(`update admin_users ${norm}: ${err.message}`)
  }
}

async function updateUserEnTurnos(norm, { email, password }, stats) {
  try {
    await queryTurnos(
      `UPDATE users
       SET email = ?, password = ?
       WHERE ${RUT_EQ_TURNOS_rut}`,
      [email, password, norm]
    )
    stats.usuarios.actualizados_en_turnos += 1
  } catch (err) {
    stats.errores.push(`update users ${norm}: ${err.message}`)
  }
}

async function syncPairedUsuario({ turnosRow, rendRow, turnosKind }, stats) {
  const diff = usuarioCommonDiffers(turnosRow, rendRow)
  if (!diff.differs) return

  const winner = resolveWinner(turnosRow.updated_at, rendRow.updated_at)
  const correo =
    winner === 'turnos'
      ? diff.correoT || diff.correoR || `${rendRow._norm}@basalto.local`
      : diff.correoR || diff.correoT || `${rendRow._norm}@basalto.local`
  const passwordHash =
    winner === 'turnos' ? diff.passT || diff.passR : diff.passR || diff.passT

  if (winner === 'turnos') {
    await updateUsuarioEnRendiciones(
      rendRow,
      { correo, passwordHash },
      stats,
      turnosKind
    )
  } else if (turnosKind === 'admin') {
    await updateAdminEnTurnos(
      rendRow._norm,
      { email: correo, password: passwordHash },
      stats
    )
  } else {
    await updateUserEnTurnos(
      rendRow._norm,
      { email: correo, password: passwordHash },
      stats
    )
  }
}

async function insertAdminEnTurnos(u, stats) {
  const correo = (u.correo || '').trim() || `${u._norm}@basalto.local`
  const hash = u.password_hash || ''
  const esSuper = mapRendicionRolToEsSuperAdmin(u.rol)
  const { nombres, apellido_paterno, apellido_materno } = splitNombreCompleto(
    u.correo?.split('@')[0] || u._norm
  )

  try {
    // Exclusividad Turnos: no crear admin si el RUT ya es trabajador/usuario.
    const [trabRows, userRows] = await Promise.all([
      queryTurnos(
        `SELECT RUT FROM trabajadores WHERE ${RUT_EQ_TURNOS_RUT} LIMIT 1`,
        [u._norm]
      ),
      queryTurnos(
        `SELECT rut FROM users WHERE ${RUT_EQ_TURNOS_rut} LIMIT 1`,
        [u._norm]
      )
    ])
    if (trabRows[0] || userRows[0]) {
      stats.errores.push(
        `rendicion→admin_users ${u._norm}: RUT ya existe como trabajador/usuario en Turnos (exclusividad admin XOR trabajador)`
      )
      return
    }

    await queryTurnos(
      `INSERT INTO admin_users
        (RUT, nombres, apellido_paterno, apellido_materno, email, password, es_super_admin, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        u._norm,
        nombres,
        apellido_paterno,
        apellido_materno || null,
        correo,
        hash,
        esSuper
      ]
    )
    stats.usuarios.creados_en_turnos += 1
  } catch (err) {
    stats.errores.push(`rendicion→admin_users ${u._norm}: ${err.message}`)
  }
}

async function insertUserEnTurnos(u, stats) {
  const correo = (u.correo || '').trim() || `${u._norm}@basalto.local`
  const hash = u.password_hash || ''
  const trabRows = await query(
    `SELECT nombre_completo FROM trabajadores WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
    [u.trabajador_id || 0]
  )
  const nombreCompleto =
    trabRows[0]?.nombre_completo || correo.split('@')[0] || u._norm
  const { nombres, apellido_paterno, apellido_materno } = splitNombreCompleto(nombreCompleto)
  const rutTurnos = rutConGuion(u._norm)

  try {
    // Exclusividad: un admin de Turnos no recibe ficha users/trabajadores.
    const adminRows = await queryTurnos(
      `SELECT RUT FROM admin_users WHERE ${RUT_EQ_TURNOS_rut} LIMIT 1`,
      [u._norm]
    )
    if (adminRows[0]) {
      stats.errores.push(
        `rendicion→users ${u._norm}: RUT ya es administrador en Turnos (exclusividad admin XOR trabajador)`
      )
      return
    }

    // FK users.rut → trabajadores.RUT
    await ensureTrabajadorTurnos(
      {
        rutNorm: u._norm,
        nombres,
        apellido_paterno,
        apellido_materno,
        email: correo
      },
      stats
    )
    await queryTurnos(
      `INSERT INTO users
        (rut, nombres, apellido_paterno, apellido_materno, email, password, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        rutTurnos,
        nombres,
        apellido_paterno,
        apellido_materno || null,
        correo,
        hash
      ]
    )
    stats.usuarios.creados_en_turnos += 1
  } catch (err) {
    stats.errores.push(`rendicion→users ${u._norm}: ${err.message}`)
  }
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

  // Pares admin_users ↔ usuarios
  // Alta Turnos→Rendiciones: siempre estado='inactivo'; UPDATE no toca estado
  for (const admin of admins) {
    if (!admin._norm) continue
    const dest = rendByNorm.get(admin._norm)
    const nombre = joinNombre(admin.nombres, admin.apellido_paterno, admin.apellido_materno)

    if (!dest) {
      try {
        const correo = (admin.email || `${admin._norm}@basalto.local`).trim()
        const hash = admin.password || (await fallbackHash(admin._norm))
        const rol = mapTurnosAdminToRol(admin.es_super_admin)
        const trabajadorId = await ensureTrabajadorRendicion(
          { rutClean: admin._norm, nombreCompleto: nombre },
          stats
        )
        await query(
          `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
           VALUES (?, ?, ?, ?, ?, 'inactivo')`,
          [trabajadorId, admin._norm, correo, hash, rol]
        )
        stats.usuarios.creados_en_rendiciones += 1
      } catch (err) {
        stats.errores.push(`admin→rendicion ${admin._norm}: ${err.message}`)
      }
      continue
    }

    await linkOrRepairTrabajadorUsuario(dest, admin, stats)
    await syncPairedUsuario({ turnosRow: admin, rendRow: dest, turnosKind: 'admin' }, stats)
  }

  // Pares users ↔ usuarios (si no hay admin_users con ese RUT)
  for (const u of users) {
    if (!u._norm) continue
    if (turnosAdminByNorm.has(u._norm)) continue

    const dest = rendByNorm.get(u._norm)
    const correo = (u.email || `${u._norm}@basalto.local`).trim()
    const hash = u.password || ''
    const nombre = joinNombre(u.nombres, u.apellido_paterno, u.apellido_materno)

    if (!dest) {
      try {
        const trabajadorId = await ensureTrabajadorRendicion(
          { rutClean: u._norm, nombreCompleto: nombre },
          stats
        )
        const passwordHash = hash || (await fallbackHash(u._norm))
        await query(
          `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
           VALUES (?, ?, ?, ?, ?, 'inactivo')`,
          [trabajadorId, u._norm, correo, passwordHash, ROLES.USER_RENDIDOR]
        )
        stats.usuarios.creados_en_rendiciones += 1
      } catch (err) {
        stats.errores.push(`user→rendicion ${u._norm}: ${err.message}`)
      }
      continue
    }

    await linkOrRepairTrabajadorUsuario(dest, u, stats)
    await syncPairedUsuario({ turnosRow: u, rendRow: dest, turnosKind: 'user' }, stats)
  }

  const rendUsuarios2 = await loadRendicionUsuarios()

  // Solo INSERT en Turnos si falta en la tabla destino (activo=1; no se propaga estado)
  for (const u of rendUsuarios2) {
    if (!u._norm) continue

    if (isAdminRol(u.rol)) {
      if (turnosAdminByNorm.has(u._norm)) continue
      await insertAdminEnTurnos(u, stats)
      turnosAdminByNorm.set(u._norm, { _norm: u._norm })
      continue
    }

    if (u.rol !== ROLES.USER_RENDIDOR) continue
    if (turnosAdminByNorm.has(u._norm) || turnosUserByNorm.has(u._norm)) continue
    await insertUserEnTurnos(u, stats)
    turnosUserByNorm.set(u._norm, { _norm: u._norm })
  }

  return new Map(rendUsuarios2.map((u) => [u._norm, u]))
}

/**
 * Si el trabajador Turnos tiene user/admin y falta usuario en Rendiciones,
 * lo crea inactivo (correo/password desde Turnos).
 */
async function ensureUsuarioRendicionDesdeTurnos(
  { rutNorm, turnosAdmin, turnosUser },
  stats
) {
  const existing = await query(
    `SELECT id FROM usuarios
     WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
       AND is_deleted = FALSE
     LIMIT 1`,
    [rutNorm]
  )
  if (existing[0]) return

  if (turnosAdmin) {
    try {
      const correo = (turnosAdmin.email || `${rutNorm}@basalto.local`).trim()
      const hash = turnosAdmin.password || (await fallbackHash(rutNorm))
      const rol = mapTurnosAdminToRol(turnosAdmin.es_super_admin)
      const nombre = joinNombre(
        turnosAdmin.nombres,
        turnosAdmin.apellido_paterno,
        turnosAdmin.apellido_materno
      )
      const trabajadorId = await ensureTrabajadorRendicion(
        { rutClean: rutNorm, nombreCompleto: nombre },
        stats
      )
      await query(
        `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
         VALUES (?, ?, ?, ?, ?, 'inactivo')`,
        [trabajadorId, rutNorm, correo, hash, rol]
      )
      stats.usuarios.creados_en_rendiciones += 1
    } catch (err) {
      stats.errores.push(`trab+admin→usuario ${rutNorm}: ${err.message}`)
    }
    return
  }

  if (turnosUser) {
    try {
      const correo = (turnosUser.email || `${rutNorm}@basalto.local`).trim()
      const hash = turnosUser.password || (await fallbackHash(rutNorm))
      const nombre = joinNombre(
        turnosUser.nombres,
        turnosUser.apellido_paterno,
        turnosUser.apellido_materno
      )
      const trabajadorId = await ensureTrabajadorRendicion(
        { rutClean: rutNorm, nombreCompleto: nombre },
        stats
      )
      await query(
        `INSERT INTO usuarios (trabajador_id, rut, correo, password_hash, rol, estado)
         VALUES (?, ?, ?, ?, ?, 'inactivo')`,
        [trabajadorId, rutNorm, correo, hash, ROLES.USER_RENDIDOR]
      )
      stats.usuarios.creados_en_rendiciones += 1
    } catch (err) {
      stats.errores.push(`trab+user→usuario ${rutNorm}: ${err.message}`)
    }
  }
}

async function syncTrabajadores(stats) {
  const [turnosTrab, rendTrab, turnosAdmins, turnosUsers, rendUsuarios] = await Promise.all([
    loadTurnosTrabajadores(),
    loadRendicionTrabajadores(),
    loadTurnosAdmins(),
    loadTurnosUsers(),
    loadRendicionUsuarios()
  ])

  const rendByNorm = new Map(rendTrab.map((t) => [t._norm, t]))
  const turnosByNorm = new Map(turnosTrab.map((t) => [t._norm, t]))
  const turnosAdminByNorm = new Map(turnosAdmins.map((u) => [u._norm, u]))
  const turnosUserByNorm = new Map(turnosUsers.map((u) => [u._norm, u]))
  /** RUTs con rol admin en Rendiciones: su ficha `trabajadores` NO se copia a Turnos. */
  const rendAdminNorms = new Set(
    rendUsuarios.filter((u) => u._norm && isAdminRol(u.rol)).map((u) => u._norm)
  )
  const paired = new Set()

  // Pares: solo nombre (NO activo↔estado)
  for (const t of turnosTrab) {
    if (!t._norm) continue
    const nombre =
      joinNombre(t.nombres, t.apellido_paterno, t.apellido_materno) || 'Sin nombre'
    const dest = rendByNorm.get(t._norm)
    const turnosAdmin = turnosAdminByNorm.get(t._norm)
    const turnosUser = turnosUserByNorm.get(t._norm)

    if (!dest) {
      try {
        await query(
          `INSERT INTO trabajadores (rut, nombre_completo, cargo)
           VALUES (?, ?, NULL)`,
          [t._norm, nombre]
        )
        stats.trabajadores.creados_en_rendiciones += 1
        // Si en Turnos tiene usuario, asegurar usuario inactivo en Rendiciones
        if (turnosAdmin || turnosUser) {
          await ensureUsuarioRendicionDesdeTurnos(
            { rutNorm: t._norm, turnosAdmin, turnosUser },
            stats
          )
        }
      } catch (err) {
        stats.errores.push(`trab turnos→rend ${t._norm}: ${err.message}`)
      }
      continue
    }

    paired.add(t._norm)

    // Trabajador ya existe: si tiene user en Turnos y falta en Rendiciones → crear inactivo
    if (turnosAdmin || turnosUser) {
      await ensureUsuarioRendicionDesdeTurnos(
        { rutNorm: t._norm, turnosAdmin, turnosUser },
        stats
      )
    }

    const destNombre = String(dest.nombre_completo || '').trim()
    if (!nombre || nombre === destNombre) continue

    const winner = resolveWinner(t.updated_at, dest.updated_at)
    if (winner === 'turnos') {
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
    } else {
      const { nombres, apellido_paterno, apellido_materno } = splitNombreCompleto(
        dest.nombre_completo
      )
      try {
        await queryTurnos(
          `UPDATE trabajadores
           SET nombres = ?, apellido_paterno = ?, apellido_materno = ?
           WHERE ${RUT_EQ_TURNOS_RUT}`,
          [nombres, apellido_paterno, apellido_materno || null, t._norm]
        )
        stats.trabajadores.actualizados_en_turnos += 1
      } catch (err) {
        stats.errores.push(`update trab turnos ${t._norm}: ${err.message}`)
      }
    }
  }

  // Solo en Rendiciones → INSERT en Turnos (activo=1 por default).
  // Admins: en Rendiciones tienen ficha en `trabajadores`, pero en Turnos NO deben
  // materializarse como trabajador (exclusividad admin XOR trabajador).
  const rendTrab2 = await loadRendicionTrabajadores()
  for (const t of rendTrab2) {
    if (!t._norm) continue
    if (paired.has(t._norm) || turnosByNorm.has(t._norm)) continue
    if (turnosAdminByNorm.has(t._norm) || rendAdminNorms.has(t._norm)) {
      continue
    }

    const { nombres, apellido_paterno, apellido_materno } = splitNombreCompleto(t.nombre_completo)
    try {
      await ensureTrabajadorTurnos(
        {
          rutNorm: t._norm,
          nombres,
          apellido_paterno,
          apellido_materno,
          email: null
        },
        stats
      )
    } catch (err) {
      stats.errores.push(`trab rend→turnos ${t._norm}: ${err.message}`)
    }
  }
}

/**
 * Sincronización bidireccional Turnos (basalto) ↔ Basalto_Rendiciones.
 * Conflictos en campos comunes: gana el registro con updated_at más reciente
 * (NULL/ausente = epoch; empate → Turnos). estado/activo NO se sincronizan.
 */
async function syncBidireccional(options = {}) {
  const dryRun = Boolean(options.dryRun)
  const startedAt = new Date().toISOString()
  const stats = emptyStats()
  cachedCiudadId = null

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
  rutConGuion,
  resolveWinner,
  toUpdatedAtMs
}
