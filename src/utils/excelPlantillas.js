/**
 * Genera y descarga plantillas Excel (SpreadsheetML .xls) sin dependencias.
 * Compatible con Excel, Google Sheets y LibreOffice.
 */

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cellXml(value, type = 'String') {
  const text = escapeXml(value)
  if (type === 'Number' && text !== '' && Number.isFinite(Number(value))) {
    return `<Cell><Data ss:Type="Number">${Number(value)}</Data></Cell>`
  }
  return `<Cell><Data ss:Type="String">${text}</Data></Cell>`
}

function rowXml(cells) {
  return `<Row>${cells.join('')}</Row>`
}

function sheetXml(name, headers, rows, colWidths = []) {
  const cols = headers
    .map((_, i) => `<Column ss:Width="${colWidths[i] || 120}"/>`)
    .join('')

  const headerRow = rowXml(headers.map((h) => cellXml(h)))
  const dataRows = rows.map((r) =>
    rowXml(
      headers.map((h, i) => {
        const cell = Array.isArray(r) ? r[i] : r[h]
        const isNum = typeof cell === 'number'
        return cellXml(cell ?? '', isNum ? 'Number' : 'String')
      })
    )
  )

  return `
  <Worksheet ss:Name="${escapeXml(name)}">
    <Table>
      ${cols}
      ${headerRow}
      ${dataRows.join('\n      ')}
    </Table>
  </Worksheet>`
}

function buildWorkbookXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
  </Styles>
  ${sheets.join('\n')}
</Workbook>`
}

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function downloadWorkbook(filename, sheets) {
  const xml = buildWorkbookXml(sheets)
  downloadBlob(
    filename,
    xml,
    'application/vnd.ms-excel;charset=utf-8'
  )
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

  const instrucciones = [
    ['Campo', 'Obligatorio', 'Descripción'],
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

  downloadWorkbook('plantilla_importacion_gastos.xls', [
    sheetXml('Gastos', headers, [ejemplo], [90, 110, 140, 100, 110, 110, 80, 90, 100, 220]),
    sheetXml(
      'Instrucciones',
      instrucciones[0],
      instrucciones.slice(1),
      [140, 90, 420]
    )
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

  const instrucciones = [
    ['Campo', 'Obligatorio', 'Descripción'],
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

  downloadWorkbook('plantilla_importacion_asignaciones.xls', [
    sheetXml(
      'Asignaciones',
      headers,
      [ejemplo],
      [90, 110, 140, 100, 90, 80, 120, 140, 220]
    ),
    sheetXml(
      'Instrucciones',
      instrucciones[0],
      instrucciones.slice(1),
      [140, 90, 420]
    )
  ])
}
