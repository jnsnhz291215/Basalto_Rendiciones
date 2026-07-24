const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')
const { getJwtSecret } = require('../middlewares/auth.middleware')
const { registrarAuditoria } = require('../utils/audit')

async function login(req, res) {
  try {
    const { correo, rut, password } = req.body || {}
    if (!password || (!correo && !rut)) {
      return res.status(400).json({ error: 'correo o rut, y password son requeridos' })
    }

    const rows = correo
      ? await query(
          `SELECT u.*, t.nombre_completo
           FROM usuarios u
           LEFT JOIN trabajadores t ON t.id = u.trabajador_id AND t.is_deleted = FALSE
           WHERE u.correo = ? AND u.is_deleted = FALSE
           LIMIT 1`,
          [correo.trim()]
        )
      : await query(
          `SELECT u.*, t.nombre_completo
           FROM usuarios u
           LEFT JOIN trabajadores t ON t.id = u.trabajador_id AND t.is_deleted = FALSE
           WHERE u.rut = ? AND u.is_deleted = FALSE
           LIMIT 1`,
          [rut.trim()]
        )

    const user = rows[0]
    if (!user || user.estado !== 'activo') {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const secret = getJwtSecret()
    if (!secret) {
      return res.status(500).json({ error: 'JWT secret no configurado' })
    }

    const nombre = user.nombre_completo || user.correo
    const token = jwt.sign(
      {
        id: user.id,
        rut: user.rut,
        rol: user.rol,
        trabajador_id: user.trabajador_id,
        nombre
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    await registrarAuditoria(user.id, nombre, 'LOGIN', 'Autenticación', 'Inicio de sesión exitoso')

    return res.json({
      token,
      user: {
        id: user.id,
        rut: user.rut,
        correo: user.correo,
        rol: user.rol,
        trabajador_id: user.trabajador_id,
        nombre
      }
    })
  } catch (err) {
    console.error('[login]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function me(req, res) {
  return res.json({ user: req.user })
}

module.exports = { login, me }
