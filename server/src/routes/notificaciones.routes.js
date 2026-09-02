'use strict'

const express = require('express')
const { query } = require('../config/db')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, SUPER_ADMINS } = require('../middlewares/role.middleware')
const { normalizeRut } = require('../utils/mustChangePassword')
const { insertNotificacion } = require('../utils/notificaciones')

const router = express.Router()

router.use(authMiddleware)

async function listInbox(req, res) {
  try {
    const rut = normalizeRut(req.user.rut)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30))

    const items = await query(
      `SELECT id, titulo, mensaje, modulo, accion, entidad_tipo, entidad_id,
              leido, leido_at,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
       FROM notificaciones_inbox
       WHERE REPLACE(REPLACE(UPPER(rut_destinatario), '.', ''), '-', '') = ?
       ORDER BY id DESC
       LIMIT ${limit}`,
      [rut]
    )

    // Resets de contraseña: cola única en Panel (/solicitudes-reset). No listar locales.
    const mapped = (items || []).map((n) => ({
      id: `n-${n.id}`,
      notif_id: n.id,
      tipo: 'notif',
      titulo: n.titulo,
      mensaje: n.mensaje,
      modulo: n.modulo,
      accion: n.accion,
      entidad_tipo: n.entidad_tipo,
      entidad_id: n.entidad_id,
      leida: Boolean(n.leido),
      created_at: n.created_at,
    }))

    return res.json({ success: true, items: mapped.slice(0, limit) })
  } catch (err) {
    console.error('[notificaciones] inbox:', err)
    return res.status(500).json({ success: false, error: 'No se pudo cargar el inbox' })
  }
}

async function countInbox(req, res) {
  try {
    const rut = normalizeRut(req.user.rut)
    const rows = await query(
      `SELECT COUNT(*) AS c FROM notificaciones_inbox
       WHERE REPLACE(REPLACE(UPPER(rut_destinatario), '.', ''), '-', '') = ?
         AND leido = 0`,
      [rut]
    )
    const count = Number(rows[0]?.c || 0)
    return res.json({ success: true, count })
  } catch (err) {
    console.error('[notificaciones] count:', err)
    return res.status(500).json({ success: false, error: 'No se pudo contar' })
  }
}

async function markAllRead(req, res) {
  try {
    const rut = normalizeRut(req.user.rut)
    await query(
      `UPDATE notificaciones_inbox
       SET leido = 1, leido_at = NOW()
       WHERE REPLACE(REPLACE(UPPER(rut_destinatario), '.', ''), '-', '') = ?
         AND leido = 0`,
      [rut]
    )
    return res.json({ success: true })
  } catch (err) {
    console.error('[notificaciones] mark all:', err)
    return res.status(500).json({ success: false, error: 'No se pudo marcar' })
  }
}

async function markOneRead(req, res) {
  try {
    const rut = normalizeRut(req.user.rut)
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'ID inválido' })
    }
    await query(
      `UPDATE notificaciones_inbox
       SET leido = 1, leido_at = NOW()
       WHERE id = ?
         AND REPLACE(REPLACE(UPPER(rut_destinatario), '.', ''), '-', '') = ?
         AND leido = 0`,
      [id, rut]
    )
    return res.json({ success: true })
  } catch (err) {
    console.error('[notificaciones] mark one:', err)
    return res.status(500).json({ success: false, error: 'No se pudo marcar' })
  }
}

/** Super Admin: enviar aviso a uno o más RUT. */
async function createNotificacion(req, res) {
  try {
    const titulo = String(req.body?.titulo || 'Aviso').trim().slice(0, 120)
    const mensaje = String(req.body?.mensaje || '').trim()
    let ruts = req.body?.ruts
    if (typeof ruts === 'string') ruts = [ruts]
    if (!Array.isArray(ruts) || !ruts.length) {
      return res.status(400).json({ success: false, error: 'Se requiere ruts[]' })
    }
    if (!mensaje) {
      return res.status(400).json({ success: false, error: 'Se requiere mensaje' })
    }

    let created = 0
    for (const raw of ruts) {
      const rut = normalizeRut(raw)
      if (!rut) continue
      await insertNotificacion({
        rutDestinatario: rut,
        titulo,
        mensaje,
        modulo: 'AVISO',
        accion: 'AVISO_PERSONAL',
      })
      created += 1
    }

    return res.json({ success: true, created })
  } catch (err) {
    console.error('[notificaciones] create:', err)
    return res.status(500).json({ success: false, error: 'No se pudo crear el aviso' })
  }
}

/** Deprecado: reset unificado en Panel administrativo. */
async function resolverReset(_req, res) {
  return res.status(410).json({
    success: false,
    code: 'reset_password_moved',
    error:
      'El restablecimiento de contraseña se gestiona en el Panel administrativo (solicitudes-reset).',
  })
}

router.get('/inbox', listInbox)
router.get('/inbox/count', countInbox)
router.patch('/inbox/leer', markAllRead)
router.patch('/inbox/:id/leer', markOneRead)
router.post('/', checkRole(SUPER_ADMINS), createNotificacion)
router.patch('/reset/:id/resolver', checkRole(SUPER_ADMINS), resolverReset)

module.exports = router
