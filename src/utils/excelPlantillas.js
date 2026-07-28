/**
 * Plantillas Excel (.xlsx) sin dependencias.
 * Genera ZIP OOXML válido para Excel / Google Sheets / LibreOffice.
 */

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

/** Plantilla de importación de gastos / rendiciones */
export function descargarPlantillaGastos() {
  const headers = [
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

  const dataTable = [headers, ...blankRows(headers.length, EMPTY_DATA_ROWS)]

  // Leyendas a la derecha (columna M = índice 12)
  const leyendaOrigen = [
    ['origen_pago', 'Significado'],
    ['e / E', 'Efectivo'],
    ['d / D', 'Débito'],
    ['c / C', 'Crédito']
  ]

  const leyendaTipo = [
    ['tipo_documento', 'Significado'],
    ['b / B', 'Boleta (sin N° docto)'],
    ['f / F', 'Factura (requiere numero_documento)'],
    ['p / P', 'Peaje (sin N° docto)'],
    ['g / G', 'Guía Despacho (sin N° docto)']
  ]

  const notas = [
    ['Notas'],
    ['fecha: DD/MM/AAAA'],
    ['cc: nombre del centro de cobro / empresa'],
    ['caja: clave interna de la caja'],
    ['monto: solo números (ej. 15000)'],
    ['tarjeta_ultimos4: obligatorio si d o c'],
    ['descripcion: obligatoria (máx. 500)'],
    ['Letras e/d/c y b/f/p/g: mayúscula o minúscula']
  ]

  const cells = [
    ...tableCells(1, 0, dataTable),
    ...tableCells(1, 12, leyendaOrigen),
    ...tableCells(7, 12, leyendaTipo),
    ...tableCells(14, 12, notas, { headerRows: 1 })
  ]

  const cols = [
    ...Array(11)
      .fill(null)
      .map((_, i) => ({
        width: [12, 14, 18, 16, 14, 12, 14, 12, 12, 14, 28][i]
      })),
    { width: 3 },
    { width: 16 },
    { width: 36 }
  ]

  const instrHeaders = ['Campo', 'Obligatorio', 'Descripción']
  const instrRows = [
    instrHeaders,
    ['fecha', 'Sí', 'Fecha del documento. Formato DD/MM/AAAA'],
    ['trabajador_rut', 'Sí', 'RUT del trabajador (con o sin puntos)'],
    ['trabajador_nombre', 'No', 'Solo referencia; se busca por RUT'],
    ['cc', 'Sí', 'Centro de cobro / empresa (nombre como en el sistema)'],
    ['caja', 'Sí', 'Clave interna / nombre de la caja en el sistema'],
    [
      'tipo_documento',
      'Sí',
      'b = Boleta | f = Factura | p = Peaje | g = Guía Despacho (mayúscula o minúscula)'
    ],
    ['numero_documento', 'Condicional', 'Obligatorio si tipo_documento = f'],
    ['monto', 'Sí', 'Monto en pesos (sin $ ni puntos)'],
    ['origen_pago', 'Sí', 'e = Efectivo | d = Débito | c = Crédito (mayúscula o minúscula)'],
    ['tarjeta_ultimos4', 'Condicional', 'Obligatorio si origen_pago = d o c'],
    ['descripcion', 'Sí', 'Descripción / observación (máx. 500 caracteres)'],
    ['NOTA', '', 'Los comprobantes se adjuntan después en el sistema. No borre la fila de encabezados.']
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
    }
  ])
}

/** Plantilla de importación de asignaciones */
export function descargarPlantillaAsignaciones() {
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
    ['cc: centro de cobro / empresa'],
    ['caja: clave interna (fondo fijo)'],
    ['monto: solo números'],
    ['numero_cuenta: obligatorio'],
    ['banco_origen: obligatorio'],
    ['observacion: máx. 500 caracteres']
  ]

  const cells = [
    ...tableCells(1, 0, dataTable),
    ...tableCells(1, 11, leyendaBanco),
    ...tableCells(9, 11, notas, { headerRows: 1 })
  ]

  const cols = [
    ...Array(10)
      .fill(null)
      .map((_, i) => ({
        width: [12, 14, 18, 16, 14, 12, 12, 16, 18, 28][i]
      })),
    { width: 3 },
    { width: 18 },
    { width: 20 }
  ]

  const instrHeaders = ['Campo', 'Obligatorio', 'Descripción']
  const instrRows = [
    instrHeaders,
    ['fecha', 'Sí', 'Fecha de la asignación. Formato DD/MM/AAAA'],
    ['trabajador_rut', 'Sí', 'RUT del trabajador (con o sin puntos)'],
    ['trabajador_nombre', 'No', 'Solo referencia; se busca por RUT'],
    ['cc', 'Sí', 'Centro de cobro / empresa (nombre como en el sistema)'],
    ['caja', 'Sí', 'Clave interna / nombre de la caja (fondo fijo)'],
    ['n_doc_vale', 'No', 'Número de documento / vale'],
    ['monto', 'Sí', 'Monto en pesos (sin $ ni puntos)'],
    ['numero_cuenta', 'Sí', 'Número de cuenta bancaria (solo dígitos)'],
    ['banco_origen', 'Sí', 'Banco en MAYÚSCULAS (ej. BANCO DE CHILE)'],
    ['observacion', 'No', 'Observaciones / motivo (máx. 500)'],
    ['NOTA', '', 'Los comprobantes se adjuntan después en el sistema. No borre la fila de encabezados.']
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
    }
  ])
}

/**
 * Exporta a Excel las filas visibles de la cartola (ya filtradas en pantalla).
 * @param {object[]} rows
 * @param {{ periodo?: string, filename?: string }} [meta]
 */
export function exportarCartolaVisible(rows, meta = {}) {
  const headers = [
    'fecha',
    'cc',
    'caja',
    'rinde_doc',
    'tipo',
    'detalle',
    'responsable',
    'abono',
    'cargo',
    'estado',
    'comprobante'
  ]

  const dataRows = (rows || []).map((row) => [
    row.fecha || '',
    row.centroCobroNombre || '',
    row.cajaGroupKey || '',
    row.doc || '',
    row.tipo || '',
    row.detalle || '',
    row.responsable || '',
    row.abono === '-' ? '' : row.abono || '',
    row.cargo === '-' ? '' : row.cargo || '',
    row.estado || '',
    row.comprobanteNombre || ''
  ])

  const table = [headers, ...dataRows]
  const cells = tableCells(1, 0, table)

  const filtroRows = [
    ['Filtro', 'Valor'],
    ['Período / filtros', meta.periodo || ''],
    ['Registros exportados', dataRows.length],
    ['NOTA', 'Solo incluye lo visible con los filtros actuales de la cartola.']
  ]

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = meta.filename || `cartola_filtrada_${stamp}.xlsx`

  downloadXlsx(filename, [
    {
      name: 'Cartola',
      xml: worksheetFromCells(cells, [
        { width: 12 },
        { width: 18 },
        { width: 14 },
        { width: 12 },
        { width: 16 },
        { width: 28 },
        { width: 18 },
        { width: 12 },
        { width: 12 },
        { width: 14 },
        { width: 28 }
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
