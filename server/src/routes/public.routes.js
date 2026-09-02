'use strict'

const express = require('express')
const { forwardSolicitarResetPassword, forwardSolicitarAccesoSistema, isCentralPasswordResetConfigured } = require('../utils/centralPasswordResetClient')

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

function normalizeRut(raw) {
  return String(raw || '')
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/\s/g, '')
    .toUpperCase()
}

const GENERIC_OK = {
  success: true,
  message:
    'Si los datos coinciden con una cuenta activa, un administrador revisará tu solicitud.',
}

/**
 * POST /api/public/solicitar-reset-password
 * Reenvía a Panel Central (cola única). Sin insert local ni campana Turnos.
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
        error: 'Se requieren RUT y correo válidos',
      })
    }

    const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown')
    const now = Date.now()
    if (tooMany(hitsByIp, ip, 5, now) || tooMany(hitsByRut, rut, 3, now)) {
      return res.status(429).json({
        success: false,
        error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
      })
    }

    if (!isCentralPasswordResetConfigured()) {
      console.error('[public] reset: CENTRAL_MAIL_URL / PANEL_ADMIN_URL no configurado')
      return res.status(503).json({
        success: false,
        error: 'Servicio de restablecimiento no disponible',
      })
    }

    const forwarded = await forwardSolicitarResetPassword({
      rut,
      email,
      origen: 'rendiciones',
    })

    if (forwarded.status === 409) {
      return res.status(409).json({
        success: false,
        error: forwarded.body?.error || 'Ya existe una solicitud pendiente para este RUT.',
      })
    }

    if (forwarded.status >= 400) {
      if (forwarded.status === 400) {
        return res.status(400).json({
          success: false,
          error: forwarded.body?.error || 'Se requieren RUT y correo válidos',
        })
      }
      console.error('[public] reset Panel status', forwarded.status, forwarded.body)
      return res.status(502).json({
        success: false,
        error: 'No se pudo registrar la solicitud',
      })
    }

    return res.json({
      success: true,
      message: forwarded.body?.message || GENERIC_OK.message,
    })
  } catch (err) {
    console.error('[public] solicitar-reset-password:', err)
    return res.status(500).json({
      success: false,
      error: 'No se pudo registrar la solicitud',
    })
  }
})

/**
 * POST /api/public/solicitar-acceso-sistema
 * Credenciales OK pero sin flag rendiciones → pedir acceso (cola Central).
 */
router.post('/solicitar-acceso-sistema', async (req, res) => {
  try {
    const honeypot = String(req.body?.website_hp || '').trim()
    if (honeypot) {
      return res.json(GENERIC_OK)
    }

    const rut = normalizeRut(req.body?.rut)
    if (!rut || rut.length < 7) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un RUT válido',
      })
    }

    const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown')
    const now = Date.now()
    if (tooMany(hitsByIp, ip, 5, now) || tooMany(hitsByRut, rut, 3, now)) {
      return res.status(429).json({
        success: false,
        error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
      })
    }

    if (!isCentralPasswordResetConfigured()) {
      console.error('[public] acceso: CENTRAL_MAIL_URL / PANEL_ADMIN_URL no configurado')
      return res.status(503).json({
        success: false,
        error: 'Servicio de solicitud de acceso no disponible',
      })
    }

    const forwarded = await forwardSolicitarAccesoSistema({
      rut,
      sistema: 'rendiciones',
      origen: 'rendiciones',
      detalle: req.body?.detalle,
    })

    if (forwarded.status === 409) {
      return res.status(409).json({
        success: false,
        code: 'already_pending',
        error: forwarded.body?.error || 'Ya existe una solicitud pendiente.',
      })
    }

    if (!forwarded.ok) {
      if (forwarded.status === 400) {
        return res.status(400).json({
          success: false,
          error: forwarded.body?.error || 'Datos inválidos',
        })
      }
      console.error('[public] acceso Panel status', forwarded.status, forwarded.body)
      return res.status(502).json({
        success: false,
        error: 'No se pudo registrar la solicitud',
      })
    }

    return res.json({
      success: true,
      message: forwarded.body?.message || GENERIC_OK.message,
      already: Boolean(forwarded.body?.already),
    })
  } catch (err) {
    console.error('[public] solicitar-acceso-sistema:', err)
    return res.status(500).json({
      success: false,
      error: 'No se pudo registrar la solicitud',
    })
  }
})

module.exports = router
