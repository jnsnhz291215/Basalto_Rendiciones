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

const corsOriginRaw = process.env.CORS_ORIGIN || 'http://localhost:5174'
const corsOrigins = corsOriginRaw.split(',').map((s) => s.trim()).filter(Boolean)

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        return cb(null, true)
      }
      // Mismo host de producción (front servido por este Express)
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
    time: new Date().toISOString()
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/cajas', cajasRoutes)
app.use('/api/rendiciones', rendicionesRoutes)
app.use('/api/anticipos', anticiposRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/legacy', legacyRoutes)

// #region agent log
function agentDebugLog(hypothesisId, location, message, data) {
  const payload = {
    sessionId: '63ab72',
    runId: process.env.DEBUG_RUN_ID || 'pre-fix',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now()
  }
  const line = `${JSON.stringify(payload)}\n`
  try {
    require('fs').appendFileSync(
      path.join(__dirname, '..', '..', '.cursor', 'debug-63ab72.log'),
      line
    )
  } catch (_) {
    /* ignore */
  }
  try {
    require('fs').appendFileSync(path.join(__dirname, '..', 'debug-404.ndjson'), line)
  } catch (_) {
    /* ignore */
  }
  fetch('http://127.0.0.1:7532/ingest/e4d621f4-3c73-4d14-9fa4-c99758ef9776', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '63ab72'
    },
    body: JSON.stringify(payload)
  }).catch(() => {})
}
// #endregion

// Front Vue (dist/) en el mismo proceso — el dominio apunta a este Express
const distPath = path.join(__dirname, '..', '..', 'dist')
const distIndex = path.join(distPath, 'index.html')
const fs = require('fs')
const distExists = fs.existsSync(distIndex)

// #region agent log
agentDebugLog('E', 'server.js:static-setup', 'Static dist check at boot', {
  distPath,
  distExists,
  port: PORT
})
// #endregion

if (distExists) {
  app.use(express.static(distPath, { index: false }))
  app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
    // #region agent log
    agentDebugLog('E', 'server.js:spa-fallback', 'Serving SPA index.html', {
      method: req.method,
      path: req.path,
      url: req.originalUrl
    })
    // #endregion
    res.sendFile(distIndex)
  })
}

app.use((req, res) => {
  // #region agent log
  agentDebugLog('A', 'server.js:404', 'Unmatched route hit Express catch-all', {
    method: req.method,
    path: req.path,
    url: req.originalUrl,
    host: req.headers.host || null,
    accept: req.headers.accept || null,
    xfwd: req.headers['x-forwarded-for'] || null,
    port: PORT,
    distExists
  })
  // #endregion
  res.status(404).json({ error: 'Not Found' })
})

app.use((err, _req, res, _next) => {
  console.error('[express]', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  // #region agent log
  agentDebugLog('D', 'server.js:listen', 'API listening', {
    port: PORT,
    distExists,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5174'
  })
  // #endregion
  console.log(`Basalto Rendiciones API escuchando en http://localhost:${PORT}`)
  if (distExists) {
    console.log(`Sirviendo frontend desde ${distPath}`)
  } else {
    console.warn(`AVISO: no hay dist/ en ${distPath} — el front no se servirá`)
  }
})

module.exports = app
