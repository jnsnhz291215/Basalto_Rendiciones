'use strict'

const { query } = require('../config/db')

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

/**
 * Tipos de docto UI: Boleta, Factura, Peaje, Guía Despacho.
 * Migra ENUM antiguo (Ticket Peaje) a VARCHAR flexible.
 * Flag es_legacy: imports Excel operativos sin comprobante (≠ tabla rendiciones_legacy).
 */
async function ensureRendicionesTipoDocto() {
  if (!(await tableExists('rendiciones_gastos'))) return

  const cols = await query(
    `SELECT DATA_TYPE, COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'rendiciones_gastos'
       AND COLUMN_NAME = 'tipo_documento'
     LIMIT 1`
  )
  if (cols[0]) {
    if (String(cols[0].DATA_TYPE).toLowerCase() === 'enum') {
      await query(
        `ALTER TABLE rendiciones_gastos
         MODIFY COLUMN tipo_documento VARCHAR(50) NOT NULL`
      )
    }

    await query(
      `UPDATE rendiciones_gastos
       SET tipo_documento = 'Peaje'
       WHERE tipo_documento = 'Ticket Peaje'`
    )
  }

  if (!(await columnExists('rendiciones_gastos', 'es_legacy'))) {
    await query(
      `ALTER TABLE rendiciones_gastos
       ADD COLUMN es_legacy TINYINT(1) NOT NULL DEFAULT 0
       COMMENT 'Import Excel sin comprobante; adjuntar después'`
    )
  }

  if (!(await columnExists('rendiciones_gastos', 'patente'))) {
    await query(
      `ALTER TABLE rendiciones_gastos
       ADD COLUMN patente VARCHAR(12) NULL
       COMMENT 'Patente normalizada XXXXNN (opcional)'
       AFTER numero_documento`
    )
  }
}

module.exports = { ensureRendicionesTipoDocto }
