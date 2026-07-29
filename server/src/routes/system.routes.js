const express = require('express')
const { getVersion } = require('../controllers/system.controller')

const router = express.Router()

/** Público: sin auth. */
router.get('/version', getVersion)

module.exports = router
