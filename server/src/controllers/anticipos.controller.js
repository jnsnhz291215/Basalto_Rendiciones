'use strict'

const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const {
  nextCodigo,
  assertDentroVentanaEdicion,
  adminUpdateTocaDatosAnticipo
} = require('../utils/helpers')
const { canDevHardDelete } = require('../config/devFlags')
const {
  ensureAsignacionesSchema,
  normalizeBancoNombre
} = require('../utils/ensureAsignacionesSchema')
const {
  ensureCuentasBancoSchema,
  upsertCuentaBanco
} = require('../utils/ensureCuentasBancoSchema')
const {
  HEADERS_ASIGNACIONES,
  parseExcelConHeaders,
  parseFechaToIso,
  parseMonto,
  cleanRut,
  normalizeNumeroDocumento,
  keysMatch,
  cellToString
} = require('../utils/excelImport')
const { ensureImportacionesSchema } = require('../utils/ensureImportacionesSchema')
const {
  ESTADOS_FLUJO,
  getImportacionLoteById,
  isLoteConfirmado,
  assertPuedeBorrarMovimientoImportado
} = require('../utils/importacionLote')

async function listAnticipos(req, res) {
  try {
    await ensureAsignacionesSchema()
    const { caja_id, trabajador_id, mes, q } = req.query
    const params = []
    let sql = `
      SELECT a.*,
             c.clave_interna, c.nombre_exterior,
             COALESCE(
               NULLIF(TRIM(t.nombre_completo), ''),
               CONCAT('Trabajador #', a.trabajador_id)
             ) AS trabajador_nombre
      FROM anticipos a
      INNER JOIN cajas_chicas c ON c.id = a.caja_id AND c.is_deleted = FALSE
      LEFT JOIN trabajadores t ON t.id = a.trabajador_id
      WHERE a.is_deleted = FALSE`

    if (caja_id) {
      sql += ' AND a.caja_id = ?'
      params.push(Number(caja_id))
    }
    if (trabajador_id) {
      sql += ' AND a.trabajador_id = ?'
      params.push(Number(trabajador_id))
    }
    if (mes) {
      sql += ' AND DATE_FORMAT(a.fecha, "%Y-%m") = ?'
      params.push(mes)
    }
    if (q?.trim()) {
      sql += ' AND t.nombre_completo LIKE ?'
      params.push(`%${q.trim()}%`)
    }

    sql += ' ORDER BY a.fecha DESC, a.id DESC'
    const rows = await query(sql, params)
    return res.json(rows)
  } catch (err) {
    console.error('[listAnticipos]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function listBancosOrigen(req, res) {
  try {
    await ensureAsignacionesSchema()
    const q = normalizeBancoNombre(req.query.q || '')
    let rows
    if (q) {
      rows = await query(
        `SELECT id, nombre FROM bancos_origen
         WHERE nombre LIKE ?
         ORDER BY nombre ASC
         LIMIT 30`,
        [`%${q}%`]
      )
    } else {
      rows = await query(
        `SELECT id, nombre FROM bancos_origen ORDER BY nombre ASC LIMIT 100`
      )
    }
    return res.json(rows)
  } catch (err) {
    console.error('[listBancosOrigen]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function createAnticipo(req, res) {
  try {
    await ensureAsignacionesSchema()
    await ensureCuentasBancoSchema()
    const {
      caja_id,
      trabajador_id,
      fecha,
      monto,
      observacion,
      comprobante_url,
      codigo_vale,
      numero_cuenta,
      banco_origen
    } = req.body || {}

    if (!caja_id || !trabajador_id || !fecha || monto === undefined) {
      return res.status(400).json({ error: 'caja_id, trabajador_id, fecha y monto son requeridos' })
    }

    const montoNum = Number(monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' })
    }

    if (!String(comprobante_url || '').trim()) {
      return res.status(400).json({
        error: 'El comprobante es obligatorio. Ninguna asignación puede guardarse sin documento.'
      })
    }

    const centroCobroId = await getCentroCobroIdFromCaja(caja_id)
    const cuentaSync = await upsertCuentaBanco(numero_cuenta, banco_origen, centroCobroId)
    if (!cuentaSync.ok) {
      return res.status(cuentaSync.status).json({ error: cuentaSync.error })
    }
    const cuenta = cuentaSync.cuenta.numero_cuenta
    const banco = cuentaSync.cuenta.banco

    const codigo = normalizeNumeroDocumento(codigo_vale)
    if (!codigo) {
      return res.status(400).json({ error: 'N° Doc / Vale (codigo_vale) es obligatorio' })
    }

    const obs = cellToString(observacion) || ''
    if (!obs.trim()) {
      return res.status(400).json({ error: 'Las observaciones / motivo son obligatorias' })
    }
    if (obs.length > 500) {
      return res.status(400).json({ error: 'Las observaciones no pueden superar 500 caracteres' })
    }

    const result = await query(
      `INSERT INTO anticipos
        (codigo_vale, caja_id, trabajador_id, fecha, monto, numero_cuenta, banco_origen,
         observacion, comprobante_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        caja_id,
        trabajador_id,
        fecha,
        montoNum,
        cuenta,
        banco,
        obs.trim(),
        comprobante_url || null
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Asignaciones',
      `Asignación ${codigo} a trabajador_id=${trabajador_id} ($${monto}) · ${banco} · cta ${cuenta}`
    )

    const created = await query(
      `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
      [result.insertId]
    )
    return res.status(201).json(created[0])
  } catch (err) {
    console.error('[createAnticipo]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function updateAnticipo(req, res) {
  try {
    await ensureAsignacionesSchema()
    await ensureCuentasBancoSchema()
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Asignación no encontrada' })

    const {
      fecha,
      monto,
      observacion,
      comprobante_url,
      trabajador_id,
      caja_id,
      numero_cuenta,
      banco_origen
    } = req.body || {}

    // Lote confirmado: no editar datos; solo subir comprobante si faltaba
    if (existing[0].importacion_lote_id) {
      const lote = await getImportacionLoteById(existing[0].importacion_lote_id)
      if (lote && isLoteConfirmado(lote)) {
        const tieneComprobante = Boolean(String(existing[0].comprobante_url || '').trim())
        const nuevaUrl = String(comprobante_url || '').trim()
        if (tieneComprobante || !nuevaUrl) {
          return res.status(403).json({
            error:
              'El lote está confirmado: no se puede editar. Solo se permite subir comprobante si aún no lo tenía.'
          })
        }
        await query(
          `UPDATE anticipos SET comprobante_url = ? WHERE id = ? AND is_deleted = FALSE`,
          [nuevaUrl, id]
        )
        await registrarAuditoria(
          req.user.id,
          req.user.nombre,
          'MODIFICAR',
          'Asignaciones',
          `Comprobante adjunto a asignación importada (lote confirmado) ${existing[0].codigo_vale}`
        )
        const updated = await query(
          `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
          [id]
        )
        return res.json(updated[0])
      }
    }

    // Admin: edición de datos solo dentro de 24h. Solo comprobante (p. ej. adjunto) queda exento.
    if (adminUpdateTocaDatosAnticipo(req.body)) {
      const bloqueoVentana = assertDentroVentanaEdicion(existing[0].created_at, 'editar')
      if (bloqueoVentana) {
        return res.status(bloqueoVentana.status).json({ error: bloqueoVentana.error })
      }
    }

    let nextCuenta = existing[0].numero_cuenta
    let nextBanco = existing[0].banco_origen
    if (numero_cuenta !== undefined || banco_origen !== undefined) {
      const cuentaRaw =
        numero_cuenta !== undefined ? numero_cuenta : existing[0].numero_cuenta
      const bancoRaw =
        banco_origen !== undefined ? banco_origen : existing[0].banco_origen
      const cajaForCc = caja_id || existing[0].caja_id
      const centroCobroId = await getCentroCobroIdFromCaja(cajaForCc)
      const cuentaSync = await upsertCuentaBanco(cuentaRaw, bancoRaw, centroCobroId)
      if (!cuentaSync.ok) {
        return res.status(cuentaSync.status).json({ error: cuentaSync.error })
      }
      nextCuenta = cuentaSync.cuenta.numero_cuenta
      nextBanco = cuentaSync.cuenta.banco
    } else if (nextBanco) {
      nextBanco = normalizeBancoNombre(nextBanco)
    }

    await query(
      `UPDATE anticipos
       SET caja_id = ?,
           trabajador_id = ?,
           fecha = ?,
           monto = ?,
           numero_cuenta = ?,
           banco_origen = ?,
           observacion = ?,
           comprobante_url = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        caja_id || existing[0].caja_id,
        trabajador_id || existing[0].trabajador_id,
        fecha || existing[0].fecha,
        monto !== undefined ? Number(monto) : existing[0].monto,
        nextCuenta,
        nextBanco,
        observacion !== undefined ? observacion : existing[0].observacion,
        comprobante_url !== undefined ? comprobante_url : existing[0].comprobante_url,
        id
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'MODIFICAR',
      'Asignaciones',
      `Asignación ${existing[0].codigo_vale} modificada`
    )

    const updated = await query(
      `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    return res.json(updated[0])
  } catch (err) {
    console.error('[updateAnticipo]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function softDeleteAnticipo(req, res) {
  try {
    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM anticipos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Asignación no encontrada' })

    const bloqueoLote = await assertPuedeBorrarMovimientoImportado(existing[0])
    if (bloqueoLote) {
      return res.status(bloqueoLote.status).json({ error: bloqueoLote.error })
    }

    const allowHard = canDevHardDelete(req.user)
    // Soft delete: ventana 24h. Hard delete Dev la omite.
    if (!allowHard) {
      const bloqueoVentana = assertDentroVentanaEdicion(existing[0].created_at, 'eliminar')
      if (bloqueoVentana) {
        return res.status(bloqueoVentana.status).json({ error: bloqueoVentana.error })
      }
    }

    if (allowHard) {
      await query(`DELETE FROM anticipos WHERE id = ?`, [id])
      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'ELIMINAR',
        'Asignaciones',
        `HARD delete asignación ${existing[0].codigo_vale}`
      )
      return res.json({ ok: true, hard: true })
    }

    await query(
      `UPDATE anticipos SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'ELIMINAR',
      'Asignaciones',
      `Soft delete asignación ${existing[0].codigo_vale}`
    )
    return res.json({ ok: true })
  } catch (err) {
    console.error('[softDeleteAnticipo]', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function findTrabajadorIdByRut(rutRaw) {
  const rut = cleanRut(rutRaw)
  if (!rut) return null
  const rows = await query(
    `SELECT id, rut FROM trabajadores WHERE is_deleted = FALSE`
  )
  const match = rows.find((t) => cleanRut(t.rut) === rut)
  return match ? Number(match.id) : null
}

async function getCentroCobroIdFromCaja(cajaId) {
  const id = Number(cajaId)
  if (!Number.isFinite(id) || id <= 0) return null
  const rows = await query(
    `SELECT centro_cobro_id FROM cajas_chicas
     WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
    [id]
  )
  const cc = rows[0]?.centro_cobro_id
  return cc != null && Number(cc) > 0 ? Number(cc) : null
}

async function findCajaIdByCcYCaja(ccNombre, cajaClave) {
  const ccRaw = cellToString(ccNombre)
  const cajaRaw = cellToString(cajaClave)
  if (!cajaRaw) return null
  const rows = await query(
    `SELECT c.id, c.clave_interna, c.nombre_exterior, COALESCE(cc.nombre, '') AS cc_nombre
     FROM cajas_chicas c
     LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id AND cc.is_deleted = FALSE
     WHERE c.is_deleted = FALSE`
  )
  const matches = rows.filter((r) => {
    const cajaOk =
      keysMatch(r.clave_interna, cajaRaw) || keysMatch(r.nombre_exterior, cajaRaw)
    if (!cajaOk) return false
    if (!ccRaw) return true
    return keysMatch(r.cc_nombre, ccRaw)
  })
  if (!matches.length) return null
  if (matches.length === 1) return Number(matches[0].id)
  const byKey = matches.find((r) => keysMatch(r.clave_interna, cajaRaw))
  return Number((byKey || matches[0]).id)
}

async function importAsignacionesExcel(req, res) {
  try {
    await ensureAsignacionesSchema()
    await ensureCuentasBancoSchema()
    await ensureImportacionesSchema()
    const parsed = parseExcelConHeaders(req.file?.buffer, HEADERS_ASIGNACIONES, 'Asignaciones')
    if (!parsed.ok) {
      return res.status(400).json({
        ok: false,
        error: parsed.error,
        faltantes: parsed.faltantes || []
      })
    }

    const archivoNombre = String(req.file?.originalname || '').slice(0, 255) || null
    const loteInsert = await query(
      `INSERT INTO importaciones_lotes
        (tipo, archivo_nombre, usuario_id, usuario_nombre, estado, creados, errores_count)
       VALUES ('asignaciones', ?, ?, ?, ?, 0, 0)`,
      [archivoNombre, req.user.id ?? null, req.user.nombre ?? null, ESTADOS_FLUJO.PENDIENTE]
    )
    const loteId = loteInsert.insertId

    const creados = []
    const errores = []

    for (const row of parsed.rows) {
      const fila = row.__row
      try {
        // Mismas normalizaciones que gastos: fecha/monto crudos, RUT, CC/caja, n° doc
        const fecha = parseFechaToIso(row.__raw?.fecha ?? row.fecha)
        if (!fecha) throw new Error('fecha inválida (usa DD/MM/AAAA)')

        const rut = cleanRut(row.trabajador_rut)
        if (!rut) throw new Error('trabajador_rut es obligatorio')

        const cc = cellToString(row.cc)
        const caja = cellToString(row.caja)
        if (!cc) throw new Error('cc (empresa) es obligatorio')
        if (!caja) throw new Error('caja es obligatoria')

        const monto = parseMonto(row.__raw?.monto ?? row.monto)
        if (monto == null) throw new Error('monto inválido')

        const trabajadorId = await findTrabajadorIdByRut(rut)
        if (!trabajadorId) {
          throw new Error(`trabajador_rut no encontrado (${row.trabajador_rut})`)
        }

        const cajaId = await findCajaIdByCcYCaja(cc, caja)
        if (!cajaId) throw new Error(`caja/cc no encontrados (${cc} / ${caja})`)

        const centroCobroId = await getCentroCobroIdFromCaja(cajaId)
        const cuentaSync = await upsertCuentaBanco(
          row.__raw?.numero_cuenta ?? row.numero_cuenta,
          cellToString(row.banco_origen),
          centroCobroId
        )
        if (!cuentaSync.ok) throw new Error(cuentaSync.error)
        const cuenta = cuentaSync.cuenta.numero_cuenta
        const banco = cuentaSync.cuenta.banco

        let codigo = normalizeNumeroDocumento(row.n_doc_vale)
        if (!codigo) {
          const maxRows = await query(
            `SELECT MAX(CAST(SUBSTRING_INDEX(codigo_vale, '-', -1) AS UNSIGNED)) AS max_num
             FROM anticipos`
          )
          codigo = nextCodigo('V', Number(maxRows[0]?.max_num) || 5500)
        } else {
          const dup = await query(
            `SELECT id FROM anticipos
             WHERE codigo_vale = ? AND is_deleted = FALSE
             LIMIT 1`,
            [codigo]
          )
          if (dup[0]) throw new Error(`n_doc_vale ya existe (${codigo})`)
        }

        const observacion = cellToString(row.observacion) || null
        if (observacion && observacion.length > 500) {
          throw new Error('observacion supera 500 caracteres')
        }

        const result = await query(
          `INSERT INTO anticipos
            (codigo_vale, caja_id, trabajador_id, fecha, monto, numero_cuenta, banco_origen,
             observacion, comprobante_url, es_legacy, importacion_lote_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?)`,
          [codigo, cajaId, trabajadorId, fecha, monto, cuenta, banco, observacion, loteId]
        )

        creados.push({ fila, id: result.insertId, codigo })
      } catch (err) {
        errores.push({ fila, error: err?.message || 'Error en fila' })
      }
    }

    await query(
      `UPDATE importaciones_lotes
       SET estado = ?, creados = ?, errores_count = ?,
           errores_json = ?, detalle_creados_json = ?
       WHERE id = ?`,
      [
        ESTADOS_FLUJO.PENDIENTE,
        creados.length,
        errores.length,
        JSON.stringify(errores),
        JSON.stringify(creados),
        loteId
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Asignaciones',
      `Import Excel lote=${loteId}: ${creados.length} ok, ${errores.length} error(es)`
    )

    return res.json({
      ok: errores.length === 0,
      lote_id: loteId,
      estado: ESTADOS_FLUJO.PENDIENTE,
      creados: creados.length,
      errores,
      detalle_creados: creados
    })
  } catch (err) {
    console.error('[importAsignacionesExcel]', err)
    return res.status(500).json({ error: err?.message || 'Error al importar Excel' })
  }
}

module.exports = {
  listAnticipos,
  listBancosOrigen,
  createAnticipo,
  updateAnticipo,
  softDeleteAnticipo,
  importAsignacionesExcel
}
