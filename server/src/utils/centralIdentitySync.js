'use strict'

const { queryCentral } = require('../config/dbCentral')
const { shouldSyncToCentral } = require('./centralPasswordSync')
const { limpiarRut } = require('./centralAuth')
const { authLog, authWarn } = require('./authLogger')

const VALID_ROLE_CODES = new Set(['trabajador', 'usuario', 'admin', 'super_admin', 'super_admin_dev'])

const REND_TO_CENTRAL_ROLE = {
  SUPER_ADMIN_DEV: 'super_admin_dev',
  SUPER_ADMIN: 'super_admin',
  ADMIN_CAJA: 'admin',
  USER_RENDIDOR: 'usuario',
}

async function fetchRoleId(codigo) {
  const code = String(codigo || '').toLowerCase()
  if (!VALID_ROLE_CODES.has(code)) return null
  const rows = await queryCentral(`SELECT id FROM roles WHERE codigo = ? LIMIT 1`, [code])
  return rows?.[0]?.id ?? null
}

async function ensureUsuarioRoles(usuarioId, roleCodes) {
  for (const code of [...new Set(roleCodes)]) {
    const rolId = await fetchRoleId(code)
    if (!rolId) continue
    await queryCentral(
      `INSERT IGNORE INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)`,
      [usuarioId, rolId],
    )
  }
}

function centralRolesFromRendEnum(rendRol) {
  const mapped = REND_TO_CENTRAL_ROLE[String(rendRol || '').toUpperCase()]
  if (!mapped) return ['usuario']
  if (mapped === 'super_admin' || mapped === 'super_admin_dev') return [mapped, 'admin']
  return [mapped]
}

async function provisionCentralUsuario({
  rutLimpio,
  nombre,
  correo,
  passwordHash,
  rendRol,
  mustChangePassword,
  activo = 1,
}) {
  if (!shouldSyncToCentral()) return { ok: true, skipped: true }

  const rut = limpiarRut(rutLimpio)
  const nombreTrim = String(nombre || '').trim()
  if (!rut || !nombreTrim) return { ok: true, skipped: true, reason: 'invalid_args' }

  try {
    const roleList = centralRolesFromRendEnum(rendRol)
    const existing = await queryCentral(`SELECT id FROM usuarios WHERE rut = ? LIMIT 1`, [rut])
    let usuarioId

    if (existing?.[0]) {
      usuarioId = existing[0].id
      const sets = ['nombre = ?']
      const params = [nombreTrim]
      if (correo !== undefined) {
        sets.push('correo = ?')
        params.push(correo ? String(correo).trim().toLowerCase() : null)
      }
      if (passwordHash) {
        sets.push('password_hash = ?')
        params.push(passwordHash)
      }
      if (mustChangePassword != null) {
        sets.push('must_change_password = ?')
        params.push(mustChangePassword ? 1 : 0)
      }
      if (activo != null) {
        sets.push('activo = ?')
        params.push(activo ? 1 : 0)
      }
      params.push(rut)
      await queryCentral(`UPDATE usuarios SET ${sets.join(', ')} WHERE rut = ?`, params)
    } else {
      const insertResult = await queryCentral(
        `INSERT INTO usuarios (rut, nombre, correo, password_hash, activo, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          rut,
          nombreTrim,
          correo ? String(correo).trim().toLowerCase() : null,
          passwordHash || null,
          activo ? 1 : 0,
          mustChangePassword ? 1 : 0,
        ],
      )
      usuarioId = insertResult?.insertId
      if (!usuarioId) {
        const again = await queryCentral(`SELECT id FROM usuarios WHERE rut = ? LIMIT 1`, [rut])
        usuarioId = again?.[0]?.id
      }
    }

    if (usuarioId) await ensureUsuarioRoles(usuarioId, roleList)
    authLog('central', 'provision OK', `rut=${rut}`)
    return { ok: true, usuarioId }
  } catch (err) {
    authWarn('central', 'provision FAIL (best-effort)', `rut=${rut} err=${err.message}`)
    return { ok: false, reason: 'db_error' }
  }
}

async function syncActivoToCentral({ rutLimpio, activo, bumpSession = true }) {
  if (!shouldSyncToCentral()) return { ok: true, skipped: true }
  const rut = limpiarRut(rutLimpio)
  if (!rut) return { ok: true, skipped: true }

  try {
    const rows = await queryCentral(`SELECT id FROM usuarios WHERE rut = ? LIMIT 1`, [rut])
    if (!rows?.[0]) return { ok: true, skipped: true, reason: 'not_in_central' }

    const sets = ['activo = ?']
    const params = [activo ? 1 : 0]
    if (bumpSession) sets.push('session_version = session_version + 1')
    params.push(rut)
    await queryCentral(`UPDATE usuarios SET ${sets.join(', ')} WHERE rut = ?`, params)
    authLog('central', 'dual-write activo OK', `rut=${rut}`)
    return { ok: true }
  } catch (err) {
    authWarn('central', 'sync activo FAIL', `rut=${rut}`)
    return { ok: false }
  }
}

async function syncProfileToCentral({ rutLimpio, nombre, correo, bumpSessionOnEmailChange = true }) {
  if (!shouldSyncToCentral()) return { ok: true, skipped: true }
  const rut = limpiarRut(rutLimpio)
  if (!rut) return { ok: true, skipped: true }

  try {
    const rows = await queryCentral(`SELECT id, correo FROM usuarios WHERE rut = ? LIMIT 1`, [rut])
    if (!rows?.[0]) return { ok: true, skipped: true, reason: 'not_in_central' }

    const emailChanged =
      correo !== undefined
      && String(correo || '').trim().toLowerCase() !== String(rows[0].correo || '').trim().toLowerCase()

    const sets = []
    const params = []
    if (nombre) {
      sets.push('nombre = ?')
      params.push(String(nombre).trim())
    }
    if (correo !== undefined) {
      sets.push('correo = ?')
      params.push(correo ? String(correo).trim().toLowerCase() : null)
    }
    if (bumpSessionOnEmailChange && emailChanged) {
      sets.push('session_version = session_version + 1')
    }
    if (!sets.length) return { ok: true, skipped: true }

    params.push(rut)
    await queryCentral(`UPDATE usuarios SET ${sets.join(', ')} WHERE rut = ?`, params)
    return { ok: true }
  } catch (err) {
    authWarn('central', 'sync perfil FAIL', `rut=${rut}`)
    return { ok: false }
  }
}

async function deactivateCentralUsuario({ rutLimpio, bumpSession = true }) {
  if (!shouldSyncToCentral()) return { ok: true, skipped: true }
  const rut = limpiarRut(rutLimpio)
  if (!rut) return { ok: true, skipped: true }

  try {
    const sets = ['activo = 0', 'is_deleted = 1', 'deleted_at = NOW()']
    if (bumpSession) sets.push('session_version = session_version + 1')
    await queryCentral(`UPDATE usuarios SET ${sets.join(', ')} WHERE rut = ?`, [rut])
    return { ok: true }
  } catch (err) {
    return { ok: false }
  }
}

async function syncAuthFlagsToCentral({ rutLimpio, mustChangePassword, graceStartedAt, clearGrace = false }) {
  if (!shouldSyncToCentral()) return { ok: true, skipped: true }
  const rut = limpiarRut(rutLimpio)
  if (!rut) return { ok: true, skipped: true }

  try {
    const rows = await queryCentral(`SELECT id FROM usuarios WHERE rut = ? LIMIT 1`, [rut])
    if (!rows?.[0]) return { ok: true, skipped: true }

    const sets = []
    const params = []
    if (mustChangePassword != null) {
      sets.push('must_change_password = ?')
      params.push(mustChangePassword ? 1 : 0)
    }
    if (clearGrace) sets.push('temp_password_grace_started_at = NULL')
    else if (graceStartedAt !== undefined) {
      sets.push('temp_password_grace_started_at = ?')
      params.push(graceStartedAt)
    }
    if (!sets.length) return { ok: true, skipped: true }

    params.push(rut)
    await queryCentral(`UPDATE usuarios SET ${sets.join(', ')} WHERE rut = ?`, params)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

module.exports = {
  provisionCentralUsuario,
  syncActivoToCentral,
  syncProfileToCentral,
  deactivateCentralUsuario,
  syncAuthFlagsToCentral,
}
