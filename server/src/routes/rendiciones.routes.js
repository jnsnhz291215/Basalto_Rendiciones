const express = require('express')
const multer = require('multer')
const {
  listRendiciones,
  createRendicion,
  updateRendicion,
  softDeleteRendicion,
  verificarComprobanteHandler,
  importRendicionesExcel
} = require('../controllers/rendiciones.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

const uploadComprobante = multer({
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

const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const name = String(file.originalname || '').toLowerCase()
    const mime = String(file.mimetype || '').toLowerCase()
    const ok =
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/octet-stream'
    if (!ok) return cb(new Error('Solo se permiten archivos Excel (.xlsx)'))
    return cb(null, true)
  }
})

router.use(authMiddleware)

router.get('/', listRendiciones)
router.post('/verificar-comprobante', uploadComprobante.single('comprobante'), verificarComprobanteHandler)
router.post(
  '/importar-excel',
  checkRole(ADMINS),
  uploadExcel.single('archivo'),
  importRendicionesExcel
)
router.post('/', createRendicion)
router.put('/:id', updateRendicion)
router.delete('/:id', softDeleteRendicion)

module.exports = router
