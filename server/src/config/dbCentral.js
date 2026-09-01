'use strict'

const mysql = require('mysql2/promise')
const { readEnvValue, authUsesCentral, orgCatalogUsesCentral } = require('./runtimeConfig')

const ALLOWED_CENTRAL_DB_LOWER = new Set([
  'basaltodrilling_central',
  'basaltodrilling_central_mock',
])

const BLOCKED_CENTRAL_DB_LOWER = new Set(['basalto', 'test', 'basalto_rendiciones'])

function assertCentralDbName(name) {
  const raw = String(name || '').trim()
  const lower = raw.toLowerCase()
  if (!raw) {
    throw new Error('[CENTRAL-DB] CENTRAL_DB_NAME es requerido cuando AUTH_SOURCE no es local.')
  }
  if (BLOCKED_CENTRAL_DB_LOWER.has(lower)) {
    throw new Error(`[CENTRAL-DB] CENTRAL_DB_NAME inválido: "${raw}" (no puede ser BD de negocio local).`)
  }
  if (!ALLOWED_CENTRAL_DB_LOWER.has(lower)) {
    throw new Error(
      '[CENTRAL-DB] CENTRAL_DB_NAME debe ser Basaltodrilling_Central o Basaltodrilling_Central_Mock.',
    )
  }
  return raw
}

function resolveCentralDbConfig() {
  if (!authUsesCentral() && !orgCatalogUsesCentral()) return null

  const database = assertCentralDbName(readEnvValue('CENTRAL_DB_NAME'))

  return {
    host: readEnvValue('CENTRAL_DB_HOST') || readEnvValue('DB_HOST') || '127.0.0.1',
    port: Number.parseInt(readEnvValue('CENTRAL_DB_PORT') || readEnvValue('DB_PORT') || '3306', 10),
    user: readEnvValue('CENTRAL_DB_USER') || readEnvValue('DB_USER') || 'root',
    password:
      readEnvValue('CENTRAL_DB_PASS')
      || readEnvValue('CENTRAL_DB_PASSWORD')
      || readEnvValue('DB_PASS')
      || readEnvValue('DB_PASSWORD')
      || '',
    database,
  }
}

let poolCentral = null

function getCentralPool() {
  const cfg = resolveCentralDbConfig()
  if (!cfg) return null
  if (!poolCentral) {
    poolCentral = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 3,
      namedPlaceholders: false,
      timezone: 'Z',
    })
  }
  return poolCentral
}

function isCentralConfigured() {
  try {
    return Boolean(resolveCentralDbConfig())
  } catch {
    return false
  }
}

async function queryCentral(sql, params = []) {
  const p = getCentralPool()
  if (!p) {
    throw new Error('[CENTRAL-DB] Pool no disponible (AUTH_SOURCE=local o CENTRAL_DB_* faltante).')
  }
  const [rows] = await p.execute(sql, params)
  return rows
}

;(async () => {
  if (!authUsesCentral() && !orgCatalogUsesCentral()) return
  try {
    const cfg = resolveCentralDbConfig()
    const p = getCentralPool()
    await p.query('SELECT 1 AS ok')
    console.log(`[CENTRAL-DB] OK db=${cfg.database}@${cfg.host}:${cfg.port}`)
  } catch (e) {
    console.error('[CENTRAL-DB] FAIL:', e.message)
  }
})()

module.exports = {
  getCentralPool,
  queryCentral,
  isCentralConfigured,
  resolveCentralDbConfig,
}
