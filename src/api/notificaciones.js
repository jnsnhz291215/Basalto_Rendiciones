import { apiFetch } from './client'

export async function fetchNotificacionesInbox(limit = 30) {
  const { res, data } = await apiFetch(`/api/notificaciones/inbox?limit=${limit}`, {
    silent: true
  })
  if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el inbox')
  return Array.isArray(data?.items) ? data.items : []
}

export async function fetchNotificacionesCount() {
  const { res, data } = await apiFetch('/api/notificaciones/inbox/count', { silent: true })
  if (!res.ok) return 0
  return Number(data?.count || 0)
}

export async function markAllNotificacionesLeidas() {
  const { res, data } = await apiFetch('/api/notificaciones/inbox/leer', {
    method: 'PATCH',
    silent: true
  })
  if (!res.ok) throw new Error(data?.error || 'No se pudo marcar')
  return data
}

export async function markNotificacionLeida(id) {
  const { res, data } = await apiFetch(`/api/notificaciones/inbox/${id}/leer`, {
    method: 'PATCH',
    silent: true
  })
  if (!res.ok) throw new Error(data?.error || 'No se pudo marcar')
  return data
}

export async function createNotificacion(payload) {
  const { res, data } = await apiFetch('/api/notificaciones', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(data?.error || 'No se pudo enviar el aviso')
  return data
}

export async function resolverResetSolicitud(id, accion) {
  const { res, data } = await apiFetch(`/api/notificaciones/reset/${id}/resolver`, {
    method: 'PATCH',
    body: JSON.stringify({ accion })
  })
  if (!res.ok) throw new Error(data?.error || 'No se pudo resolver')
  return data
}

export async function solicitarResetPassword({ rut, email, website_hp = '' }) {
  const { res, data } = await apiFetch('/api/public/solicitar-reset-password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ rut, email, website_hp })
  })
  if (res.status === 409 || res.status === 429) {
    const err = new Error(data?.error || 'No se pudo solicitar')
    err.status = res.status
    throw err
  }
  if (!res.ok) throw new Error(data?.error || 'No se pudo solicitar el reset')
  return data
}

export async function dismissTempPassword() {
  const { res, data } = await apiFetch('/api/auth/temp-password/dismiss', {
    method: 'POST'
  })
  if (!res.ok) throw new Error(data?.error || data?.message || 'No se pudo continuar')
  return data
}
