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
}

module.exports = { ensureIndexes }
