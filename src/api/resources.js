import { apiFetch } from './client'

function unwrapList(data) {
  return Array.isArray(data) ? data : []
}

async function jsonOrThrow(path, options = {}) {
  const { res, data } = await apiFetch(path, options)
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Error ${res.status}`)
  }
  return data
}

export async function listCajas() {
  return unwrapList(await jsonOrThrow('/api/cajas'))
}

/** Resumen métricas: { clave_interna, mes } */
export async function resumenCaja(params = {}) {
  const qs = new URLSearchParams()
  if (params.clave_interna) qs.set('clave_interna', params.clave_interna)
  if (params.mes) qs.set('mes', params.mes)
  const q = qs.toString()
  return jsonOrThrow(`/api/cajas/resumen${q ? `?${q}` : ''}`)
}

export async function createCaja(payload) {
  return jsonOrThrow('/api/cajas', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateCaja(id, payload) {
  return jsonOrThrow(`/api/cajas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteCaja(id) {
  return jsonOrThrow(`/api/cajas/${id}`, { method: 'DELETE' })
}

export async function listRendiciones(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const q = qs.toString()
  return unwrapList(await jsonOrThrow(`/api/rendiciones${q ? `?${q}` : ''}`))
}

export async function createRendicion(payload) {
  return jsonOrThrow('/api/rendiciones', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateRendicion(id, payload) {
  return jsonOrThrow(`/api/rendiciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteRendicion(id) {
  return jsonOrThrow(`/api/rendiciones/${id}`, { method: 'DELETE' })
}

export async function listAnticipos(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const q = qs.toString()
  return unwrapList(await jsonOrThrow(`/api/anticipos${q ? `?${q}` : ''}`))
}

export async function createAnticipo(payload) {
  return jsonOrThrow('/api/anticipos', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateAnticipo(id, payload) {
  return jsonOrThrow(`/api/anticipos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteAnticipo(id) {
  return jsonOrThrow(`/api/anticipos/${id}`, { method: 'DELETE' })
}

export async function listTrabajadores() {
  return unwrapList(await jsonOrThrow('/api/admin/trabajadores'))
}

export async function createTrabajador(payload) {
  return jsonOrThrow('/api/admin/trabajadores', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateTrabajador(id, payload) {
  return jsonOrThrow(`/api/admin/trabajadores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteTrabajador(id) {
  return jsonOrThrow(`/api/admin/trabajadores/${id}`, { method: 'DELETE' })
}

export async function setTrabajadorCajas(id, claves) {
  return jsonOrThrow(`/api/admin/trabajadores/${id}/cajas`, {
    method: 'PUT',
    body: JSON.stringify({ claves })
  })
}

export async function listUsuarios() {
  return unwrapList(await jsonOrThrow('/api/admin/usuarios'))
}

export async function createUsuario(payload) {
  return jsonOrThrow('/api/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateMe(payload) {
  return jsonOrThrow('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function createTarjeta(payload) {
  return jsonOrThrow('/api/admin/tarjetas', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateTarjeta(id, payload) {
  return jsonOrThrow(`/api/admin/tarjetas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteTarjeta(id) {
  return jsonOrThrow(`/api/admin/tarjetas/${id}`, { method: 'DELETE' })
}

export async function deleteUsuario(id) {
  return jsonOrThrow(`/api/admin/usuarios/${id}`, { method: 'DELETE' })
}

export async function listTarjetas() {
  return unwrapList(await jsonOrThrow('/api/admin/tarjetas'))
}

export async function listAuditLogs(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const q = qs.toString()
  return unwrapList(await jsonOrThrow(`/api/admin/audit-logs${q ? `?${q}` : ''}`))
}

export async function syncBidireccional(payload = {}) {
  return jsonOrThrow('/api/admin/sync-bidireccional', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function listLegacy(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const q = qs.toString()
  return unwrapList(await jsonOrThrow(`/api/legacy${q ? `?${q}` : ''}`))
}
