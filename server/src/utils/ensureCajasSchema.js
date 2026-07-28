const { query } = require('../config/db')

let ready = false
let readyPromise = null

async function tryQuery(sql, params = []) {
  try {
    await query(sql, params)
    return true
  } catch (err) {
    // Errores esperables en migraciones idempotentes
    if (
      err.errno === 1091 || // can't drop
      err.errno === 1060 || // dup column
      err.errno === 1061 || // dup key name
      err.errno === 1062 || // dup entry (unique)
      err.errno === 1005 || // can't create table / FK
      err.errno === 1215 || // cannot add foreign key
      err.errno === 1216 ||
      err.errno === 1217 ||
      err.errno === 1451 ||
      err.errno === 1452 || // FK constraint fails
      err.errno === 150 ||
      err.errno === 1826 ||
      err.errno === 1830 ||
      err.errno === 1832 ||
      err.errno === 1833 ||
      err.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
      err.code === 'ER_DUP_FIELDNAME' ||
      err.code === 'ER_DUP_KEYNAME' ||
      err.code === 'ER_DUP_ENTRY' ||
      err.code === 'ER_CANNOT_ADD_FOREIGN' ||
      err.code === 'ER_FK_CANNOT_OPEN_PARENT' ||
      err.code === 'ER_NO_REFERENCED_ROW_2'
    ) {
      return false
    }
    throw err
  }
}

async function tableExists(tableName) {
  const rows = await query(
    `SELECT 1 AS ok
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  )
  return Boolean(rows[0])
}

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

async function constraintExists(tableName, constraintName) {
  const rows = await query(
    `SELECT 1 AS ok
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
     LIMIT 1`,
    [tableName, constraintName]
  )
  return Boolean(rows[0])
}

/**
 * centros_costo: id + nombre
 * cajas_chicas: nombre_exterior + centro_cobro_id (agrupador = CC)
 * clave_interna: clave técnica auto (compat. selectores / trabajador_cajas)
 */
async function ensureCajasSchema() {
  if (ready) return
  if (readyPromise) return readyPromise

  readyPromise = (async () => {
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

    // Migración desde versión con columna codigo (NOT NULL)
    if (await columnExists('centros_costo', 'codigo')) {
      // Rellenar nombre vacío desde codigo antes de dropear
      await tryQuery(`
        UPDATE centros_costo
        SET nombre = codigo
        WHERE (nombre IS NULL OR TRIM(nombre) = '')
          AND codigo IS NOT NULL AND TRIM(codigo) <> ''
      `)
      await tryQuery(`
        UPDATE centros_costo
        SET nombre = CONCAT('CC-', id)
        WHERE nombre IS NULL OR TRIM(nombre) = ''
      `)
      // Si aún no se puede dropear (p.ej. FK), al menos evitar INSERT fallidos
      await tryQuery(`ALTER TABLE centros_costo MODIFY codigo VARCHAR(50) NULL`)
      await tryQuery(`ALTER TABLE centros_costo DROP INDEX uk_centros_costo_codigo`)
      await tryQuery(`ALTER TABLE centros_costo DROP COLUMN codigo`)
    }

    await tryQuery(`
      UPDATE centros_costo
      SET nombre = CONCAT('CC-', id)
      WHERE nombre IS NULL OR TRIM(nombre) = ''
    `)
    await tryQuery(`ALTER TABLE centros_costo MODIFY nombre VARCHAR(150) NOT NULL`)
    await tryQuery(`ALTER TABLE centros_costo ADD UNIQUE KEY uk_centros_costo_nombre (nombre)`)

    if (!(await tableExists('cajas_chicas'))) {
      await query(`
        CREATE TABLE cajas_chicas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          clave_interna VARCHAR(50) NOT NULL,
          nombre_exterior VARCHAR(150) NOT NULL,
          centro_cobro_id INT NULL,
          is_deleted BOOLEAN DEFAULT FALSE,
          deleted_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_caja_nombre_interior (clave_interna),
          CONSTRAINT fk_caja_centro_cobro
            FOREIGN KEY (centro_cobro_id) REFERENCES centros_costo(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB
      `)
      ready = true
      return
    }

    // Consolidar duplicados activos de cajas por clave_interna
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

    // Evitar choque de UNIQUE entre filas soft-deleted con la misma clave
    try {
      await query(`
        UPDATE cajas_chicas c
        INNER JOIN (
          SELECT clave_interna, MAX(id) AS keep_id
          FROM cajas_chicas
          GROUP BY clave_interna
          HAVING COUNT(*) > 1
        ) d ON c.clave_interna = d.clave_interna AND c.id <> d.keep_id
        SET c.clave_interna = CONCAT(c.clave_interna, '_DEL_', c.id)
        WHERE c.is_deleted = TRUE
      `)
    } catch (err) {
      console.warn('[ensureCajasSchema] rename deleted dupes:', err.message)
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

    if (!(await columnExists('cajas_chicas', 'centro_cobro_id'))) {
      await tryQuery(
        `ALTER TABLE cajas_chicas ADD COLUMN centro_cobro_id INT NULL AFTER nombre_exterior`
      )
    }

    if (!(await constraintExists('cajas_chicas', 'fk_caja_centro_cobro'))) {
      // Limpiar huérfanos antes de FK
      await tryQuery(`
        UPDATE cajas_chicas c
        LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id
        SET c.centro_cobro_id = NULL
        WHERE c.centro_cobro_id IS NOT NULL AND cc.id IS NULL
      `)
      await tryQuery(`
        ALTER TABLE cajas_chicas
        ADD CONSTRAINT fk_caja_centro_cobro
          FOREIGN KEY (centro_cobro_id) REFERENCES centros_costo(id) ON DELETE RESTRICT
      `)
    }

    ready = true
  })()

  try {
    await readyPromise
  } catch (err) {
    readyPromise = null
    throw err
  }
}

module.exports = { ensureCajasSchema }
