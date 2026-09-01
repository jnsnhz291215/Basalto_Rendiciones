'use strict';

const { query } = require('../../config/db');
const orgCatalog = require('./index');

const CC_SELECT = `id, codigo, nombre, activo, is_deleted, created_at, updated_at`;

function mapRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    codigo: row.codigo || null,
    nombre: row.nombre || '',
    activo: Number(row.activo) === 1,
    is_deleted: Number(row.is_deleted) === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listCentrosCosto({ includeDeleted = false } = {}) {
  const where = includeDeleted ? '' : 'WHERE is_deleted = 0';
  const rows = await orgCatalog.executeRead(
    `SELECT ${CC_SELECT} FROM centros_costo ${where} ORDER BY nombre ASC`,
  );
  return (rows || []).map(mapRow);
}

async function getCentroById(id) {
  const rows = await orgCatalog.executeRead(
    `SELECT ${CC_SELECT} FROM centros_costo WHERE id = ? AND is_deleted = 0 LIMIT 1`,
    [Number(id)],
  );
  return mapRow(rows?.[0]);
}

async function fetchNombreMap(ids = []) {
  const unique = [...new Set(ids.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))];
  const map = new Map();
  if (!unique.length) return map;
  const ph = unique.map(() => '?').join(', ');
  const rows = await orgCatalog.executeRead(
    `SELECT id, nombre FROM centros_costo WHERE id IN (${ph}) AND is_deleted = 0`,
    unique,
  );
  for (const row of rows || []) {
    map.set(Number(row.id), row.nombre || '');
  }
  return map;
}

async function enrichRows(rows, {
  idField = 'centro_cobro_id',
  nameField = 'centro_cobro_nombre',
  fallback = 'sin_cc',
} = {}) {
  if (!orgCatalog.usesCentralReads() || !Array.isArray(rows) || !rows.length) {
    return rows;
  }
  const map = await fetchNombreMap(rows.map((r) => r[idField]));
  return rows.map((row) => ({
    ...row,
    [nameField]: map.get(Number(row[idField])) || fallback,
  }));
}

async function createCentroCosto({ nombre, codigo = null, uso = 'cobro' }) {
  const n = String(nombre || '').trim();
  const c = codigo ? String(codigo).trim().slice(0, 32) : n.slice(0, 32);
  const result = await orgCatalog.executeWrite(
    `INSERT INTO centros_costo (codigo, nombre, activo, uso) VALUES (?, ?, 1, ?)`,
    [c || n, n, uso],
  );
  const id = result?.insertId;
  return getCentroById(id);
}

async function updateCentroCosto(id, { nombre }) {
  const n = String(nombre || '').trim();
  await orgCatalog.executeWrite(
    `UPDATE centros_costo SET nombre = ?, updated_at = NOW() WHERE id = ? AND is_deleted = 0`,
    [n, Number(id)],
  );
  return getCentroById(id);
}

async function softDeleteCentroCosto(id) {
  await orgCatalog.executeWrite(
    `UPDATE centros_costo
     SET is_deleted = 1, activo = 0, deleted_at = NOW(), nombre = CONCAT(nombre, '_DEL_', id)
     WHERE id = ? AND is_deleted = 0`,
    [Number(id)],
  );
}

async function hardDeleteCentroCosto(id) {
  await orgCatalog.executeWrite(`DELETE FROM centros_costo WHERE id = ?`, [Number(id)]);
}

/** Cajas asociadas siguen en BD Rendiciones */
async function centroTieneCajas(ccId) {
  const rows = await query(
    `SELECT id FROM cajas_chicas WHERE centro_cobro_id = ? AND is_deleted = FALSE LIMIT 1`,
    [Number(ccId)],
  );
  return Boolean(rows?.[0]);
}

module.exports = {
  usesCentralReads: orgCatalog.usesCentralReads,
  mapRow,
  listCentrosCosto,
  getCentroById,
  fetchNombreMap,
  enrichRows,
  createCentroCosto,
  updateCentroCosto,
  softDeleteCentroCosto,
  hardDeleteCentroCosto,
  centroTieneCajas,
};
