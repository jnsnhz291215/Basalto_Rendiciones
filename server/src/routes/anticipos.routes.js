const express = require('express')
const multer = require('multer')
const {
  listAnticipos,
  listBancosOrigen,
  createAnticipo,
  updateAnticipo,
  softDeleteAnticipo,
  importAsignacionesExcel
} = require('../controllers/anticipos.controller')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, ADMINS } = require('../middlewares/role.middleware')

const router = express.Router()

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
router.use(checkRole(ADMINS))

router.get('/bancos', listBancosOrigen)
router.get('/', listAnticipos)
router.post('/importar-excel', uploadExcel.single('archivo'), importAsignacionesExcel)
router.post('/', createAnticipo)
router.put('/:id', updateAnticipo)
router.delete('/:id', softDeleteAnticipo)

module.exports = router
