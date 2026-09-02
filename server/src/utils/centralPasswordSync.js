'use strict'

const { queryCentral, isCentralConfigured } = require('../config/dbCentral')
const { authUsesCentral } = require('../config/runtimeConfig')
const { findCentralUsuario, limpiarRut, ensureAccesoSistemaCentral } = require('./centralAuth')
const { checkPasswordAny } = require('./passwordCheck')
const { authLog, authWarn } = require('./authLogger')

function shouldSyncToCentral() {
  return authUsesCentral() && isCentralConfigured()
}

async function verifyCurrentPasswordForChange({
  rutLimpio,
  passwordActual,
  identitySource,
  localPasswordHash,
}) {
  const rut = limpiarRut(rutLimpio)
  if (String(identitySource || '').toLowerCase() === 'central' && shouldSyncToCentral()) {
    const record = await findCentralUsuario(rut)
    const centralHash = record?.usuario?.password_hash
    if (centralHash) {
      return checkPasswordAny(centralHash, passwordActual, rut)
    }
    authWarn('central', 'change-password: sin password_hash Central; fallback local', `rut=${rut}`)
  }
  if (!localPasswordHash) return false
  return checkPasswordAny(localPasswordHash, passwordActual, rut)
}

async function syncPasswordHashToCentral({
  rutLimpio,
  passwordHash,
  mustChangePassword,
  clearGrace = false,
  bumpSession = true,
  requireOk = false,
}) {
  if (!shouldSyncToCentral()) {
    return { ok: true, skipped: true, reason: 'central_disabled' }
  }

  const rut = limpiarRut(rutLimpio)
  if (!rut || !passwordHash) {
    if (requireOk) return { ok: false, reason: 'invalid_args' }
    return { ok: true, skipped: true, reason: 'invalid_args' }
  }

  try {
    const rows = await queryCentral(`SELECT id FROM usuarios WHERE rut = ? LIMIT 1`, [rut])
    if (!rows?.[0]) {
      authWarn('central', 'dual-write password omitido: sin fila usuarios', `rut=${rut}`)
      return { ok: true, skipped: true, reason: 'not_in_central' }
    }
    const centralUsuarioId = rows[0].id

    const sets = ['password_hash = ?']
    const params = [passwordHash]
    if (mustChangePassword != null) {
      sets.push('must_change_password = ?')
      params.push(mustChangePassword ? 1 : 0)
    }
    if (clearGrace) sets.push('temp_password_grace_started_at = NULL')
    if (bumpSession) sets.push('session_version = session_version + 1')

    params.push(rut)
    await queryCentral(`UPDATE usuarios SET ${sets.join(', ')} WHERE rut = ?`, params)

    const versionRows = await queryCentral(
      `SELECT session_version FROM usuarios WHERE rut = ? LIMIT 1`,
      [rut],
    )
    const sessionVersion = Number(versionRows?.[0]?.session_version) || 1
    await ensureAccesoSistemaCentral(centralUsuarioId, 'rendiciones', true)
    authLog('central', 'dual-write password OK', `rut=${rut} session_version=${sessionVersion}`)
    return { ok: true, sessionVersion }
  } catch (err) {
    console.error('[AUTH:central] dual-write password FAIL:', err.message)
    if (requireOk) return { ok: false, reason: 'db_error' }
    authWarn('central', 'dual-write password FAIL (best-effort)', `rut=${rut}`)
    return { ok: false, reason: 'db_error' }
  }
}

async function getCentralAuthState(rutLimpio) {
  if (!shouldSyncToCentral()) return null
  try {
    const record = await findCentralUsuario(rutLimpio)
    if (!record?.usuario) return null
    const u = record.usuario
    return {
      session_version: Number(u.session_version) || 1,
      must_change_password: Number(u.must_change_password) === 1,
      temp_password_grace_started_at: u.temp_password_grace_started_at || null,
      activo: Number(u.activo) === 1,
    }
  } catch {
    return null
  }
}

module.exports = {
  shouldSyncToCentral,
  verifyCurrentPasswordForChange,
  syncPasswordHashToCentral,
  getCentralAuthState,
}
