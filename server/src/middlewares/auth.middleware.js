const jwt = require('jsonwebtoken')
const { query } = require('../config/db')
const { authUsesCentral } = require('../config/runtimeConfig')
const { queryCentral } = require('../config/dbCentral')
const { limpiarRut } = require('../utils/centralAuth')
const { authLog } = require('../utils/authLogger')
const {
  buildUserAuthFlags,
  EXPIRED_MESSAGE,
  isTempPasswordWhitelist
} = require('../utils/mustChangePassword')

function getJwtSecret() {
  return process.env.JWT_SECRET_RENDICIONES || process.env.JWT_SECRET
}

/**
 * Exige Authorization: Bearer <token>.
 * Revalida en BD: estado activo e is_deleted = FALSE.
 * Bloquea API si must_change + gracia expirada (salvo whitelist).
 */
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token Bearer requerido' })
    }

    const secret = getJwtSecret()
    if (!secret) {
      return res.status(500).json({ error: 'Server misconfigured', message: 'JWT secret no definido' })
    }

    let payload
    try {
      payload = jwt.verify(token, secret)
    } catch {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token inválido o expirado' })
    }

    const identitySource = String(payload.identity_source || 'local').toLowerCase()
    const tokenSessionVersion = Number(payload.session_version) || 1

    if (identitySource === 'central' && authUsesCentral()) {
      const rutLimpio = limpiarRut(payload.rut)
      let centralRows
      try {
        centralRows = await queryCentral(
          `SELECT activo, session_version FROM usuarios WHERE rut = ? LIMIT 1`,
          [rutLimpio],
        )
      } catch (centralErr) {
        console.error('[authMiddleware] Error verificando sesión Central:', centralErr.message)
        return res.status(503).json({ error: 'Identidad Central no disponible' })
      }
      const centralRow = centralRows?.[0]
      if (!centralRow || Number(centralRow.activo) !== 1) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Usuario inactivo en Central' })
      }
      const dbVersion = Number(centralRow.session_version) || 1
      if (dbVersion !== tokenSessionVersion) {
        authLog('central', 'session invalidada', `rut=${rutLimpio} jwt=${tokenSessionVersion} db=${dbVersion}`)
        return res.status(401).json({
          error: 'invalid_session_version',
          message: 'Sesión invalidada. Vuelve a iniciar sesión.',
        })
      }
    }

    let rows
    try {
      rows = await query(
        `SELECT id, trabajador_id, rut, correo, rol, estado, is_deleted, persona_confianza,
                must_change_password, temp_password_grace_started_at,
                accepted_email, accepted_privacy_at
         FROM usuarios
         WHERE id = ? AND is_deleted = FALSE
         LIMIT 1`,
        [payload.id]
      )
    } catch (err) {
      if (err?.code !== 'ER_BAD_FIELD_ERROR' && err?.errno !== 1054) throw err
      rows = await query(
        `SELECT id, trabajador_id, rut, correo, rol, estado, is_deleted, persona_confianza
         FROM usuarios
         WHERE id = ? AND is_deleted = FALSE
         LIMIT 1`,
        [payload.id]
      )
      if (rows[0]) {
        rows[0].must_change_password = 0
        rows[0].temp_password_grace_started_at = null
        rows[0].accepted_email = null
        rows[0].accepted_privacy_at = null
      }
    }

    const user = rows[0]
    if (!user || user.estado !== 'activo') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Usuario inactivo o eliminado' })
    }

    const flags = buildUserAuthFlags(user)
    if (flags.temp_password_expired && !isTempPasswordWhitelist(req.method, req.path)) {
      // req.path en routers montados puede ser relativo; usar originalUrl
      const fullPath = String(req.originalUrl || req.url || '').split('?')[0]
      if (!isTempPasswordWhitelist(req.method, fullPath)) {
        return res.status(403).json({
          error: 'temp_password_expired',
          message: EXPIRED_MESSAGE
        })
      }
    }

    req.user = {
      id: user.id,
      trabajador_id: user.trabajador_id,
      rut: user.rut,
      correo: user.correo,
      rol: user.rol,
      nombre: payload.nombre || user.correo,
      persona_confianza: Boolean(user.persona_confianza),
      must_change_password: flags.must_change_password,
      temp_password_grace_started_at: flags.temp_password_grace_started_at,
      temp_password_days_left: flags.temp_password_days_left,
      accepted_email: flags.accepted_email,
      accepted_privacy_at: flags.accepted_privacy_at,
      identity_source: identitySource,
      session_version: tokenSessionVersion,
    }

    return next()
  } catch (err) {
    console.error('[authMiddleware]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = { authMiddleware, getJwtSecret }
