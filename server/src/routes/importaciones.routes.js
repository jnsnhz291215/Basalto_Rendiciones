'use strict'

const express = require('express')
const {
  listImportaciones,
  getImportacion,
  anularImportacion
} = require('../controllers/importaciones.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

router.use(authMiddleware)
router.use(checkRole(ADMINS))

router.get('/', listImportaciones)
router.get('/:id', getImportacion)
router.delete('/:id', anularImportacion)

module.exports = router
