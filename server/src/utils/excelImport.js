'use strict'

const XLSX = require('xlsx')

/** Header canónico de plantilla. Columna DB / API sigue siendo origen_pago. */
const HEADERS_GASTOS = [
  'fecha',
  'trabajador_rut',
  'trabajador_nombre',
  'cc',
  'caja',
  'tipo_documento',
  'numero_documento',
  'monto',
  'forma_pago',
  'tarjeta_ultimos4',
  'patente',
  'descripcion'
]

/**
 * Alias de encabezado Excel → clave canónica en HEADERS_*.
 * Acepta plantillas antiguas (origen_pago) y variantes con espacios.
 */
const HEADER_ALIASES = {
  forma_pago: ['origen_pago', 'forma_de_pago']
}

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

/** Resuelve índice de columna: clave canónica o cualquiera de sus alias. */
function resolveHeaderIndex(indexByHeader, canonicalKey) {
  if (indexByHeader.has(canonicalKey)) return indexByHeader.get(canonicalKey)
  const aliases = HEADER_ALIASES[canonicalKey] || []
  for (const alias of aliases) {
    if (indexByHeader.has(alias)) return indexByHeader.get(alias)
  }
  return undefined
}

/**
 * Lee el primer sheet y exige que existan TODAS las columnas requeridas.
 * Acepta alias de encabezado (p. ej. origen_pago → forma_pago).
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

  const faltantes = requiredHeaders.filter(
    (h) => resolveHeaderIndex(indexByHeader, h) === undefined
  )
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
      const idx = resolveHeaderIndex(indexByHeader, key)
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
  if (
    raw === 'oc' ||
    raw === 'o' ||
    raw === 'orden_de_compra' ||
    raw === 'orden de compra' ||
    raw === 'ordencompra' ||
    raw.startsWith('orden')
  ) {
    return 'Orden de compra'
  }
  return null
}

/** Mapea forma_pago / origen_pago Excel → valor DB origen_pago (Efectivo|Debito|Credito). */
function mapOrigenPago(value) {
  const raw = cellToString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
    .trim()
  if (!raw) return null
  if (raw === 'e' || raw.startsWith('efect')) return 'Efectivo'
  if (raw === 'd' || raw.startsWith('debit')) return 'Debito'
  if (raw === 'c' || raw.startsWith('credit')) return 'Credito'
  return null
}

/**
 * Patente chilena corta: display XX-XX-NN, guardado XXXXNN (4 letras + 2 dígitos).
 */
function normalizePatente(value) {
  const chars = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  let out = ''
  for (const ch of chars) {
    if (out.length >= 6) break
    if (out.length < 4) {
      if (/[A-Z]/.test(ch)) out += ch
    } else if (/[0-9]/.test(ch)) {
      out += ch
    }
  }
  return out
}

function formatPatenteDisplay(value) {
  const clean = normalizePatente(value)
  if (!clean) return ''
  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)}-${clean.slice(2)}`
  return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4)}`
}

/**
 * N° documento:
 * - Peaje: no aplica
 * - Boleta: opcional
 * - Factura / Guía Despacho / Orden de compra: obligatorio
 */
function tipoAceptaNumeroDocumento(tipo) {
  return (
    tipo === 'Boleta' ||
    tipo === 'Factura' ||
    tipo === 'Guía Despacho' ||
    tipo === 'Orden de compra'
  )
}

function tipoRequiereNumeroDocumento(tipo) {
  return (
    tipo === 'Factura' ||
    tipo === 'Guía Despacho' ||
    tipo === 'Orden de compra'
  )
}

function resolveNumeroDocumentoForTipo(tipo, value) {
  if (!tipoAceptaNumeroDocumento(tipo)) return null
  const num = normalizeNumeroDocumento(value)
  return num || null
}
function keysMatch(a, b) {
  const ka = normalizeLookupKey(a)
  const kb = normalizeLookupKey(b)
  if (!ka || !kb) return false
  if (ka === kb) return true
  if (ka.length >= 3 && kb.length >= 3 && (ka.includes(kb) || kb.includes(ka))) return true
  return false
}

/**
 * Solo enteros positivos exactos (id de catálogo).
 * Acepta number o string "12" / "12.0"; rechaza "12abc", vacío, etc.
 */
function parsePositiveIntId(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.round(value)
    if (n > 0 && Math.abs(value - n) < 1e-9) return n
    return null
  }
  const s = cellToString(value).trim()
  if (!/^\d+(\.0+)?$/.test(s)) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

/**
 * Resuelve caja_id desde filas de catálogo.
 * Prioridad: id numérico exacto de caja → filtro cc por id → fuzzy keysMatch.
 *
 * @param {{ id: any, clave_interna?: any, nombre_exterior?: any, cc_nombre?: any, centro_cobro_id?: any }[]} rows
 * @param {any} ccNombre
 * @param {any} cajaClave
 * @returns {number|null}
 */
function resolveCajaIdFromCatalog(rows, ccNombre, cajaClave) {
  const list = Array.isArray(rows) ? rows : []
  const ccRaw = cellToString(ccNombre)
  const cajaRaw = cellToString(cajaClave)
  if (!cajaRaw) return null

  const cajaIdNum = parsePositiveIntId(cajaRaw)
  if (cajaIdNum != null) {
    const byId = list.find((r) => Number(r.id) === cajaIdNum)
    if (byId) return Number(byId.id)
  }

  const ccIdNum = parsePositiveIntId(ccRaw)
  let candidates = list
  if (ccRaw) {
    if (ccIdNum != null) {
      candidates = list.filter((r) => Number(r.centro_cobro_id) === ccIdNum)
    } else {
      candidates = list.filter((r) => keysMatch(r.cc_nombre, ccRaw))
    }
  }

  const matches = candidates.filter((r) => {
    return keysMatch(r.clave_interna, cajaRaw) || keysMatch(r.nombre_exterior, cajaRaw)
  })

  if (!matches.length) return null
  if (matches.length === 1) return Number(matches[0].id)

  const byKey = matches.find((r) => keysMatch(r.clave_interna, cajaRaw))
  return Number((byKey || matches[0]).id)
}

module.exports = {
  HEADERS_GASTOS,
  HEADERS_ASIGNACIONES,
  HEADER_ALIASES,
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
  parsePositiveIntId,
  resolveCajaIdFromCatalog,
  cellToString,
  tipoAceptaNumeroDocumento,
  tipoRequiereNumeroDocumento,
  resolveNumeroDocumentoForTipo,
  normalizePatente,
  formatPatenteDisplay
}
