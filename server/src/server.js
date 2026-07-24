const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth.routes')
const cajasRoutes = require('./routes/cajas.routes')
const rendicionesRoutes = require('./routes/rendiciones.routes')
const anticiposRoutes = require('./routes/anticipos.routes')
const adminRoutes = require('./routes/admin.routes')
const legacyRoutes = require('./routes/legacy.routes')

const app = express()
const PORT = Number(process.env.PORT) || 3002

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
    credentials: true
  })
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'basalto-rendiciones',
    time: new Date().toISOString()
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/cajas', cajasRoutes)
app.use('/api/rendiciones', rendicionesRoutes)
app.use('/api/anticipos', anticiposRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/legacy', legacyRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

app.use((err, _req, res, _next) => {
  console.error('[express]', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`Basalto Rendiciones API escuchando en http://localhost:${PORT}`)
})

module.exports = app
