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

/** Nombres de índices de una sola columna sobre `column`. */
async function singleColumnIndexes(table, column) {
  const rows = await query(
    `SELECT INDEX_NAME AS name, COLUMN_NAME AS col, SEQ_IN_INDEX AS seq
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME != 'PRIMARY'`,
    [table]
  )
  const byIndex = new Map()
  for (const r of rows) {
    if (!byIndex.has(r.name)) byIndex.set(r.name, [])
    byIndex.get(r.name).push({ col: r.col, seq: Number(r.seq) })
  }
  const names = []
  for (const [name, cols] of byIndex) {
    if (cols.length === 1 && cols[0].col === column) names.push(name)
  }
  return names
}

async function tryQuery(sql) {
  try {
    await query(sql)
    return true
  } catch (err) {
    // 1091 = can't DROP; 1061 = duplicate key name
    if (
      err.errno === 1091 ||
      err.errno === 1061 ||
      err.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
      err.code === 'ER_DUP_KEYNAME'
    ) {
      return false
    }
    throw err
  }
}

/**
 * - Quita índice duplicado en usuarios.rut (deja uno)
 * - Agrega índices útiles para listados/filtros por caja + fecha
 */
async function ensureIndexes() {
  // --- usuarios.rut: duplicado rut + idx_rend_usuarios_rut ---
  if (await tableExists('usuarios')) {
    const onRut = await singleColumnIndexes('usuarios', 'rut')
    if (onRut.length > 1) {
      // Preferir conservar el nombre corto `rut`; borrar el resto
      const toDrop = onRut.includes('rut')
        ? onRut.filter((n) => n !== 'rut')
        : onRut.slice(1)
      for (const name of toDrop) {
        const ok = await tryQuery(`ALTER TABLE usuarios DROP INDEX \`${name}\``)
        if (ok) console.log(`[indexes] DROP usuarios.${name} (duplicado en rut)`)
      }
    }
  }

  // --- anticipos(fecha) ---
  if (
    (await tableExists('anticipos')) &&
    (await columnExists('anticipos', 'fecha')) &&
    !(await indexExists('anticipos', 'idx_anticipos_fecha'))
  ) {
    const ok = await tryQuery(
      `ALTER TABLE anticipos ADD INDEX idx_anticipos_fecha (fecha)`
    )
    if (ok) console.log('[indexes] ADD anticipos.idx_anticipos_fecha')
  }

  // --- anticipos(caja_id, fecha, is_deleted) ---
  if (
    (await tableExists('anticipos')) &&
    (await columnExists('anticipos', 'caja_id')) &&
    (await columnExists('anticipos', 'fecha')) &&
    (await columnExists('anticipos', 'is_deleted')) &&
    !(await indexExists('anticipos', 'idx_anticipos_caja_fecha'))
  ) {
    const ok = await tryQuery(
      `ALTER TABLE anticipos ADD INDEX idx_anticipos_caja_fecha (caja_id, fecha, is_deleted)`
    )
    if (ok) console.log('[indexes] ADD anticipos.idx_anticipos_caja_fecha')
  }

  // --- rendiciones_gastos(caja_id, fecha_documento, is_deleted) ---
  if (
    (await tableExists('rendiciones_gastos')) &&
    (await columnExists('rendiciones_gastos', 'caja_id')) &&
    (await columnExists('rendiciones_gastos', 'fecha_documento')) &&
    (await columnExists('rendiciones_gastos', 'is_deleted')) &&
    !(await indexExists('rendiciones_gastos', 'idx_rendiciones_caja_fecha'))
  ) {
    const ok = await tryQuery(
      `ALTER TABLE rendiciones_gastos
       ADD INDEX idx_rendiciones_caja_fecha (caja_id, fecha_documento, is_deleted)`
    )
    if (ok) console.log('[indexes] ADD rendiciones_gastos.idx_rendiciones_caja_fecha')
  }

  // --- rendiciones_gastos.numero_documento UNIQUE (NULL/vacío no participa) ---
  await ensureUniqueNumeroDocumento()
}

/**
 * UNIQUE en numero_documento entre gastos activos:
 * - Vacío → NULL (varios NULL OK en MySQL UNIQUE)
 * - Soft-deleted: libera UNIQUE renombrando a {num}#DEL{id} (conservador)
 * - Si hay duplicados activos legacy: solo loguea; NO aplica UNIQUE (arranque seguro)
 * - Chequeo en código sigue siendo la fuente de verdad en create/update/import
 */
async function ensureUniqueNumeroDocumento() {
  if (
    !(await tableExists('rendiciones_gastos')) ||
    !(await columnExists('rendiciones_gastos', 'numero_documento'))
  ) {
    return
  }

  // Strings vacíos → NULL para que no choquen entre sí ni con el UNIQUE
  const emptied = await query(
    `UPDATE rendiciones_gastos
     SET numero_documento = NULL
     WHERE numero_documento IS NOT NULL
       AND TRIM(numero_documento) = ''`
  )
  if (Number(emptied.affectedRows) > 0) {
    console.log(
      `[indexes] numero_documento: ${emptied.affectedRows} vacío(s) → NULL`
    )
  }

  // Soft-deleted: liberar valor para reutilizar el N° en activos
  const softRows = await query(
    `SELECT id, numero_documento
     FROM rendiciones_gastos
     WHERE is_deleted = TRUE
       AND numero_documento IS NOT NULL
       AND TRIM(numero_documento) <> ''
       AND numero_documento NOT LIKE '%#DEL%'`
  )
  for (const row of softRows) {
    const freed = `${String(row.numero_documento)}#DEL${row.id}`.slice(0, 50)
    await query(
      `UPDATE rendiciones_gastos SET numero_documento = ? WHERE id = ?`,
      [freed, row.id]
    )
  }
  if (softRows.length) {
    console.log(
      `[indexes] numero_documento: liberados ${softRows.length} soft-deleted`
    )
  }

  if (await indexExists('rendiciones_gastos', 'uq_rendiciones_numero_documento')) {
    return
  }

  const dups = await query(
    `SELECT numero_documento AS num, COUNT(*) AS n, GROUP_CONCAT(id ORDER BY id) AS ids
     FROM rendiciones_gastos
     WHERE is_deleted = FALSE
       AND numero_documento IS NOT NULL
       AND TRIM(numero_documento) <> ''
     GROUP BY numero_documento
     HAVING n > 1
     LIMIT 20`
  )

  if (dups.length) {
    console.warn(
      '[indexes] uq_rendiciones_numero_documento NO aplicado: hay duplicados activos. ' +
        'Resuélvelos manualmente; el chequeo en API igual bloquea nuevos duplicados.'
    )
    for (const d of dups) {
      console.warn(
        `[indexes]   duplicado numero_documento="${d.num}" x${d.n} ids=${d.ids}`
      )
    }
    return
  }

  const ok = await tryQuery(
    `ALTER TABLE rendiciones_gastos
     ADD UNIQUE KEY uq_rendiciones_numero_documento (numero_documento)`
  )
  if (ok) {
    console.log('[indexes] ADD rendiciones_gastos.uq_rendiciones_numero_documento')
  }
}

module.exports = { ensureIndexes }
