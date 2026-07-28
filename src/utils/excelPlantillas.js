/**
 * Plantillas Excel reales (.xlsx) sin dependencias.
 * Genera un ZIP OOXML válido para que Excel no muestre aviso de extensión.
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

function sheetRowsXml(headers, rows) {
  const all = [
    headers,
    ...rows.map((r) =>
      headers.map((h, i) => {
        const val = Array.isArray(r) ? r[i] : r[h]
        return val ?? ''
      })
    )
  ]
  return all
    .map((row, rIdx) => {
      const cells = row
        .map((val, cIdx) => {
          const ref = `${colLetter(cIdx)}${rIdx + 1}`
          if (typeof val === 'number' && Number.isFinite(val)) {
            return `<c r="${ref}"><v>${val}</v></c>`
          }
          const text = escapeXml(val)
          return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`
        })
        .join('')
      return `<row r="${rIdx + 1}">${cells}</row>`
    })
    .join('')
}

function worksheetXml(headers, rows) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRowsXml(headers, rows)}</sheetData>
</worksheet>`
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
  const rels = Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`
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
  ${overrides}
</Types>`
}

/** CRC32 para ZIP store */
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

/**
 * ZIP con método Store (sin compresión) — suficiente para xlsx válido.
 * @param {{ name: string, data: Uint8Array }[]} files
 */
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

function downloadXlsx(filename, sheets) {
  const names = sheets.map((s) => s.name)
  const files = [
    { name: '[Content_Types].xml', data: encodeUtf8(contentTypesXml(sheets.length)) },
    { name: '_rels/.rels', data: encodeUtf8(rootRelsXml()) },
    { name: 'xl/workbook.xml', data: encodeUtf8(workbookXml(names)) },
    { name: 'xl/_rels/workbook.xml.rels', data: encodeUtf8(workbookRelsXml(sheets.length)) }
  ]

  sheets.forEach((sheet, i) => {
    files.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: encodeUtf8(worksheetXml(sheet.headers, sheet.rows))
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

/** Plantilla de importación de gastos / rendiciones */
export function descargarPlantillaGastos() {
  const headers = [
    'fecha',
    'trabajador_rut',
    'trabajador_nombre',
    'caja',
    'tipo_documento',
    'numero_documento',
    'monto',
    'origen_pago',
    'tarjeta_ultimos4',
    'descripcion'
  ]

  const ejemplo = [
    '28/07/2026',
    '21.191.911-6',
    'Juan Sanhueza',
    'TestCAJA',
    'Boleta',
    '',
    20000,
    'efectivo',
    '',
    'Detalle del gasto (obligatorio)'
  ]

  const instrHeaders = ['Campo', 'Obligatorio', 'Descripción']
  const instrRows = [
    ['fecha', 'Sí', 'Fecha del documento. Formato DD/MM/YYYY'],
    ['trabajador_rut', 'Sí', 'RUT del trabajador (con o sin puntos)'],
    ['trabajador_nombre', 'No', 'Nombre referencial (se busca por RUT)'],
    ['caja', 'Sí', 'Clave interna / nombre de la caja (como en el sistema)'],
    ['tipo_documento', 'Sí', 'Boleta | Factura | Ticket Peaje'],
    ['numero_documento', 'Condicional', 'Obligatorio si tipo_documento = Factura'],
    ['monto', 'Sí', 'Monto total en pesos chilenos (sin $ ni puntos)'],
    ['origen_pago', 'Sí', 'efectivo | tarjeta'],
    ['tarjeta_ultimos4', 'Condicional', 'Obligatorio si origen_pago = tarjeta'],
    ['descripcion', 'Sí', 'Descripción / observación (máx. 500 caracteres)'],
    [
      'NOTA',
      '',
      'Los comprobantes (PDF/PNG/JPG) se adjuntan después en el sistema. No elimine la fila de encabezados.'
    ]
  ]

  downloadXlsx('plantilla_importacion_gastos.xlsx', [
    { name: 'Gastos', headers, rows: [ejemplo] },
    { name: 'Instrucciones', headers: instrHeaders, rows: instrRows }
  ])
}

/** Plantilla de importación de asignaciones */
export function descargarPlantillaAsignaciones() {
  const headers = [
    'fecha',
    'trabajador_rut',
    'trabajador_nombre',
    'caja',
    'n_doc_vale',
    'monto',
    'numero_cuenta',
    'banco_origen',
    'observacion'
  ]

  const ejemplo = [
    '28/07/2026',
    '21.191.911-6',
    'Juan Sanhueza',
    'TestCAJA',
    '01',
    30000,
    '00123456789',
    'BANCO DE CHILE',
    'Motivo de la asignación (máx. 500)'
  ]

  const instrHeaders = ['Campo', 'Obligatorio', 'Descripción']
  const instrRows = [
    ['fecha', 'Sí', 'Fecha de la asignación. Formato DD/MM/YYYY'],
    ['trabajador_rut', 'Sí', 'RUT del trabajador (con o sin puntos)'],
    ['trabajador_nombre', 'No', 'Nombre referencial (se busca por RUT)'],
    ['caja', 'Sí', 'Clave interna / nombre de la caja (fondo fijo)'],
    ['n_doc_vale', 'No', 'Número de documento / vale'],
    ['monto', 'Sí', 'Monto en pesos chilenos (sin $ ni puntos)'],
    ['numero_cuenta', 'Sí', 'Número de cuenta bancaria (solo dígitos)'],
    ['banco_origen', 'Sí', 'Banco en MAYÚSCULAS (ej: BANCO DE CHILE, SANTANDER)'],
    ['observacion', 'No', 'Observaciones / motivo (máx. 500 caracteres)'],
    [
      'NOTA',
      '',
      'Los comprobantes (PDF/PNG/JPG) se adjuntan después en el sistema. No elimine la fila de encabezados.'
    ]
  ]

  downloadXlsx('plantilla_importacion_asignaciones.xlsx', [
    { name: 'Asignaciones', headers, rows: [ejemplo] },
    { name: 'Instrucciones', headers: instrHeaders, rows: instrRows }
  ])
}
