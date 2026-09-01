'use strict';

const { readEnvValue } = require('../../config/runtimeConfig');

/** basalto | dual | central */
function resolveOrgCatalogSource() {
  const raw = String(readEnvValue('ORG_CATALOG_SOURCE') || 'basalto').trim().toLowerCase();
  if (raw === 'dual' || raw === 'central') return raw;
  return 'basalto';
}

function orgCatalogUsesCentral() {
  return resolveOrgCatalogSource() === 'central' || resolveOrgCatalogSource() === 'dual';
}

module.exports = {
  resolveOrgCatalogSource,
  orgCatalogUsesCentral,
};
