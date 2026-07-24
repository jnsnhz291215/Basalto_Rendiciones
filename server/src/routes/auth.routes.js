const express = require('express')
const { login, me, updateMe } = require('../controllers/auth.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')

const router = express.Router()

router.post('/login', login)
router.get('/me', authMiddleware, me)
router.put('/me', authMiddleware, updateMe)

module.exports = router
