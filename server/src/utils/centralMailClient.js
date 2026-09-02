'use strict'

/**
 * Cliente HTTP → Panel Central mail hub.
 * Env: CENTRAL_MAIL_URL (o PANEL_ADMIN_URL) + CENTRAL_MAIL_SECRET
 */

function readEnv(name) {
  const raw = String(process.env[name] || '').trim()
  if (!raw) return ''
  if (raw.startsWith('[') && raw.endsWith(']')) return raw.slice(1, -1).trim()
  return raw
}

function getCentralMailBaseUrl() {
  const fromEnv = readEnv('CENTRAL_MAIL_URL') || readEnv('PANEL_ADMIN_URL')
  return fromEnv.replace(/\/+$/, '')
}

function getCentralMailSecret() {
  return readEnv('CENTRAL_MAIL_SECRET')
}

function isCentralMailConfigured() {
  const url = getCentralMailBaseUrl()
  const secret = getCentralMailSecret()
  return Boolean(url && secret && secret.length >= 32)
}

async function sendMailViaCentral({ to, subject, html, replyTo, attachments } = {}) {
  if (!isCentralMailConfigured()) {
    throw new Error(
      'Correo Central no configurado. Define CENTRAL_MAIL_URL (o PANEL_ADMIN_URL) y CENTRAL_MAIL_SECRET (≥32).',
    )
  }

  const base = getCentralMailBaseUrl()
  const secret = getCentralMailSecret()
  const url = `${base}/api/internal/mail/send`

  const body = { to, subject, html }
  if (replyTo) body.replyTo = replyTo
  if (Array.isArray(attachments) && attachments.length) body.attachments = attachments

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok || !data?.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`
    throw new Error(`Central mail send failed: ${msg}`)
  }

  console.log(`[MAIL] OK via Central → ${Array.isArray(to) ? to.join(',') : to} | "${subject}"`)
  return { messageId: data.messageId || null }
}

async function sendMailSafeViaCentral(opts) {
  try {
    return await sendMailViaCentral(opts)
  } catch (err) {
    console.error(`[MAIL][ERROR] Fallo Central a ${opts?.to}: ${err.message}`)
    return null
  }
}

module.exports = {
  isCentralMailConfigured,
  sendMailViaCentral,
  sendMailSafeViaCentral,
  getCentralMailBaseUrl,
}
