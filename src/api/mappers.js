/** Mapeo filas API → shapes que usa DashboardView.vue */

const ESTADO_CLASS = {
  'Sin Devolución': 'dash-status--warn',
  Parcial: 'dash-status--info',
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

/** Solo dígitos → entero (ignora puntos/separadores de miles). */
export function parseMontoInput(value) {
  const n = Number(String(value || '').replace(/\D/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Formato de entrada moneda CL: 20000 → 20.000 */
export function formatMontoInputCl(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
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
  const interior = row.nombre_interior || row.clave_interna || ''
  return {
    id: row.id,
    groupKey: interior,
    displayName: row.nombre_exterior,
    nombreInterior: interior,
    centroCobroId: row.centro_cobro_id ?? null,
    centroCobroNombre: row.centro_cobro_nombre || null,
    tieneDatos: Boolean(row.tiene_datos),
    totalMes: Number(row.total_mes) || 0,
    totalAnio: Number(row.total_anio) || 0,
    personalAsignado: Number(row.personal_asignado) || 0
  }
}

export function mapCentroCobro(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    tieneDatos: Boolean(row.tiene_datos)
  }
}

export function mapTrabajador(row) {
  return {
    id: row.id,
    rut: row.rut,
    nombre: row.nombre_completo,
    cargo: row.cargo || '-',
    tieneUsuario: false,
    cajasAsignadas: Array.isArray(row.cajas_asignadas) ? [...row.cajas_asignadas] : []
  }
}

/** Ficha trabajador + acceso USER_RENDIDOR opcional (módulo Personal). */
export function mapPersonal(row) {
  const esAdmin = Boolean(row.es_admin)
  const acceso = row.acceso_sistema
  let accesoLabel = 'Solo Ficha'
  let accesoKind = 'none'
  if (acceso === 'activo') {
    accesoLabel = 'Activo'
    accesoKind = 'activo'
  } else if (acceso === 'inactivo') {
    accesoLabel = 'Inactivo'
    accesoKind = 'inactivo'
  } else if (esAdmin) {
    accesoLabel = 'Admin'
    accesoKind = 'admin'
  }
  return {
    id: row.id,
    rut: row.rut,
    nombre: row.nombre_completo || '',
    cargo: row.cargo || '-',
    correo: row.correo || '',
    cajasAsignadas: Array.isArray(row.cajas_asignadas) ? [...row.cajas_asignadas] : [],
    usuarioId: row.usuario_id ?? null,
    usuarioRol: row.usuario_rol || null,
    usuarioEstado: row.usuario_estado || null,
    accesoSistema: acceso,
    accesoLabel,
    accesoKind,
    esAdmin,
    adminRol: row.admin_rol || null,
    tieneUsuario: Boolean(row.usuario_id),
    /** Puede crear USER_RENDIDOR solo si no es admin del sistema */
    puedeCrearUsuarioNormal: !esAdmin && !row.usuario_id
  }
}

export function mapUsuario(row) {
  const nombreTrab = normalizeTrabajadorNombre(row.trabajador_nombre)
  return {
    id: row.id,
    correo: row.correo,
    nombre: nombreTrab,
    trabajador: nombreTrab || '-',
    cargo: row.cargo || '-',
    trabajadorId: row.trabajador_id,
    rut: row.rut,
    rol: row.rol,
    rolLabel: rolUiFromApi(row.rol),
    estado: row.estado === 'inactivo' ? 'Inactivo' : 'Activo',
    estadoApi: row.estado === 'inactivo' ? 'inactivo' : 'activo'
  }
}

/** Nombre de ficha trabajador; nunca usar correo como fallback de nombre. */
function normalizeTrabajadorNombre(value) {
  const raw = value == null ? '' : String(value).trim()
  if (!raw || raw === '-') return ''
  return raw
}

export function mapAdminFromUsuario(row) {
  const nombreTrab = normalizeTrabajadorNombre(row.trabajador_nombre)
  return {
    id: row.id,
    rut: row.rut,
    nombre: nombreTrab,
    correo: row.correo,
    rol: rolUiFromApi(row.rol),
    rolApi: row.rol,
    estado: row.estado === 'activo' ? 'Activo' : 'Inactivo',
    estadoApi: row.estado === 'inactivo' ? 'inactivo' : 'activo',
    trabajadorId: row.trabajador_id ?? null
  }
}

export function mapTarjeta(row) {
  const fechaOff = row.fecha_desactivacion
    ? String(row.fecha_desactivacion).slice(0, 10)
    : null
  return {
    id: row.id,
    alias: row.alias,
    tipo: row.tipo === 'Debito' || row.tipo === 'Débito' ? 'Débito' : 'Crédito',
    ultimos4: row.ultimos_digitos,
    banco: row.banco || '-',
    titular: row.titular_nombre || '-',
    estado: row.estado === 'inactiva' ? 'Inactiva' : 'Activa',
    estadoApi: row.estado === 'inactiva' ? 'inactiva' : 'activa',
    fechaDesactivacion: fechaOff
  }
}

export function mapRendicion(row) {
  let tipo = row.tipo_documento || ''
  if (tipo === 'Ticket Peaje') tipo = 'Peaje'
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
    fechaSort: String(row.fecha_documento || '').slice(0, 10),
    subidoEl: formatSubidoElFromIso(row.created_at),
    createdAtMs: row.created_at ? new Date(row.created_at).getTime() : 0,
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
    tarjetaId: row.tarjeta_id ?? null,
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
    fechaSort: String(row.fecha || '').slice(0, 10),
    subidoEl: formatSubidoElFromIso(row.created_at),
    createdAtMs: row.created_at ? new Date(row.created_at).getTime() : 0,
    conductor: row.trabajador_nombre || '',
    trabajadorId: row.trabajador_id,
    doc: row.codigo_vale,
    observaciones: row.observacion || '-',
    monto: formatMontoApi(row.monto),
    numeroCuenta: row.numero_cuenta || '',
    bancoOrigen: row.banco_origen || '',
    cajaGroupKey: row.clave_interna || '',
    cajaId: row.caja_id,
    comprobanteNombre: row.comprobante_url || ''
  }
}

export function mapAuditLog(row) {
  const accion = row.accion || ''
  return {
    fechaHora: formatSubidoElFromIso(row.created_at).replace(' hrs', '') || String(row.created_at || ''),
    actor: row.usuario_nombre || '-',
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

/** Cartola simple: rendiciones + anticipos (ya no hay inyección de fondo en caja) */
export function buildCartola({ cajas, movimientos, asignaciones }) {
  const rows = []
  const cajaByKey = new Map()
  for (const c of cajas || []) {
    if (!c?.groupKey) continue
    if (!cajaByKey.has(c.groupKey)) cajaByKey.set(c.groupKey, c)
  }

  function metaCaja(groupKey) {
    const caja = cajaByKey.get(groupKey) || null
    return {
      cajaGroupKey: groupKey || '',
      centroCobroId: caja?.centroCobroId ?? null,
      centroCobroNombre: caja?.centroCobroNombre || null
    }
  }

  for (const m of movimientos) {
    if (m.legacy) continue
    const mes = mesFromDDMMYYYY(m.fecha)
    const meta = metaCaja(m.cajaGroupKey)
    rows.push({
      id: m.id,
      fecha: m.fecha,
      mes,
      ...meta,
      doc: m.rinde,
      docClass: 'dash-rinde',
      tipoKey: 'rendicion',
      tipo: 'Rendición Gasto',
      badgeClass: 'dash-badge--warn',
      detalle: m.descripcion || 'Gasto',
      responsable: m.trabajador,
      trabajadorId: m.trabajadorId ?? null,
      abono: '-',
      abonoClass: 'dash-muted',
      cargo: m.monto,
      cargoClass: 'dash-table-amount',
      comprobanteNombre: m.comprobanteNombre || '',
      estado: m.estado || '',
      estadoClass: m.estadoClass || '',
      intento: m.intento || 1,
      observacionAdmin: m.observacionAdmin || '',
      pago: m.pago || '',
      docto: m.docto || '',
      subidoEl: m.subidoEl || ''
    })
  }

  for (const a of asignaciones) {
    const mes = mesFromDDMMYYYY(a.fecha)
    const meta = metaCaja(a.cajaGroupKey)
    rows.push({
      id: a.id,
      fecha: a.fecha,
      mes,
      ...meta,
      doc: a.doc,
      docClass: 'dash-doc-muted',
      tipoKey: 'anticipo',
      tipo: 'Asignación',
      badgeClass: 'dash-badge--info',
      detalle: a.observaciones || 'Asignación',
      responsable: a.conductor,
      trabajadorId: a.trabajadorId ?? null,
      abono: '-',
      abonoClass: 'dash-muted',
      cargo: a.monto,
      cargoClass: 'dash-rinde',
      comprobanteNombre: a.comprobanteNombre || '',
      estado: '',
      estadoClass: '',
      intento: 1,
      observacionAdmin: '',
      pago: '',
      docto: '',
      subidoEl: ''
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
