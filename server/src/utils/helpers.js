const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

/**
 * Compara fecha_documento (Date|string YYYY-MM-DD) con mes_asignado (YYYY-MM).
 * Si el documento es de un mes anterior → "Arrastre (Mes)"; si no → null.
 */
function calcularArrastreMes(fechaDocumento, mesAsignado) {
  if (!fechaDocumento || !mesAsignado) return null

  const fecha =
    fechaDocumento instanceof Date
      ? fechaDocumento
      : new Date(`${String(fechaDocumento).slice(0, 10)}T12:00:00Z`)

  if (Number.isNaN(fecha.getTime())) return null

  const [yCaja, mCaja] = String(mesAsignado).split('-').map(Number)
  const yDoc = fecha.getUTCFullYear()
  const mDoc = fecha.getUTCMonth() + 1

  const docKey = yDoc * 12 + mDoc
  const cajaKey = yCaja * 12 + mCaja

  if (docKey < cajaKey) {
    return `Arrastre (${MESES_ES[mDoc - 1]})`
  }
  return null
}

function nextCodigo(prefix, maxNum) {
  const n = Number.isFinite(maxNum) ? maxNum + 1 : 1
  return `${prefix}-${n}`
}

module.exports = { calcularArrastreMes, nextCodigo, MESES_ES }
