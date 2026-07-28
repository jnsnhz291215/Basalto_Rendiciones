'use strict'

const fs = require('fs')
const path = require('path')
const { storagePath } = require('../config/storage')

const TIPOS_MOVIMIENTO = new Set(['gasto', 'asignacion', 'devolucion'])

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Segmento seguro para nombre de archivo / carpeta */
function slugPart(value, { max = 40, fallback = 'x' } = {}) {
  const cleaned = stripAccents(value)
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, max)
  return cleaned || fallback
}

function normalizeTipoMovimiento(value) {
  const raw = stripAccents(String(value || ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (raw === 'anticipo' || raw === 'asignacion' || raw === 'asignación') return 'asignacion'
  if (raw === 'devolucion' || raw === 'devolución') return 'devolucion'
  if (raw === 'gasto' || raw === 'rendicion' || raw === 'rendición') return 'gasto'
  if (TIPOS_MOVIMIENTO.has(raw)) return raw
  return 'gasto'
}

function normalizeTipoDocto(value, tipoMovimiento) {
  if (tipoMovimiento === 'asignacion') return 'vale'
  if (tipoMovimiento === 'devolucion') return 'comprobante'
  const raw = stripAccents(String(value || ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (!raw) return 'documento'
  if (raw === 'ticket_peaje' || raw === 'peaje') return 'peaje'
  if (raw === 'guia_despacho' || raw === 'guia' || raw === 'guía_despacho') return 'guia_despacho'
  if (raw === 'boleta') return 'boleta'
  if (raw === 'factura') return 'factura'
  return slugPart(raw, { max: 24, fallback: 'documento' })
}

function mesFromFecha(fecha) {
  const s = String(fecha || '').trim()
  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}`
  // DD/MM/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}`
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function extensionFromFile(file) {
  const ext = path.extname(file?.originalname || '').toLowerCase()
  if (ext === '.pdf' || ext === '.png' || ext === '.jpg' || ext === '.jpeg') return ext
  const mime = String(file?.mimetype || '').toLowerCase()
  if (mime === 'application/pdf') return '.pdf'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg'
  return '.bin'
}

/**
 * Ruta relativa:
 *   {YYYY-MM}/{cc}/{caja}/{gasto|asignacion|devolucion}/{caja}_{trabajador}_{mov}_{docto}.ext
 *
 * Nombre:
 *   caja_trabajador_gasto_boleta.pdf
 */
function buildComprobanteRelPath({
  mes,
  centroCobro,
  caja,
  trabajador,
  tipoMovimiento,
  tipoDocumento,
  file
}) {
  const mov = normalizeTipoMovimiento(tipoMovimiento)
  const docto = normalizeTipoDocto(tipoDocumento, mov)
  const mesKey = mesFromFecha(mes)
  const ccKey = slugPart(centroCobro, { max: 48, fallback: 'sin_cc' })
  const cajaKey = slugPart(caja, { max: 40, fallback: 'sin_caja' })
  const trabKey = slugPart(trabajador, { max: 40, fallback: 'sin_trabajador' })
  const stamp = String(Date.now()).slice(-6)
  const filename = `${cajaKey}_${trabKey}_${mov}_${docto}_${stamp}${extensionFromFile(file)}`

  const relDir = path.join(mesKey, ccKey, cajaKey, mov)
  const relPath = path.join(relDir, filename)
  return {
    relDir: relDir.replace(/\\/g, '/'),
    relPath: relPath.replace(/\\/g, '/'),
    filename
  }
}

function writeComprobanteFile(relPath, buffer) {
  const absPath = storagePath(...relPath.split('/'))
  fs.mkdirSync(path.dirname(absPath), { recursive: true })
  fs.writeFileSync(absPath, buffer)
  return absPath
}

function removeComprobanteFile(relPath) {
  if (!relPath) return
  try {
    const absPath = storagePath(...String(relPath).split('/'))
    fs.unlinkSync(absPath)
  } catch (_) {
    /* ignore */
  }
}

module.exports = {
  TIPOS_MOVIMIENTO,
  slugPart,
  normalizeTipoMovimiento,
  normalizeTipoDocto,
  mesFromFecha,
  buildComprobanteRelPath,
  writeComprobanteFile,
  removeComprobanteFile
}
