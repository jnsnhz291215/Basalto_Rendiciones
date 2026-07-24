const express = require('express')
const {
  listTrabajadores,
  createTrabajador,
  updateTrabajador,
  softDeleteTrabajador,
  setTrabajadorCajas,
  listUsuarios,
  createUsuario,
  softDeleteUsuario,
  listTarjetas,
  createTarjeta,
  softDeleteTarjeta,
  listAuditLogs
} = require('../controllers/admin.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS, SUPER_ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

router.use(authMiddleware)
router.use(checkRole(ADMINS))

/* Trabajadores */
router.get('/trabajadores', listTrabajadores)
router.post('/trabajadores', createTrabajador)
router.put('/trabajadores/:id', updateTrabajador)
router.delete('/trabajadores/:id', softDeleteTrabajador)
router.put('/trabajadores/:id/cajas', setTrabajadorCajas)

/* Usuarios */
router.get('/usuarios', listUsuarios)
router.post('/usuarios', createUsuario)
router.delete('/usuarios/:id', softDeleteUsuario)

/* Tarjetas */
router.get('/tarjetas', listTarjetas)
router.post('/tarjetas', createTarjeta)
router.delete('/tarjetas/:id', softDeleteTarjeta)

/* Audit logs — solo Super Admins */
router.get('/audit-logs', checkRole(SUPER_ADMINS), listAuditLogs)

module.exports = router
