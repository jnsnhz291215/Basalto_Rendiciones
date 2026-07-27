const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { ensureCajasSchema } = require('../utils/ensureCajasSchema')

function normalizeNombreInterior(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
}

function mapCajaRow(row) {
  if (!row) return null
  return {
    id: row.id,
    nombre_exterior: row.nombre_exterior,
    nombre_interior: row.clave_interna,
    clave_interna: row.clave_interna,
    is_deleted: row.is_deleted,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

async function listCajas(req, res) {
  try {
    await ensureCajasSchema()
    const rows = await query(
      `SELECT id, clave_interna, nombre_exterior, is_deleted, created_at, updated_at
       FROM cajas_chicas
       WHERE is_deleted = FALSE
       ORDER BY clave_interna ASC`
    )
    return res.json(rows.map(mapCajaRow))
  } catch (err) {
    console.error('[listCajas]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/**
 * Resumen por caja (nombre interior) + mes de filtro (sobre fechas de gastos/anticipos).
 * Query: ?clave_interna=FAENA_NORTE&mes=2026-07
 */
async function resumenCaja(req, res) {
  try {
    await ensureCajasSchema()
    const clave = normalizeNombreInterior(req.query.clave_interna || req.query.caja || '')
    const mes = String(req.query.mes || '').trim()

    if (!clave) {
      return res.status(400).json({ error: 'clave_interna / nombre_interior es requerido' })
    }

    const cajas = await query(
      `SELECT id, clave_interna, nombre_exterior
       FROM cajas_chicas
       WHERE is_deleted = FALSE AND clave_interna = ?
       LIMIT 1`,
      [clave]
    )

    if (!cajas[0]) {
      return res.json({
        caja_id: null,
        clave_interna: clave,
        nombre_interior: clave,
        mes: mes || null,
        fondo_estimado: 0,
        saldo_caja: 0,
        gastos_rendidos: { total: 0, cantidad: 0 },
        anticipos_pendientes: { total: 0, cantidad: 0 }
      })
    }

    const caja = cajas[0]
    const mesFilter = /^\d{4}-\d{2}$/.test(mes)

    let gastosSql = `
      SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad
      FROM rendiciones_gastos
      WHERE is_deleted = FALSE
        AND caja_id = ?
        AND estado <> 'Rechazado'`
    const gastosParams = [caja.id]
    if (mesFilter) {
      gastosSql += ` AND DATE_FORMAT(fecha_documento, '%Y-%m') = ?`
      gastosParams.push(mes)
    }

    let aprobadosSql = `
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM rendiciones_gastos
      WHERE is_deleted = FALSE
        AND caja_id = ?
        AND estado IN ('Aprobado', 'Devuelto')`
    const aprobadosParams = [caja.id]
    if (mesFilter) {
      aprobadosSql += ` AND DATE_FORMAT(fecha_documento, '%Y-%m') = ?`
      aprobadosParams.push(mes)
    }

    let anticiposSql = `
      SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad
      FROM anticipos
      WHERE is_deleted = FALSE AND caja_id = ?`
    const anticiposParams = [caja.id]
    if (mesFilter) {
      anticiposSql += ` AND DATE_FORMAT(fecha, '%Y-%m') = ?`
      anticiposParams.push(mes)
    }

    const [gastosMes, gastosAprobados, anticiposMes] = await Promise.all([
      query(gastosSql, gastosParams),
      query(aprobadosSql, aprobadosParams),
      query(anticiposSql, anticiposParams)
    ])

    const totalAprobados = Number(gastosAprobados[0]?.total) || 0
    const gastosTotal = Number(gastosMes[0]?.total) || 0
    const gastosCantidad = Number(gastosMes[0]?.cantidad) || 0
    const anticiposTotal = Number(anticiposMes[0]?.total) || 0
    const anticiposCantidad = Number(anticiposMes[0]?.cantidad) || 0

    return res.json({
      caja_id: caja.id,
      clave_interna: caja.clave_interna,
      nombre_interior: caja.clave_interna,
      nombre_exterior: caja.nombre_exterior,
      mes: mes || null,
      fondo_estimado: 0,
      saldo_caja: 0 - totalAprobados - anticiposTotal,
      gastos_rendidos: { total: gastosTotal, cantidad: gastosCantidad },
      anticipos_pendientes: { total: anticiposTotal, cantidad: anticiposCantidad }
    })
  } catch (err) {
    console.error('[resumenCaja]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createCaja(req, res) {
  try {
    await ensureCajasSchema()
    const body = req.body || {}
    const nombreExterior = String(body.nombre_exterior || '').trim()
    const clave = normalizeNombreInterior(
      body.nombre_interior || body.clave_interna || body.nombreInterior
    )

    if (!nombreExterior || !clave) {
      return res.status(400).json({
        error: 'nombre_exterior y nombre_interior son requeridos'
      })
    }

    try {
      const result = await query(
        `INSERT INTO cajas_chicas (clave_interna, nombre_exterior)
         VALUES (?, ?)`,
        [clave, nombreExterior]
      )

      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'CREAR',
        'Cajas',
        `Caja ${clave} creada (${nombreExterior})`
      )

      const created = await query(
        `SELECT id, clave_interna, nombre_exterior, is_deleted, created_at, updated_at
         FROM cajas_chicas WHERE id = ? AND is_deleted = FALSE`,
        [result.insertId]
      )
      return res.status(201).json(mapCajaRow(created[0]))
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe una caja con ese nombre interior' })
      }
      throw e
    }
  } catch (err) {
    console.error('[createCaja]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function updateCaja(req, res) {
  try {
    await ensureCajasSchema()
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM cajas_chicas WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Caja no encontrada' })

    const body = req.body || {}
    const nombreExterior =
      body.nombre_exterior !== undefined
        ? String(body.nombre_exterior || '').trim() || existing[0].nombre_exterior
        : existing[0].nombre_exterior

    if (!nombreExterior) {
      return res.status(400).json({ error: 'nombre_exterior es requerido' })
    }

    // nombre interior (clave) inmutable
    await query(
      `UPDATE cajas_chicas SET nombre_exterior = ? WHERE id = ? AND is_deleted = FALSE`,
      [nombreExterior, id]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Cajas',
      `Caja id=${id} actualizada`
    )

    const updated = await query(
      `SELECT id, clave_interna, nombre_exterior, is_deleted, created_at, updated_at
       FROM cajas_chicas WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    return res.json(mapCajaRow(updated[0]))
  } catch (err) {
    console.error('[updateCaja]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteCaja(req, res) {
  try {
    await ensureCajasSchema()
    const id = Number(req.params.id)
    const result = await query(
      `UPDATE cajas_chicas
       SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Caja no encontrada' })
    }

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Cajas',
      `Soft delete caja id=${id}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteCaja]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

/* --- Centros de costo --- */

function mapCcRow(row) {
  if (!row) return null
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre || '',
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

async function listCentrosCosto(req, res) {
  try {
    await ensureCajasSchema()
    const rows = await query(
      `SELECT * FROM centros_costo WHERE is_deleted = FALSE ORDER BY codigo ASC`
    )
    return res.json(rows.map(mapCcRow))
  } catch (err) {
    console.error('[listCentrosCosto]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createCentroCosto(req, res) {
  try {
    await ensureCajasSchema()
    const codigo = String(req.body?.codigo || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-')
    const nombre = String(req.body?.nombre || '').trim() || null

    if (!codigo) {
      return res.status(400).json({ error: 'codigo es requerido' })
    }

    try {
      const result = await query(
        `INSERT INTO centros_costo (codigo, nombre) VALUES (?, ?)`,
        [codigo, nombre]
      )
      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'CREAR',
        'CentrosCosto',
        `CC ${codigo} creado`
      )
      const created = await query(
        `SELECT * FROM centros_costo WHERE id = ? AND is_deleted = FALSE`,
        [result.insertId]
      )
      return res.status(201).json(mapCcRow(created[0]))
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe un centro de costo con ese código' })
      }
      throw e
    }
  } catch (err) {
    console.error('[createCentroCosto]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function updateCentroCosto(req, res) {
  try {
    await ensureCajasSchema()
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM centros_costo WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Centro de costo no encontrado' })

    const codigo =
      req.body?.codigo !== undefined
        ? String(req.body.codigo || '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '-') || existing[0].codigo
        : existing[0].codigo
    const nombre =
      req.body?.nombre !== undefined
        ? String(req.body.nombre || '').trim() || null
        : existing[0].nombre

    try {
      await query(`UPDATE centros_costo SET codigo = ?, nombre = ? WHERE id = ?`, [
        codigo,
        nombre,
        id
      ])
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe un centro de costo con ese código' })
      }
      throw e
    }

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'CentrosCosto',
      `CC id=${id} actualizado`
    )
    const updated = await query(
      `SELECT * FROM centros_costo WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    return res.json(mapCcRow(updated[0]))
  } catch (err) {
    console.error('[updateCentroCosto]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteCentroCosto(req, res) {
  try {
    await ensureCajasSchema()
    const id = Number(req.params.id)
    const result = await query(
      `UPDATE centros_costo
       SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Centro de costo no encontrado' })
    }
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'CentrosCosto',
      `Soft delete CC id=${id}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteCentroCosto]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = {
  listCajas,
  resumenCaja,
  createCaja,
  updateCaja,
  softDeleteCaja,
  listCentrosCosto,
  createCentroCosto,
  updateCentroCosto,
  softDeleteCentroCosto
}
