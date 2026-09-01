'use strict'

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')
const { getJwtSecret } = require('../middlewares/auth.middleware')
const { registrarAuditoria } = require('../utils/audit')
const { resolveAuthSource, authUsesCentral } = require('../config/runtimeConfig')
const { authenticateCentral, limpiarRut } = require('../utils/centralAuth')
const { authLog, authWarn } = require('../utils/authLogger')
const {
  verifyCurrentPasswordForChange,
  syncPasswordHashToCentral,
} = require('../utils/centralPasswordSync')
const { syncAuthFlagsToCentral, syncProfileToCentral } = require('../utils/centralIdentitySync')
const {
  buildUserAuthFlags,
  asFlag,
  EXPIRED_MESSAGE
} = require('../utils/mustChangePassword')

/**
 * bcryptjs acepta $2a$/$2b$; hashes PHP suelen venir como $2y$ (compatibles).
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

function publicUserPayload(userRow, nombre) {
  const flags = buildUserAuthFlags(userRow)
  return {
    id: userRow.id,
    rut: userRow.rut,
    correo: userRow.correo,
    rol: userRow.rol,
    trabajador_id: userRow.trabajador_id,
    nombre: nombre || userRow.correo,
    persona_confianza: Boolean(userRow.persona_confianza),
    ...flags
  }
}

function normalizeRut(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/\s+/g, '')
}

async function fetchLocalUser(identifier, byCorreo) {
  if (byCorreo) {
    return query(
      `SELECT u.*, t.nombre_completo
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id AND t.is_deleted = FALSE
       WHERE LOWER(u.correo) = LOWER(?) AND u.is_deleted = FALSE
       LIMIT 1`,
      [String(identifier).trim()],
    )
  }
  return query(
    `SELECT u.*, t.nombre_completo
     FROM usuarios u
     LEFT JOIN trabajadores t ON t.id = u.trabajador_id AND t.is_deleted = FALSE
     WHERE REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', '') = ?
       AND u.is_deleted = FALSE
     LIMIT 1`,
    [normalizeRut(identifier)],
  )
}

function issueToken(user, nombre, flags, identitySource, sessionVersion) {
  const secret = getJwtSecret()
  return jwt.sign(
    {
      id: user.id,
      rut: user.rut,
      rol: user.rol,
      trabajador_id: user.trabajador_id,
      nombre,
      must_change_password: flags.must_change_password,
      identity_source: identitySource,
      session_version: Number(sessionVersion) > 0 ? Number(sessionVersion) : 1,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  )
}

async function tryLoginViaCentral(identifier, plain) {
  const mode = resolveAuthSource()
  if (!authUsesCentral()) return null

  authLog('dual', 'verificando credenciales en Basaltodrilling_Central', `id=${identifier}`)

  let centralResult
  try {
    centralResult = await authenticateCentral(identifier, plain)
  } catch (err) {
    authWarn('central', 'error pool/query Central', err.message)
    if (mode === 'central') {
      return { error: { status: 503, body: { error: 'Identidad Central no disponible' } } }
    }
    return null
  }

  if (!centralResult.ok) {
    if (mode === 'central') {
      authLog('central', 'login rechazado', `reason=${centralResult.reason}`)
      if (centralResult.reason === 'inactive') {
        return {
          error: {
            status: 401,
            body: { error: 'Tu cuenta está desactivada. Contacta a un administrador.' },
          },
        }
      }
      return { error: { status: 401, body: { error: 'Credenciales inválidas' } } }
    }
    authLog('dual', 'Central sin match → fallback BD local', `reason=${centralResult.reason}`)
    return null
  }

  const { usuario, rendRol, rutLimpio } = centralResult
  const localRows = await fetchLocalUser(rutLimpio, false)
  let user = localRows?.[0]

  if (!user) {
    authWarn('central', 'password OK en Central; sin fila local usuarios', `rut=${rutLimpio}`)
    return {
      error: {
        status: 403,
        body: {
          error: 'Usuario válido en Central pero sin cuenta local en Rendiciones. Contacta a un administrador.',
        },
      },
    }
  }

  if (user.estado !== 'activo') {
    return {
      error: {
        status: 401,
        body: { error: 'Tu cuenta está desactivada. Contacta a un administrador.' },
      },
    }
  }

  const mergedUser = {
    ...user,
    rol: rendRol || user.rol,
    must_change_password: usuario.must_change_password ?? user.must_change_password,
    temp_password_grace_started_at:
      usuario.temp_password_grace_started_at ?? user.temp_password_grace_started_at,
  }

  const flags = buildUserAuthFlags(mergedUser)
  if (flags.temp_password_expired) {
    return {
      error: { status: 403, body: { error: 'temp_password_expired', message: EXPIRED_MESSAGE } },
    }
  }

  const nombre = mergedUser.nombre_completo || mergedUser.correo
  const sessionVersion = Number(usuario.session_version) || 1
  authLog(
    'central',
    'login OK',
    `rut=${rutLimpio} rol=${mergedUser.rol} session_version=${sessionVersion} permisos_desde=Basalto_Rendiciones`,
  )

  const token = issueToken(mergedUser, nombre, flags, 'central', sessionVersion)
  await registrarAuditoria(
    mergedUser.id,
    nombre,
    'LOGIN',
    'Autenticación',
    JSON.stringify({
      resumen: `Inicio de sesión: ${nombre}`,
      identity_source: 'central',
      password_verificado: 'Basaltodrilling_Central',
    }),
  )

  return {
    token,
    user: publicUserPayload(mergedUser, nombre),
    identity_source: 'central',
  }
}

async function loginLocal(identifier, plain, byCorreo) {
  authLog('local', 'verificando credenciales en BD local', `id=${identifier}`)
  const rows = await fetchLocalUser(identifier, byCorreo)
  const user = rows?.[0]
  if (!user) {
    console.warn('[login] usuario no encontrado / soft-deleted')
    return { error: { status: 401, body: { error: 'Credenciales inválidas' } } }
  }
  if (user.estado !== 'activo') {
    console.warn(`[login] usuario id=${user.id} estado=${user.estado}`)
    return {
      error: {
        status: 401,
        body: { error: 'Tu cuenta está desactivada. Contacta a un administrador.' },
      },
    }
  }

  const hash = normalizePasswordHash(user.password_hash)
  if (!hash.startsWith('$2')) {
    console.error(
      `[login] password_hash inválido para usuario id=${user.id} (no parece bcrypt). Prefijo: ${String(user.password_hash || '').slice(0, 4)}`,
    )
    return { error: { status: 401, body: { error: 'Credenciales inválidas' } } }
  }

  const ok = await bcrypt.compare(plain, hash)
  if (!ok) {
    console.warn(`[login] password incorrecto para usuario id=${user.id}`)
    return { error: { status: 401, body: { error: 'Credenciales inválidas' } } }
  }

  const flags = buildUserAuthFlags(user)
  if (flags.temp_password_expired) {
    return { error: { status: 403, body: { error: 'temp_password_expired', message: EXPIRED_MESSAGE } } }
  }

  const nombre = user.nombre_completo || user.correo
  const token = issueToken(user, nombre, flags, 'local', 1)
  await registrarAuditoria(user.id, nombre, 'LOGIN', 'Autenticación', 'Inicio de sesión exitoso')

  return { token, user: publicUserPayload(user, nombre), identity_source: 'local' }
}

async function login(req, res) {
  try {
    const { correo, rut, password } = req.body || {}
    const identifier = correo?.trim() || rut?.trim()
    const plain = typeof password === 'string' ? password : ''
    if (!plain || !identifier) {
      return res.status(400).json({ error: 'correo o rut, y password son requeridos' })
    }

    const secret = getJwtSecret()
    if (!secret) {
      return res.status(500).json({ error: 'JWT secret no configurado' })
    }

    const byCorreo = Boolean(correo?.trim())
    const centralHandled = await tryLoginViaCentral(identifier, plain)
    if (centralHandled?.error) {
      return res.status(centralHandled.error.status).json(centralHandled.error.body)
    }
    if (centralHandled?.token) {
      return res.json({ token: centralHandled.token, user: centralHandled.user })
    }

    const localResult = await loginLocal(identifier, plain, byCorreo)
    if (localResult.error) {
      return res.status(localResult.error.status).json(localResult.error.body)
    }

    return res.json({ token: localResult.token, user: localResult.user })
  } catch (err) {
    console.error('[login]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function me(req, res) {
  return res.json({
    user: publicUserPayload(
      {
        id: req.user.id,
        rut: req.user.rut,
        correo: req.user.correo,
        rol: req.user.rol,
        trabajador_id: req.user.trabajador_id,
        persona_confianza: req.user.persona_confianza,
        must_change_password: req.user.must_change_password,
        temp_password_grace_started_at: req.user.temp_password_grace_started_at,
        accepted_email: req.user.accepted_email,
        accepted_privacy_at: req.user.accepted_privacy_at
      },
      req.user.nombre
    )
  })
}

/**
 * Actualiza correo, contraseña y/o consentimientos.
 * Body: { correo?, password_actual?, password_nueva?, accepted_privacy?, accepted_email? }
 */
async function updateMe(req, res) {
  try {
    const {
      correo,
      password_actual,
      password_nueva,
      accepted_privacy,
      accepted_email: acceptedEmailFlag
    } = req.body || {}
    const userId = req.user.id

    const rows = await query(
      `SELECT id, rut, correo, password_hash, rol, trabajador_id, estado,
              persona_confianza, must_change_password,
              temp_password_grace_started_at, accepted_email, accepted_privacy_at
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
    let clearMustChange = false
    const quiereCambiarClave =
      password_nueva !== undefined && String(password_nueva).length > 0

    if (quiereCambiarClave) {
      if (!password_actual && !asFlag(user.must_change_password)) {
        return res.status(400).json({ error: 'password_actual es requerida' })
      }
      if (password_actual) {
        const identitySource = req.user.identity_source || 'local'
        const ok = await verifyCurrentPasswordForChange({
          rutLimpio: user.rut,
          passwordActual: password_actual,
          identitySource,
          localPasswordHash: user.password_hash,
        })
        if (!ok) {
          return res.status(401).json({ error: 'Contraseña actual incorrecta' })
        }
      }
      if (String(password_nueva).length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
      }
      nextHash = await bcrypt.hash(String(password_nueva), 10)
      clearMustChange = true
    }

    let nextAcceptedEmail = user.accepted_email
    let nextAcceptedPrivacy = user.accepted_privacy_at

    if (acceptedEmailFlag === true || acceptedEmailFlag === 1 || acceptedEmailFlag === '1') {
      nextAcceptedEmail = nextCorreo
    }
    if (accepted_privacy === true || accepted_privacy === 1 || accepted_privacy === '1') {
      nextAcceptedPrivacy = new Date()
    }

    // Si cambia el correo, invalidar accepted_email previo salvo que se re-acepte ahora
    if (
      correo !== undefined &&
      String(user.correo || '').trim().toLowerCase() !== String(nextCorreo).trim().toLowerCase() &&
      !(acceptedEmailFlag === true || acceptedEmailFlag === 1 || acceptedEmailFlag === '1')
    ) {
      nextAcceptedEmail = null
    }

    await query(
      `UPDATE usuarios
       SET correo = ?,
           password_hash = ?,
           must_change_password = ?,
           temp_password_grace_started_at = ?,
           accepted_email = ?,
           accepted_privacy_at = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        nextCorreo,
        nextHash,
        clearMustChange ? 0 : asFlag(user.must_change_password) ? 1 : 0,
        clearMustChange ? null : user.temp_password_grace_started_at,
        nextAcceptedEmail,
        nextAcceptedPrivacy,
        userId
      ]
    )

    if (quiereCambiarClave) {
      const identitySource = req.user.identity_source || 'local'
      const syncResult = await syncPasswordHashToCentral({
        rutLimpio: user.rut,
        passwordHash: nextHash,
        mustChangePassword: clearMustChange ? false : asFlag(user.must_change_password),
        clearGrace: clearMustChange,
        requireOk: identitySource === 'central',
      })
      if (identitySource === 'central' && !syncResult.ok) {
        return res.status(500).json({ error: 'No se pudo sincronizar la contraseña con identidad Central' })
      }
    }
    if (correo !== undefined) {
      await syncProfileToCentral({
        rutLimpio: user.rut,
        nombre: req.user.nombre,
        correo: nextCorreo,
      })
    }

    await registrarAuditoria(
      userId,
      req.user.nombre,
      'MODIFICAR',
      'Perfil',
      quiereCambiarClave
        ? `Actualizó correo/clave (correo=${nextCorreo})`
        : `Actualizó perfil (correo=${nextCorreo})`
    )

    const updated = {
      ...user,
      correo: nextCorreo,
      password_hash: nextHash,
      must_change_password: clearMustChange ? 0 : user.must_change_password,
      temp_password_grace_started_at: clearMustChange ? null : user.temp_password_grace_started_at,
      accepted_email: nextAcceptedEmail,
      accepted_privacy_at: nextAcceptedPrivacy
    }

    return res.json({
      user: publicUserPayload(updated, req.user.nombre)
    })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Correo ya registrado' })
    }
    console.error('[updateMe]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/** Inicia (o confirma) la gracia de 7 días tras dismiss del modal. */
async function dismissTempPassword(req, res) {
  try {
    const userId = req.user.id
    const rows = await query(
      `SELECT id, must_change_password, temp_password_grace_started_at
       FROM usuarios WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
      [userId]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (!asFlag(user.must_change_password)) {
      return res.json({ ok: true, must_change_password: false })
    }
    if (!user.temp_password_grace_started_at) {
      await query(
        `UPDATE usuarios SET temp_password_grace_started_at = NOW()
         WHERE id = ? AND is_deleted = FALSE`,
        [userId]
      )
    }
    if (req.user.identity_source === 'central') {
      await syncAuthFlagsToCentral({
        rutLimpio: user.rut || req.user.rut,
        mustChangePassword: true,
        graceStartedAt: new Date(),
      })
    }
    const refreshed = await query(
      `SELECT id, rut, correo, rol, trabajador_id, persona_confianza,
              must_change_password, temp_password_grace_started_at,
              accepted_email, accepted_privacy_at
       FROM usuarios WHERE id = ? LIMIT 1`,
      [userId]
    )
    return res.json({
      ok: true,
      user: publicUserPayload(refreshed[0], req.user.nombre)
    })
  } catch (err) {
    console.error('[dismissTempPassword]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = {
  login,
  me,
  updateMe,
  dismissTempPassword,
  normalizePasswordHash,
  publicUserPayload
}
