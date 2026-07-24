const express = require('express')
const {
  listLegacy,
  createLegacy,
  softDeleteLegacy
} = require('../controllers/legacy.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

router.use(authMiddleware)
router.use(checkRole(ADMINS))

router.get('/', listLegacy)
router.post('/', createLegacy)
router.delete('/:id', softDeleteLegacy)

module.exports = router
