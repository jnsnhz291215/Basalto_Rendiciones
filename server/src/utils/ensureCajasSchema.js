const { query } = require('../config/db')

let ready = false
let readyPromise = null

/** Errores esperables en ALTER idempotentes (migración). */
function isIgnorableSchemaError(err) {
  return (
    err.errno === 1091 || // can't drop
    err.errno === 1060 || // dup column
    err.errno === 1061 || // dup key name
    err.errno === 1062 || // dup entry
    err.errno === 1072 || // key column doesn't exist (índice legacy rotos)
    err.errno === 1005 ||
    err.errno === 1215 ||
    err.errno === 1216 ||
    err.errno === 1217 ||
    err.errno === 1451 ||
    err.errno === 1452 ||
    err.errno === 150 ||
    err.errno === 1826 ||
    err.errno === 1830 ||
    err.errno === 1832 ||
    err.errno === 1833 ||
    err.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
    err.code === 'ER_DUP_FIELDNAME' ||
    err.code === 'ER_DUP_KEYNAME' ||
    err.code === 'ER_DUP_ENTRY' ||
    err.code === 'ER_KEY_COLUMN_DOES_NOT_EXITS' ||
    err.code === 'ER_KEY_COLUMN_DOES_NOT_EXIST' ||
    err.code === 'ER_CANNOT_ADD_FOREIGN' ||
    err.code === 'ER_FK_CANNOT_OPEN_PARENT' ||
    err.code === 'ER_NO_REFERENCED_ROW_2'
  )
}

async function tryQuery(sql, params = []) {
  try {
    await query(sql, params)
    return true
  } catch (err) {
    if (isIgnorableSchemaError(err)) return false
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

async function listIndexNames(tableName) {
  const rows = await query(
    `SELECT DISTINCT INDEX_NAME AS name
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  )
  return rows.map((r) => r.name).filter(Boolean)
}

async function indexesUsingColumn(tableName, columnName) {
  const rows = await query(
    `SELECT DISTINCT INDEX_NAME AS name
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )
  return rows.map((r) => r.name).filter((n) => n && n !== 'PRIMARY')
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

    // Limpieza legacy: NUNCA debe tumbar el ensure (centros de cobro / listados)
    try {
      await migrateCajasChicasLegacy()
    } catch (err) {
      console.warn('[ensureCajasSchema] migrateCajasChicasLegacy:', err.message)
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

async function migrateCajasChicasLegacy() {
  // Consolidar duplicados activos por clave_interna
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

  // Evitar choque UNIQUE entre soft-deletes
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

  // Primero índices que usan columnas a eliminar (evita 1072 / estados rotos)
  const legacyCols = [
    'mes_asignado',
    'fondo_estimado_mes',
    'centro_costo',
    'responsable_id',
    'estado'
  ]
  for (const col of legacyCols) {
    if (!(await columnExists('cajas_chicas', col))) continue
    const idxs = await indexesUsingColumn('cajas_chicas', col)
    for (const idx of idxs) {
      await tryQuery(`ALTER TABLE cajas_chicas DROP INDEX \`${idx}\``)
    }
  }

  // Nombres conocidos por si information_schema no los listó
  for (const idx of ['uk_caja_clave_mes', 'idx_cajas_clave_mes', 'uk_cajas_clave_mes']) {
    const names = await listIndexNames('cajas_chicas')
    if (names.includes(idx)) {
      await tryQuery(`ALTER TABLE cajas_chicas DROP INDEX \`${idx}\``)
    }
  }

  for (const col of legacyCols) {
    if (await columnExists('cajas_chicas', col)) {
      await tryQuery(`ALTER TABLE cajas_chicas DROP COLUMN \`${col}\``)
    }
  }

  await tryQuery(
    `ALTER TABLE cajas_chicas ADD UNIQUE KEY uk_caja_nombre_interior (clave_interna)`
  )

  if (!(await columnExists('cajas_chicas', 'centro_cobro_id'))) {
    await tryQuery(
      `ALTER TABLE cajas_chicas ADD COLUMN centro_cobro_id INT NULL AFTER nombre_exterior`
    )
  }

  if (!(await constraintExists('cajas_chicas', 'fk_caja_centro_cobro'))) {
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
}

module.exports = { ensureCajasSchema }
