const { query } = require('../config/db')

/**
 * Inserta un evento inmutable en audit_logs.
 * No aplica soft delete; nunca se altera retroactivamente.
 */
async function registrarAuditoria(usuario_id, usuario_nombre, accion, modulo, detalle) {
  await query(
    `INSERT INTO audit_logs (usuario_id, usuario_nombre, accion, modulo, detalle)
     VALUES (?, ?, ?, ?, ?)`,
    [
      usuario_id ?? null,
      usuario_nombre ?? null,
      accion,
      modulo,
      detalle
    ]
  )
}

module.exports = { registrarAuditoria }
