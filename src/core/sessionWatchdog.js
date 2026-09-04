/**
 * Session watchdog — contrato compartido con Turnos / Panel Admin:
 * - intervalo 45s (solo pestaña visible)
 * - al focus / visibilitychange
 * - sonda /api/auth/me; 401/403 → login
 */
import { apiFetch, getToken, handleSessionExpiry } from '../api/client'

const INTERVAL_MS = 45_000

async function checkSession() {
  if (!getToken()) return
  const { res } = await apiFetch('/api/auth/me', { method: 'GET', silent: true })
  if (res.status === 401 || res.status === 403) {
    await handleSessionExpiry()
  }
}

export function startSessionWatchdog() {
  let stopped = false
  let inFlight = false

  async function tick() {
    if (stopped || inFlight) return
    if (typeof document !== 'undefined' && document.hidden) return
    inFlight = true
    try {
      await checkSession()
    } catch {
      /* red */
    } finally {
      inFlight = false
    }
  }

  const id = window.setInterval(() => {
    void tick()
  }, INTERVAL_MS)

  const onVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void tick()
    }
  }

  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onVisible)
  const firstTimer = window.setTimeout(() => {
    void tick()
  }, 500)

  return () => {
    stopped = true
    window.clearTimeout(firstTimer)
    window.clearInterval(id)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onVisible)
  }
}
