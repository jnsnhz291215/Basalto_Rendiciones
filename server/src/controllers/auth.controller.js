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

/**
 * Actualiza correo y/o contraseña del usuario autenticado.
 * Body: { correo?, password_actual?, password_nueva? }
 */
async function updateMe(req, res) {
  try {
    const { correo, password_actual, password_nueva } = req.body || {}
    const userId = req.user.id

    const rows = await query(
      `SELECT id, rut, correo, password_hash, rol, trabajador_id, estado
       FROM usuarios
       WHERE id = ? AND is_deleted = FALSE
       LIMIT 1`,
      [userId]
    )
    const user = rows[0]
    if (!user || user.estado !== 'activo') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    let nextCorreo = user.correo
    if (correo !== undefined) {
      const trimmed = String(correo).trim()
      if (!trimmed) {
        return res.status(400).json({ error: 'correo no puede estar vacío' })
      }
      nextCorreo = trimmed
    }

    let nextHash = user.password_hash
    const quiereCambiarClave =
      password_nueva !== undefined && String(password_nueva).length > 0

    if (quiereCambiarClave) {
      if (!password_actual) {
        return res.status(400).json({ error: 'password_actual es requerida' })
      }
      const hash = normalizePasswordHash(user.password_hash)
      const ok = await bcrypt.compare(String(password_actual), hash)
      if (!ok) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' })
      }
      if (String(password_nueva).length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
      }
      nextHash = await bcrypt.hash(String(password_nueva), 10)
    }

    await query(
      `UPDATE usuarios SET correo = ?, password_hash = ? WHERE id = ? AND is_deleted = FALSE`,
      [nextCorreo, nextHash, userId]
    )

    await registrarAuditoria(
      userId,
      req.user.nombre,
      'MODIFICAR',
      'Perfil',
      quiereCambiarClave
        ? `Actualizó correo/clave (correo=${nextCorreo})`
        : `Actualizó correo=${nextCorreo}`
    )

    return res.json({
      user: {
        id: user.id,
        rut: user.rut,
        correo: nextCorreo,
        rol: user.rol,
        trabajador_id: user.trabajador_id,
        nombre: req.user.nombre
      }
    })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Correo ya registrado' })
    }
    console.error('[updateMe]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = { login, me, updateMe, normalizePasswordHash }
