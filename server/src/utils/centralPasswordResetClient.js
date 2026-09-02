'use strict'

/**
 * Forward de solicitud de reset → Panel Central (cola unificada).
 * Env: CENTRAL_MAIL_URL o PANEL_ADMIN_URL (base del Panel).
 */

function readEnv(name) {
  const raw = String(process.env[name] || '').trim()
  if (!raw) return ''
  if (raw.startsWith('[') && raw.endsWith(']')) return raw.slice(1, -1).trim()
  return raw
}

function getPanelBaseUrl() {
  const fromEnv = readEnv('CENTRAL_MAIL_URL') || readEnv('PANEL_ADMIN_URL')
  return fromEnv.replace(/\/+$/, '')
}

function isCentralPasswordResetConfigured() {
  return Boolean(getPanelBaseUrl())
}

/**
 * @param {{ rut: string, email: string, origen: 'turnos'|'rendiciones'|'panel', detalle?: string }} opts
 * @returns {Promise<{ ok: boolean, status: number, body: any }>}
 */
async function forwardSolicitarResetPassword({ rut, email, origen, detalle }) {
  const base = getPanelBaseUrl()
  if (!base) {
    const err = new Error('Panel URL no configurada (CENTRAL_MAIL_URL / PANEL_ADMIN_URL)')
    err.code = 'panel_url_missing'
    throw err
  }

  const url = `${base}/api/public/solicitar-reset-password`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Reset-Origen': String(origen || 'panel'),
    },
    body: JSON.stringify({
      rut,
      email,
      origen: origen || 'panel',
      detalle: detalle || undefined,
    }),
  })

  let body = null
  try {
    body = await res.json()
  } catch {
    body = { success: false, error: 'Respuesta inválida del Panel' }
  }

  return { ok: res.ok, status: res.status, body }
}

/**
 * @param {{ rut: string, sistema: 'turnos'|'rendiciones', origen?: string, detalle?: string }} opts
 */
async function forwardSolicitarAccesoSistema({ rut, sistema, origen, detalle }) {
  const base = getPanelBaseUrl()
  if (!base) {
    const err = new Error('Panel URL no configurada (CENTRAL_MAIL_URL / PANEL_ADMIN_URL)')
    err.code = 'panel_url_missing'
    throw err
  }

  const url = `${base}/api/public/solicitar-acceso-sistema`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Acceso-Origen': String(origen || 'panel'),
    },
    body: JSON.stringify({
      rut,
      sistema,
      origen: origen || 'panel',
      detalle: detalle || undefined,
    }),
  })

  let body = null
  try {
    body = await res.json()
  } catch {
    body = { success: false, error: 'Respuesta inválida del Panel' }
  }

  return { ok: res.ok, status: res.status, body }
}

module.exports = {
  getPanelBaseUrl,
  isCentralPasswordResetConfigured,
  forwardSolicitarResetPassword,
  forwardSolicitarAccesoSistema,
}
