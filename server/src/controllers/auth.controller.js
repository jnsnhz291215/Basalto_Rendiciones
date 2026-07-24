const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')
const { getJwtSecret } = require('../middlewares/auth.middleware')
const { registrarAuditoria } = require('../utils/audit')

/**
 * bcryptjs acepta $2a$/$2b$; hashes PHP suelen venir como $2y$ (compatibles).
 * También limpia espacios/comillas accidentales al pegar el hash en BD.
 */
function normalizePasswordHash(raw) {
  let hash = String(raw || '').trim()
  if (
    (hash.startsWith('"') && hash.endsWith('"')) ||
    (hash.startsWith("'") && hash.endsWith("'"))
  ) {
    hash = hash.slice(1, -1).trim()
  }
  if (hash.startsWith('$2y$')) {
    hash = `$2a$${hash.slice(4)}`
  }
  return hash
}

async function login(req, res) {
  try {
    const { correo, rut, password } = req.body || {}
    const identifier = correo?.trim() || rut?.trim()
    const plain = typeof password === 'string' ? password : ''
    if (!plain || !identifier) {
      return res.status(400).json({ error: 'correo o rut, y password son requeridos' })
    }

    const normalizeRut = (value) =>
      String(value || '')
        .trim()
        .toUpperCase()
        .replace(/\./g, '')
        .replace(/-/g, '')
        .replace(/\s+/g, '')

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
           WHERE REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', '') = ?
             AND u.is_deleted = FALSE
           LIMIT 1`,
          [normalizeRut(rut)]
        )

    const user = rows[0]
    if (!user) {
      console.warn('[login] usuario no encontrado / soft-deleted')
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }
    if (user.estado !== 'activo') {
      console.warn(`[login] usuario id=${user.id} estado=${user.estado}`)
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const hash = normalizePasswordHash(user.password_hash)
    if (!hash.startsWith('$2')) {
      console.error(
        `[login] password_hash inválido para usuario id=${user.id} (no parece bcrypt). Prefijo: ${String(user.password_hash || '').slice(0, 4)}`
      )
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const ok = await bcrypt.compare(plain, hash)
    if (!ok) {
      console.warn(`[login] password incorrecto para usuario id=${user.id}`)
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
  return res.json({
    user: {
      id: req.user.id,
      rut: req.user.rut,
      correo: req.user.correo,
      rol: req.user.rol,
      trabajador_id: req.user.trabajador_id,
      nombre: req.user.nombre
    }
  })
}

module.exports = { login, me, normalizePasswordHash }
