'use strict';

const { pool, query } = require('../../config/db');
const { queryCentral, isCentralConfigured, getCentralPool } = require('../../config/dbCentral');
const { resolveOrgCatalogSource } = require('./orgCatalogSource');

function usesCentralReads() {
  const src = resolveOrgCatalogSource();
  return (src === 'central' || src === 'dual') && isCentralConfigured();
}

function usesCentralWrites() {
  return usesCentralReads();
}

async function executeRead(sql, params = []) {
  if (usesCentralReads()) {
    return queryCentral(sql, params);
  }
  return query(sql, params);
}

async function executeWrite(sql, params = []) {
  const src = resolveOrgCatalogSource();

  async function runCentral() {
    if (!isCentralConfigured()) return null;
    const p = getCentralPool();
    const [result] = await p.execute(sql, params);
    return result;
  }

  if (src === 'central') {
    return runCentral();
  }

  const [localResult] = await pool.execute(sql, params);
  if (src === 'dual') {
    try {
      await runCentral();
    } catch (e) {
      console.error('[ORG-CATALOG:rend] dual-write Central falló:', e.message);
      throw e;
    }
  }
  return localResult;
}

module.exports = {
  resolveOrgCatalogSource,
  usesCentralReads,
  usesCentralWrites,
  executeRead,
  executeWrite,
};
