const { getSystemVersion, bumpSystemVersion } = require('../utils/systemVersion')

function getVersion(_req, res) {
  return res.json({ version: getSystemVersion() })
}

function triggerReload(_req, res) {
  const version = bumpSystemVersion()
  return res.json({
    ok: true,
    version,
    message: 'Recarga de clientes solicitada'
  })
}

module.exports = { getVersion, triggerReload }
