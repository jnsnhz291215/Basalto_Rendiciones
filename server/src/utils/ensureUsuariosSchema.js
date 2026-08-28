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

async function tableExists(tableName) {
  const rows = await query(
    `SELECT 1 AS ok
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  )
  return Boolean(rows[0])
}

async function addColumnIfMissing(table, column, ddl) {
  if (await columnExists(table, column)) return
  await query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}

/**
 * Permiso "persona de confianza" + QoL (must_change, consent, gracia).
 */
async function ensureUsuariosSchema() {
  if (!(await columnExists('usuarios', 'persona_confianza'))) {
    await query(
      `ALTER TABLE usuarios
       ADD COLUMN persona_confianza TINYINT(1) NOT NULL DEFAULT 0
       AFTER estado`
    )
  }

  await addColumnIfMissing(
    'usuarios',
    'must_change_password',
    `must_change_password TINYINT(1) NOT NULL DEFAULT 0`
  )
  await addColumnIfMissing(
    'usuarios',
    'temp_password_grace_started_at',
    `temp_password_grace_started_at DATETIME NULL DEFAULT NULL`
  )
  await addColumnIfMissing(
    'usuarios',
    'accepted_email',
    `accepted_email VARCHAR(190) NULL DEFAULT NULL`
  )
  await addColumnIfMissing(
    'usuarios',
    'accepted_privacy_at',
    `accepted_privacy_at DATETIME NULL DEFAULT NULL`
  )
}

async function ensureNotificacionesSchema() {
  if (!(await tableExists('notificaciones_inbox'))) {
    await query(`
      CREATE TABLE notificaciones_inbox (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        rut_destinatario VARCHAR(32) NOT NULL,
        titulo VARCHAR(120) NOT NULL DEFAULT 'Aviso',
        mensaje TEXT NOT NULL,
        modulo VARCHAR(40) NULL DEFAULT NULL,
        accion VARCHAR(80) NULL DEFAULT NULL,
        entidad_tipo VARCHAR(40) NULL DEFAULT NULL,
        entidad_id VARCHAR(64) NULL DEFAULT NULL,
        leido TINYINT(1) NOT NULL DEFAULT 0,
        leido_at DATETIME NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_notif_dest_leido (rut_destinatario, leido),
        KEY idx_notif_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
  }

  if (!(await tableExists('solicitudes_reset_password'))) {
    await query(`
      CREATE TABLE solicitudes_reset_password (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        rut VARCHAR(32) NOT NULL,
        correo_indicado VARCHAR(190) NULL DEFAULT NULL,
        estado ENUM('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
        detalle TEXT NULL,
        resolved_by INT NULL DEFAULT NULL,
        resolved_at DATETIME NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_reset_estado (estado, created_at),
        KEY idx_reset_rut (rut)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
  }
}

function isPersonaConfianza(value) {
  return value === true || value === 1 || value === '1'
}

module.exports = {
  ensureUsuariosSchema,
  ensureNotificacionesSchema,
  isPersonaConfianza
}
