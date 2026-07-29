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

async function resolveCentroCobro(raw) {
  const id = Number(raw)
  if (!Number.isFinite(id) || id <= 0) return null
  const rows = await query(
    `SELECT id, nombre FROM centros_costo WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
    [id]
  )
  return rows[0] || null
}

/**
 * Catálogo 1:1 número de cuenta → banco, con CC (centro de cobro) obligatorio en altas.
 * Soft delete libera el UNIQUE renombrando numero_cuenta.
 */
async function ensureCuentasBancoSchema() {
  if (!(await tableExists('cuentas_banco'))) {
    await query(
      `CREATE TABLE cuentas_banco (
         id INT AUTO_INCREMENT PRIMARY KEY,
         numero_cuenta VARCHAR(40) NOT NULL,
         banco VARCHAR(120) NOT NULL,
         centro_cobro_id INT NULL,
         is_deleted BOOLEAN DEFAULT FALSE,
         deleted_at DATETIME NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         UNIQUE KEY uq_cuentas_banco_numero (numero_cuenta),
         CONSTRAINT fk_cuentas_banco_centro_cobro
           FOREIGN KEY (centro_cobro_id) REFERENCES centros_costo(id) ON DELETE RESTRICT
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
  }

  if (!(await columnExists('cuentas_banco', 'centro_cobro_id'))) {
    await query(
      `ALTER TABLE cuentas_banco
       ADD COLUMN centro_cobro_id INT NULL AFTER banco`
    )
  }

  if (!(await constraintExists('cuentas_banco', 'fk_cuentas_banco_centro_cobro'))) {
    // Limpiar FKs huérfanas antes de crear la constraint
    await query(
      `UPDATE cuentas_banco cb
       LEFT JOIN centros_costo cc ON cc.id = cb.centro_cobro_id
       SET cb.centro_cobro_id = NULL
       WHERE cb.centro_cobro_id IS NOT NULL AND cc.id IS NULL`
    )
    try {
      await query(
        `ALTER TABLE cuentas_banco
         ADD CONSTRAINT fk_cuentas_banco_centro_cobro
           FOREIGN KEY (centro_cobro_id) REFERENCES centros_costo(id) ON DELETE RESTRICT`
      )
    } catch (err) {
      console.warn('[ensureCuentasBancoSchema] FK centro_cobro:', err.message)
    }
  }

  // Backfill desde anticipos existentes (pares únicos; CC desde la caja del anticipo)
  if (await tableExists('anticipos')) {
    try {
      const rows = await query(
        `SELECT a.numero_cuenta, a.banco_origen, c.centro_cobro_id
         FROM anticipos a
         LEFT JOIN cajas_chicas c ON c.id = a.caja_id AND c.is_deleted = FALSE
         WHERE a.is_deleted = FALSE
           AND a.numero_cuenta IS NOT NULL
           AND TRIM(a.numero_cuenta) <> ''
           AND a.banco_origen IS NOT NULL
           AND TRIM(a.banco_origen) <> ''
         ORDER BY a.id ASC`
      )
      const seen = new Set()
      for (const row of rows) {
        const cuenta = normalizeNumeroCuenta(row.numero_cuenta)
        const banco = normalizeBancoNombre(row.banco_origen)
        if (!cuenta || !banco || seen.has(cuenta)) continue
        seen.add(cuenta)
        const ccId =
          row.centro_cobro_id != null && Number(row.centro_cobro_id) > 0
            ? Number(row.centro_cobro_id)
            : null
        if (ccId) {
          await query(
            `INSERT IGNORE INTO cuentas_banco (numero_cuenta, banco, centro_cobro_id)
             VALUES (?, ?, ?)`,
            [cuenta, banco, ccId]
          )
          // Si ya existía sin CC, completar
          await query(
            `UPDATE cuentas_banco
             SET centro_cobro_id = ?
             WHERE numero_cuenta = ?
               AND is_deleted = FALSE
               AND centro_cobro_id IS NULL`,
            [ccId, cuenta]
          )
        } else {
          await query(
            `INSERT IGNORE INTO cuentas_banco (numero_cuenta, banco)
             VALUES (?, ?)`,
            [cuenta, banco]
          )
        }
      }
    } catch (err) {
      console.warn('[ensureCuentasBancoSchema] backfill anticipos:', err.message)
    }
  }
}

/**
 * Asegura el par cuenta↔banco en el catálogo (UNIQUE global por número).
 * - Si no existe: crea (requiere centro_cobro_id).
 * - Si existe con el mismo banco: ok; completa CC si estaba NULL.
 * - Si existe con otro banco u otro CC: error.
 * @returns {{ ok: true, cuenta: object } | { ok: false, status: number, error: string }}
 */
async function upsertCuentaBanco(numeroRaw, bancoRaw, centroCobroIdRaw = null) {
  const numero = normalizeNumeroCuenta(numeroRaw)
  const banco = normalizeBancoNombre(bancoRaw)
  if (!numero) {
    return { ok: false, status: 400, error: 'Número de cuenta es obligatorio' }
  }
  if (!banco) {
    return { ok: false, status: 400, error: 'Banco es obligatorio' }
  }

  let centroCobroId = null
  if (centroCobroIdRaw != null && centroCobroIdRaw !== '') {
    const cc = await resolveCentroCobro(centroCobroIdRaw)
    if (!cc) {
      return { ok: false, status: 400, error: 'Centro de cobro (CC) no encontrado' }
    }
    centroCobroId = cc.id
  }

  await upsertBancoOrigen(banco)

  const existing = await query(
    `SELECT cb.*, cc.nombre AS centro_cobro_nombre
     FROM cuentas_banco cb
     LEFT JOIN centros_costo cc ON cc.id = cb.centro_cobro_id AND cc.is_deleted = FALSE
     WHERE cb.numero_cuenta = ? AND cb.is_deleted = FALSE
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
    const prevCc = existing[0].centro_cobro_id
    if (
      centroCobroId != null &&
      prevCc != null &&
      Number(prevCc) !== Number(centroCobroId)
    ) {
      const prevNombre = existing[0].centro_cobro_nombre || `id=${prevCc}`
      return {
        ok: false,
        status: 400,
        error: `El número de cuenta ${numero} ya está registrado en el CC ${prevNombre}. No se puede asociar a otro CC.`
      }
    }
    if (centroCobroId != null && prevCc == null) {
      await query(
        `UPDATE cuentas_banco SET centro_cobro_id = ? WHERE id = ? AND is_deleted = FALSE`,
        [centroCobroId, existing[0].id]
      )
      existing[0].centro_cobro_id = centroCobroId
      const cc = await resolveCentroCobro(centroCobroId)
      existing[0].centro_cobro_nombre = cc?.nombre || null
    }
    return { ok: true, cuenta: existing[0] }
  }

  if (centroCobroId == null) {
    return {
      ok: false,
      status: 400,
      error: 'Centro de cobro (CC) es obligatorio'
    }
  }

  try {
    const result = await query(
      `INSERT INTO cuentas_banco (numero_cuenta, banco, centro_cobro_id) VALUES (?, ?, ?)`,
      [numero, banco, centroCobroId]
    )
    const created = await query(
      `SELECT cb.*, cc.nombre AS centro_cobro_nombre
       FROM cuentas_banco cb
       LEFT JOIN centros_costo cc ON cc.id = cb.centro_cobro_id AND cc.is_deleted = FALSE
       WHERE cb.id = ? AND cb.is_deleted = FALSE`,
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
  resolveCentroCobro,
  normalizeNumeroCuenta,
  normalizeBancoNombre
}
