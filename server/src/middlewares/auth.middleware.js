const jwt = require('jsonwebtoken')
const { query } = require('../config/db')

function getJwtSecret() {
  return process.env.JWT_SECRET_RENDICIONES || process.env.JWT_SECRET
}

/**
 * Exige Authorization: Bearer <token>.
 * Revalida en BD: estado activo e is_deleted = FALSE.
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

    const rows = await query(
      `SELECT id, trabajador_id, rut, correo, rol, estado, is_deleted
       FROM usuarios
       WHERE id = ? AND is_deleted = FALSE
       LIMIT 1`,
      [payload.id]
    )

    const user = rows[0]
    if (!user || user.estado !== 'activo') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Usuario inactivo o eliminado' })
    }

    req.user = {
      id: user.id,
      trabajador_id: user.trabajador_id,
      rut: user.rut,
      correo: user.correo,
      rol: user.rol,
      nombre: payload.nombre || user.correo
    }

    return next()
  } catch (err) {
    console.error('[authMiddleware]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = { authMiddleware, getJwtSecret }
