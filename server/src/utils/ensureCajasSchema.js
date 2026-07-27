const { query } = require('../config/db')

let ready = false

async function tryQuery(sql, params = []) {
  try {
    await query(sql, params)
    return true
  } catch (err) {
    if (
      err.errno === 1091 ||
      err.errno === 1060 ||
      err.errno === 1061 ||
      err.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
      err.code === 'ER_DUP_FIELDNAME' ||
      err.code === 'ER_DUP_KEYNAME'
    ) {
      return false
    }
    throw err
  }
}

/**
 * centros_costo: id + nombre
 * cajas_chicas: nombre_exterior + clave_interna + centro_cobro_id
 */
async function ensureCajasSchema() {
  if (ready) return

  await query(`
    CREATE TABLE IF NOT EXISTS centros_costo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_centros_costo_nombre (nombre)
    ) ENGINE=InnoDB
  `)

  // Migración desde versión con columna codigo
  await tryQuery(`ALTER TABLE centros_costo DROP INDEX uk_centros_costo_codigo`)
  await tryQuery(`ALTER TABLE centros_costo DROP COLUMN codigo`)
  // Si la tabla vieja tenía nombre NULL, rellenar y forzar NOT NULL
  try {
    await query(`UPDATE centros_costo SET nombre = CONCAT('CC-', id) WHERE nombre IS NULL OR TRIM(nombre) = ''`)
  } catch (_) {
    /* ignore */
  }
  await tryQuery(`ALTER TABLE centros_costo MODIFY nombre VARCHAR(150) NOT NULL`)
  await tryQuery(`ALTER TABLE centros_costo ADD UNIQUE KEY uk_centros_costo_nombre (nombre)`)

  // Consolidar duplicados de cajas por clave_interna
  try {
    await query(`
      UPDATE cajas_chicas c
      INNER JOIN (
        SELECT clave_interna, MAX(id) AS keep_id
        FROM cajas_chicas
        WHERE is_deleted = FALSE
        GROUP BY clave_interna
        HAVING COUNT(*) > 1
      ) d ON c.clave_interna = d.clave_interna AND c.id <> d.keep_id
      SET c.is_deleted = TRUE, c.deleted_at = NOW()
      WHERE c.is_deleted = FALSE
    `)
  } catch (err) {
    console.warn('[ensureCajasSchema] consolidate:', err.message)
  }

  const fks = await query(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'cajas_chicas'
       AND COLUMN_NAME = 'responsable_id'
       AND REFERENCED_TABLE_NAME IS NOT NULL`
  )
  for (const fk of fks) {
    await tryQuery(`ALTER TABLE cajas_chicas DROP FOREIGN KEY \`${fk.name}\``)
  }

  await tryQuery(`ALTER TABLE cajas_chicas DROP INDEX uk_caja_clave_mes`)
  await tryQuery(`ALTER TABLE cajas_chicas DROP INDEX idx_cajas_clave_mes`)
  await tryQuery(`ALTER TABLE cajas_chicas DROP COLUMN responsable_id`)
  await tryQuery(`ALTER TABLE cajas_chicas DROP COLUMN centro_costo`)
  await tryQuery(`ALTER TABLE cajas_chicas DROP COLUMN mes_asignado`)
  await tryQuery(`ALTER TABLE cajas_chicas DROP COLUMN fondo_estimado_mes`)
  await tryQuery(`ALTER TABLE cajas_chicas DROP COLUMN estado`)
  await tryQuery(
    `ALTER TABLE cajas_chicas ADD UNIQUE KEY uk_caja_nombre_interior (clave_interna)`
  )

  await tryQuery(
    `ALTER TABLE cajas_chicas ADD COLUMN centro_cobro_id INT NULL AFTER nombre_exterior`
  )

  // FK a centros_costo (si aún no existe)
  const fkCc = await query(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'cajas_chicas'
       AND COLUMN_NAME = 'centro_cobro_id'
       AND REFERENCED_TABLE_NAME = 'centros_costo'`
  )
  if (!fkCc.length) {
    await tryQuery(`
      ALTER TABLE cajas_chicas
      ADD CONSTRAINT fk_caja_centro_cobro
        FOREIGN KEY (centro_cobro_id) REFERENCES centros_costo(id) ON DELETE RESTRICT
    `)
  }

  ready = true
}

module.exports = { ensureCajasSchema }
