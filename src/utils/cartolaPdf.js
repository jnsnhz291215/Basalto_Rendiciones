import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function cellMonto(value) {
  const v = String(value ?? '').trim()
  if (!v || v === '-') return ''
  return v
}

/**
 * Exporta la cartola filtrada a PDF: fecha, detalle, responsable, abono, cargo + saldo.
 * @param {object[]} rows Filas ya filtradas (mismas que en pantalla)
 * @param {{
 *   periodo?: string,
 *   totales?: { abono?: string, cargo?: string, saldo?: string, saldoNegativo?: boolean },
 *   filename?: string
 * }} [meta]
 */
export function exportarCartolaPdf(rows, meta = {}) {
  const list = Array.isArray(rows) ? rows : []
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 12

  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text('Cartola Consolidada del Mes', margin, 16)

  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  const periodo = meta.periodo || ''
  if (periodo) {
    const lines = doc.splitTextToSize(periodo, pageW - margin * 2)
    doc.text(lines, margin, 22)
  }

  const startY = periodo
    ? 22 + Math.max(1, doc.splitTextToSize(periodo, pageW - margin * 2).length) * 4 + 4
    : 26

  const body = list.map((row) => [
    row.fecha || '',
    row.detalle || '',
    row.responsable || '',
    cellMonto(row.abono),
    cellMonto(row.cargo)
  ])

  const totAbono = meta.totales?.abono || ''
  const totCargo = meta.totales?.cargo || ''
  const totSaldo = meta.totales?.saldo || ''

  autoTable(doc, {
    startY,
    head: [['Fecha', 'Detalle', 'Responsable', 'Abono', 'Cargo']],
    body,
    foot: [
      ['', '', 'Totales', totAbono, totCargo],
      ['', '', 'Saldo (abono − cargo)', totSaldo, '']
    ],
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 2,
      overflow: 'linebreak',
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [226, 232, 240],
      fontStyle: 'bold',
      fontSize: 9
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 42 },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' }
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3 && data.cell.raw) {
        data.cell.styles.textColor = [22, 163, 74]
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.section === 'body' && data.column.index === 4 && data.cell.raw) {
        data.cell.styles.textColor = [220, 38, 38]
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.section === 'foot' && data.column.index === 3) {
        data.cell.styles.halign = 'right'
        data.cell.styles.textColor =
          data.row.index === 1 && meta.totales?.saldoNegativo ? [220, 38, 38] : [22, 163, 74]
      }
      if (data.section === 'foot' && data.column.index === 4) {
        data.cell.styles.halign = 'right'
        data.cell.styles.textColor = [220, 38, 38]
      }
    },
    margin: { left: margin, right: margin }
  })

  const afterTable = doc.lastAutoTable?.finalY || startY + 20
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(
    'Saldo = abono − cargo. Si el saldo es negativo, se debe plata al trabajador.',
    margin,
    afterTable + 8
  )

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = meta.filename || `cartola_filtrada_${stamp}.pdf`
  doc.save(filename)
}
