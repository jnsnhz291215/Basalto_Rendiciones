const express = require('express')
const multer = require('multer')
const {
  listRendiciones,
  createRendicion,
  updateRendicion,
  softDeleteRendicion,
  verificarComprobanteHandler
} = require('../controllers/rendiciones.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const mime = String(file.mimetype || '').toLowerCase()
    const ok =
      mime === 'application/pdf' ||
      mime === 'image/png' ||
      mime === 'image/jpeg' ||
      mime === 'image/jpg'
    if (!ok) {
      return cb(new Error('Solo se permiten PDF, PNG o JPG'))
    }
    return cb(null, true)
  }
})

router.use(authMiddleware)

router.get('/', listRendiciones)
router.post('/verificar-comprobante', upload.single('comprobante'), verificarComprobanteHandler)
router.post('/', createRendicion)
router.put('/:id', updateRendicion)
router.delete('/:id', softDeleteRendicion)

module.exports = router
