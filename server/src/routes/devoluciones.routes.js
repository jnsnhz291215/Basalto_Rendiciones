const express = require('express')
const {
  listDevoluciones,
  createDevolucion,
  updateDevolucion,
  softDeleteDevolucion
} = require('../controllers/devoluciones.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

router.use(authMiddleware)
router.use(checkRole(ADMINS))

router.get('/', listDevoluciones)
router.post('/', createDevolucion)
router.put('/:id', updateDevolucion)
router.delete('/:id', softDeleteDevolucion)

module.exports = router
