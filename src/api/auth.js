/**
 * Auth contra la API local de Rendiciones (JWT Bearer).
 * No usa cookie httpOnly ni el backend de Turnos.
 */

import { apiFetch, clearToken, setToken, API_BASE_URL } from './client'

export { API_BASE_URL }

const DEFAULT_LOGIN_URL = '/login'

export const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || DEFAULT_LOGIN_URL

/** Roles API → etiquetas UI del Dashboard */
const ROL_TO_ADMIN_NIVEL = {
  SUPER_ADMIN_DEV: 'Super Admin - Dev',
  SUPER_ADMIN: 'Super Admin',
  ADMIN_CAJA: 'Administrador de Caja',
  USER_RENDIDOR: ''
}

const PROFILE_KEYS = [
  'rendiciones_token',
  'user_role',
  'user_rut',
  'user_name',
  'user_correo',
  'user_id',
  'user_trabajador_id',
  'user_admin_nivel',
  'user_api_rol',
  'usuarioActivo',
  'adminData',
  'userRUT',
  'userName'
]

export function clearProfile() {
  for (const key of PROFILE_KEYS) {
    localStorage.removeItem(key)
  }
  clearToken()
  sessionStorage.removeItem('TEMP_AUTH_BYPASS_OK')
}

function mapAdminNivel(rol) {
  return ROL_TO_ADMIN_NIVEL[rol] ?? ''
}

function isAdminRol(rol) {
  return rol === 'SUPER_ADMIN_DEV' || rol === 'SUPER_ADMIN' || rol === 'ADMIN_CAJA'
}

/**
 * Normaliza respuesta login/me del server nuevo.
 * Server login: { token, user: { id, rut, correo, rol, trabajador_id, nombre } }
 * Server me:    { user: { id, trabajador_id, rut, correo, rol, nombre } }
 */
export function normalizeAuthUser(data) {
  const source = data?.user && (data.user.rut || data.user.rol || data.user.role) ? data.user : data
  if (!source) return null

  const rolApi = source.rol || source.role || ''
  const nombre =
    source.nombre ||
    [source.nombres, source.apellido_paterno, source.apellido_materno].filter(Boolean).join(' ') ||
    source.correo ||
    ''

  const user = {
    id: source.id ?? null,
    rut: source.rut || '',
    correo: source.correo || '',
    nombre,
    /** Rol API canónico */
    rol: rolApi,
    /** Compat UI legacy (turnos usaba role admin|...) */
    role: isAdminRol(rolApi) ? 'admin' : rolApi === 'USER_RENDIDOR' ? 'usuario' : rolApi,
    adminNivel: mapAdminNivel(rolApi),
    trabajador_id: source.trabajador_id ?? null
  }

  return user.rut || user.rol ? user : null
}

export function persistSessionProfile(data) {
  const user = normalizeAuthUser(data)
  if (!user) return null

  if (user.id != null) localStorage.setItem('user_id', String(user.id))
  if (user.rut) localStorage.setItem('user_rut', user.rut)
  if (user.nombre) localStorage.setItem('user_name', user.nombre)
  if (user.correo) localStorage.setItem('user_correo', user.correo)
  if (user.role) localStorage.setItem('user_role', user.role)
  if (user.rol) localStorage.setItem('user_api_rol', user.rol)
  if (user.adminNivel) localStorage.setItem('user_admin_nivel', user.adminNivel)
  else localStorage.removeItem('user_admin_nivel')
  if (user.trabajador_id != null) {
    localStorage.setItem('user_trabajador_id', String(user.trabajador_id))
  }

  localStorage.setItem(
    'usuarioActivo',
    JSON.stringify({
      rol: user.role,
      apiRol: user.rol,
      nombre: user.nombre,
      rut: user.rut,
      correo: user.correo,
      isAdmin: user.role === 'admin',
      adminNivel: user.adminNivel || '',
      trabajador_id: user.trabajador_id
    })
  )

  if (user.role === 'admin') {
    localStorage.setItem(
      'adminData',
      JSON.stringify({
        id: user.id,
        rut: user.rut,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
        isAdmin: true,
        adminNivel: user.adminNivel
      })
    )
    localStorage.setItem('userRUT', user.rut)
    localStorage.setItem('userName', user.nombre)
  } else {
    localStorage.removeItem('adminData')
  }

  return user
}

/** @deprecated alias — login ya persiste con persistSessionProfile */
export function persistLoginProfile(data) {
  return persistSessionProfile(data)
}

export function loginRedirectUrl(returnTo = window.location.href) {
  const url = new URL(LOGIN_URL, window.location.origin)
  url.searchParams.set('returnTo', returnTo)
  return url.toString()
}

export async function login(rut, password) {
  const { res, data } = await apiFetch('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ rut: String(rut || '').trim(), password })
  })

  if (!res.ok || !data?.token || !data?.user) {
    throw new Error(data?.error || data?.message || 'Credenciales inválidas')
  }

  setToken(data.token)
  persistSessionProfile(data)
  return data
}

export async function fetchMe() {
  const token = localStorage.getItem('rendiciones_token')
  if (!token) return null

  const { res, data } = await apiFetch('/api/auth/me', { method: 'GET' })
  if (!res.ok || !data?.user) return null
  return data
}

/**
 * JWT es stateless: logout = borrar token local.
 * No hay cookie de Turnos ni POST obligatorio al server.
 */
export async function logout() {
  clearProfile()
}

export function readCachedUser() {
  const rut = localStorage.getItem('user_rut')
  const nombre = localStorage.getItem('user_name')
  const role = localStorage.getItem('user_role')
  const rol = localStorage.getItem('user_api_rol') || ''
  const adminNivel = localStorage.getItem('user_admin_nivel') || ''
  const correo = localStorage.getItem('user_correo') || ''
  if (!rut && !role && !rol) return null
  return { rut, nombre, role, rol, adminNivel, correo }
}
