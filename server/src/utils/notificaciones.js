'use strict'

const { query } = require('../config/db')
const { queryCentral, isCentralConfigured } = require('../config/dbCentral')
const { authUsesCentral, resolveAuthSource } = require('../config/runtimeConfig')
const { normalizeRut } = require('./mustChangePassword')

async function insertNotificacion({
  rutDestinatario,
  titulo = 'Aviso',
  mensaje,
  modulo = null,
  accion = null,
  entidadTipo = null,
  entidadId = null
}) {
  const rut = normalizeRut(rutDestinatario)
  if (!rut || !mensaje) return null
  const result = await query(
    `INSERT INTO notificaciones_inbox
       (rut_destinatario, titulo, mensaje, modulo, accion, entidad_tipo, entidad_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      rut,
      String(titulo || 'Aviso').slice(0, 120),
      String(mensaje).slice(0, 2000),
      modulo,
      accion,
      entidadTipo,
      entidadId != null ? String(entidadId) : null
    ]
  )
  return result?.insertId || null
}

async function loadSuperAdminRutsFromCentral() {
  const rows = await queryCentral(
    `SELECT DISTINCT u.rut
     FROM usuarios u
     INNER JOIN usuario_roles ur ON ur.usuario_id = u.id
     INNER JOIN roles r ON r.id = ur.rol_id
     WHERE u.activo = 1
       AND (u.is_deleted = 0 OR u.is_deleted IS NULL)
       AND r.codigo IN ('super_admin', 'super_admin_dev')`,
  )
  return (rows || []).map((r) => r.rut).filter(Boolean)
}

/** Notifica a todos los Super Admin activos (Central si AUTH_SOURCE=central). */
async function notifySuperAdmins({ titulo, mensaje, modulo, accion, entidadTipo, entidadId }) {
  let ruts = []
  if (authUsesCentral() && resolveAuthSource() === 'central' && isCentralConfigured()) {
    try {
      ruts = await loadSuperAdminRutsFromCentral()
    } catch (err) {
      console.error('[notifySuperAdmins] Central FAIL, fallback local:', err.message)
    }
  }
  if (!ruts.length) {
    const admins = await query(
      `SELECT rut FROM usuarios
       WHERE is_deleted = FALSE
         AND estado = 'activo'
         AND rol IN ('SUPER_ADMIN', 'SUPER_ADMIN_DEV')`
    )
    ruts = (admins || []).map((a) => a.rut)
  }

  for (const rut of ruts) {
    await insertNotificacion({
      rutDestinatario: rut,
      titulo,
      mensaje,
      modulo,
      accion,
      entidadTipo,
      entidadId
    })
  }
}

module.exports = { insertNotificacion, notifySuperAdmins }
