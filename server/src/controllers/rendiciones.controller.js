const { query } = require('../config/db')
const { registrarAuditoria } = require('../utils/audit')
const { calcularArrastreMes, nextCodigo, mesActualYYYYMM } = require('../utils/helpers')
const { ROLES, ADMINS } = require('../middlewares/role.middleware')
const { assertTarjetaPermitePago } = require('../utils/tarjetaPago')
const { guardarYVerificarComprobante } = require('../utils/verificarComprobante')
const { canDevHardDelete, canSkipComprobanteVerify } = require('../config/devFlags')
const {
  HEADERS_GASTOS,
  parseExcelConHeaders,
  parseFechaToIso,
  parseMonto,
  cleanRut,
  normalizeTarjetaUltimos4,
  mapTipoDocumento,
  mapOrigenPago,
  keysMatch,
  cellToString,
  tipoRequiereNumeroDocumento,
  resolveNumeroDocumentoForTipo
} = require('../utils/excelImport')

async function assertCajaAsignadaATrabajador(trabajadorId, cajaId) {
  const rows = await query(
    `SELECT 1 AS ok
     FROM cajas_chicas c
     INNER JOIN trabajador_cajas tc
       ON tc.clave_interna = c.clave_interna AND tc.trabajador_id = ?
     WHERE c.id = ? AND c.is_deleted = FALSE
     LIMIT 1`,
    [trabajadorId, cajaId]
  )
  return Boolean(rows[0])
}

async function resolveMetaComprobante({ caja_id, trabajador_id, fecha }) {
  let caja = ''
  let centroCobro = 'sin_cc'
  let trabajador = ''
  let mes = fecha || ''

  if (caja_id) {
    const rows = await query(
      `SELECT c.clave_interna, c.nombre_exterior,
              COALESCE(cc.nombre, 'sin_cc') AS centro_cobro_nombre
       FROM cajas_chicas c
       LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id AND cc.is_deleted = FALSE
       WHERE c.id = ? AND c.is_deleted = FALSE
       LIMIT 1`,
      [Number(caja_id)]
    )
    if (rows[0]) {
      caja = rows[0].clave_interna || rows[0].nombre_exterior || ''
      centroCobro = rows[0].centro_cobro_nombre || 'sin_cc'
    }
  }

  if (trabajador_id) {
    const rows = await query(
      `SELECT COALESCE(NULLIF(TRIM(nombre_completo), ''), CONCAT('Trabajador_', id)) AS nombre
       FROM trabajadores
       WHERE id = ?
       LIMIT 1`,
      [Number(trabajador_id)]
    )
    if (rows[0]) trabajador = rows[0].nombre || ''
  }

  return { caja, centroCobro, trabajador, mes }
}

async function verificarComprobanteHandler(req, res) {
  try {
    const body = req.body || {}
    const meta = await resolveMetaComprobante({
      caja_id: body.caja_id,
      trabajador_id: body.trabajador_id,
      fecha: body.fecha || body.fecha_documento
    })

    const result = await guardarYVerificarComprobante({
      file: req.file,
      montoEsperado: body.monto,
      tipoDocumento: body.tipo_documento,
      numeroDocumento: body.numero_documento,
      skipIaVerify: canSkipComprobanteVerify(req.user),
      tipoMovimiento: body.tipo_movimiento || 'gasto',
      mes: meta.mes || body.mes,
      centroCobro: body.centro_cobro || meta.centroCobro,
      caja: body.caja || meta.caja,
      trabajador: body.trabajador || meta.trabajador
    })

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        error: result.errores[0] || 'Comprobante inválido',
        errores: result.errores,
        detalle: result.detalle || {}
      })
    }

    return res.json({
      ok: true,
      comprobante_url: result.comprobante_url,
      detalle: result.detalle || {},
      bypass_ia: Boolean(result.detalle?.bypass_ia)
    })
  } catch (err) {
    console.error('[verificarComprobante]', err)
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Error al verificar el comprobante'
    })
  }
}

async function listRendiciones(req, res) {
  try {
    const { caja_id, trabajador_id, mes, q } = req.query
    const params = []
    let sql = `
      SELECT r.*,
             c.clave_interna, c.nombre_exterior,
             COALESCE(
               NULLIF(TRIM(t.nombre_completo), ''),
               CONCAT('Trabajador #', r.trabajador_id)
             ) AS trabajador_nombre
      FROM rendiciones_gastos r
      INNER JOIN cajas_chicas c ON c.id = r.caja_id AND c.is_deleted = FALSE
      LEFT JOIN trabajadores t ON t.id = r.trabajador_id
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
      sql += ` AND (
        t.nombre_completo LIKE ?
        OR CONCAT('Trabajador #', r.trabajador_id) LIKE ?
      )`
      const like = `%${q.trim()}%`
      params.push(like, like)
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

    if (!String(comprobante_url || '').trim()) {
      return res.status(400).json({
        error: 'El comprobante es obligatorio. Ningún cobro puede guardarse sin documento.'
      })
    }

    if (!String(descripcion || '').trim()) {
      return res.status(400).json({ error: 'La descripción / observación es obligatoria.' })
    }

    if (
      tipoRequiereNumeroDocumento(tipo_documento) &&
      !resolveNumeroDocumentoForTipo(tipo_documento, numero_documento) &&
      !canSkipComprobanteVerify(req.user)
    ) {
      return res.status(400).json({
        error: `numero_documento es obligatorio para ${tipo_documento}`
      })
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

    if (req.user.rol === ROLES.USER_RENDIDOR) {
      const ok = await assertCajaAsignadaATrabajador(trabajadorId, Number(caja_id))
      if (!ok) {
        return res.status(403).json({ error: 'Caja no asignada a tu usuario' })
      }
    }

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
        resolveNumeroDocumentoForTipo(tipo_documento, numero_documento),
        Number(monto),
        origen_pago,
        tarjeta_id || null,
        comprobante_url || null,
        String(descripcion).trim(),
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

    const isUser = req.user.rol === ROLES.USER_RENDIDOR
    const isAdmin = ADMINS.includes(req.user.rol)

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

    if (isUser) {
      if (existing[0].trabajador_id !== req.user.trabajador_id) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      // Import Excel (es_legacy): permitir adjuntar/cambiar comprobante sin editar el resto
      const urlAdjunto = String(comprobante_url || '').trim()
      if (Boolean(existing[0].es_legacy) && urlAdjunto) {
        await query(
          `UPDATE rendiciones_gastos
           SET comprobante_url = ?
           WHERE id = ? AND is_deleted = FALSE`,
          [urlAdjunto, id]
        )
        await registrarAuditoria(
          req.user.id,
          req.user.nombre,
          'MODIFICAR',
          'Gastos',
          `Comprobante adjunto a rendición legacy ${existing[0].codigo_rinde}`
        )
        const updated = await query(
          `SELECT * FROM rendiciones_gastos WHERE id = ? AND is_deleted = FALSE`,
          [id]
        )
        return res.json(updated[0])
      }

      // Solo puede responder/corregir si el admin pidió corrección
      if (existing[0].estado !== 'Por Corregir') {
        return res.status(403).json({
          error: 'No se puede editar ni borrar una rendición ya enviada'
        })
      }
    } else if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Usuario normal: solo campos de corrección; vuelve a "Sin Devolución"
    if (isUser) {
      const tipo = tipo_documento || existing[0].tipo_documento
      const numRaw =
        numero_documento !== undefined
          ? numero_documento
          : existing[0].numero_documento
      const num = resolveNumeroDocumentoForTipo(tipo, numRaw)

      if (tipoRequiereNumeroDocumento(tipo) && !num) {
        return res.status(400).json({
          error: `numero_documento es obligatorio para ${tipo}`
        })
      }

      const nextOrigen = origen_pago || existing[0].origen_pago
      const nextTarjetaId =
        tarjeta_id !== undefined ? tarjeta_id : existing[0].tarjeta_id
      const tarjetaCheck = await assertTarjetaPermitePago({
        tarjetaId: nextTarjetaId,
        origenPago: nextOrigen,
        fechaDocumento: existing[0].fecha_documento
      })
      if (tarjetaCheck) {
        return res.status(tarjetaCheck.status).json({ error: tarjetaCheck.error })
      }

      await query(
        `UPDATE rendiciones_gastos
         SET tipo_documento = ?,
             numero_documento = ?,
             monto = ?,
             origen_pago = ?,
             tarjeta_id = ?,
             comprobante_url = ?,
             descripcion = ?,
             estado = 'Sin Devolución'
         WHERE id = ? AND is_deleted = FALSE`,
        [
          tipo,
          num,
          monto !== undefined ? Number(monto) : existing[0].monto,
          nextOrigen,
          nextTarjetaId,
          comprobante_url !== undefined ? comprobante_url : existing[0].comprobante_url,
          descripcion !== undefined ? descripcion : existing[0].descripcion,
          id
        ]
      )

      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'MODIFICAR',
        'Gastos',
        `Corrección de rendición ${existing[0].codigo_rinde} por usuario`
      )

      const updated = await query(
        `SELECT * FROM rendiciones_gastos WHERE id = ? AND is_deleted = FALSE`,
        [id]
      )
      return res.json(updated[0])
    }

    let arrastre = existing[0].arrastre_mes
    const fecha = fecha_documento || existing[0].fecha_documento
    if (fecha_documento) {
      arrastre = calcularArrastreMes(fecha, mesActualYYYYMM())
    }

    const tipo = tipo_documento || existing[0].tipo_documento
    const numRaw =
      numero_documento !== undefined
        ? numero_documento
        : existing[0].numero_documento
    const num = resolveNumeroDocumentoForTipo(tipo, numRaw)

    if (tipoRequiereNumeroDocumento(tipo) && !num) {
      return res.status(400).json({
        error: `numero_documento es obligatorio para ${tipo}`
      })
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
    const allowHard = canDevHardDelete(req.user)

    // Usuario normal: nunca puede borrar (ni las propias), salvo flag Dev
    if (req.user.rol === ROLES.USER_RENDIDOR && !allowHard) {
      return res.status(403).json({
        error: 'No se puede editar ni borrar una rendición ya enviada'
      })
    }
    if (!ADMINS.includes(req.user.rol) && !allowHard) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const id = Number(req.params.id)
    const existing = await query(
      `SELECT * FROM rendiciones_gastos WHERE id = ? AND is_deleted = FALSE`,
      [id]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Rendición no encontrada' })

    if (allowHard) {
      await query(`DELETE FROM rendiciones_gastos WHERE id = ?`, [id])
      await registrarAuditoria(
        req.user.id,
        req.user.nombre,
        'ELIMINAR',
        'Gastos',
        `HARD delete rendición ${existing[0].codigo_rinde}`
      )
      return res.json({ ok: true, hard: true })
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

async function findTrabajadorIdByRut(rutRaw) {
  const rut = cleanRut(rutRaw)
  if (!rut) return null
  const rows = await query(
    `SELECT id, rut, nombre_completo
     FROM trabajadores
     WHERE is_deleted = FALSE`
  )
  const match = rows.find((t) => cleanRut(t.rut) === rut)
  return match ? Number(match.id) : null
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

  // Preferir match exacto de clave_interna normalizada
  const byKey = matches.find((r) => keysMatch(r.clave_interna, cajaRaw))
  return Number((byKey || matches[0]).id)
}

async function findTarjetaIdPorUltimos4(origenPago, ultimos4) {
  const digits = String(ultimos4 || '').replace(/\D/g, '')
  if (digits.length !== 4) return null
  const tipoWanted = origenPago === 'Debito' ? 'Débito' : origenPago === 'Credito' ? 'Crédito' : null
  if (!tipoWanted) return null
  // tarjetas_empresa.tipo suele ser 'Débito'/'Crédito' o Debito/Credito
  const rows = await query(
    `SELECT id, tipo, ultimos_digitos, estado
     FROM tarjetas_empresa
     WHERE is_deleted = FALSE`
  )
  const match = rows.find((t) => {
    const tipo = String(t.tipo || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    const want = tipoWanted
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    return tipo === want && String(t.ultimos_digitos || '') === digits
  })
  return match ? Number(match.id) : null
}

/**
 * Importa gastos desde Excel. Exige todas las columnas de la plantilla.
 * Comprobante queda pendiente (se adjunta después).
 */
async function importRendicionesExcel(req, res) {
  try {
    if (!ADMINS.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Solo administradores pueden importar Excel' })
    }

    const parsed = parseExcelConHeaders(req.file?.buffer, HEADERS_GASTOS, 'Gastos')
    if (!parsed.ok) {
      return res.status(400).json({
        ok: false,
        error: parsed.error,
        faltantes: parsed.faltantes || []
      })
    }

    const creados = []
    const errores = []

    for (const row of parsed.rows) {
      const fila = row.__row
      try {
        const fecha = parseFechaToIso(row.__raw?.fecha ?? row.fecha)
        if (!fecha) throw new Error('fecha inválida (usa DD/MM/AAAA)')

        const rut = cleanRut(row.trabajador_rut)
        if (!rut) throw new Error('trabajador_rut es obligatorio')

        const cc = cellToString(row.cc)
        const caja = cellToString(row.caja)
        if (!cc) throw new Error('cc (empresa) es obligatorio')
        if (!caja) throw new Error('caja es obligatoria')

        const tipo = mapTipoDocumento(row.tipo_documento)
        if (!tipo) throw new Error('tipo_documento inválido (b/f/p/g)')

        const origen = mapOrigenPago(row.origen_pago)
        if (!origen) throw new Error('origen_pago inválido (e/d/c)')

        const monto = parseMonto(row.__raw?.monto ?? row.monto)
        if (monto == null) throw new Error('monto inválido')

        const descripcion = cellToString(row.descripcion)
        if (!descripcion) throw new Error('descripcion es obligatoria')
        if (descripcion.length > 500) throw new Error('descripcion supera 500 caracteres')

        const numeroDoc = resolveNumeroDocumentoForTipo(tipo, row.numero_documento)
        if (tipoRequiereNumeroDocumento(tipo) && !numeroDoc) {
          throw new Error(`numero_documento obligatorio para ${tipo}`)
        }

        const trabajadorId = await findTrabajadorIdByRut(rut)
        if (!trabajadorId) throw new Error(`trabajador_rut no encontrado (${row.trabajador_rut})`)

        const cajaId = await findCajaIdByCcYCaja(cc, caja)
        if (!cajaId) throw new Error(`caja/cc no encontrados (${cc} / ${caja})`)

        let tarjetaId = null
        if (origen === 'Debito' || origen === 'Credito') {
          const ult4 = normalizeTarjetaUltimos4(row.tarjeta_ultimos4)
          if (ult4.length !== 4) {
            throw new Error('tarjeta_ultimos4 obligatorio (4 dígitos) si origen es d/c')
          }
          tarjetaId = await findTarjetaIdPorUltimos4(origen, ult4)
          if (!tarjetaId) {
            throw new Error(`No hay tarjeta ${origen} con finales ${ult4}`)
          }
          const tarjetaCheck = await assertTarjetaPermitePago({
            tarjetaId,
            origenPago: origen,
            fechaDocumento: fecha
          })
          if (tarjetaCheck) throw new Error(tarjetaCheck.error)
        }

        const arrastre = calcularArrastreMes(fecha, mesActualYYYYMM())
        const maxRows = await query(
          `SELECT MAX(CAST(SUBSTRING_INDEX(codigo_rinde, '-', -1) AS UNSIGNED)) AS max_num
           FROM rendiciones_gastos`
        )
        const codigo = nextCodigo('R', Number(maxRows[0]?.max_num) || 100)

        const result = await query(
          `INSERT INTO rendiciones_gastos
            (codigo_rinde, caja_id, trabajador_id, fecha_documento, tipo_documento, numero_documento,
             monto, origen_pago, tarjeta_id, comprobante_url, descripcion, estado, arrastre_mes, es_legacy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'Sin Devolución', ?, 1)`,
          [
            codigo,
            cajaId,
            trabajadorId,
            fecha,
            tipo,
            numeroDoc,
            monto,
            origen,
            tarjetaId,
            descripcion,
            arrastre
          ]
        )

        creados.push({ fila, id: result.insertId, codigo })
      } catch (err) {
        errores.push({ fila, error: err?.message || 'Error en fila' })
      }
    }

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Gastos',
      `Import Excel: ${creados.length} ok, ${errores.length} error(es)`
    )

    return res.json({
      ok: errores.length === 0,
      creados: creados.length,
      errores,
      detalle_creados: creados
    })
  } catch (err) {
    console.error('[importRendicionesExcel]', err)
    return res.status(500).json({ error: err?.message || 'Error al importar Excel' })
  }
}

module.exports = {
  listRendiciones,
  createRendicion,
  updateRendicion,
  softDeleteRendicion,
  verificarComprobanteHandler,
  importRendicionesExcel
}
