const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { calcularArrastreMes, nextCodigo, mesActualYYYYMM } = require('../utils/helpers')
const { ROLES } = require('../middlewares/role.middleware')
const { assertTarjetaPermitePago } = require('../utils/tarjetaPago')

async function listRendiciones(req, res) {
  try {
    const { caja_id, trabajador_id, mes, q } = req.query
    const params = []
    let sql = `
      SELECT r.*,
             c.clave_interna, c.nombre_exterior,
             t.nombre_completo AS trabajador_nombre
      FROM rendiciones_gastos r
      INNER JOIN cajas_chicas c ON c.id = r.caja_id AND c.is_deleted = FALSE
      INNER JOIN trabajadores t ON t.id = r.trabajador_id AND t.is_deleted = FALSE
      WHERE r.is_deleted = FALSE`

    if (caja_id) {
      sql += ' AND r.caja_id = ?'
      params.push(Number(caja_id))
    }
    if (trabajador_id) {
      sql += ' AND r.trabajador_id = ?'
      params.push(Number(trabajador_id))
    }
    if (mes) {
      sql += ` AND DATE_FORMAT(r.fecha_documento, '%Y-%m') = ?`
      params.push(mes)
    }
    if (q?.trim()) {
      sql += ' AND t.nombre_completo LIKE ?'
      params.push(`%${q.trim()}%`)
    }

    // Usuario rendidor solo ve las suyas
    if (req.user.rol === ROLES.USER_RENDIDOR) {
      if (!req.user.trabajador_id) {
        return res.json([])
      }
      sql += ' AND r.trabajador_id = ?'
      params.push(req.user.trabajador_id)
    }

    sql += ' ORDER BY r.created_at DESC, r.id DESC'

    const rows = await query(sql, params)
    return res.json(rows)
  } catch (err) {
    console.error('[listRendiciones]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createRendicion(req, res) {
  try {
    const {
      caja_id,
      trabajador_id,
      fecha_documento,
      tipo_documento,
      numero_documento,
      monto,
      origen_pago,
      tarjeta_id,
      comprobante_url,
      descripcion
    } = req.body || {}

    if (!caja_id || !fecha_documento || !tipo_documento || monto === undefined || !origen_pago) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }

    if (tipo_documento === 'Factura' && !String(numero_documento || '').trim()) {
      return res.status(400).json({ error: 'numero_documento es obligatorio para Factura' })
    }

    let trabajadorId = trabajador_id
    if (req.user.rol === ROLES.USER_RENDIDOR) {
      trabajadorId = req.user.trabajador_id
    }
    if (!trabajadorId) {
      return res.status(400).json({ error: 'trabajador_id requerido' })
    }

    const cajas = await query(
      `SELECT id FROM cajas_chicas WHERE id = ? AND is_deleted = FALSE`,
      [caja_id]
    )
    if (!cajas[0]) return res.status(404).json({ error: 'Caja no encontrada' })

    const tarjetaCheck = await assertTarjetaPermitePago({
      tarjetaId: tarjeta_id,
      origenPago: origen_pago,
      fechaDocumento: fecha_documento
    })
    if (tarjetaCheck) {
      return res.status(tarjetaCheck.status).json({ error: tarjetaCheck.error })
    }

    const arrastre = calcularArrastreMes(fecha_documento, mesActualYYYYMM())

    const maxRows = await query(
      `SELECT MAX(CAST(SUBSTRING_INDEX(codigo_rinde, '-', -1) AS UNSIGNED)) AS max_num
       FROM rendiciones_gastos`
    )
    const codigo = nextCodigo('R', Number(maxRows[0]?.max_num) || 100)

    const result = await query(
      `INSERT INTO rendiciones_gastos
        (codigo_rinde, caja_id, trabajador_id, fecha_documento, tipo_documento, numero_documento,
         monto, origen_pago, tarjeta_id, comprobante_url, descripcion, estado, arrastre_mes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Sin Devolución', ?)`,
      [
        codigo,
        caja_id,
        trabajadorId,
        fecha_documento,
        tipo_documento,
        tipo_documento === 'Factura' ? String(numero_documento).trim() : numero_documento || null,
        Number(monto),
        origen_pago,
        tarjeta_id || null,
        comprobante_url || null,
        descripcion || null,
        arrastre
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Gastos',
      `Rendición ${codigo} creada (monto ${monto})`
    )

    const created = await query(
      `SELECT * FROM rendiciones_gastos WHERE id = ? AND is_deleted = FALSE`,
      [result.insertId]
    )
    return res.status(201).json(created[0])
  } catch (err) {
    console.error('[createRendicion]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function updateRendicion(req, res) {
  try {
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM rendiciones_gastos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Rendición no encontrada' })

    if (
      req.user.rol === ROLES.USER_RENDIDOR &&
      existing[0].trabajador_id !== req.user.trabajador_id
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const {
      fecha_documento,
      tipo_documento,
      numero_documento,
      monto,
      origen_pago,
      tarjeta_id,
      comprobante_url,
      descripcion,
      estado
    } = req.body || {}

    let arrastre = existing[0].arrastre_mes
    const fecha = fecha_documento || existing[0].fecha_documento
    if (fecha_documento) {
      arrastre = calcularArrastreMes(fecha, mesActualYYYYMM())
    }

    const tipo = tipo_documento || existing[0].tipo_documento
    const num =
      tipo === 'Factura'
        ? String(numero_documento ?? existing[0].numero_documento ?? '').trim()
        : numero_documento !== undefined
          ? numero_documento
          : existing[0].numero_documento

    if (tipo === 'Factura' && !num) {
      return res.status(400).json({ error: 'numero_documento es obligatorio para Factura' })
    }

    const nextTarjetaId =
      tarjeta_id !== undefined ? tarjeta_id : existing[0].tarjeta_id
    const nextOrigen = origen_pago || existing[0].origen_pago
    const tarjetaCheck = await assertTarjetaPermitePago({
      tarjetaId: nextTarjetaId,
      origenPago: nextOrigen,
      fechaDocumento: fecha
    })
    if (tarjetaCheck) {
      return res.status(tarjetaCheck.status).json({ error: tarjetaCheck.error })
    }

    await query(
      `UPDATE rendiciones_gastos
       SET fecha_documento = ?,
           tipo_documento = ?,
           numero_documento = ?,
           monto = ?,
           origen_pago = ?,
           tarjeta_id = ?,
           comprobante_url = ?,
           descripcion = ?,
           estado = ?,
           arrastre_mes = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        fecha,
        tipo,
        num,
        monto !== undefined ? Number(monto) : existing[0].monto,
        nextOrigen,
        nextTarjetaId,
        comprobante_url !== undefined ? comprobante_url : existing[0].comprobante_url,
        descripcion !== undefined ? descripcion : existing[0].descripcion,
        estado || existing[0].estado,
        arrastre,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Gastos',
      `Rendición ${existing[0].codigo_rinde} modificada`
    )

    const updated = await query(
      `SELECT * FROM rendiciones_gastos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    return res.json(updated[0])
  } catch (err) {
    console.error('[updateRendicion]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteRendicion(req, res) {
  try {
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM rendiciones_gastos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Rendición no encontrada' })

    if (
      req.user.rol === ROLES.USER_RENDIDOR &&
      existing[0].trabajador_id !== req.user.trabajador_id
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await query(
      `UPDATE rendiciones_gastos
       SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Gastos',
      `Soft delete rendición ${existing[0].codigo_rinde}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteRendicion]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = {
  listRendiciones,
  createRendicion,
  updateRendicion,
  softDeleteRendicion
}
