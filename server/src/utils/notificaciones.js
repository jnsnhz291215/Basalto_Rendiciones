'use strict'

const { query } = require('../config/db')
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

/** Notifica a todos los Super Admin activos. */
async function notifySuperAdmins({ titulo, mensaje, modulo, accion, entidadTipo, entidadId }) {
  const admins = await query(
    `SELECT rut FROM usuarios
     WHERE is_deleted = FALSE
       AND estado = 'activo'
       AND rol IN ('SUPER_ADMIN', 'SUPER_ADMIN_DEV')`
  )
  for (const a of admins || []) {
    await insertNotificacion({
      rutDestinatario: a.rut,
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
