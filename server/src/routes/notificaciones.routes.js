'use strict'

const express = require('express')
const { query } = require('../config/db')
const { authMiddleware } = require('../middlewares/auth.middleware')
const { checkRole, SUPER_ADMINS } = require('../middlewares/role.middleware')
const { normalizeRut, generarPasswordTemporal } = require('../utils/mustChangePassword')
const { insertNotificacion } = require('../utils/notificaciones')
const bcrypt = require('bcryptjs')
const { registrarAuditoria } = require('../utils/audit')

const router = express.Router()

router.use(authMiddleware)

function isSuper(req) {
  return SUPER_ADMINS.includes(req.user?.rol)
}

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

    // Los resets se aprueban en Turnos SPA (solicitudes_operativas).
    // Aquí solo mostramos un aviso informativo si aún está PENDIENTE.
    let resetPendientes = []
    if (isSuper(req)) {
      resetPendientes = await query(
        `SELECT id, rut, correo_indicado, detalle, estado,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
         FROM solicitudes_reset_password
         WHERE estado = 'PENDIENTE'
         ORDER BY id DESC
         LIMIT 20`
      )
    }

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
      created_at: n.created_at
    }))

    for (const s of resetPendientes || []) {
      mapped.push({
        id: `reset-${s.id}`,
        reset_id: s.id,
        tipo: 'reset_info',
        titulo: 'Reset pendiente (aprobar en Turnos)',
        mensaje:
          (s.detalle ||
            `RUT ${s.rut}${s.correo_indicado ? ` · ${s.correo_indicado}` : ''}`) +
          ' — Abre la campana del SPA Turnos para Aceptar/Rechazar.',
        modulo: 'AUTH',
        accion: 'SOLICITAR_RESET_PASSWORD',
        entidad_tipo: 'USUARIO',
        entidad_id: s.rut,
        leida: false,
        created_at: s.created_at,
        rut: s.rut,
        correo_indicado: s.correo_indicado
      })
    }

    mapped.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))

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
    let count = Number(rows[0]?.c || 0)
    if (isSuper(req)) {
      const pend = await query(
        `SELECT COUNT(*) AS c FROM solicitudes_reset_password WHERE estado = 'PENDIENTE'`
      )
      count += Number(pend[0]?.c || 0)
    }
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
        accion: 'AVISO_PERSONAL'
      })
      created += 1
    }

    return res.json({ success: true, created })
  } catch (err) {
    console.error('[notificaciones] create:', err)
    return res.status(500).json({ success: false, error: 'No se pudo crear el aviso' })
  }
}

/** Super Admin: aprobar/rechazar solicitud de reset. */
async function resolverReset(req, res) {
  try {
    const id = Number(req.params.id)
    const accion = String(req.body?.accion || '').toUpperCase()
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'ID inválido' })
    }
    if (accion !== 'APROBAR' && accion !== 'RECHAZAR') {
      return res.status(400).json({ success: false, error: 'accion debe ser APROBAR o RECHAZAR' })
    }

    const rows = await query(
      `SELECT * FROM solicitudes_reset_password WHERE id = ? LIMIT 1`,
      [id]
    )
    const sol = rows[0]
    if (!sol) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' })
    if (sol.estado !== 'PENDIENTE') {
      return res.status(409).json({ success: false, error: 'La solicitud ya fue resuelta' })
    }

    if (accion === 'RECHAZAR') {
      await query(
        `UPDATE solicitudes_reset_password
         SET estado = 'RECHAZADA', resolved_by = ?, resolved_at = NOW()
         WHERE id = ?`,
        [req.user.id, id]
      )
      await insertNotificacion({
        rutDestinatario: sol.rut,
        titulo: 'Reset rechazado',
        mensaje: 'Tu solicitud de restablecimiento de contraseña fue rechazada.',
        modulo: 'AUTH',
        accion: 'RESET_RECHAZADO',
        entidadTipo: 'SOLICITUD_RESET',
        entidadId: id
      })
      return res.json({ success: true, estado: 'RECHAZADA' })
    }

    const usuarios = await query(
      `SELECT id, rut, correo, rol FROM usuarios
       WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
         AND is_deleted = FALSE
       LIMIT 1`,
      [normalizeRut(sol.rut)]
    )
    const dest = usuarios[0]
    if (!dest) {
      return res.status(404).json({ success: false, error: 'Usuario destino no encontrado' })
    }

    const passwordTemporal = generarPasswordTemporal(12)
    const hash = await bcrypt.hash(passwordTemporal, 10)
    await query(
      `UPDATE usuarios
       SET password_hash = ?,
           must_change_password = 1,
           temp_password_grace_started_at = NULL
       WHERE id = ?`,
      [hash, dest.id]
    )
    await query(
      `UPDATE solicitudes_reset_password
       SET estado = 'APROBADA', resolved_by = ?, resolved_at = NOW()
       WHERE id = ?`,
      [req.user.id, id]
    )

    await insertNotificacion({
      rutDestinatario: dest.rut,
      titulo: 'Clave temporal lista',
      mensaje:
        'Un administrador aprobó tu solicitud. Te entregarán una clave temporal; deberás cambiarla al ingresar.',
      modulo: 'AUTH',
      accion: 'RESET_APROBADO',
      entidadTipo: 'SOLICITUD_RESET',
      entidadId: id
    })

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Usuarios',
      `Aprobó reset de contraseña para RUT ${dest.rut}`
    )

    return res.json({
      success: true,
      estado: 'APROBADA',
      password_temporal: passwordTemporal,
      usuario: {
        id: dest.id,
        rut: dest.rut,
        correo: dest.correo,
        rol: dest.rol
      }
    })
  } catch (err) {
    console.error('[notificaciones] resolver reset:', err)
    return res.status(500).json({ success: false, error: 'No se pudo resolver la solicitud' })
  }
}

router.get('/inbox', listInbox)
router.get('/inbox/count', countInbox)
router.patch('/inbox/leer', markAllRead)
router.patch('/inbox/:id/leer', markOneRead)
router.post('/', checkRole(SUPER_ADMINS), createNotificacion)
router.patch('/reset/:id/resolver', checkRole(SUPER_ADMINS), resolverReset)

module.exports = router
