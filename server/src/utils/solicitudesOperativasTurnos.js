'use strict'

const { queryTurnos } = require('../config/dbTurnos')
const { normalizeRut } = require('./mustChangePassword')

/**
 * Inserta una solicitud PENDIENTE en la campana de Turnos SPA
 * (`solicitudes_operativas`), para que Super Admins la aprueben allí.
 *
 * @returns {Promise<number|null>} insertId o null si TURNOS_DB no disponible
 */
async function crearSolicitudResetEnTurnos({
  rut,
  emailIndicado,
  emailFicha = '',
  nombre = '',
  tipoCuenta = 'trabajador',
  solicitudLocalId = null
}) {
  const rutLimpio = normalizeRut(rut)
  if (!rutLimpio) return null

  const email = String(emailIndicado || '').trim().toLowerCase()
  const ficha = String(emailFicha || '').trim().toLowerCase()
  const tipo =
    String(tipoCuenta || '').toLowerCase() === 'administrador'
      ? 'administrador'
      : 'trabajador'

  const detalle = [
    'Origen: Rendiciones',
    `Tipo cuenta: ${tipo}`,
    `Nombre: ${nombre || '—'}`,
    `Correo indicado: ${email || '—'}`,
    ficha
      ? `Correo en ficha: ${ficha}`
      : 'Correo en ficha: (sin correo guardado — usar el indicado al resetear)',
    solicitudLocalId != null ? `Solicitud Rendiciones #${solicitudLocalId}` : '',
    'Acción: restablecer contraseña del módulo Rendiciones. Entregar clave temporal al usuario (sin SMTP en Rendiciones).'
  ]
    .filter(Boolean)
    .join('\n')

  // Evitar duplicados en Turnos
  const dup = await queryTurnos(
    `SELECT id
     FROM solicitudes_operativas
     WHERE REPLACE(REPLACE(REPLACE(UPPER(rut_solicitante), '.', ''), '-', ''), ' ', '') = ?
       AND UPPER(modulo) = 'AUTH'
       AND UPPER(accion_solicitada) = 'SOLICITAR_RESET_PASSWORD'
       AND estado = 'PENDIENTE'
     LIMIT 1`,
    [rutLimpio]
  )
  if (dup?.[0]?.id) {
    return Number(dup[0].id)
  }

  const result = await queryTurnos(
    `INSERT INTO solicitudes_operativas
      (rut_solicitante, modulo, accion_solicitada, entidad_tipo, entidad_id, detalle, estado)
     VALUES (?, 'AUTH', 'SOLICITAR_RESET_PASSWORD', 'USUARIO', ?, ?, 'PENDIENTE')`,
    [rutLimpio, rutLimpio, detalle]
  )

  return result?.insertId != null ? Number(result.insertId) : null
}

module.exports = { crearSolicitudResetEnTurnos }
