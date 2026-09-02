const { query } = require('../config/db')
const { authUsesCentral, resolveAuthSource } = require('../config/runtimeConfig')

/**
 * Inserta un evento inmutable en audit_logs.
 * Con AUTH_SOURCE=central: usuario_id local queda NULL; se guarda central_usuario_id / actor_rut.
 * No tumba la request si falla la inserción.
 */
async function registrarAuditoria(usuario_id, usuario_nombre, accion, modulo, detalle, opts = {}) {
  const identitySource = String(opts.identity_source || '').toLowerCase()
  const forceCentral =
    identitySource === 'central' ||
    (authUsesCentral() && resolveAuthSource() === 'central')

  const centralId = opts.central_usuario_id ?? (forceCentral ? usuario_id : null)
  const actorRut = opts.actor_rut ?? null
  const localId = forceCentral ? null : (usuario_id ?? null)

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
    if (
      err?.code === 'ER_BAD_FIELD_ERROR' ||
      err?.errno === 1054 ||
      err?.code === 'ER_NO_REFERENCED_ROW_2' ||
      err?.errno === 1452
    ) {
      try {
        await query(
          `INSERT INTO audit_logs (usuario_id, usuario_nombre, accion, modulo, detalle)
           VALUES (?, ?, ?, ?, ?)`,
          [
            // Nunca insertar id Central en FK local
            forceCentral ? null : localId,
            usuario_nombre ?? null,
            accion,
            modulo,
            detalle
          ]
        )
      } catch (fallbackErr) {
        console.error('[registrarAuditoria] fallback FAIL:', fallbackErr.message)
      }
      return
    }
    console.error('[registrarAuditoria] FAIL:', err.message)
  }
}

/**
 * Atajo: pasa req para rellenar actor Central (rut + identity).
 */
function auditOptsFromReq(req) {
  const source = String(req?.user?.identity_source || '').toLowerCase()
  if (source === 'central' || (authUsesCentral() && resolveAuthSource() === 'central')) {
    return {
      identity_source: 'central',
      central_usuario_id: req.user?.central_id ?? req.user?.id ?? null,
      actor_rut: req.user?.rut ?? null,
    }
  }
  return {}
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
  auditOptsFromReq,
  identificarEntidad,
  pushCambio,
  pushPasswordReset,
  formatearDetalleCambio,
  valorAuditoria
}
