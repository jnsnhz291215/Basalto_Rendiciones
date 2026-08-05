import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function cellMonto(value) {
  const v = String(value ?? '').trim()
  if (!v || v === '-') return ''
  return v
}

/**
 * Exporta la cartola filtrada (vista actual) a PDF con columnas Abono/Cargo y totales.
 * @param {object[]} rows Filas ya filtradas (mismas que en pantalla)
 * @param {{
 *   periodo?: string,
 *   totales?: { abono?: string, cargo?: string },
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

  const startY = periodo ? 22 + Math.max(1, doc.splitTextToSize(periodo, pageW - margin * 2).length) * 4 + 4 : 26

  const body = list.map((row) => [
    row.fecha || '',
    row.centroCobroNombre || '',
    row.cajaLabel || row.cajaGroupKey || '',
    row.doc || '',
    row.tipo || '',
    row.detalle || '',
    row.responsable || '',
    cellMonto(row.abono),
    cellMonto(row.cargo)
  ])

  const totAbono = meta.totales?.abono || ''
  const totCargo = meta.totales?.cargo || ''

  autoTable(doc, {
    startY,
    head: [['Fecha', 'CC', 'Caja', 'Doc', 'Tipo', 'Detalle', 'Responsable', 'Abono', 'Cargo']],
    body,
    foot: [['', '', '', '', '', '', 'Totales', totAbono, totCargo]],
    theme: 'striped',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.6,
      overflow: 'linebreak',
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [226, 232, 240],
      fontStyle: 'bold',
      fontSize: 7.5
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 32 },
      2: { cellWidth: 28 },
      3: { cellWidth: 22 },
      4: { cellWidth: 28 },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 32 },
      7: { cellWidth: 26, halign: 'right' },
      8: { cellWidth: 26, halign: 'right' }
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const tipo = String(data.cell.raw || '')
        if (tipo.toLowerCase().includes('asign')) {
          data.cell.styles.textColor = [22, 163, 74]
        } else if (tipo.toLowerCase().includes('rend') || tipo.toLowerCase().includes('gasto')) {
          data.cell.styles.textColor = [220, 38, 38]
        }
      }
      if (data.section === 'body' && data.column.index === 7 && data.cell.raw) {
        data.cell.styles.textColor = [22, 163, 74]
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.section === 'body' && data.column.index === 8 && data.cell.raw) {
        data.cell.styles.textColor = [220, 38, 38]
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.section === 'foot' && (data.column.index === 7 || data.column.index === 8)) {
        data.cell.styles.halign = 'right'
        data.cell.styles.textColor =
          data.column.index === 7 ? [22, 163, 74] : [220, 38, 38]
      }
    },
    margin: { left: margin, right: margin }
  })

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = meta.filename || `cartola_filtrada_${stamp}.pdf`
  doc.save(filename)
}
