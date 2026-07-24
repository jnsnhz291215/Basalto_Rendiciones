/**
 * Cliente HTTP base para la API de Rendiciones.
 *
 * - Dev local: `VITE_API_BASE_URL=http://localhost:3002` (o vacío + proxy Vite)
 * - Producción (mismo dominio): paths relativos `/api/...` (ignora localhost del build)
 */

const TOKEN_KEY = 'rendiciones_token'

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

/**
 * fetch JSON con Bearer opcional.
 * @param {string} path
 * @param {RequestInit & { auth?: boolean }} options
 */
export async function apiFetch(path, options = {}) {
  const { auth = true, headers: extraHeaders, ...rest } = options
  const headers = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {})
  }

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(apiUrl(path), {
    ...rest,
    headers,
    credentials: 'omit'
  })

  const data = await parseJson(res)
  return { res, data }
}
