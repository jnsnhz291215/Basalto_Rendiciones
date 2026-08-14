/**
 * Patente / máquina: texto corto (letras, números y guión), máx. 10 caracteres.
 */

export const PATENTE_MAX_CHARS = 10

export function normalizePatente(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, PATENTE_MAX_CHARS)
}

export function formatPatenteDisplay(value) {
  return normalizePatente(value)
}

export function fromPatenteInput(value) {
  const clean = normalizePatente(value)
  return { clean, display: clean }
}
