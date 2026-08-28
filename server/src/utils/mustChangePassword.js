'use strict'

const TEMP_PASSWORD_GRACE_DAYS = 7

const EXPIRED_MESSAGE =
  'Tu plazo de 7 días para cambiar la contraseña temporal ha vencido. ' +
  'Contacta a un administrador para que te asigne una nueva contraseña.'

function asFlag(value) {
  return Number(value) === 1 || value === true || value === '1'
}

function daysLeftFrom(startedAt) {
  if (!startedAt) return null
  const start = new Date(startedAt)
  if (Number.isNaN(start.getTime())) return null
  const ends = new Date(start.getTime() + TEMP_PASSWORD_GRACE_DAYS * 24 * 60 * 60 * 1000)
  const ms = ends.getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

function isGraceExpired(startedAt) {
  if (!startedAt) return false
  const left = daysLeftFrom(startedAt)
  return left !== null && left <= 0
}

function buildUserAuthFlags(row = {}) {
  const mustChange = asFlag(row.must_change_password)
  const graceStarted = row.temp_password_grace_started_at || null
  const daysLeft = mustChange ? daysLeftFrom(graceStarted) : null
  return {
    must_change_password: mustChange,
    temp_password_grace_started_at: graceStarted,
    temp_password_days_left: daysLeft,
    temp_password_expired: Boolean(mustChange && graceStarted && isGraceExpired(graceStarted)),
    accepted_email: row.accepted_email || null,
    accepted_privacy_at: row.accepted_privacy_at || null
  }
}

/** Genera clave temporal aleatoria (12 chars, sin ambigüedad 0/O/1/l). */
function generarPasswordTemporal(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function normalizeRut(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/\s+/g, '')
}

/** Rutas permitidas aunque la gracia haya expirado. */
function isTempPasswordWhitelist(method, path) {
  const p = String(path || '')
  const m = String(method || 'GET').toUpperCase()
  if (p === '/api/auth/me' && m === 'GET') return true
  if (p === '/api/auth/me' && m === 'PUT') return true
  if (p === '/api/auth/temp-password/dismiss' && m === 'POST') return true
  if (p === '/api/auth/logout') return true
  if (p.startsWith('/api/avisos/emergencia')) return true
  if (p === '/api/system/version') return true
  if (p === '/api/health') return true
  return false
}

module.exports = {
  TEMP_PASSWORD_GRACE_DAYS,
  EXPIRED_MESSAGE,
  asFlag,
  daysLeftFrom,
  isGraceExpired,
  buildUserAuthFlags,
  generarPasswordTemporal,
  normalizeRut,
  isTempPasswordWhitelist
}
