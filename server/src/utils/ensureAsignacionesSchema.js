'use strict'

const { query } = require('../config/db')

const SEED_BANCOS = [
  'BANCO DE CHILE',
  'BANCO ESTADO',
  'BANCO SANTANDER',
  'SANTANDER',
  'BCI',
  'BANCO BCI',
  'SCOTIABANK',
  'ITAU',
  'BANCO ITAU',
  'BANCO SECURITY',
  'BANCO FALABELLA',
  'BANCO RIPLEY',
  'BANCO CONSORCIO',
  'TENPO',
  'MACH',
  'MERCADO PAGO'
]

async function columnExists(table, column) {
  const rows = await query(
    `SELECT 1 AS ok
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  )
  return Boolean(rows[0])
}

async function tableExists(table) {
  const rows = await query(
    `SELECT 1 AS ok
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [table]
  )
  return Boolean(rows[0])
}

/**
 * - Columnas numero_cuenta / banco_origen en anticipos (UI: Asignación)
 * - Tabla bancos_origen para sugerencias (mayúsculas, unique)
 */
async function ensureAsignacionesSchema() {
  if (!(await tableExists('anticipos'))) return

  if (!(await columnExists('anticipos', 'numero_cuenta'))) {
    await query(
      `ALTER TABLE anticipos
       ADD COLUMN numero_cuenta VARCHAR(40) NULL AFTER monto`
    )
  }
  if (!(await columnExists('anticipos', 'banco_origen'))) {
    await query(
      `ALTER TABLE anticipos
       ADD COLUMN banco_origen VARCHAR(120) NULL AFTER numero_cuenta`
    )
  }

  if (!(await tableExists('bancos_origen'))) {
    await query(
      `CREATE TABLE bancos_origen (
         id INT AUTO_INCREMENT PRIMARY KEY,
         nombre VARCHAR(120) NOT NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         UNIQUE KEY uq_bancos_origen_nombre (nombre)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
  }

  for (const nombre of SEED_BANCOS) {
    try {
      await query(`INSERT IGNORE INTO bancos_origen (nombre) VALUES (?)`, [nombre])
    } catch {
      /* ignore */
    }
  }
}

function normalizeBancoNombre(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 120)
}

async function upsertBancoOrigen(nombreRaw) {
  const nombre = normalizeBancoNombre(nombreRaw)
  if (!nombre) return null
  await query(`INSERT IGNORE INTO bancos_origen (nombre) VALUES (?)`, [nombre])
  return nombre
}

module.exports = {
  ensureAsignacionesSchema,
  normalizeBancoNombre,
  upsertBancoOrigen
}
