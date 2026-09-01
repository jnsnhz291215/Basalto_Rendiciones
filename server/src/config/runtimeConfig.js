'use strict'

function readEnvValue(name) {
  const raw = String(process.env[name] || '').trim()
  if (!raw) return ''
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).trim()
  }
  return raw
}

/** local | dual | central */
function resolveAuthSource() {
  const v = readEnvValue('AUTH_SOURCE').toLowerCase()
  if (v === 'dual' || v === 'central') return v
  return 'local'
}

function authUsesCentral() {
  return resolveAuthSource() !== 'local'
}

function logAuthBanner() {
  const authSource = resolveAuthSource()
  console.log(`[ENV] AUTH_SOURCE=${authSource}${authUsesCentral() ? ' · central=on' : ''}`)
}

module.exports = {
  readEnvValue,
  resolveAuthSource,
  authUsesCentral,
  logAuthBanner,
}
