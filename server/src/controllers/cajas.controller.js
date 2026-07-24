const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')

async function listCajas(req, res) {
  try {
    const rows = await query(
      `SELECT c.*, t.nombre_completo AS responsable_nombre
       FROM cajas_chicas c
       LEFT JOIN trabajadores t ON t.id = c.responsable_id AND t.is_deleted = FALSE
       WHERE c.is_deleted = FALSE
       ORDER BY c.clave_interna ASC, c.mes_asignado DESC`
    )
    return res.json(rows)
  } catch (err) {
    console.error('[listCajas]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createCaja(req, res) {
  try {
    const {
      clave_interna,
      nombre_exterior,
      centro_costo,
      responsable_id,
      mes_asignado,
      fondo_estimado_mes,
      estado
    } = req.body || {}

    if (!clave_interna?.trim() || !nombre_exterior?.trim() || !mes_asignado) {
      return res.status(400).json({ error: 'clave_interna, nombre_exterior y mes_asignado son requeridos' })
    }

    const clave = String(clave_interna).trim().toUpperCase().replace(/\s+/g, '_')

    try {
      const result = await query(
        `INSERT INTO cajas_chicas
          (clave_interna, nombre_exterior, centro_costo, responsable_id, mes_asignado, fondo_estimado_mes, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          clave,
          nombre_exterior.trim(),
          centro_costo?.trim() || '—',
          responsable_id || null,
          mes_asignado,
          Number(fondo_estimado_mes) || 0,
          estado === 'inactiva' ? 'inactiva' : 'activa'
        ]
      )

      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'CREAR',
        'Cajas',
        `Caja ${clave} / ${mes_asignado} creada`
      )

      const created = await query(
        `SELECT * FROM cajas_chicas WHERE id = ? AND is_deleted = FALSE`,
        [result.insertId]
      )
      return res.status(201).json(created[0])
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Ya existe un presupuesto para esa clave_interna y mes_asignado'
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
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM cajas_chicas WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Caja no encontrada' })

    const {
      nombre_exterior,
      centro_costo,
      responsable_id,
      mes_asignado,
      fondo_estimado_mes,
      estado
    } = req.body || {}

    // clave_interna no se modifica (inmutable)
    await query(
      `UPDATE cajas_chicas
       SET nombre_exterior = ?,
           centro_costo = ?,
           responsable_id = ?,
           mes_asignado = ?,
           fondo_estimado_mes = ?,
           estado = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        nombre_exterior?.trim() || existing[0].nombre_exterior,
        centro_costo?.trim() || existing[0].centro_costo,
        responsable_id !== undefined ? responsable_id : existing[0].responsable_id,
        mes_asignado || existing[0].mes_asignado,
        fondo_estimado_mes !== undefined
          ? Number(fondo_estimado_mes)
          : existing[0].fondo_estimado_mes,
        estado || existing[0].estado,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Cajas',
      `Caja id=${id} actualizada`
    )

    const updated = await query(
      `SELECT * FROM cajas_chicas WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    return res.json(updated[0])
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Conflicto clave_interna + mes_asignado' })
    }
    console.error('[updateCaja]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteCaja(req, res) {
  try {
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

module.exports = { listCajas, createCaja, updateCaja, softDeleteCaja }
