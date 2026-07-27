const express = require('express')
const {
  listTrabajadores,
  createTrabajador,
  updateTrabajador,
  softDeleteTrabajador,
  setTrabajadorCajas,
  listUsuarios,
  createUsuario,
  updateUsuario,
  softDeleteUsuario,
  resetPasswordUsuario,
  listPersonal,
  createPersonal,
  updatePersonal,
  listTarjetas,
  createTarjeta,
  updateTarjeta,
  softDeleteTarjeta,
  listAuditLogs,
  syncBidireccionalHandler
} = require('../controllers/admin.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS, SUPER_ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

router.use(authMiddleware)
router.use(checkRole(ADMINS))

/* Personal unificado (ficha + acceso rendidor opcional) */
router.get('/personal', listPersonal)
router.post('/personal', createPersonal)
router.put('/personal/:idOrRut', updatePersonal)

/* Trabajadores (legacy / otros módulos) */
router.get('/trabajadores', listTrabajadores)
router.post('/trabajadores', createTrabajador)
router.put('/trabajadores/:id', updateTrabajador)
router.delete('/trabajadores/:id', checkRole(SUPER_ADMINS), softDeleteTrabajador)
router.put('/trabajadores/:id/cajas', setTrabajadorCajas)

/* Usuarios (legacy / Admins) */
router.get('/usuarios', listUsuarios)
router.post('/usuarios', createUsuario)
router.put('/usuarios/:id', updateUsuario)
router.post('/usuarios/:id/reset-password', checkRole(SUPER_ADMINS), resetPasswordUsuario)
router.delete('/usuarios/:id', checkRole(SUPER_ADMINS), softDeleteUsuario)

/* Tarjetas */
router.get('/tarjetas', listTarjetas)
router.post('/tarjetas', createTarjeta)
router.put('/tarjetas/:id', updateTarjeta)
router.delete('/tarjetas/:id', checkRole(SUPER_ADMINS), softDeleteTarjeta)

/* Audit logs - solo Super Admins */
router.get('/audit-logs', checkRole(SUPER_ADMINS), listAuditLogs)

/* Sync Turnos ↔ Rendiciones - solo Super Admins */
router.post('/sync-bidireccional', checkRole(SUPER_ADMINS), syncBidireccionalHandler)

module.exports = router
