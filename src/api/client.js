/**
 * Cliente HTTP base para la API local de Rendiciones (Express :3002).
 *
 * `VITE_API_BASE_URL` debe ser el origen del API **sin** `/api` al final
 * (ej. `http://localhost:3002`) o vacío para usar el proxy de Vite
 * (`/api` → `http://localhost:3002`).
 */

const TOKEN_KEY = 'rendiciones_token'

/** Origen API; vacío = paths relativos vía proxy Vite. */
export const API_BASE_URL = normalizeApiBase(import.meta.env.VITE_API_BASE_URL)

function normalizeApiBase(raw) {
  const base = String(raw || '')
    .trim()
    .replace(/\/$/, '')
  // Evita /api/api/... si alguien pone VITE_API_BASE_URL=.../api
  return base.replace(/\/api$/i, '')
}

/**
 * @param {string} path - Debe empezar con `/api/...`
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${p}`
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
