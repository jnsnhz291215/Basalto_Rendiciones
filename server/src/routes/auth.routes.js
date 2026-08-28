const express = require('express')
const { login, me, updateMe, dismissTempPassword } = require('../controllers/auth.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')

const router = express.Router()

router.post('/login', login)
router.get('/me', authMiddleware, me)
router.put('/me', authMiddleware, updateMe)
router.post('/temp-password/dismiss', authMiddleware, dismissTempPassword)

module.exports = router
