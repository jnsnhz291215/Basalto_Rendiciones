const express = require('express')
const {
  listAnticipos,
  createAnticipo,
  updateAnticipo,
  softDeleteAnticipo
} = require('../controllers/anticipos.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

router.use(authMiddleware)
router.use(checkRole(ADMINS))

router.get('/', listAnticipos)
router.post('/', createAnticipo)
router.put('/:id', updateAnticipo)
router.delete('/:id', softDeleteAnticipo)

module.exports = router
