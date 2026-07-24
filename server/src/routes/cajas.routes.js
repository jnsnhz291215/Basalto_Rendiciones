const express = require('express')
const {
  listCajas,
  createCaja,
  updateCaja,
  softDeleteCaja
} = require('../controllers/cajas.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

router.use(authMiddleware)

router.get('/', listCajas)
router.post('/', checkRole(ADMINS), createCaja)
router.put('/:id', checkRole(ADMINS), updateCaja)
router.delete('/:id', checkRole(ADMINS), softDeleteCaja)

module.exports = router
