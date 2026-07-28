const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { ensureCajasSchema } = require('../utils/ensureCajasSchema')
const { ROLES, ADMINS } = require('../middlewares/role.middleware')
const { canDevHardDelete } = require('../config/devFlags')

function normalizeNombreInterior(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
}

async function cajaTieneDatos(cajaId) {
  const rend = await query(
    `SELECT COUNT(*) AS n FROM rendiciones_gastos
     WHERE caja_id = ? AND is_deleted = FALSE`,
    [cajaId]
  )
  const ant = await query(
    `SELECT COUNT(*) AS n FROM anticipos
     WHERE caja_id = ? AND is_deleted = FALSE`,
    [cajaId]
  )
  return Number(rend[0]?.n || 0) + Number(ant[0]?.n || 0) > 0
}

async function centroTieneDatos(ccId) {
  const cajas = await query(
    `SELECT id FROM cajas_chicas WHERE centro_cobro_id = ? AND is_deleted = FALSE`,
    [ccId]
  )
  if (!cajas.length) return false
  for (const c of cajas) {
    if (await cajaTieneDatos(c.id)) return true
  }
  // Tiene cajas asociadas = ya tiene estructura/datos de negocio
  return true
}

function mapCajaRow(row) {
  if (!row) return null
  return {
    id: row.id,
    nombre_exterior: row.nombre_exterior,
    nombre_interior: row.clave_interna,
    clave_interna: row.clave_interna,
    centro_cobro_id: row.centro_cobro_id ?? null,
    centro_cobro_nombre: row.centro_cobro_nombre || null,
    tiene_datos: Boolean(row.tiene_datos),
    total_mes: Number(row.total_mes) || 0,
    total_anio: Number(row.total_anio) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function mapCcRow(row) {
  if (!row) return null
  return {
    id: row.id,
    nombre: row.nombre || '',
    tiene_datos: Boolean(row.tiene_datos),
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

async function listCajas(req, res) {
  try {
    await ensureCajasSchema()

    // Mes/año desde el cliente (PC host); fallback a fecha del servidor
    const now = new Date()
    const mesParam = String(req.query.mes || '').trim()
    const anioParam = String(req.query.anio || '').trim()
    const mes =
      /^\d{4}-\d{2}$/.test(mesParam)
        ? mesParam
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const anio = /^\d{4}$/.test(anioParam) ? anioParam : String(Number(mes.slice(0, 4)) || now.getFullYear())

    let sql = `
      SELECT c.id, c.clave_interna, c.nombre_exterior, c.centro_cobro_id,
              c.created_at, c.updated_at,
              cc.nombre AS centro_cobro_nombre,
              (
                EXISTS(
                  SELECT 1 FROM rendiciones_gastos r
                  WHERE r.caja_id = c.id AND r.is_deleted = FALSE
                )
                OR EXISTS(
                  SELECT 1 FROM anticipos a
                  WHERE a.caja_id = c.id AND a.is_deleted = FALSE
                )
              ) AS tiene_datos,
              (
                SELECT COALESCE(SUM(r.monto), 0)
                FROM rendiciones_gastos r
                WHERE r.caja_id = c.id
                  AND r.is_deleted = FALSE
                  AND r.estado <> 'Rechazado'
                  AND DATE_FORMAT(r.fecha_documento, '%Y-%m') = ?
              ) AS total_mes,
              (
                SELECT COALESCE(SUM(r.monto), 0)
                FROM rendiciones_gastos r
                WHERE r.caja_id = c.id
                  AND r.is_deleted = FALSE
                  AND r.estado <> 'Rechazado'
                  AND YEAR(r.fecha_documento) = ?
              ) AS total_anio
       FROM cajas_chicas c
       LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id AND cc.is_deleted = FALSE
       WHERE c.is_deleted = FALSE`
    const params = [mes, Number(anio)]

    // Usuario normal: solo cajas asignadas en Personal / Usuarios
    if (req.user?.rol === ROLES.USER_RENDIDOR) {
      if (!req.user.trabajador_id) {
        return res.json([])
      }
      sql += ` AND c.clave_interna IN (
        SELECT tc.clave_interna FROM trabajador_cajas tc WHERE tc.trabajador_id = ?
      )`
      params.push(req.user.trabajador_id)
    }

    sql += ' ORDER BY cc.nombre ASC, c.clave_interna ASC'
    const rows = await query(sql, params)
    return res.json(rows.map(mapCajaRow))
  } catch (err) {
    console.error('[listCajas]', err)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.sqlMessage || err.message || undefined
    })
  }
}

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

    if (req.user?.rol === ROLES.USER_RENDIDOR) {
      if (!req.user.trabajador_id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      const assigned = await query(
        `SELECT 1 AS ok FROM trabajador_cajas
         WHERE trabajador_id = ? AND clave_interna = ?
         LIMIT 1`,
        [req.user.trabajador_id, caja.clave_interna]
      )
      if (!assigned[0]) {
        return res.status(403).json({ error: 'Caja no asignada a tu usuario' })
      }
    }

    const mesFilter = /^\d{4}-\d{2}$/.test(mes)

    let gastosSql = `
      SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad
      FROM rendiciones_gastos
      WHERE is_deleted = FALSE AND caja_id = ? AND estado <> 'Rechazado'`
    const gastosParams = [caja.id]
    if (mesFilter) {
      gastosSql += ` AND DATE_FORMAT(fecha_documento, '%Y-%m') = ?`
      gastosParams.push(mes)
    }

    let aprobadosSql = `
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM rendiciones_gastos
      WHERE is_deleted = FALSE AND caja_id = ?
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
    return res.json({
      caja_id: caja.id,
      clave_interna: caja.clave_interna,
      nombre_interior: caja.clave_interna,
      nombre_exterior: caja.nombre_exterior,
      mes: mes || null,
      fondo_estimado: 0,
      saldo_caja: 0 - totalAprobados - (Number(anticiposMes[0]?.total) || 0),
      gastos_rendidos: {
        total: Number(gastosMes[0]?.total) || 0,
        cantidad: Number(gastosMes[0]?.cantidad) || 0
      },
      anticipos_pendientes: {
        total: Number(anticiposMes[0]?.total) || 0,
        cantidad: Number(anticiposMes[0]?.cantidad) || 0
      }
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
    const centroCobroId = Number(body.centro_cobro_id)

    if (!nombreExterior) {
      return res.status(400).json({ error: 'nombre_exterior es requerido' })
    }
    if (!Number.isFinite(centroCobroId) || centroCobroId <= 0) {
      return res.status(400).json({ error: 'centro_cobro_id es requerido' })
    }

    const cc = await query(
      `SELECT id, nombre FROM centros_costo WHERE id = ? AND is_deleted = FALSE`,
      [centroCobroId]
    )
    if (!cc[0]) {
      return res.status(400).json({ error: 'Centro de cobro / empresa no encontrado' })
    }

    // El agrupador es el CC (antes "nombre interior"). clave_interna técnica única por caja.
    const slugExterior = normalizeNombreInterior(nombreExterior) || 'CAJA'
    const clave =
      normalizeNombreInterior(`${cc[0].nombre}_${slugExterior}`) ||
      `CC${centroCobroId}_${slugExterior}`

    try {
      const result = await query(
        `INSERT INTO cajas_chicas (clave_interna, nombre_exterior, centro_cobro_id)
         VALUES (?, ?, ?)`,
        [clave, nombreExterior, centroCobroId]
      )

      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'CREAR',
        'Cajas',
        `Caja ${clave} creada (${nombreExterior}) en CC id=${centroCobroId}`
      )

      const created = await query(
        `SELECT c.*, cc.nombre AS centro_cobro_nombre, FALSE AS tiene_datos
         FROM cajas_chicas c
         LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id
         WHERE c.id = ? AND c.is_deleted = FALSE`,
        [result.insertId]
      )
      return res.status(201).json(mapCajaRow(created[0]))
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Ya existe una caja con ese nombre en este centro de cobro / empresa'
        })
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

    const allowHard = canDevHardDelete(req.user)
    if (!allowHard && (await cajaTieneDatos(id))) {
      return res.status(400).json({
        error: 'No se puede editar: la caja ya tiene datos asociados'
      })
    }

    const body = req.body || {}
    const nombreExterior =
      body.nombre_exterior !== undefined
        ? String(body.nombre_exterior || '').trim() || existing[0].nombre_exterior
        : existing[0].nombre_exterior

    // El CC es el agrupador (ex nombre interior): no se cambia al editar.
    const centroCobroId = existing[0].centro_cobro_id

    await query(
      `UPDATE cajas_chicas
       SET nombre_exterior = ?, centro_cobro_id = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [nombreExterior, centroCobroId, id]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Cajas',
      `Caja id=${id} actualizada`
    )

    const updated = await query(
      `SELECT c.*, cc.nombre AS centro_cobro_nombre, FALSE AS tiene_datos
       FROM cajas_chicas c
       LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id
       WHERE c.id = ? AND c.is_deleted = FALSE`,
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
    const existing = await query(
      `SELECT id FROM cajas_chicas WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Caja no encontrada' })

    const allowHard = canDevHardDelete(req.user)

    if (!allowHard && (await cajaTieneDatos(id))) {
      return res.status(400).json({
        error: 'No se puede eliminar: la caja ya tiene datos asociados'
      })
    }

    if (allowHard) {
      await query(`DELETE FROM rendiciones_gastos WHERE caja_id = ?`, [id])
      await query(`DELETE FROM anticipos WHERE caja_id = ?`, [id])
      await query(`DELETE FROM cajas_chicas WHERE id = ?`, [id])
      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'ELIMINAR',
        'Cajas',
        `HARD delete caja id=${id}`
      )
      return res.json({ ok: true, hard: true })
    }

    await query(
      `UPDATE cajas_chicas SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )

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

/* --- Centro de cobro / empresa --- */

async function listCentrosCosto(req, res) {
  try {
    await ensureCajasSchema()
    const rows = await query(
      `SELECT cc.*,
              EXISTS(
                SELECT 1 FROM cajas_chicas c
                WHERE c.centro_cobro_id = cc.id AND c.is_deleted = FALSE
              ) AS tiene_datos
       FROM centros_costo cc
       WHERE cc.is_deleted = FALSE
       ORDER BY cc.nombre ASC`
    )
    return res.json(rows.map(mapCcRow))
  } catch (err) {
    console.error('[listCentrosCosto]', err)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.sqlMessage || err.message || undefined
    })
  }
}

async function createCentroCosto(req, res) {
  try {
    await ensureCajasSchema()
    const nombre = String(req.body?.nombre || '').trim()
    if (!nombre) {
      return res.status(400).json({ error: 'nombre es requerido' })
    }

    try {
      // Compat: si quedó columna legacy `codigo`, reutilizar el mismo valor
      let result
      try {
        result = await query(
          `INSERT INTO centros_costo (nombre, codigo) VALUES (?, ?)`,
          [nombre, nombre]
        )
      } catch (insertErr) {
        if (
          insertErr.errno === 1054 ||
          insertErr.code === 'ER_BAD_FIELD_ERROR'
        ) {
          result = await query(`INSERT INTO centros_costo (nombre) VALUES (?)`, [nombre])
        } else {
          throw insertErr
        }
      }
      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'CREAR',
        'CentrosCobro',
        `Centro de cobro "${nombre}" creado`
      )
      const created = await query(
        `SELECT *, FALSE AS tiene_datos FROM centros_costo WHERE id = ? AND is_deleted = FALSE`,
        [result.insertId]
      )
      return res.status(201).json(mapCcRow(created[0]))
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe un centro de cobro con ese nombre' })
      }
      throw e
    }
  } catch (err) {
    console.error('[createCentroCosto]', err)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.sqlMessage || err.message || undefined
    })
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
    if (!existing[0]) {
      return res.status(404).json({ error: 'Centro de cobro / empresa no encontrado' })
    }

    const allowHard = canDevHardDelete(req.user)
    if (!allowHard && (await centroTieneDatos(id))) {
      return res.status(400).json({
        error: 'No se puede editar: el centro de cobro ya tiene cajas o datos asociados'
      })
    }

    const nombre = String(req.body?.nombre || '').trim()
    if (!nombre) {
      return res.status(400).json({ error: 'nombre es requerido' })
    }

    try {
      await query(`UPDATE centros_costo SET nombre = ? WHERE id = ?`, [nombre, id])
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe un centro de cobro con ese nombre' })
      }
      throw e
    }

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'CentrosCobro',
      `Centro de cobro id=${id} actualizado`
    )
    const updated = await query(
      `SELECT *, FALSE AS tiene_datos FROM centros_costo WHERE id = ? AND is_deleted = FALSE`,
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
    const existing = await query(
      `SELECT id FROM centros_costo WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) {
      return res.status(404).json({ error: 'Centro de cobro / empresa no encontrado' })
    }

    const allowHard = canDevHardDelete(req.user)
    if (!allowHard && (await centroTieneDatos(id))) {
      return res.status(400).json({
        error: 'No se puede eliminar: el centro de cobro ya tiene cajas o datos asociados'
      })
    }

    if (allowHard) {
      const cajas = await query(
        `SELECT id FROM cajas_chicas WHERE centro_cobro_id = ?`,
        [id]
      )
      for (const c of cajas) {
        await query(`DELETE FROM rendiciones_gastos WHERE caja_id = ?`, [c.id])
        await query(`DELETE FROM anticipos WHERE caja_id = ?`, [c.id])
        await query(`DELETE FROM cajas_chicas WHERE id = ?`, [c.id])
      }
      await query(`DELETE FROM centros_costo WHERE id = ?`, [id])
      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'ELIMINAR',
        'CentrosCobro',
        `HARD delete centro de cobro id=${id}`
      )
      return res.json({ ok: true, hard: true })
    }

    // Liberar UNIQUE(nombre) para poder recrear el mismo nombre luego
    await query(
      `UPDATE centros_costo
       SET is_deleted = TRUE,
           deleted_at = NOW(),
           nombre = CONCAT(nombre, '_DEL_', id)
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'CentrosCobro',
      `Soft delete centro de cobro id=${id}`
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
