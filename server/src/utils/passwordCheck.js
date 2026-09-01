'use strict'

const bcrypt = require('bcryptjs')

function normalizePasswordHash(raw) {
  let hash = String(raw || '').trim()
  if (
    (hash.startsWith('"') && hash.endsWith('"'))
    || (hash.startsWith("'") && hash.endsWith("'"))
  ) {
    hash = hash.slice(1, -1).trim()
  }
  if (hash.startsWith('$2y$')) {
    hash = `$2a$${hash.slice(4)}`
  }
  return hash
}

async function checkPassword(stored, input) {
  const hash = normalizePasswordHash(stored)
  if (!hash || !input) return false
  if (!hash.startsWith('$2')) return false
  return bcrypt.compare(String(input), hash)
}

function candidatosPasswordLogin(password, rutLimpio) {
  const original = String(password || '').trim()
  const limpiaUpper = original.replace(/[.\-\s]/g, '').toUpperCase()
  const out = []
  const push = (v) => {
    if (v && !out.includes(v)) out.push(v)
  }
  push(original)
  push(limpiaUpper)
  return out
}

async function checkPasswordAny(stored, password, rutLimpio) {
  for (const candidate of candidatosPasswordLogin(password, rutLimpio)) {
    if (await checkPassword(stored, candidate)) return candidate
  }
  return null
}

module.exports = {
  normalizePasswordHash,
  checkPassword,
  checkPasswordAny,
}
