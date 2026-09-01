'use strict'

function authLog(source, event, detail = '') {
  const src = String(source || 'local').toLowerCase()
  const tag = src === 'central' ? 'AUTH:central' : src === 'dual' ? 'AUTH:dual' : 'AUTH:local'
  const msg = detail ? `${event} · ${detail}` : event
  console.log(`[${tag}] ${msg}`)
}

function authWarn(source, event, detail = '') {
  const src = String(source || 'local').toLowerCase()
  const tag = src === 'central' ? 'AUTH:central' : src === 'dual' ? 'AUTH:dual' : 'AUTH:local'
  const msg = detail ? `${event} · ${detail}` : event
  console.warn(`[${tag}] ${msg}`)
}

module.exports = { authLog, authWarn }
