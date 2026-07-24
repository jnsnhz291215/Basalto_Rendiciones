/** Mapeo filas API → shapes que usa DashboardView.vue */

const ESTADO_CLASS = {
  'Sin Devolución': 'dash-status--warn',
  Devuelto: 'dash-status--ok',
  'Por Corregir': 'dash-status--danger',
  Aprobado: 'dash-status--ok',
  Rechazado: 'dash-status--danger'
}

const ACCION_CLASS = {
  CREAR: 'dash-badge--ok',
  MODIFICAR: 'dash-badge--warn',
  ELIMINAR: 'dash-badge--danger',
  LOGIN: 'dash-badge--info'
}

const ORIGEN_TO_METODO = {
  Efectivo: 'efectivo',
  Debito: 'debito',
  Credito: 'credito',
  efectivo: 'efectivo',
  debito: 'debito',
  credito: 'credito'
}

const METODO_TO_ORIGEN = {
  efectivo: 'Efectivo',
  debito: 'Debito',
  credito: 'Credito'
}

const ROL_UI = {
  SUPER_ADMIN_DEV: 'Super Admin - Dev',
  SUPER_ADMIN: 'Super Admin',
  ADMIN_CAJA: 'Admin Caja',
  USER_RENDIDOR: 'Usuario'
}

const ROL_API = {
  'Super Admin - Dev': 'SUPER_ADMIN_DEV',
  'Super Admin': 'SUPER_ADMIN',
  'Administrador de Caja': 'ADMIN_CAJA',
  'Admin Caja': 'ADMIN_CAJA'
}

export function formatMontoApi(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '$ 0'
  return `$ ${n.toLocaleString('es-CL')}`
}

export function parseMontoInput(value) {
  const n = Number(String(value || '').replace(/\D/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** YYYY-MM-DD or Date → DD/MM/YYYY */
export function toDDMMYYYY(value) {
  if (!value) return ''
  const s = String(value).slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export function formatSubidoElFromIso(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min} hrs`
}

/** "Arrastre (Junio)" → "Junio" */
export function parseArrastreMes(arrastre) {
  if (!arrastre) return ''
  const m = String(arrastre).match(/Arrastre\s*\(([^)]+)\)/i)
  return m ? m[1] : String(arrastre)
}

export function metodoFromOrigen(origen) {
  return ORIGEN_TO_METODO[origen] || 'efectivo'
}

export function origenFromMetodo(metodo) {
  return METODO_TO_ORIGEN[metodo] || 'Efectivo'
}

export function labelPagoFromOrigen(origen) {
  const m = metodoFromOrigen(origen)
  if (m === 'debito') return 'Débito'
  if (m === 'credito') return 'Crédito'
  return 'Efectivo'
}

export function rolUiFromApi(rol) {
  return ROL_UI[rol] || rol || ''
}

export function rolApiFromUi(label) {
  return ROL_API[label] || label
}

export function mapCaja(row) {
  return {
    id: row.id,
    groupKey: row.clave_interna,
    displayName: row.nombre_exterior,
    centroCosto: row.centro_costo || '—',
    responsable: row.responsable_nombre || '—',
    responsableId: row.responsable_id ?? null,
    fondoEstimado: formatMontoApi(row.fondo_estimado_mes),
    fondoEstimadoNum: Number(row.fondo_estimado_mes) || 0,
    mes: row.mes_asignado,
    estado: row.estado === 'inactiva' ? 'inactiva' : 'activa'
  }
}

export function mapTrabajador(row) {
  return {
    id: row.id,
    rut: row.rut,
    nombre: row.nombre_completo,
    cargo: row.cargo || '—',
    tieneUsuario: false,
    cajasAsignadas: Array.isArray(row.cajas_asignadas) ? [...row.cajas_asignadas] : []
  }
}

export function mapUsuario(row) {
  return {
    id: row.id,
    correo: row.correo,
    trabajador: row.trabajador_nombre || '—',
    cargo: row.cargo || '—',
    trabajadorId: row.trabajador_id,
    rut: row.rut,
    rol: row.rol,
    estado: row.estado
  }
}

export function mapAdminFromUsuario(row) {
  return {
    id: row.id,
    rut: row.rut,
    nombre: row.trabajador_nombre || row.correo,
    correo: row.correo,
    rol: rolUiFromApi(row.rol),
    estado: row.estado === 'activo' ? 'Activo' : 'Inactivo'
  }
}

export function mapTarjeta(row) {
  return {
    id: row.id,
    alias: row.alias,
    tipo: row.tipo === 'Debito' || row.tipo === 'Débito' ? 'Débito' : 'Crédito',
    ultimos4: row.ultimos_digitos,
    banco: row.banco || '—',
    titular: row.titular_nombre || '—',
    estado: row.estado === 'inactiva' ? 'Inactiva' : 'Activa'
  }
}

export function mapRendicion(row) {
  const tipo = row.tipo_documento || ''
  const num = row.numero_documento
  const docto =
    tipo === 'Factura' && num
      ? `Factura #${num}`
      : tipo && tipo !== 'Factura'
        ? tipo
        : ''

  return {
    id: row.id,
    fecha: toDDMMYYYY(row.fecha_documento),
    subidoEl: formatSubidoElFromIso(row.created_at),
    arrastreMes: parseArrastreMes(row.arrastre_mes),
    rinde: row.codigo_rinde,
    trabajador: row.trabajador_nombre || '',
    trabajadorId: row.trabajador_id,
    pago: labelPagoFromOrigen(row.origen_pago),
    docto,
    monto: formatMontoApi(row.monto),
    estado: row.estado || 'Sin Devolución',
    estadoClass: ESTADO_CLASS[row.estado] || 'dash-status--warn',
    metodoPago: metodoFromOrigen(row.origen_pago),
    cajaGroupKey: row.clave_interna || '',
    cajaId: row.caja_id,
    descripcion: row.descripcion || '',
    intento: 1,
    observacionAdmin: row.observacion_admin || '',
    camposCorregir: null,
    legacy: false,
    comprobanteNombre: row.comprobante_url || ''
  }
}

export function mapLegacy(row) {
  const tipo = row.tipo_documento || ''
  const num = row.numero_documento
  const docto =
    tipo === 'Factura' && num
      ? `Factura #${num}`
      : tipo || ''

  return {
    id: `legacy-${row.id}`,
    legacyId: row.id,
    fecha: toDDMMYYYY(row.fecha_documento),
    subidoEl: formatSubidoElFromIso(row.created_at),
    rinde: row.codigo_original || `LEG-${row.id}`,
    trabajador: row.trabajador_nombre_legacy || '',
    pago: labelPagoFromOrigen(row.origen_pago),
    docto,
    monto: formatMontoApi(row.monto),
    estado: row.estado || 'Devuelto',
    estadoClass: ESTADO_CLASS[row.estado] || 'dash-status--ok',
    metodoPago: metodoFromOrigen(row.origen_pago),
    cajaGroupKey: '',
    descripcion: row.descripcion || 'Registro migrado del sistema anterior.',
    intento: 1,
    observacionAdmin: '',
    legacy: true
  }
}

export function mapAnticipo(row) {
  return {
    id: row.id,
    fecha: toDDMMYYYY(row.fecha),
    conductor: row.trabajador_nombre || '',
    trabajadorId: row.trabajador_id,
    doc: row.codigo_vale,
    observaciones: row.observacion || '—',
    monto: formatMontoApi(row.monto),
    cajaGroupKey: row.clave_interna || '',
    cajaId: row.caja_id,
    comprobanteNombre: row.comprobante_url || ''
  }
}

export function mapAuditLog(row) {
  const accion = row.accion || ''
  return {
    fechaHora: formatSubidoElFromIso(row.created_at).replace(' hrs', '') || String(row.created_at || ''),
    actor: row.usuario_nombre || '—',
    rol: '',
    accion,
    accionClass: ACCION_CLASS[accion] || 'dash-badge--info',
    modulo: row.modulo || '',
    detalleHtml: escapeHtml(row.detalle || ''),
    ip: ''
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Cartola simple: aperturas (fondo caja) + rendiciones + anticipos del mes */
export function buildCartola({ cajas, movimientos, asignaciones }) {
  const rows = []

  for (const c of cajas) {
    if (c.estado !== 'activa') continue
    rows.push({
      fecha: `01/${String(c.mes).slice(5)}/${String(c.mes).slice(0, 4)}`,
      mes: c.mes,
      cajaGroupKey: c.groupKey,
      doc: `DEP-${c.id || c.groupKey}`,
      docClass: 'dash-doc-muted',
      tipoKey: 'apertura',
      tipo: 'Inyección Fondo',
      badgeClass: 'dash-badge--ok',
      detalle: `Apertura ${c.displayName}`,
      responsable: c.responsable || 'Administración',
      abono: c.fondoEstimado,
      abonoClass: 'dash-metric-value--ok dash-table-amount',
      cargo: '-',
      cargoClass: 'dash-muted'
    })
  }

  for (const m of movimientos) {
    if (m.legacy) continue
    const mes = mesFromDDMMYYYY(m.fecha)
    rows.push({
      fecha: m.fecha,
      mes,
      cajaGroupKey: m.cajaGroupKey,
      doc: m.rinde,
      docClass: 'dash-rinde',
      tipoKey: 'rendicion',
      tipo: 'Rendición Gasto',
      badgeClass: 'dash-badge--warn',
      detalle: m.descripcion || 'Gasto',
      responsable: m.trabajador,
      abono: '-',
      abonoClass: 'dash-muted',
      cargo: m.monto,
      cargoClass: 'dash-table-amount'
    })
  }

  for (const a of asignaciones) {
    const mes = mesFromDDMMYYYY(a.fecha)
    rows.push({
      fecha: a.fecha,
      mes,
      cajaGroupKey: a.cajaGroupKey,
      doc: a.doc,
      docClass: 'dash-doc-muted',
      tipoKey: 'anticipo',
      tipo: 'Anticipo',
      badgeClass: 'dash-badge--info',
      detalle: a.observaciones || 'Anticipo',
      responsable: a.conductor,
      abono: '-',
      abonoClass: 'dash-muted',
      cargo: a.monto,
      cargoClass: 'dash-rinde'
    })
  }

  return rows.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
}

function mesFromDDMMYYYY(fecha) {
  const parts = String(fecha || '').split('/')
  if (parts.length !== 3) return ''
  const [dd, mm, yyyy] = parts
  if (!mm || !yyyy) return ''
  return `${yyyy}-${String(mm).padStart(2, '0')}`
}

export { ESTADO_CLASS }
