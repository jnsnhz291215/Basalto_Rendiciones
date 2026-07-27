'use strict'

const fs = require('fs')
const path = require('path')
const { storagePath } = require('../config/storage')
const { procesarDocumentoConGemini } = require('./geminiClient')

const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'])

function normalizeMonto(value) {
  const n = Number(String(value ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

function montosCoinciden(esperado, detectado) {
  const a = normalizeMonto(esperado)
  const b = normalizeMonto(detectado)
  if (a == null || b == null) return false
  return Math.abs(a - b) < 0.51
}

function normalizeNumeroDoc(value) {
  return String(value || '')
    .trim()
    .replace(/[^0-9a-zA-Z]/g, '')
    .toUpperCase()
}

function numerosCoinciden(esperado, detectado) {
  const a = normalizeNumeroDoc(esperado)
  const b = normalizeNumeroDoc(detectado)
  if (!a || !b) return false
  return a === b || a.replace(/^0+/, '') === b.replace(/^0+/, '')
}

function safeFilename(originalName) {
  const base = path
    .basename(String(originalName || 'comprobante'))
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80)
  return `${Date.now()}_${base || 'comprobante'}`
}

function resolveMime(file) {
  const mime = String(file?.mimetype || '').toLowerCase()
  if (ALLOWED_MIME.has(mime)) return mime === 'image/jpg' ? 'image/jpeg' : mime
  const ext = path.extname(file?.originalname || '').toLowerCase()
  if (ext === '.pdf') return 'application/pdf'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  return ''
}

function buildPrompt({ tipoDocumento, montoEsperado, numeroEsperado }) {
  const esFactura = String(tipoDocumento || '') === 'Factura'
  return `Eres un validador de comprobantes chilenos (boleta, factura, ticket de peaje u otro).
Analiza el documento adjunto y responde SOLO un JSON con esta forma exacta:
{
  "monto_total": number|null,
  "numero_documento": string|null,
  "monto_visible": boolean,
  "numero_visible": boolean,
  "notas": string
}

Reglas:
- "monto_total" es el total a pagar / total del documento (número, sin símbolo $).
- Si el monto no se ve claro o no aparece, monto_total=null y monto_visible=false.
- "numero_documento" es el N° de factura/boleta/documento tributario cuando exista.
- Si el número no se ve claro o no aparece, numero_documento=null y numero_visible=false.
- No inventes valores. Si dudás, marca visible=false y null.
- Tipo declarado por el usuario: ${tipoDocumento || 'desconocido'}.
- Monto declarado por el usuario: ${montoEsperado}.
${esFactura ? `- Número de factura declarado: ${numeroEsperado || '(vacío)'}.` : '- No es factura: el número es opcional.'}
- notas: breve explicación en español.`
}

/**
 * Guarda el archivo en storage/comprobantes y valida con IA.
 * @returns {{ ok: boolean, comprobante_url?: string, errores: string[], detalle: object }}
 */
async function guardarYVerificarComprobante({
  file,
  montoEsperado,
  tipoDocumento,
  numeroDocumento
}) {
  const errores = []
  if (!file?.buffer?.length) {
    return {
      ok: false,
      errores: ['Debes adjuntar un comprobante (PDF, PNG o JPG).'],
      detalle: {}
    }
  }

  const mimeType = resolveMime(file)
  if (!mimeType) {
    return {
      ok: false,
      errores: ['Formato no permitido. Usa PDF, PNG o JPG.'],
      detalle: {}
    }
  }

  const montoNorm = normalizeMonto(montoEsperado)
  if (montoNorm == null || montoNorm <= 0) {
    return {
      ok: false,
      errores: ['El monto total declarado es inválido.'],
      detalle: {}
    }
  }

  const esFactura = String(tipoDocumento || '') === 'Factura'
  const numeroEsperado = String(numeroDocumento || '').trim()
  if (esFactura && !numeroEsperado) {
    return {
      ok: false,
      errores: ['Para Factura debes ingresar el N° de documento.'],
      detalle: {}
    }
  }

  const filename = safeFilename(file.originalname)
  const relPath = path.join('comprobantes', filename)
  const absPath = storagePath('comprobantes', filename)
  fs.writeFileSync(absPath, file.buffer)

  const base64Data = file.buffer.toString('base64')
  let parsed
  try {
    const result = await procesarDocumentoConGemini({
      base64Data,
      mimeType,
      prompt: buildPrompt({
        tipoDocumento,
        montoEsperado: montoNorm,
        numeroEsperado
      })
    })
    parsed = result.parsed || {}
  } catch (err) {
    try {
      fs.unlinkSync(absPath)
    } catch (_) {
      /* ignore */
    }
    return {
      ok: false,
      errores: [
        err?.message ||
          'No se pudo analizar el comprobante con IA. Sube una foto/PDF más clara e intenta de nuevo.'
      ],
      detalle: {}
    }
  }

  const montoDetectado = normalizeMonto(parsed.monto_total)
  const montoVisible = parsed.monto_visible !== false && montoDetectado != null
  if (!montoVisible || montoDetectado == null) {
    errores.push(
      'No se pudo leer el monto total en el comprobante. Sube una foto/PDF más clara donde se vea el cobro.'
    )
  } else if (!montosCoinciden(montoNorm, montoDetectado)) {
    errores.push(
      `El monto del comprobante ($${montoDetectado.toLocaleString('es-CL')}) no coincide con el monto declarado ($${montoNorm.toLocaleString('es-CL')}).`
    )
  }

  const numeroDetectado = parsed.numero_documento != null ? String(parsed.numero_documento) : null
  const numeroVisible = parsed.numero_visible !== false && Boolean(normalizeNumeroDoc(numeroDetectado))

  if (esFactura) {
    if (!numeroVisible) {
      errores.push(
        'No se pudo leer el N° de factura en el comprobante. Debe verse claramente el número de documento.'
      )
    } else if (!numerosCoinciden(numeroEsperado, numeroDetectado)) {
      errores.push(
        `El N° de factura del comprobante (${numeroDetectado}) no coincide con el declarado (${numeroEsperado}).`
      )
    }
  }

  if (errores.length) {
    try {
      fs.unlinkSync(absPath)
    } catch (_) {
      /* ignore */
    }
    return {
      ok: false,
      errores,
      detalle: {
        monto_detectado: montoDetectado,
        numero_detectado: numeroDetectado,
        notas: parsed.notas || null
      }
    }
  }

  return {
    ok: true,
    comprobante_url: relPath.replace(/\\/g, '/'),
    errores: [],
    detalle: {
      monto_detectado: montoDetectado,
      numero_detectado: numeroDetectado,
      notas: parsed.notas || null
    }
  }
}

module.exports = {
  guardarYVerificarComprobante,
  normalizeMonto,
  montosCoinciden,
  normalizeNumeroDoc,
  ALLOWED_MIME
}
