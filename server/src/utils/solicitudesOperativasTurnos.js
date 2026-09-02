'use strict'

/**
 * @deprecated Reset unificado en Panel Central.
 * No insertar en solicitudes_operativas AUTH desde Rendiciones.
 */
async function crearSolicitudResetEnTurnos() {
  console.warn(
    '[solicitudesOperativasTurnos] crearSolicitudResetEnTurnos deprecado: usar Panel /api/public/solicitar-reset-password',
  )
  return { ok: false, skipped: true, reason: 'reset_password_moved_to_panel' }
}

module.exports = { crearSolicitudResetEnTurnos }
