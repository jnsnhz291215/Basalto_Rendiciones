'use strict'

const { queryTurnos, poolTurnos } = require('../config/dbTurnos')

/** Reloj de pared America/Santiago → 'YYYY-MM-DD HH:mm:ss' (sin zona). */
function nowSantiagoMysql() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date())
  const get = (type) => parts.find((p) => p.type === type)?.value || '00'
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

function nowUtcMysql() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/**
 * Avisos de emergencia vigentes desde la BD de Turnos (`avisos_emergencia`).
 * Misma ventana Chile/UTC que Turnos SPA.
 *
 * @returns {{ items: Array<object>, now: string }}
 */
async function listEmergenciaActivaDesdeTurnos() {
  const nowCl = nowSantiagoMysql()
  const nowUtc = nowUtcMysql()

  let rows
  try {
    rows = await queryTurnos(
      `SELECT
         id,
         mensaje,
         DATE_FORMAT(inicia_en, '%Y-%m-%d %H:%i:%s') AS inicia_en,
         DATE_FORMAT(termina_en, '%Y-%m-%d %H:%i:%s') AS termina_en,
         DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
       FROM avisos_emergencia
       WHERE activo = 1
       ORDER BY id DESC
       LIMIT 20`
    )
  } catch (err) {
    // Tabla aún no existe en Turnos / sin permiso: no romper Rendiciones.
    if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) {
      return { items: [], now: nowCl }
    }
    throw err
  }

  const items = (rows || [])
    .filter((r) => {
      const ini = String(r.inicia_en || '')
      const fin = String(r.termina_en || '')
      if (!ini || !fin) return false
      const matchCl = ini <= nowCl && fin > nowCl
      const matchUtc = ini <= nowUtc && fin > nowUtc
      return matchCl || matchUtc
    })
    .slice(0, 5)

  const activeIds = new Set(items.map((r) => Number(r.id)))
  const expiredIds = (rows || [])
    .map((r) => Number(r.id))
    .filter((id) => Number.isInteger(id) && id > 0 && !activeIds.has(id))

  if (expiredIds.length) {
    try {
      await poolTurnos.execute(
        `UPDATE avisos_emergencia
         SET activo = 0, desactivado_at = COALESCE(desactivado_at, NOW())
         WHERE activo = 1
           AND id IN (${expiredIds.map(() => '?').join(',')})`,
        expiredIds
      )
    } catch (updErr) {
      console.warn('[avisos-emergencia] No se pudieron auto-desactivar vencidos:', updErr.message)
    }
  }

  return { items, now: nowCl }
}

module.exports = {
  nowSantiagoMysql,
  listEmergenciaActivaDesdeTurnos
}
