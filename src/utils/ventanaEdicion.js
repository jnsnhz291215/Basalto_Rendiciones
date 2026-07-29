/** Espejo de `server/src/utils/helpers.js` — ventana admin para editar/borrar movimientos. */
export const VENTANA_EDICION_HORAS = 24

/**
 * @param {Date|string|number|null|undefined} createdAt — `created_at` ISO o `createdAtMs`
 * @param {number} [hours=24]
 */
export function estaDentroVentanaEdicion(createdAt, hours = VENTANA_EDICION_HORAS) {
  if (createdAt == null || createdAt === '') return false
  const t =
    createdAt instanceof Date
      ? createdAt.getTime()
      : typeof createdAt === 'number'
        ? createdAt
        : new Date(createdAt).getTime()
  if (!Number.isFinite(t) || t <= 0) return false
  const h = Number(hours)
  const ms = (Number.isFinite(h) && h > 0 ? h : VENTANA_EDICION_HORAS) * 60 * 60 * 1000
  return Date.now() - t <= ms
}

export function hintFueraVentanaEdicion(accion = 'editar') {
  const verb = accion === 'eliminar' ? 'eliminar' : 'editar'
  return `Fuera de la ventana de 24 horas: no se puede ${verb}`
}

export function hintVentanaEdicionActiva() {
  return `Puede editar o eliminar durante ${VENTANA_EDICION_HORAS} h desde la creación (Subido el)`
}
