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

/** basalto | dual | central — catálogo centros_costo unificado */
function resolveOrgCatalogSource() {
  const raw = String(readEnvValue('ORG_CATALOG_SOURCE') || 'basalto').trim().toLowerCase()
  if (raw === 'dual' || raw === 'central') return raw
  return 'basalto'
}

function orgCatalogUsesCentral() {
  const src = resolveOrgCatalogSource()
  return src === 'central' || src === 'dual'
}

function logAuthBanner() {
  const authSource = resolveAuthSource()
  console.log(`[ENV] AUTH_SOURCE=${authSource}${authUsesCentral() ? ' · central=on' : ''}`)
  const orgSrc = resolveOrgCatalogSource()
  if (orgCatalogUsesCentral()) {
    console.log(`[ENV] ORG_CATALOG_SOURCE=${orgSrc} · centros_costo en Basaltodrilling_Central`)
  }
}

module.exports = {
  readEnvValue,
  resolveAuthSource,
  authUsesCentral,
  resolveOrgCatalogSource,
  orgCatalogUsesCentral,
  logAuthBanner,
}
