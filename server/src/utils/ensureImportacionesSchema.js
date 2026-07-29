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

async function indexExists(table, indexName) {
  const rows = await query(
    `SELECT 1 AS ok
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [table, indexName]
  )
  return Boolean(rows[0])
}

/**
 * Lotes de importación Excel (gastos / asignaciones) + FK suave en filas creadas.
 *
 * estado (flujo): pendiente | confirmado | anulado
 * (legado completo/parcial/fallido se migra a pendiente)
 */
async function ensureImportacionesSchema() {
  if (!(await tableExists('importaciones_lotes'))) {
    await query(
      `CREATE TABLE importaciones_lotes (
         id INT AUTO_INCREMENT PRIMARY KEY,
         tipo VARCHAR(20) NOT NULL COMMENT 'gastos | asignaciones',
         archivo_nombre VARCHAR(255) NULL,
         usuario_id INT NULL,
         usuario_nombre VARCHAR(150) NULL,
         estado VARCHAR(30) NOT NULL DEFAULT 'pendiente'
           COMMENT 'pendiente | confirmado | anulado',
         confirmado_at DATETIME NULL,
         confirmado_por_id INT NULL,
         confirmado_por_nombre VARCHAR(150) NULL,
         creados INT NOT NULL DEFAULT 0,
         errores_count INT NOT NULL DEFAULT 0,
         omitidos_count INT NOT NULL DEFAULT 0,
         errores_json JSON NULL,
         detalle_creados_json JSON NULL,
         conflictos_json JSON NULL,
         omitidos_json JSON NULL,
         is_deleted BOOLEAN DEFAULT FALSE,
         deleted_at DATETIME NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
  } else {
    if (!(await columnExists('importaciones_lotes', 'confirmado_at'))) {
      await query(
        `ALTER TABLE importaciones_lotes
         ADD COLUMN confirmado_at DATETIME NULL
         COMMENT 'Momento de confirmación del lote'`
      )
    }
    if (!(await columnExists('importaciones_lotes', 'confirmado_por_id'))) {
      await query(
        `ALTER TABLE importaciones_lotes
         ADD COLUMN confirmado_por_id INT NULL`
      )
    }
    if (!(await columnExists('importaciones_lotes', 'confirmado_por_nombre'))) {
      await query(
        `ALTER TABLE importaciones_lotes
         ADD COLUMN confirmado_por_nombre VARCHAR(150) NULL`
      )
    }
    if (!(await columnExists('importaciones_lotes', 'conflictos_json'))) {
      await query(
        `ALTER TABLE importaciones_lotes
         ADD COLUMN conflictos_json JSON NULL
         COMMENT 'Conflictos N° documento pendientes de resolución'`
      )
    }
    if (!(await columnExists('importaciones_lotes', 'omitidos_json'))) {
      await query(
        `ALTER TABLE importaciones_lotes
         ADD COLUMN omitidos_json JSON NULL
         COMMENT 'Filas omitidas (duplicado idéntico u omitidas por resolución)'`
      )
    }
    if (!(await columnExists('importaciones_lotes', 'omitidos_count'))) {
      await query(
        `ALTER TABLE importaciones_lotes
         ADD COLUMN omitidos_count INT NOT NULL DEFAULT 0`
      )
    }

    // Migrar estados de calidad legacy → flujo pendiente
    await query(
      `UPDATE importaciones_lotes
       SET estado = 'pendiente'
       WHERE is_deleted = FALSE
         AND estado IN ('completo', 'parcial', 'fallido', 'borrador', 'sin_confirmar')`
    )
  }

  if (await tableExists('rendiciones_gastos')) {
    if (!(await columnExists('rendiciones_gastos', 'importacion_lote_id'))) {
      await query(
        `ALTER TABLE rendiciones_gastos
         ADD COLUMN importacion_lote_id INT NULL
         COMMENT 'Lote de import Excel'`
      )
    }
    if (!(await indexExists('rendiciones_gastos', 'idx_rendiciones_importacion_lote'))) {
      await query(
        `ALTER TABLE rendiciones_gastos
         ADD INDEX idx_rendiciones_importacion_lote (importacion_lote_id)`
      )
    }
  }

  if (await tableExists('anticipos')) {
    if (!(await columnExists('anticipos', 'importacion_lote_id'))) {
      await query(
        `ALTER TABLE anticipos
         ADD COLUMN importacion_lote_id INT NULL
         COMMENT 'Lote de import Excel'`
      )
    }
    if (!(await indexExists('anticipos', 'idx_anticipos_importacion_lote'))) {
      await query(
        `ALTER TABLE anticipos
         ADD INDEX idx_anticipos_importacion_lote (importacion_lote_id)`
      )
    }
  }
}

module.exports = { ensureImportacionesSchema }
