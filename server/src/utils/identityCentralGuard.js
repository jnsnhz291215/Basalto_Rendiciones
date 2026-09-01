'use strict';

const { authUsesCentral, resolveAuthSource } = require('../config/runtimeConfig');

function blocksLocalUsuarioCrud() {
  return authUsesCentral() && resolveAuthSource() === 'central';
}

function identityCentralOnlyResponse(res) {
  return res.status(410).json({
    error: 'identity_central',
    message: 'La identidad se gestiona en el Panel administrativo (/usuarios).',
  });
}

module.exports = {
  blocksLocalUsuarioCrud,
  identityCentralOnlyResponse,
};
