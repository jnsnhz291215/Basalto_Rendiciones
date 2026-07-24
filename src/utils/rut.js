/**
 * Validador / formateo de RUT chileno (Módulo 11).
 */

export function cleanRut(rut) {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase()
}

/** Visual: 211919116 → 21.191.911-6 */
export function formatRut(rut) {
  let cleaned = cleanRut(rut)
  if (cleaned.length > 9) cleaned = cleaned.slice(0, 9)
  if (!cleaned) return ''
  if (cleaned.length === 1) return cleaned

  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots}-${dv}`
}

export function validarRutChileno(rut) {
  const cleaned = cleanRut(rut)
  if (cleaned.length < 8 || cleaned.length > 9) return false

  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1).toUpperCase()

  let suma = 0
  let multiplo = 2

  for (let i = body.length - 1; i >= 0; i -= 1) {
    suma += Number.parseInt(body.charAt(i), 10) * multiplo
    multiplo = multiplo < 7 ? multiplo + 1 : 2
  }

  const dvEsperado = 11 - (suma % 11)
  const dvCalc =
    dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado)

  return dv === dvCalc
}

/** Contraseña temporal derivada del cuerpo del RUT (sin DV). */
export function passwordFromRut(rut) {
  const cleaned = cleanRut(rut)
  if (cleaned.length < 8) return ''
  return cleaned.slice(0, -1)
}

export function rutStatusLabel(rut) {
  const value = String(rut || '').trim()
  if (!value) {
    return { text: 'Formato: 12.345.678-9', state: 'idle' }
  }
  if (validarRutChileno(value)) {
    return { text: '✓ RUT Válido', state: 'ok' }
  }
  return { text: '✕ RUT Inválido', state: 'bad' }
}
