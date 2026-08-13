/**
 * Plantillas Excel (.xlsx) sin dependencias.
 * Genera ZIP OOXML válido para Excel / Google Sheets / LibreOffice.
 */

import { listCajas, listCentrosCosto } from '../api/resources'

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function colLetter(index0) {
  let n = index0 + 1
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/**
 * @param {{ r: number, c: number, v: string|number, header?: boolean }[]} cells
 * @param {{ width: number }[]} [cols]
 */
function worksheetFromCells(cells, cols = []) {
  const byRow = new Map()
  for (const cell of cells) {
    if (!byRow.has(cell.r)) byRow.set(cell.r, [])
    byRow.get(cell.r).push(cell)
  }

  const rowXml = [...byRow.keys()]
    .sort((a, b) => a - b)
    .map((r) => {
      const list = byRow
        .get(r)
        .sort((a, b) => a.c - b.c)
        .map((cell) => {
          const ref = `${colLetter(cell.c)}${cell.r}`
          const style = cell.header ? ' s="1"' : ''
          if (typeof cell.v === 'number' && Number.isFinite(cell.v)) {
            return `<c r="${ref}"${style}><v>${cell.v}</v></c>`
          }
          return `<c r="${ref}"${style} t="inlineStr"><is><t>${escapeXml(cell.v)}</t></is></c>`
        })
        .join('')
      return `<row r="${r}">${list}</row>`
    })
    .join('')

  const colsXml =
    cols.length > 0
      ? `<cols>${cols
          .map(
            (col, i) =>
              `<col min="${i + 1}" max="${i + 1}" width="${col.width}" customWidth="1"/>`
          )
          .join('')}</cols>`
      : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsXml}
  <sheetData>${rowXml}</sheetData>
</worksheet>`
}

function tableCells(startRow, startCol, rows, { headerRows = 1 } = {}) {
  const cells = []
  rows.forEach((row, ri) => {
    row.forEach((v, ci) => {
      cells.push({
        r: startRow + ri,
        c: startCol + ci,
        v,
        header: ri < headerRows
      })
    })
  })
  return cells
}

function workbookXml(sheetNames) {
  const sheets = sheetNames
    .map(
      (name, i) =>
        `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets}</sheets>
</workbook>`
}

function workbookRelsXml(count) {
  const sheetRels = Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`
  }).join('')
  const stylesRid = `rId${count + 1}`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
}

function contentTypesXml(sheetCount) {
  const overrides = Array.from({ length: sheetCount }, (_, i) => {
    const n = i + 1
    return `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${overrides}
</Types>`
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>`
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u16(n) {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}

function u32(n) {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}

function concatBytes(parts) {
  const total = parts.reduce((acc, p) => acc + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

function encodeUtf8(str) {
  return new TextEncoder().encode(str)
}

function zipStore(files) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encodeUtf8(file.name)
    const data = file.data
    const crc = crc32(data)
    const localHeader = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes
    ])
    localParts.push(localHeader, data)

    const central = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes
    ])
    centralParts.push(central)
    offset += localHeader.length + data.length
  }

  const centralDir = concatBytes(centralParts)
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0)
  ])

  return concatBytes([...localParts, centralDir, end])
}

/**
 * @param {string} filename
 * @param {{ name: string, xml: string }[]} sheets
 */
function downloadXlsx(filename, sheets) {
  const names = sheets.map((s) => s.name)
  const files = [
    { name: '[Content_Types].xml', data: encodeUtf8(contentTypesXml(sheets.length)) },
    { name: '_rels/.rels', data: encodeUtf8(rootRelsXml()) },
    { name: 'xl/workbook.xml', data: encodeUtf8(workbookXml(names)) },
    { name: 'xl/_rels/workbook.xml.rels', data: encodeUtf8(workbookRelsXml(sheets.length)) },
    { name: 'xl/styles.xml', data: encodeUtf8(stylesXml()) }
  ]

  sheets.forEach((sheet, i) => {
    files.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: encodeUtf8(sheet.xml)
    })
  })

  const zipBytes = zipStore(files)
  const blob = new Blob([zipBytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const EMPTY_DATA_ROWS = 8

function blankRows(colCount, count) {
  return Array.from({ length: count }, () => Array(colCount).fill(''))
}

function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.cajas)) return data.cajas
  if (Array.isArray(data?.centros)) return data.centros
  return []
}

function normalizeCentroRef(c) {
  const id = Number(c?.id)
  return {
    id: Number.isFinite(id) && id > 0 ? id : null,
    nombre: String(c?.nombre || '').trim()
  }
}

function normalizeCajaRef(c) {
  const id = Number(c?.id)
  const ccIdRaw = c?.centro_cobro_id ?? c?.centroCobroId
  const ccId = Number(ccIdRaw)
  return {
    id: Number.isFinite(id) && id > 0 ? id : null,
    nombre: String(c?.nombre_exterior || c?.nombreExterior || c?.displayName || '').trim(),
    clave: String(c?.clave_interna || c?.claveInterna || c?.groupKey || '').trim(),
    ccId: Number.isFinite(ccId) && ccId > 0 ? ccId : '',
    ccNombre: String(c?.centro_cobro_nombre || c?.centroCobroNombre || '').trim()
  }
}

/**
 * Catálogo real para hoja CC y Cajas (listCajas + centros).
 * @returns {Promise<{ centros: { id: number, nombre: string }[], cajas: object[] }>}
 */
async function fetchCatalogoReferencia() {
  const [cajasRaw, centrosRaw] = await Promise.all([
    listCajas().catch(() => []),
    listCentrosCosto().catch(() => [])
  ])

  const cajasNorm = asList(cajasRaw).map(normalizeCajaRef).filter((c) => c.id)

  let centros = asList(centrosRaw)
    .map(normalizeCentroRef)
    .filter((c) => c.id)

  if (!centros.length) {
    const byId = new Map()
    for (const caja of cajasNorm) {
      const id = Number(caja.ccId)
      if (!Number.isFinite(id) || id <= 0 || byId.has(id)) continue
      byId.set(id, { id, nombre: caja.ccNombre })
    }
    centros = [...byId.values()]
  }

  centros.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  const cajasSorted = [...cajasNorm].sort((a, b) => {
    const cc = String(a.ccNombre || '').localeCompare(String(b.ccNombre || ''), 'es', {
      sensitivity: 'base'
    })
    if (cc !== 0) return cc
    return String(a.nombre || a.clave).localeCompare(String(b.nombre || b.clave), 'es', {
      sensitivity: 'base'
    })
  })

  return { centros, cajas: cajasSorted }
}

function catalogoResumenRows(catalogo) {
  const { centros = [], cajas = [] } = catalogo || {}
  const rows = [
    ['CC y Cajas (usa estos id)'],
    ['tipo', 'nombre', 'id', 'cc_id']
  ]
  for (const c of centros) {
    rows.push(['cc', c.nombre || '', c.id, ''])
  }
  if (!centros.length) rows.push(['cc', '(sin centros — recarga e intenta de nuevo)', '', ''])
  rows.push(['', '', '', ''])
  for (const caja of cajas) {
    rows.push(['caja', caja.nombre || caja.clave || '', caja.id, caja.ccId || ''])
  }
  if (!cajas.length) rows.push(['caja', '(sin cajas — recarga e intenta de nuevo)', '', ''])
  rows.push(['', '', '', ''])
  rows.push(['Cómo llenar cc / caja', '', '', ''])
  rows.push(['Escribe el id (recomendado), ej. cc=1 y caja=2', '', '', ''])
  return rows
}

/**
 * Hoja "CC y Cajas" con tablas de ids reales.
 * @param {{ centros: { id: number, nombre: string }[], cajas: object[] }} catalogo
 */
function buildReferenciaSheet(catalogo) {
  const { centros = [], cajas = [] } = catalogo || {}

  const ccTable = [
    ['Centros de cobro / empresa (CC)'],
    ['id', 'nombre'],
    ...centros.map((c) => [c.id, c.nombre || '']),
    ...(centros.length ? [] : [['', '(sin centros disponibles)']])
  ]

  const cajasHeaderRow = ccTable.length + 2
  const cajasTable = [
    ['Cajas'],
    ['id', 'caja (nombre)', 'clave_interna', 'cc_id', 'cc / empresa'],
    ...cajas.map((c) => [c.id, c.nombre || '', c.clave || '', c.ccId || '', c.ccNombre || '']),
    ...(cajas.length ? [] : [['', '', '', '', '(sin cajas disponibles)']])
  ]

  const compacto = [
    ['Resumen (cc - empresa = id / caja - nombre = id)'],
    ...centros.map((c) => [`cc - ${c.nombre || ''} = ${c.id}`]),
    ...cajas.map((c) => [`caja - ${c.nombre || c.clave || ''} = ${c.id}`])
  ]

  const notaRows = [
    ['Cómo usar'],
    [
      'En las columnas cc y caja de la hoja de datos pon el id (recomendado) o el nombre. El id evita ambigüedad (BASALTO vs CENTINELA).'
    ],
    ['Ejemplo: cc = 1 y caja = 2 según esta hoja.']
  ]

  const cells = [
    ...tableCells(1, 0, ccTable, { headerRows: 2 }),
    ...tableCells(cajasHeaderRow, 0, cajasTable, { headerRows: 2 }),
    ...tableCells(cajasHeaderRow + cajasTable.length + 2, 0, compacto, { headerRows: 1 }),
    ...tableCells(
      cajasHeaderRow + cajasTable.length + compacto.length + 4,
      0,
      notaRows,
      { headerRows: 1 }
    )
  ]

  return {
    name: 'CC y Cajas',
    xml: worksheetFromCells(cells, [
      { width: 14 },
      { width: 28 },
      { width: 22 },
      { width: 10 },
      { width: 28 }
    ])
  }
}

/** Plantilla de importación de gastos / rendiciones */
export async function descargarPlantillaGastos() {
  const catalogo = await fetchCatalogoReferencia()

  const headers = [
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

  const dataTable = [headers, ...blankRows(headers.length, EMPTY_DATA_ROWS)]

  const leyendaFormaPago = [
    ['forma_pago', 'Significado'],
    ['e / E', 'Efectivo (tarjeta_ultimos4 opcional / vacío)'],
    ['d / D', 'Débito (requiere tarjeta_ultimos4)'],
    ['c / C', 'Crédito (requiere tarjeta_ultimos4)']
  ]

  const leyendaTipo = [
    ['tipo_documento', 'Significado'],
    ['b / B', 'Boleta (N° docto opcional)'],
    ['f / F', 'Factura (requiere numero_documento)'],
    ['p / P', 'Peaje (sin N° docto)'],
    ['g / G', 'Guía Despacho (requiere numero_documento)'],
    ['oc / OC', 'Orden de compra (requiere numero_documento)'],
    ['v / V', 'Viático (sin N° docto ni patente; forma_pago = e; comprobante opcional)'],
    ['op / OP', 'Otro pago (sin N° docto; patente opcional; forma_pago = e; comprobante opcional)']
  ]

  const notas = [
    ['Notas'],
    ['fecha: DD/MM/AAAA'],
    ['cc y caja: usa el id de la tabla a la derecha o de la hoja CC y Cajas'],
    ['monto: solo números (ej. 15000)'],
    ['tarjeta_ultimos4: obligatorio solo si d o c; vacío/opcional si e'],
    ['patente: opcional (ABCD12 o AB-CD-12 → ABCD12); no aplica en Viático'],
    ['descripcion: obligatoria (máx. 500)'],
    ['Letras e/d/c y b/f/p/g/oc/v/op: mayúscula o minúscula'],
    ['Compat: columna origen_pago antigua también se acepta al importar'],
    ['Se crean como Legacy sin comprobante; adjuntar después en el sistema']
  ]

  const cells = [
    ...tableCells(1, 0, dataTable),
    ...tableCells(1, 13, leyendaFormaPago),
    ...tableCells(7, 13, leyendaTipo),
    ...tableCells(17, 13, notas, { headerRows: 1 }),
    ...tableCells(1, 17, catalogoResumenRows(catalogo), { headerRows: 2 })
  ]

  const cols = [
    ...Array(12)
      .fill(null)
      .map((_, i) => ({
        width: [12, 14, 18, 16, 14, 12, 14, 12, 12, 14, 12, 28][i]
      })),
    { width: 3 },
    { width: 16 },
    { width: 42 },
    { width: 3 },
    { width: 12 },
    { width: 28 },
    { width: 8 },
    { width: 8 }
  ]

  const instrHeaders = ['Campo', 'Obligatorio', 'Descripción']
  const instrRows = [
    instrHeaders,
    ['fecha', 'Sí', 'Fecha del documento. Formato DD/MM/AAAA'],
    ['trabajador_rut', 'Sí', 'RUT del trabajador (con o sin puntos)'],
    ['trabajador_nombre', 'No (opcional)', 'Solo referencia; se busca por RUT'],
    [
      'cc',
      'Sí',
      'Id del centro de cobro (recomendado) o nombre. Ver hoja CC y Cajas (y tabla a la derecha en Gastos).'
    ],
    [
      'caja',
      'Sí',
      'Id de la caja (recomendado) o clave_interna / nombre_exterior. Ver hoja CC y Cajas.'
    ],
    [
      'tipo_documento',
      'Sí',
      'b = Boleta | f = Factura | p = Peaje | g = Guía | oc = OC | v = Viático | op = Otro pago'
    ],
    [
      'numero_documento',
      'Condicional',
      'Obligatorio si f, g u oc; opcional en b; vacío en p, v y op'
    ],
    ['monto', 'Sí', 'Monto en pesos (sin $ ni puntos)'],
    ['forma_pago', 'Sí', 'e = Efectivo | d = Débito | c = Crédito (alias import: origen_pago)'],
    [
      'tarjeta_ultimos4',
      'Condicional',
      'Obligatorio solo si forma_pago = d o c; opcional/vacío si e'
    ],
    ['patente', 'No (opcional)', 'Opcional. Se normaliza a XXXXNN (ej. AB-CD-12 → ABCD12)'],
    ['descripcion', 'Sí', 'Descripción / observación (máx. 500 caracteres)'],
    [
      'NOTA',
      '',
      'Preferir ids de la hoja CC y Cajas. v/op: forma_pago=e, comprobante opcional. No borre la fila de encabezados.'
    ]
  ]

  downloadXlsx('plantilla_importacion_gastos.xlsx', [
    {
      name: 'Gastos',
      xml: worksheetFromCells(cells, cols)
    },
    {
      name: 'Instrucciones',
      xml: worksheetFromCells(tableCells(1, 0, instrRows), [
        { width: 18 },
        { width: 14 },
        { width: 70 }
      ])
    },
    buildReferenciaSheet(catalogo)
  ])
}

/** Plantilla de importación de asignaciones */
export async function descargarPlantillaAsignaciones() {
  const catalogo = await fetchCatalogoReferencia()

  const headers = [
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

  const dataTable = [headers, ...blankRows(headers.length, EMPTY_DATA_ROWS)]

  const leyendaBanco = [
    ['banco_origen', 'Ejemplos'],
    ['BANCO DE CHILE', 'Usar MAYÚSCULAS'],
    ['SANTANDER', ''],
    ['BCI', ''],
    ['SCOTIABANK', ''],
    ['ITAÚ', '']
  ]

  const notas = [
    ['Notas'],
    ['fecha: DD/MM/AAAA'],
    ['cc y caja: usa el id de la tabla a la derecha o de la hoja CC y Cajas'],
    ['monto: solo números'],
    ['numero_cuenta: obligatorio'],
    ['banco_origen: obligatorio'],
    ['observacion: máx. 500 caracteres'],
    ['Se crean como Legacy sin comprobante; adjuntar después en el sistema']
  ]

  const cells = [
    ...tableCells(1, 0, dataTable),
    ...tableCells(1, 11, leyendaBanco),
    ...tableCells(9, 11, notas, { headerRows: 1 }),
    ...tableCells(1, 15, catalogoResumenRows(catalogo), { headerRows: 2 })
  ]

  const cols = [
    ...Array(10)
      .fill(null)
      .map((_, i) => ({
        width: [12, 14, 18, 16, 14, 12, 12, 16, 18, 28][i]
      })),
    { width: 3 },
    { width: 18 },
    { width: 20 },
    { width: 3 },
    { width: 12 },
    { width: 28 },
    { width: 8 },
    { width: 8 }
  ]

  const instrHeaders = ['Campo', 'Obligatorio', 'Descripción']
  const instrRows = [
    instrHeaders,
    ['fecha', 'Sí', 'Fecha de la asignación. Formato DD/MM/AAAA'],
    ['trabajador_rut', 'Sí', 'RUT del trabajador (con o sin puntos)'],
    ['trabajador_nombre', 'No', 'Solo referencia; se busca por RUT'],
    [
      'cc',
      'Sí',
      'Id del centro de cobro (recomendado) o nombre. Ver hoja CC y Cajas.'
    ],
    [
      'caja',
      'Sí',
      'Id de la caja (recomendado) o clave_interna / nombre_exterior. Ver hoja CC y Cajas.'
    ],
    ['n_doc_vale', 'No', 'Número de documento / vale'],
    ['monto', 'Sí', 'Monto en pesos (sin $ ni puntos)'],
    ['numero_cuenta', 'Sí', 'Número de cuenta bancaria (solo dígitos)'],
    ['banco_origen', 'Sí', 'Banco en MAYÚSCULAS (ej. BANCO DE CHILE)'],
    ['observacion', 'No', 'Observaciones / motivo (máx. 500)'],
    [
      'NOTA',
      '',
      'Preferir ids de la hoja CC y Cajas en cc y caja. Se crean como Legacy sin comprobante; adjuntar después. No borre la fila de encabezados.'
    ]
  ]

  downloadXlsx('plantilla_importacion_asignaciones.xlsx', [
    {
      name: 'Asignaciones',
      xml: worksheetFromCells(cells, cols)
    },
    {
      name: 'Instrucciones',
      xml: worksheetFromCells(tableCells(1, 0, instrRows), [
        { width: 18 },
        { width: 14 },
        { width: 55 }
      ])
    },
    buildReferenciaSheet(catalogo)
  ])
}

/**
 * Exporta a Excel las filas visibles de la cartola (ya filtradas en pantalla).
 * @param {object[]} rows
 * @param {{ periodo?: string, filename?: string }} [meta]
 */
export function exportarCartolaVisible(rows, meta = {}) {
  const headers = ['fecha', 'detalle', 'responsable', 'abono', 'cargo']

  const dataRows = (rows || []).map((row) => [
    row.fecha || '',
    row.detalle || '',
    row.responsable || '',
    row.abono === '-' ? '' : row.abono || '',
    row.cargo === '-' ? '' : row.cargo || ''
  ])

  const totAbono = meta.totales?.abono || ''
  const totCargo = meta.totales?.cargo || ''
  const totSaldo = meta.totales?.saldo || ''

  const table = [
    headers,
    ...dataRows,
    [],
    ['', '', 'Totales', totAbono, totCargo],
    ['', '', 'Saldo (abono − cargo)', totSaldo, ''],
    ['', '', 'Saldo negativo = se debe al trabajador', '', '']
  ]
  const cells = tableCells(1, 0, table)

  const filtroRows = [
    ['Filtro', 'Valor'],
    ['Período / filtros', meta.periodo || ''],
    ['Registros exportados', dataRows.length],
    ['Total abono', totAbono],
    ['Total cargo', totCargo],
    ['Saldo', totSaldo],
    ['NOTA', 'Saldo = abono − cargo. Si es negativo, se debe plata al trabajador.']
  ]

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = meta.filename || `cartola_filtrada_${stamp}.xlsx`

  downloadXlsx(filename, [
    {
      name: 'Cartola',
      xml: worksheetFromCells(cells, [
        { width: 12 },
        { width: 36 },
        { width: 22 },
        { width: 14 },
        { width: 14 }
      ])
    },
    {
      name: 'Filtros',
      xml: worksheetFromCells(tableCells(1, 0, filtroRows), [
        { width: 22 },
        { width: 60 }
      ])
    }
  ])
}
