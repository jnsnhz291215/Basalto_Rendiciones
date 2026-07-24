import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Target del proxy: origen del Express (sin path `/api`).
 * El front arma URLs con `VITE_API_BASE_URL + '/api/...'` (ver src/api/auth.js),
 * así que el proxy solo aplica en dev si las requests van a paths relativos `/api/...`
 * (p. ej. `VITE_API_BASE_URL=` vacío). Con URL absoluta a :3002 el browser habla
 * directo al API y CORS_ORIGIN debe incluir http://localhost:5174.
 */
function resolveProxyTarget(env) {
  const dedicated = (env.VITE_API_PROXY_TARGET || '').replace(/\/$/, '')
  if (dedicated) return dedicated

  const base = (env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (base) {
    // Evita target `.../api` + path `/api/...` → `/api/api/...`
    return base.replace(/\/api$/i, '') || 'http://localhost:3002'
  }

  return 'http://localhost:3002'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = resolveProxyTarget(env)

  return {
    plugins: [vue()],
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    }
  }
})
