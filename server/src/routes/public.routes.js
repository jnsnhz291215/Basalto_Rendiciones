'use strict'

const express = require('express')
const { query } = require('../config/db')
const { normalizeRut } = require('../utils/mustChangePassword')
const { crearSolicitudResetEnTurnos } = require('../utils/solicitudesOperativasTurnos')

const router = express.Router()

/** Rate limit simple en memoria: 5/IP y 3/RUT por 15 min. */
const hitsByIp = new Map()
const hitsByRut = new Map()
const WINDOW_MS = 15 * 60 * 1000

function prune(map, now) {
  for (const [k, arr] of map.entries()) {
    const next = arr.filter((t) => now - t < WINDOW_MS)
    if (next.length) map.set(k, next)
    else map.delete(k)
  }
}

function tooMany(map, key, limit, now) {
  prune(map, now)
  const arr = map.get(key) || []
  if (arr.length >= limit) return true
  arr.push(now)
  map.set(key, arr)
  return false
}

const GENERIC_OK = {
  success: true,
  message:
    'Si los datos coinciden con una cuenta activa, un administrador revisará tu solicitud.'
}

/**
 * POST /api/public/solicitar-reset-password
 * Body: { rut, email, website_hp? }
 *
 * Registra solicitud local + inserta en campana Turnos (`solicitudes_operativas`)
 * para que Super Admins aprueben desde el SPA.
 */
router.post('/solicitar-reset-password', async (req, res) => {
  try {
    const honeypot = String(req.body?.website_hp || '').trim()
    if (honeypot) {
      return res.json(GENERIC_OK)
    }

    const rut = normalizeRut(req.body?.rut)
    const email = String(req.body?.email || '').trim().toLowerCase()
    if (!rut || rut.length < 7 || !email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren RUT y correo válidos'
      })
    }

    const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown')
    const now = Date.now()
    if (tooMany(hitsByIp, ip, 5, now) || tooMany(hitsByRut, rut, 3, now)) {
      return res.status(429).json({
        success: false,
        error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
      })
    }

    const users = await query(
      `SELECT u.id, u.rut, u.correo, u.estado, u.is_deleted, u.rol,
              COALESCE(t.nombre_completo, u.correo) AS nombre
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id AND t.is_deleted = FALSE
       WHERE REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', '') = ?
       LIMIT 1`,
      [rut]
    )
    const user = users[0]

    // Anti-enumeración: siempre respuesta genérica si no calza
    if (!user || user.is_deleted || user.estado !== 'activo') {
      return res.json(GENERIC_OK)
    }

    const correoFicha = String(user.correo || '').trim().toLowerCase()
    if (correoFicha && correoFicha !== email) {
      return res.json(GENERIC_OK)
    }

    const pendientes = await query(
      `SELECT id FROM solicitudes_reset_password
       WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
         AND estado = 'PENDIENTE'
       LIMIT 1`,
      [rut]
    )
    if (pendientes[0]) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una solicitud pendiente para este RUT.'
      })
    }

    const detalle =
      `Reset solicitado · RUT ${rut} · correo indicado ${email}` +
      (correoFicha ? ` · ficha ${correoFicha}` : ' · ficha sin correo')

    const result = await query(
      `INSERT INTO solicitudes_reset_password (rut, correo_indicado, estado, detalle)
       VALUES (?, ?, 'PENDIENTE', ?)`,
      [rut, email, detalle]
    )

    const rol = String(user.rol || '')
    const tipoCuenta =
      rol === 'SUPER_ADMIN' || rol === 'SUPER_ADMIN_DEV' || rol === 'ADMIN_CAJA'
        ? 'administrador'
        : 'trabajador'

    try {
      await crearSolicitudResetEnTurnos({
        rut,
        emailIndicado: email,
        emailFicha: correoFicha,
        nombre: user.nombre || '',
        tipoCuenta,
        solicitudLocalId: result.insertId
      })
    } catch (err) {
      // La solicitud local ya quedó; Turnos puede fallar por red/env.
      console.error('[public] solicitud Turnos (campana):', err?.message || err)
    }

    return res.json(GENERIC_OK)
  } catch (err) {
    console.error('[public] solicitar-reset-password:', err)
    return res.status(500).json({
      success: false,
      error: 'No se pudo registrar la solicitud'
    })
  }
})

module.exports = router
