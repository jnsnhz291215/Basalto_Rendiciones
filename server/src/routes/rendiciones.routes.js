const express = require('express')
const {
  listRendiciones,
  createRendicion,
  updateRendicion,
  softDeleteRendicion
} = require('../controllers/rendiciones.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')

const router = express.Router()

router.use(authMiddleware)

router.get('/', listRendiciones)
router.post('/', createRendicion)
router.put('/:id', updateRendicion)
router.delete('/:id', softDeleteRendicion)

module.exports = router
