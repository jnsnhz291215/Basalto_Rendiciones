const express = require('express')
const {
  listCajas,
  resumenCaja,
  createCaja,
  updateCaja,
  softDeleteCaja,
  listCentrosCosto,
  createCentroCosto,
  updateCentroCosto,
  softDeleteCentroCosto
} = require('../controllers/cajas.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

router.use(authMiddleware)

router.get('/resumen', resumenCaja)
router.get('/centros-costo', listCentrosCosto)
router.post('/centros-costo', checkRole(ADMINS), createCentroCosto)
router.put('/centros-costo/:id', checkRole(ADMINS), updateCentroCosto)
router.delete('/centros-costo/:id', checkRole(ADMINS), softDeleteCentroCosto)

router.get('/', listCajas)
router.post('/', checkRole(ADMINS), createCaja)
router.put('/:id', checkRole(ADMINS), updateCaja)
router.delete('/:id', checkRole(ADMINS), softDeleteCaja)

module.exports = router
