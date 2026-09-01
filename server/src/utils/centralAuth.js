'use strict'

const { queryCentral } = require('../config/dbCentral')
const { checkPasswordAny } = require('./passwordCheck')

const LOGIN_ROLES = new Set(['usuario', 'admin', 'super_admin', 'super_admin_dev'])
const ROL_RANK = {
  trabajador: 10,
  usuario: 20,
  admin: 30,
  super_admin: 40,
  super_admin_dev: 50,
}

const CENTRAL_TO_REND_ENUM = {
  super_admin_dev: 'SUPER_ADMIN_DEV',
  super_admin: 'SUPER_ADMIN',
  admin: 'ADMIN_CAJA',
  usuario: 'USER_RENDIDOR',
}

function limpiarRut(rut) {
  return String(rut || '').replace(/[.\-\s]/g, '').trim().toUpperCase()
}

function rankRol(codigo) {
  return ROL_RANK[String(codigo || '').toLowerCase()] || 0
}

function maxRolCode(roles) {
  let best = null
  let bestRank = 0
  for (const r of roles || []) {
    const code = typeof r === 'string' ? r : r.codigo
    const rk = rankRol(code)
    if (rk > bestRank) {
      bestRank = rk
      best = code
    }
  }
  return best
}

function canLogin(roles) {
  return (roles || []).some((r) => {
    const code = typeof r === 'string' ? r : r.codigo
    return LOGIN_ROLES.has(code)
  })
}

function mapCentralToRendRol(roles) {
  const max = maxRolCode(roles)
  if (!max || max === 'trabajador') return null
  const rendRol = CENTRAL_TO_REND_ENUM[max]
  if (!rendRol) return null
  return { rendRol, centralRol: max }
}

async function fetchRolesForUsuario(usuarioId) {
  const rows = await queryCentral(
    `SELECT r.id, r.codigo, r.nombre
     FROM usuario_roles ur
     JOIN roles r ON r.id = ur.rol_id
     WHERE ur.usuario_id = ?
     ORDER BY r.orden ASC`,
    [usuarioId],
  )
  return rows || []
}

async function findCentralUsuario(identifier) {
  const raw = String(identifier || '').trim()
  if (!raw) return null
  const rut = limpiarRut(raw)
  const rows = await queryCentral(
    `SELECT id, rut, nombre, correo, password_hash, activo, is_deleted,
            must_change_password, session_version, temp_password_grace_started_at
     FROM usuarios
     WHERE rut = ? OR LOWER(correo) = LOWER(?)
     LIMIT 1`,
    [rut, raw],
  )
  if (!rows?.[0]) return null
  const usuario = rows[0]
  const roles = await fetchRolesForUsuario(usuario.id)
  return { usuario, roles }
}

async function authenticateCentral(identifier, password) {
  const record = await findCentralUsuario(identifier)
  if (!record) {
    return { ok: false, reason: 'not_found' }
  }

  const { usuario, roles } = record

  if (Number(usuario.is_deleted) === 1 || Number(usuario.activo) !== 1) {
    return { ok: false, reason: 'inactive' }
  }

  if (!canLogin(roles)) {
    return { ok: false, reason: 'role_no_login' }
  }

  if (!usuario.password_hash) {
    return { ok: false, reason: 'no_login' }
  }

  const rutLimpio = limpiarRut(usuario.rut || identifier)
  const passwordMatched = await checkPasswordAny(usuario.password_hash, password, rutLimpio)
  if (!passwordMatched) {
    return { ok: false, reason: 'invalid_credentials' }
  }

  const mapped = mapCentralToRendRol(roles)
  if (!mapped) {
    return { ok: false, reason: 'role_no_login' }
  }

  return {
    ok: true,
    usuario,
    roles,
    rendRol: mapped.rendRol,
    passwordMatched,
    rutLimpio,
  }
}

module.exports = {
  limpiarRut,
  findCentralUsuario,
  authenticateCentral,
  mapCentralToRendRol,
  canLogin,
}
