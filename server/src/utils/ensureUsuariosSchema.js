'use strict'

const { query } = require('../config/db')

async function columnExists(tableName, columnName) {
  const rows = await query(
    `SELECT 1 AS ok
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  )
  return Boolean(rows[0])
}

/**
 * Permiso "persona de confianza": omite la validación IA de comprobantes.
 */
async function ensureUsuariosSchema() {
  if (!(await columnExists('usuarios', 'persona_confianza'))) {
    await query(
      `ALTER TABLE usuarios
       ADD COLUMN persona_confianza TINYINT(1) NOT NULL DEFAULT 0
       AFTER estado`
    )
  }
}

function isPersonaConfianza(value) {
  return value === true || value === 1 || value === '1'
}

module.exports = { ensureUsuariosSchema, isPersonaConfianza }
