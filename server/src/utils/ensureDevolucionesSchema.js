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

/**
 * Devoluciones: cierre de saldo entre trabajador y empresa
 * (trabajador → empresa o empresa → trabajador).
 */
async function ensureDevolucionesSchema() {
  if (await tableExists('devoluciones')) return

  await query(
    `CREATE TABLE devoluciones (
       id INT AUTO_INCREMENT PRIMARY KEY,
       codigo VARCHAR(20) NOT NULL,
       caja_id INT NOT NULL,
       trabajador_id INT NOT NULL,
       fecha DATE NOT NULL,
       monto DECIMAL(12, 2) NOT NULL,
       sentido ENUM('trabajador', 'empresa') NOT NULL
         COMMENT 'trabajador=devuelve a empresa; empresa=devuelve a trabajador',
       observacion TEXT NULL,
       comprobante_url TEXT NULL,
       is_deleted BOOLEAN DEFAULT FALSE,
       deleted_at DATETIME NULL,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       UNIQUE KEY uq_devoluciones_codigo (codigo),
       KEY idx_devoluciones_caja (caja_id, is_deleted),
       KEY idx_devoluciones_trabajador (trabajador_id, is_deleted),
       KEY idx_devoluciones_fecha (fecha),
       CONSTRAINT fk_devoluciones_caja
         FOREIGN KEY (caja_id) REFERENCES cajas_chicas(id) ON DELETE RESTRICT,
       CONSTRAINT fk_devoluciones_trabajador
         FOREIGN KEY (trabajador_id) REFERENCES trabajadores(id) ON DELETE RESTRICT
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )
}

module.exports = { ensureDevolucionesSchema }
