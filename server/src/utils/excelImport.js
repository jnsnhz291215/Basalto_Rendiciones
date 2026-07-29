'use strict'

const XLSX = require('xlsx')

const HEADERS_GASTOS = [
  'fecha',
  'trabajador_rut',
  'trabajador_nombre',
  'cc',
  'caja',
  'tipo_documento',
  'numero_documento',
  'monto',
  'origen_pago',
  'tarjeta_ultimos4',
  'descripcion'
]

const HEADERS_ASIGNACIONES = [
  'fecha',
  'trabajador_rut',
  'trabajador_nombre',
  'cc',
  'caja',
  'n_doc_vale',
  'monto',
  'numero_cuenta',
  'banco_origen',
  'observacion'
]

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function cellToString(value) {
  if (value == null) return ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const dd = String(value.getDate()).padStart(2, '0')
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const yyyy = value.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }
  // Excel a veces entrega números (RUT sin guión, montos, etc.)
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-9) {
      return String(Math.round(value))
    }
    return String(value)
  }
  return String(value).trim()
}

/**
 * Clave de comparación para CC / caja:
 * quita acentos, espacios, guiones y símbolos → solo A-Z0-9 mayúsculas.
 * "Test CAJA" === "test_caja" === "TestCAJA"
 */
function normalizeLookupKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
}

/** RUT: solo dígitos + K (igual que el front). */
function cleanRut(value) {
  return cellToString(value)
    .toUpperCase()
    .replace(/[^0-9K]/g, '')
}

/**
 * N° documento / vale: sin espacios ni separadores visuales; conserva letras/números.
 * "12.345-6" → "123456", "  F-001 " → "F001"
 */
function normalizeNumeroDocumento(value) {
  return cellToString(value)
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, 50)
}

function normalizeTarjetaUltimos4(value) {
  const digits = cellToString(value).replace(/\D/g, '')
  if (!digits) return ''
  return digits.slice(-4).padStart(4, '0').slice(-4)
}

/** Número de cuenta: solo dígitos (quita puntos, guiones, espacios). */
function normalizeNumeroCuenta(value) {
  return cellToString(value)
    .replace(/\D/g, '')
    .slice(0, 40)
}

/**
 * Lee el primer sheet y exige que existan TODAS las columnas requeridas.
 * @returns {{ ok: true, rows: object[] } | { ok: false, error: string, faltantes?: string[] }}
 */
function parseExcelConHeaders(buffer, requiredHeaders, sheetPreferido = null) {
  if (!buffer?.length) {
    return { ok: false, error: 'Archivo vacío o inválido.' }
  }

  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  } catch (err) {
    return { ok: false, error: 'No se pudo leer el Excel. Usa la plantilla .xlsx del sistema.' }
  }

  if (!workbook.SheetNames?.length) {
    return { ok: false, error: 'El Excel no tiene hojas.' }
  }

  let sheetName = workbook.SheetNames[0]
  if (sheetPreferido) {
    const found = workbook.SheetNames.find(
      (n) => normalizeHeader(n) === normalizeHeader(sheetPreferido)
    )
    if (found) sheetName = found
  }

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false
  })

  if (!matrix.length) {
    return { ok: false, error: 'La hoja está vacía.' }
  }

  const headerRow = matrix[0].map(normalizeHeader)
  const indexByHeader = new Map()
  headerRow.forEach((h, i) => {
    if (h && !indexByHeader.has(h)) indexByHeader.set(h, i)
  })

  const faltantes = requiredHeaders.filter((h) => !indexByHeader.has(h))
  if (faltantes.length) {
    return {
      ok: false,
      error: `Faltan columnas obligatorias en el Excel: ${faltantes.join(', ')}`,
      faltantes
    }
  }

  const rows = []
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] || []
    const obj = {}
    let any = false
    for (const key of requiredHeaders) {
      const idx = indexByHeader.get(key)
      const raw = line[idx]
      const val = cellToString(raw)
      obj[key] = val
      obj.__raw = obj.__raw || {}
      obj.__raw[key] = raw
      if (val) any = true
    }
    if (!any) continue
    obj.__row = r + 1
    rows.push(obj)
  }

  if (!rows.length) {
    return { ok: false, error: 'No hay filas de datos bajo el encabezado.' }
  }

  return { ok: true, rows, sheetName }
}

function parseFechaToIso(value) {
  const s = cellToString(value)
  // DD/MM/YYYY
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
  }
  // YYYY-MM-DD
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  // Excel serial (número de días desde 1899-12-30)
  const n = typeof value === 'number' ? value : Number(s)
  if (Number.isFinite(n) && n > 20000 && n < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30))
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(n))
    return epoch.toISOString().slice(0, 10)
  }
  return null
}

function parseMonto(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100) / 100
  }
  const raw = cellToString(value)
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '')
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function mapTipoDocumento(value) {
  const raw = cellToString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (!raw) return null
  if (raw === 'b' || raw === 'boleta') return 'Boleta'
  if (raw === 'f' || raw === 'factura') return 'Factura'
  if (raw === 'p' || raw === 'peaje' || raw === 'ticket_peaje' || raw === 'ticket peaje') {
    return 'Peaje'
  }
  if (
    raw === 'g' ||
    raw === 'guia' ||
    raw === 'guia_despacho' ||
    raw === 'guia despacho' ||
    raw.startsWith('guia')
  ) {
    return 'Guía Despacho'
  }
  return null
}

function mapOrigenPago(value) {
  const raw = cellToString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (!raw) return null
  if (raw === 'e' || raw === 'efectivo') return 'Efectivo'
  if (raw === 'd' || raw === 'debito') return 'Debito'
  if (raw === 'c' || raw === 'credito') return 'Credito'
  return null
}

/**
 * ¿Dos textos de CC/caja apuntan al mismo registro?
 * Compara clave normalizada; también acepta si una contiene a la otra (≥3 chars).
 */
function keysMatch(a, b) {
  const ka = normalizeLookupKey(a)
  const kb = normalizeLookupKey(b)
  if (!ka || !kb) return false
  if (ka === kb) return true
  if (ka.length >= 3 && kb.length >= 3 && (ka.includes(kb) || kb.includes(ka))) return true
  return false
}

module.exports = {
  HEADERS_GASTOS,
  HEADERS_ASIGNACIONES,
  parseExcelConHeaders,
  parseFechaToIso,
  parseMonto,
  cleanRut,
  normalizeLookupKey,
  normalizeNumeroDocumento,
  normalizeNumeroCuenta,
  normalizeTarjetaUltimos4,
  mapTipoDocumento,
  mapOrigenPago,
  keysMatch,
  cellToString
}
