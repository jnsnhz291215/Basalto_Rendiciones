/**
 * Cliente auth contra el backend centralizado (cookie JWT httpOnly `token`).
 *
 * Usa `credentials: 'include'` para enviar y recibir la cookie entre subdominios.
 */

const DEFAULT_API_BASE_URL = 'https://turnos.basalto.app'
const DEFAULT_LOGIN_URL = 'https://inicio.basalto.app/login'
const DEFAULT_LOGOUT_URL = 'https://turnos.basalto.app/api/auth/logout'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')
export const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || DEFAULT_LOGIN_URL
export const LOGOUT_URL = import.meta.env.VITE_LOGOUT_URL || DEFAULT_LOGOUT_URL

function apiUrl(path) {
  return `${API_BASE_URL}${path}`
}

async function parseJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const PROFILE_KEYS = [
  'user_role',
  'user_rut',
  'user_name',
  'session_version',
  'user_permissions_cargo',
  'user_permissions_cargo_ids',
  'user_permissions_solo_cargo',
  'user_permissions_especiales_trabajador',
  'user_permissions_total',
  'user_cargo_name',
  'user_cargo_id',
  'user_grupo',
  'user_super_admin',
  'user_permisos',
  'usuarioActivo',
  'adminData',
  'userRUT',
  'userName',
  'password_predeterminada'
]

export function clearProfile() {
  localStorage.clear()
  sessionStorage.clear()
}

export function persistLoginProfile(data) {
  localStorage.setItem('user_role', data.role)
  localStorage.setItem('user_rut', data.rut)
  localStorage.setItem('user_name', data.nombre)

  if (data.session_version) {
    localStorage.setItem('session_version', String(data.session_version))
  }

  localStorage.setItem('user_permissions_cargo', JSON.stringify(data.permisos_cargo || []))
  localStorage.setItem('user_permissions_cargo_ids', JSON.stringify(data.permisos_cargo_ids || []))
  localStorage.setItem('user_permissions_solo_cargo', JSON.stringify(data.permisos_solo_cargo || []))
  localStorage.setItem(
    'user_permissions_especiales_trabajador',
    JSON.stringify(data.permisos_especiales_trabajador || [])
  )
  localStorage.setItem('user_permissions_total', JSON.stringify(data.permisos_totales || []))
  localStorage.setItem('user_cargo_name', data.cargo?.nombre_cargo || '')
  localStorage.setItem('user_cargo_id', data.cargo?.id_cargo ? String(data.cargo.id_cargo) : '')
  localStorage.setItem('user_grupo', data.grupo || '')

  if (data.role === 'admin') {
    localStorage.setItem('user_super_admin', data.es_super_admin ? '1' : '0')
    localStorage.setItem('user_permisos', JSON.stringify(data.permisos || []))
    if (data.user) {
      localStorage.setItem(
        'adminData',
        JSON.stringify({
          ...data.user,
          isAdmin: true,
          es_super_admin: data.es_super_admin,
          permisos: data.permisos || []
        })
      )
      localStorage.setItem('userRUT', data.rut)
      localStorage.setItem('userName', data.nombre)
    }
  } else {
    localStorage.removeItem('user_super_admin')
    localStorage.removeItem('user_permisos')
  }

  localStorage.setItem(
    'usuarioActivo',
    JSON.stringify({
      rol: data.role,
      nombre: data.nombre,
      rut: data.rut,
      isAdmin: data.role === 'admin',
      es_super_admin: data.es_super_admin || 0,
      permisos: data.permisos || [],
      permisos_cargo: data.permisos_cargo || [],
      permisos_especiales_trabajador: data.permisos_especiales_trabajador || [],
      permisos_totales: data.permisos_totales || [],
      cargo: data.cargo || null,
      id_grupo: data.id_grupo || null,
      grupo: data.grupo || data.id_grupo || null
    })
  )
}

export function normalizeAuthUser(data) {
  const source = data?.user && (data.user.rut || data.user.role) ? data.user : data
  const nombre = source?.nombre || data?.nombre || [
    source?.nombres,
    source?.apellido_paterno,
    source?.apellido_materno
  ].filter(Boolean).join(' ')

  const user = {
    rut: source?.rut || data?.rut || '',
    nombre: nombre || '',
    role: source?.role || data?.role || ''
  }

  return user.rut || user.role ? user : null
}

export function persistSessionProfile(data) {
  const user = normalizeAuthUser(data)
  if (!user) return null

  if (user.rut) localStorage.setItem('user_rut', user.rut)
  if (user.nombre) localStorage.setItem('user_name', user.nombre)
  if (user.role) localStorage.setItem('user_role', user.role)
  if (data?.session_version) {
    localStorage.setItem('session_version', String(data.session_version))
  }

  localStorage.setItem(
    'usuarioActivo',
    JSON.stringify({
      rol: user.role,
      nombre: user.nombre,
      rut: user.rut,
      isAdmin: user.role === 'admin',
      es_super_admin: data?.es_super_admin || 0,
      permisos: data?.permisos || [],
      permisos_cargo: data?.permisos_cargo || [],
      permisos_especiales_trabajador: data?.permisos_especiales_trabajador || [],
      permisos_totales: data?.permisos_totales || [],
      cargo: data?.cargo || null,
      id_grupo: data?.id_grupo || null,
      grupo: data?.grupo || data?.id_grupo || null
    })
  )

  return user
}

export function loginRedirectUrl(returnTo = window.location.href) {
  const url = new URL(LOGIN_URL, window.location.origin)
  url.searchParams.set('returnTo', returnTo)
  return url.toString()
}

export async function login(rut, password) {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rut, password })
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Credenciales inválidas')
  }
  persistLoginProfile(data)
  return data
}

export async function fetchMe() {
  const headers = { 'Content-Type': 'application/json' }
  const sv = localStorage.getItem('session_version')
  const rut = localStorage.getItem('user_rut')
  if (sv) headers['X-Session-Version'] = sv
  if (rut) headers['X-Requested-With'] = 'XMLHttpRequest'

  const res = await fetch(apiUrl('/api/auth/me'), {
    method: 'GET',
    headers,
    credentials: 'include'
  })
  const data = await parseJson(res)
  if (!res.ok || !data) {
    return null
  }
  return data
}

export async function logout() {
  try {
    await fetch(LOGOUT_URL, {
      method: 'POST',
      credentials: 'include'
    })
  } finally {
    clearProfile()
  }
}

export function readCachedUser() {
  const rut = localStorage.getItem('user_rut')
  const nombre = localStorage.getItem('user_name')
  const role = localStorage.getItem('user_role')
  if (!rut && !role) return null
  return { rut, nombre, role }
}
