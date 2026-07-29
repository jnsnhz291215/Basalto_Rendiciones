const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const express = require('express')
const cors = require('cors')

const { STORAGE_ROOT, ensureStorageDirs } = require('./config/storage')
const { ensureCajasSchema } = require('./utils/ensureCajasSchema')
const { ensureAsignacionesSchema } = require('./utils/ensureAsignacionesSchema')
const { ensureRendicionesTipoDocto } = require('./utils/ensureRendicionesTipoDocto')
const { ensureImportacionesSchema } = require('./utils/ensureImportacionesSchema')
const { ensureCuentasBancoSchema } = require('./utils/ensureCuentasBancoSchema')
const { ensureIndexes } = require('./utils/ensureIndexes')

const authRoutes = require('./routes/auth.routes')
const cajasRoutes = require('./routes/cajas.routes')
const rendicionesRoutes = require('./routes/rendiciones.routes')
const anticiposRoutes = require('./routes/anticipos.routes')
const adminRoutes = require('./routes/admin.routes')
const legacyRoutes = require('./routes/legacy.routes')
const importacionesRoutes = require('./routes/importaciones.routes')

const app = express()
const PORT = Number(process.env.PORT) || 3002

try {
  ensureStorageDirs()
  console.log(`Storage: ${STORAGE_ROOT}`)
} catch (err) {
  console.warn(`[storage] No se pudo preparar ${STORAGE_ROOT}:`, err.message)
}

const corsOriginRaw = process.env.CORS_ORIGIN || 'http://localhost:5174'
const corsOrigins = corsOriginRaw.split(',').map((s) => s.trim()).filter(Boolean)

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        return cb(null, true)
      }
      if (origin && /rendiciones\.basalto\.app$/i.test(origin)) {
        return cb(null, true)
      }
      return cb(null, false)
    },
    credentials: true
  })
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'basalto-rendiciones',
    time: new Date().toISOString(),
    storage: STORAGE_ROOT
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/cajas', cajasRoutes)
app.use('/api/rendiciones', rendicionesRoutes)
app.use('/api/anticipos', anticiposRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/legacy', legacyRoutes)
app.use('/api/importaciones', importacionesRoutes)

// Archivos de storage (comprobantes, etc.) - lectura vía /api/files/*
app.use(
  '/api/files',
  express.static(STORAGE_ROOT, {
    fallthrough: true,
    index: false,
    dotfiles: 'deny'
  })
)

// Front Vue (dist/) en el mismo proceso - el dominio apunta a este Express
const distPath = path.join(__dirname, '..', '..', 'dist')
const distIndex = path.join(distPath, 'index.html')
const distExists = fs.existsSync(distIndex)

if (distExists) {
  app.use(express.static(distPath, { index: false }))
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(distIndex)
  })
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

app.use((err, _req, res, _next) => {
  console.error('[express]', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, async () => {
  console.log(`Basalto Rendiciones API escuchando en http://localhost:${PORT}`)
  if (distExists) {
    console.log(`Sirviendo frontend desde ${distPath}`)
  } else {
    console.warn(`AVISO: no hay dist/ en ${distPath} - el front no se servirá`)
  }
  try {
    await ensureCajasSchema()
    console.log('[schema] cajas_chicas + centros_costo OK')
  } catch (err) {
    console.warn('[schema] ensureCajasSchema:', err.message)
  }
  try {
    await ensureAsignacionesSchema()
    console.log('[schema] asignaciones (anticipos + bancos_origen) OK')
  } catch (err) {
    console.warn('[schema] ensureAsignacionesSchema:', err.message)
  }
  try {
    await ensureRendicionesTipoDocto()
    console.log('[schema] rendiciones tipo_documento OK')
  } catch (err) {
    console.warn('[schema] ensureRendicionesTipoDocto:', err.message)
  }
  try {
    await ensureImportacionesSchema()
    console.log('[schema] importaciones_lotes OK')
  } catch (err) {
    console.warn('[schema] ensureImportacionesSchema:', err.message)
  }
  try {
    await ensureCuentasBancoSchema()
    console.log('[schema] cuentas_banco OK')
  } catch (err) {
    console.warn('[schema] ensureCuentasBancoSchema:', err.message)
  }
  try {
    await ensureIndexes()
    console.log('[schema] indexes OK')
  } catch (err) {
    console.warn('[schema] ensureIndexes:', err.message)
  }
})

module.exports = app
