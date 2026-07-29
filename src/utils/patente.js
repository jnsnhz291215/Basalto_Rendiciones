/**
 * Patente chilena corta: display XX-XX-NN, guardado XXXXNN.
 */

export function normalizePatente(value) {
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

export function formatPatenteDisplay(value) {
  const clean = normalizePatente(value)
  if (!clean) return ''
  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)}-${clean.slice(2)}`
  return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4)}`
}

export function fromPatenteInput(value) {
  const clean = normalizePatente(value)
  return { clean, display: formatPatenteDisplay(clean) }
}
