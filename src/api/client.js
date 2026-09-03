/**
 * Cliente HTTP base para la API de Rendiciones.
 *
 * - Dev local: `VITE_API_BASE_URL=http://localhost:3002` (o vacío + proxy Vite)
 * - Producción (mismo dominio): paths relativos `/api/...` (ignora localhost del build)
 */

import { beginApiLoading, endApiLoading } from '../composables/useApiLoading'

const TOKEN_KEY = 'rendiciones_token'

/** Profundidad de contexto silent anidado (p. ej. refresh en background). */
let silentDepth = 0

/**
 * Ejecuta `fn` forzando silent en todas las llamadas apiFetch anidadas.
 * @template T
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withSilentApi(fn) {
  silentDepth += 1
  try {
    return await fn()
  } finally {
    silentDepth = Math.max(0, silentDepth - 1)
  }
}

function normalizeApiBase(raw) {
  const base = String(raw || '')
    .trim()
    .replace(/\/$/, '')
  return base.replace(/\/api$/i, '')
}

/**
 * Origen API. En hosts reales (no localhost), si el env quedó apuntando a
 * localhost (build mal configurado), usamos same-origin para evitar Failed to fetch.
 */
export function resolveApiBase() {
  const fromEnv = normalizeApiBase(import.meta.env.VITE_API_BASE_URL)

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1'
    if (!isLocalHost && (!fromEnv || /localhost|127\.0\.0\.1/i.test(fromEnv))) {
      return ''
    }
  }

  return fromEnv
}

export const API_BASE_URL = resolveApiBase()

/**
 * @param {string} path - Debe empezar con `/api/...`
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  const base = resolveApiBase()
  return `${base}${p}`
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function parseJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

/** Rutas que no deben disparar el redirect global de sesión expirada. */
const SESSION_EXPIRY_EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/me'])

let handlingSessionExpiry = false

/**
 * Ante un 401 en cualquier llamada autenticada (fuera de login/me), limpia el
 * perfil local y redirige a /login de inmediato, sin esperar a la próxima
 * navegación (cubre el caso de sesión expirada a mitad de una vista, tras 8h).
 */
async function handleSessionExpiry() {
  if (handlingSessionExpiry) return
  if (typeof window === 'undefined') return
  handlingSessionExpiry = true
  try {
    const { clearProfile, LOGIN_URL } = await import('./auth')
    clearProfile()
    const current = window.location.pathname
    if (current !== LOGIN_URL && current !== '/login') {
      window.location.href = LOGIN_URL
    }
  } catch {
    /* ignore */
  } finally {
    handlingSessionExpiry = false
  }
}

/**
 * fetch JSON con Bearer opcional.
 * @param {string} path
 * @param {RequestInit & { auth?: boolean, silent?: boolean }} options
 *   - `silent: true` omite el contador de loading global (sin spinners de pantalla).
 */
export async function apiFetch(path, options = {}) {
  const { auth = true, silent = false, headers: extraHeaders, ...rest } = options
  const isSilent = silent === true || silentDepth > 0
  const headers = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {})
  }

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  if (!isSilent) beginApiLoading()
  try {
    const res = await fetch(apiUrl(path), {
      ...rest,
      headers,
      credentials: 'omit'
    })

    const data = await parseJson(res)

    const cleanPath = String(path || '').split('?')[0]
    if (res.status === 401 && auth && !SESSION_EXPIRY_EXEMPT_PATHS.has(cleanPath)) {
      void handleSessionExpiry()
    }

    return { res, data }
  } finally {
    if (!isSilent) endApiLoading()
  }
}
