'use strict'

const express = require('express')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { listEmergenciaActivaDesdeTurnos } = require('../utils/avisosEmergenciaTurnos')

const router = express.Router()

router.use(authMiddleware)

/**
 * GET /api/avisos/emergencia/activa
 * Banner compartido con Turnos: lee `avisos_emergencia` vía TURNOS_DB_*.
 */
router.get('/emergencia/activa', async (_req, res) => {
  try {
    const { items, now } = await listEmergenciaActivaDesdeTurnos()
    return res.json({ success: true, items, now })
  } catch (err) {
    console.error('[avisos] emergencia/activa:', err)
    return res.status(500).json({
      success: false,
      error: 'No se pudo obtener el aviso de emergencia'
    })
  }
})

module.exports = router
