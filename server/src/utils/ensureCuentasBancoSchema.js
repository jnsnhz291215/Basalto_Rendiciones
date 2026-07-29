'use strict'

const { query } = require('../config/db')
const { normalizeNumeroCuenta } = require('./excelImport')
const { normalizeBancoNombre, upsertBancoOrigen } = require('./ensureAsignacionesSchema')

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
 * Catálogo 1:1 número de cuenta → banco.
 * Soft delete libera el UNIQUE renombrando numero_cuenta.
 */
async function ensureCuentasBancoSchema() {
  if (!(await tableExists('cuentas_banco'))) {
    await query(
      `CREATE TABLE cuentas_banco (
         id INT AUTO_INCREMENT PRIMARY KEY,
         numero_cuenta VARCHAR(40) NOT NULL,
         banco VARCHAR(120) NOT NULL,
         is_deleted BOOLEAN DEFAULT FALSE,
         deleted_at DATETIME NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         UNIQUE KEY uq_cuentas_banco_numero (numero_cuenta)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
  }

  // Backfill desde anticipos existentes (pares únicos)
  if (await tableExists('anticipos')) {
    try {
      const rows = await query(
        `SELECT numero_cuenta, banco_origen
         FROM anticipos
         WHERE is_deleted = FALSE
           AND numero_cuenta IS NOT NULL
           AND TRIM(numero_cuenta) <> ''
           AND banco_origen IS NOT NULL
           AND TRIM(banco_origen) <> ''
         ORDER BY id ASC`
      )
      const seen = new Set()
      for (const row of rows) {
        const cuenta = normalizeNumeroCuenta(row.numero_cuenta)
        const banco = normalizeBancoNombre(row.banco_origen)
        if (!cuenta || !banco || seen.has(cuenta)) continue
        seen.add(cuenta)
        await query(
          `INSERT IGNORE INTO cuentas_banco (numero_cuenta, banco)
           VALUES (?, ?)`,
          [cuenta, banco]
        )
      }
    } catch (err) {
      console.warn('[ensureCuentasBancoSchema] backfill anticipos:', err.message)
    }
  }
}

/**
 * Asegura el par cuenta↔banco en el catálogo.
 * - Si no existe: crea.
 * - Si existe con el mismo banco: ok.
 * - Si existe con otro banco: error (1:1).
 * @returns {{ ok: true, cuenta: object } | { ok: false, status: number, error: string }}
 */
async function upsertCuentaBanco(numeroRaw, bancoRaw) {
  const numero = normalizeNumeroCuenta(numeroRaw)
  const banco = normalizeBancoNombre(bancoRaw)
  if (!numero) {
    return { ok: false, status: 400, error: 'Número de cuenta es obligatorio' }
  }
  if (!banco) {
    return { ok: false, status: 400, error: 'Banco es obligatorio' }
  }

  await upsertBancoOrigen(banco)

  const existing = await query(
    `SELECT * FROM cuentas_banco
     WHERE numero_cuenta = ? AND is_deleted = FALSE
     LIMIT 1`,
    [numero]
  )

  if (existing[0]) {
    if (normalizeBancoNombre(existing[0].banco) !== banco) {
      return {
        ok: false,
        status: 400,
        error: `El número de cuenta ${numero} ya está asociado a ${existing[0].banco}. No se puede usar con ${banco}.`
      }
    }
    return { ok: true, cuenta: existing[0] }
  }

  try {
    const result = await query(
      `INSERT INTO cuentas_banco (numero_cuenta, banco) VALUES (?, ?)`,
      [numero, banco]
    )
    const created = await query(
      `SELECT * FROM cuentas_banco WHERE id = ? AND is_deleted = FALSE`,
      [result.insertId]
    )
    return { ok: true, cuenta: created[0] }
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return {
        ok: false,
        status: 409,
        error: `El número de cuenta ${numero} ya existe en el catálogo`
      }
    }
    throw err
  }
}

module.exports = {
  ensureCuentasBancoSchema,
  upsertCuentaBanco,
  normalizeNumeroCuenta,
  normalizeBancoNombre
}
