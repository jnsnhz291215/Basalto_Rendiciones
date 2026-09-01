const { query } = require('../config/db')

/**
 * Inserta un evento inmutable en audit_logs.
 * Con identidad Central: central_usuario_id + actor_rut; usuario_id local queda NULL.
 */
async function registrarAuditoria(usuario_id, usuario_nombre, accion, modulo, detalle, opts = {}) {
  const identitySource = String(opts.identity_source || '').toLowerCase()
  const isCentral = identitySource === 'central'
  const centralId = opts.central_usuario_id ?? (isCentral ? usuario_id : null)
  const actorRut = opts.actor_rut ?? null
  const localId = isCentral ? null : (usuario_id ?? null)

  try {
    await query(
      `INSERT INTO audit_logs (usuario_id, central_usuario_id, actor_rut, usuario_nombre, accion, modulo, detalle)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        localId,
        centralId ?? null,
        actorRut,
        usuario_nombre ?? null,
        accion,
        modulo,
        detalle
      ]
    )
  } catch (err) {
    if (err?.code === 'ER_BAD_FIELD_ERROR' || err?.errno === 1054) {
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
      return
    }
    throw err
  }
}

/** Normaliza valor escalar para comparar / mostrar en detalle. */
function valorAuditoria(v) {
  if (v == null) return ''
  if (Array.isArray(v)) {
    return [...v].map((x) => String(x).trim()).filter(Boolean).sort().join(', ')
  }
  return String(v).trim()
}

/**
 * Identifica a la persona afectada (correo / nombre / RUT), no solo id.
 * Ej: "Usuario rdelavega@basaltodrilling.cl (Rodrigo De La Vega, RUT 12345678K)"
 */
function identificarEntidad(etiqueta, { correo, nombre, rut, id } = {}) {
  const correoClean = valorAuditoria(correo)
  const nombreClean = valorAuditoria(nombre)
  const rutClean = valorAuditoria(rut)
  const extras = []
  if (nombreClean) extras.push(nombreClean)
  if (rutClean) extras.push(`RUT ${rutClean}`)

  let who
  if (correoClean) {
    who = extras.length ? `${correoClean} (${extras.join(', ')})` : correoClean
  } else if (nombreClean) {
    who = rutClean ? `${nombreClean} (RUT ${rutClean})` : nombreClean
  } else if (rutClean) {
    who = `RUT ${rutClean}`
  } else if (id != null && id !== '') {
    who = `id=${id}`
  } else {
    who = 'desconocido'
  }
  return `${etiqueta} ${who}`
}

/**
 * Agrega un cambio si antes ≠ después.
 * @param {Array<{campo: string, antes: string, despues: string}|{texto: string}>} cambios
 */
function pushCambio(cambios, campo, antes, despues) {
  const a = valorAuditoria(antes)
  const b = valorAuditoria(despues)
  if (a === b) return
  cambios.push({ campo, antes: a || '(vacío)', despues: b || '(vacío)' })
}

/** Marca restablecimiento de contraseña sin registrar el valor. */
function pushPasswordReset(cambios) {
  cambios.push({ texto: 'contraseña restablecida' })
}

/**
 * Arma detalle legible: "Entidad …: rol A → B" o varios "campo: antes → después".
 * Si no hay cambios: "…: sin cambios de datos".
 */
function formatearDetalleCambio(identidad, cambios) {
  if (!cambios || cambios.length === 0) {
    return `${identidad}: sin cambios de datos`
  }

  const partes = cambios.map((c) => {
    if (c.texto) return c.texto
    if (cambios.length === 1) {
      return `${c.campo} ${c.antes} → ${c.despues}`
    }
    return `${c.campo}: ${c.antes} → ${c.despues}`
  })

  return `${identidad}: ${partes.join('; ')}`
}

module.exports = {
  registrarAuditoria,
  identificarEntidad,
  pushCambio,
  pushPasswordReset,
  formatearDetalleCambio,
  valorAuditoria
}
