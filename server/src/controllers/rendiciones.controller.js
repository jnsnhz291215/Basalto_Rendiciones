const { query } = require('../config/db')
const ccRepo = require('../services/orgCatalog/centrosCostoRepo')
const { registrarAuditoria } = require('../utils/audit')
const {
  calcularArrastreMes,
  nextCodigo,
  mesActualYYYYMM,
  assertDentroVentanaEdicion,
  adminUpdateTocaDatosRendicion
} = require('../utils/helpers')
const { ROLES, ADMINS } = require('../middlewares/role.middleware')
const { assertTarjetaPermitePago } = require('../utils/tarjetaPago')
const { guardarYVerificarComprobante } = require('../utils/verificarComprobante')
const { canDevHardDelete, canSkipComprobanteVerify, canSkipComprobanteVerifyDev } = require('../config/devFlags')
const {
  HEADERS_GASTOS,
  parseExcelConHeaders,
  parseFechaToIso,
  parseMonto,
  cleanRut,
  normalizeTarjetaUltimos4,
  mapTipoDocumento,
  mapOrigenPago,
  cellToString,
  resolveCajaIdFromCatalog,
  tipoRequiereNumeroDocumento,
  tipoFuerzaEfectivo,
  tipoOcultaPatente,
  tipoComprobanteOpcional,
  normalizePatente
} = require('../utils/excelImport')
const { ensureImportacionesSchema } = require('../utils/ensureImportacionesSchema')
const {
  ESTADOS_FLUJO,
  getImportacionLoteById,
  isLoteConfirmado,
  assertPuedeBorrarMovimientoImportado
} = require('../utils/importacionLote')
const {
  assertNumeroDocumentoUnico,
  findGastoActivoByNumeroDocumento,
  gastosSonIdenticos,
  listarDiferenciasGasto,
  numeroDocumentoLiberado,
  snapshotParaUi,
  valorNumeroDocumentoPersistible
} = require('../utils/numeroDocumentoUnico')

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
      `SELECT c.clave_interna, c.nombre_exterior, c.centro_cobro_id
       FROM cajas_chicas c
       WHERE c.id = ? AND c.is_deleted = FALSE
       LIMIT 1`,
      [Number(caja_id)]
    )
    if (rows[0]) {
      caja = rows[0].clave_interna || rows[0].nombre_exterior || ''
      if (rows[0].centro_cobro_id) {
        const cc = await ccRepo.getCentroById(rows[0].centro_cobro_id)
        centroCobro = cc?.nombre || 'sin_cc'
      }
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
      patente,
      monto,
      origen_pago,
      tarjeta_id,
      comprobante_url,
      descripcion
    } = req.body || {}

    if (!caja_id || !fecha_documento || !tipo_documento || monto === undefined || !origen_pago) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }

    const tipoNorm = mapTipoDocumento(tipo_documento) || String(tipo_documento || '').trim()
    const origenNorm = tipoFuerzaEfectivo(tipoNorm) ? 'Efectivo' : origen_pago
    const patenteNorm = tipoOcultaPatente(tipoNorm)
      ? null
      : normalizePatente(patente) || null

    if (
      !String(comprobante_url || '').trim() &&
      !tipoComprobanteOpcional(tipoNorm)
    ) {
      return res.status(400).json({
        error: 'El comprobante es obligatorio. Ningún cobro puede guardarse sin documento.'
      })
    }

    if (!String(descripcion || '').trim()) {
      return res.status(400).json({ error: 'La descripción / observación es obligatoria.' })
    }

    const numeroDoc = valorNumeroDocumentoPersistible(tipoNorm, numero_documento)
    if (
      tipoRequiereNumeroDocumento(tipoNorm) &&
      !numeroDoc &&
      !canSkipComprobanteVerifyDev(req.user)
    ) {
      return res.status(400).json({
        error: `numero_documento es obligatorio para ${tipoNorm}`
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
      tarjetaId: tipoFuerzaEfectivo(tipoNorm) ? null : tarjeta_id,
      origenPago: origenNorm,
      fechaDocumento: fecha_documento
    })
    if (tarjetaCheck) {
      return res.status(tarjetaCheck.status).json({ error: tarjetaCheck.error })
    }

    const dup = await assertNumeroDocumentoUnico(numeroDoc)
    if (dup) {
      return res.status(dup.status).json({ error: dup.error, existente_id: dup.existente_id })
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
         patente, monto, origen_pago, tarjeta_id, comprobante_url, descripcion, estado, arrastre_mes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Sin Devolución', ?)`,
      [
        codigo,
        caja_id,
        trabajadorId,
        fecha_documento,
        tipoNorm,
        numeroDoc,
        patenteNorm,
        Number(monto),
        origenNorm,
        origenNorm === 'Efectivo' ? null : tarjeta_id || null,
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
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return res.status(400).json({
        error: 'ya existe un gasto con el mismo numero de documento, imposible guardar'
      })
    }
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
      patente,
      monto,
      origen_pago,
      tarjeta_id,
      comprobante_url,
      descripcion,
      estado
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
          `UPDATE rendiciones_gastos
           SET comprobante_url = ?
           WHERE id = ? AND is_deleted = FALSE`,
          [nuevaUrl, id]
        )
        await registrarAuditoria(
          req.user.id,
          req.user.nombre,
          'MODIFICAR',
          'Gastos',
          `Comprobante adjunto a gasto importado (lote confirmado) ${existing[0].codigo_rinde}`
        )
        const updated = await query(
          `SELECT * FROM rendiciones_gastos WHERE id = ? AND is_deleted = FALSE`,
          [id]
        )
        return res.json(updated[0])
      }
    }

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
      const num = valorNumeroDocumentoPersistible(tipo, numRaw)

      if (tipoRequiereNumeroDocumento(tipo) && !num) {
        return res.status(400).json({
          error: `numero_documento es obligatorio para ${tipo}`
        })
      }

      const dupUser = await assertNumeroDocumentoUnico(num, id)
      if (dupUser) {
        return res
          .status(dupUser.status)
          .json({ error: dupUser.error, existente_id: dupUser.existente_id })
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

    // Admin: edición de datos solo dentro de 24h desde created_at.
    // Workflow (estado / comprobante / descripción) y adjuntos de lote quedan fuera de esta regla.
    if (adminUpdateTocaDatosRendicion(req.body)) {
      const bloqueoVentana = assertDentroVentanaEdicion(existing[0].created_at, 'editar')
      if (bloqueoVentana) {
        return res.status(bloqueoVentana.status).json({ error: bloqueoVentana.error })
      }
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
    const num = valorNumeroDocumentoPersistible(tipo, numRaw)

    if (tipoRequiereNumeroDocumento(tipo) && !num) {
      return res.status(400).json({
        error: `numero_documento es obligatorio para ${tipo}`
      })
    }

    const dupAdmin = await assertNumeroDocumentoUnico(num, id)
    if (dupAdmin) {
      return res
        .status(dupAdmin.status)
        .json({ error: dupAdmin.error, existente_id: dupAdmin.existente_id })
    }

    const nextOrigen = origen_pago || existing[0].origen_pago
    const nextTarjetaId =
      nextOrigen === 'Efectivo'
        ? null
        : tarjeta_id !== undefined
          ? tarjeta_id
          : existing[0].tarjeta_id
    const nextPatente =
      patente !== undefined
        ? normalizePatente(patente) || null
        : existing[0].patente || null
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
           patente = ?,
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
        nextPatente,
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
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return res.status(400).json({
        error: 'ya existe un gasto con el mismo numero de documento, imposible guardar'
      })
    }
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

    const bloqueoLote = await assertPuedeBorrarMovimientoImportado(existing[0])
    if (bloqueoLote) {
      return res.status(bloqueoLote.status).json({ error: bloqueoLote.error })
    }

    // Soft delete: ventana 24h. Hard delete Dev (`canDevHardDelete`) la omite.
    if (!allowHard) {
      const bloqueoVentana = assertDentroVentanaEdicion(existing[0].created_at, 'eliminar')
      if (bloqueoVentana) {
        return res.status(bloqueoVentana.status).json({ error: bloqueoVentana.error })
      }
    }

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
       SET is_deleted = TRUE, deleted_at = NOW(), numero_documento = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [numeroDocumentoLiberado(existing[0].numero_documento, id), id]
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
  const rows = await query(
    `SELECT c.id, c.clave_interna, c.nombre_exterior, c.centro_cobro_id,
            COALESCE(cc.nombre, '') AS cc_nombre
     FROM cajas_chicas c
     LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id AND cc.is_deleted = FALSE
     WHERE c.is_deleted = FALSE`
  )
  return resolveCajaIdFromCatalog(rows, ccNombre, cajaClave)
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

async function enrichGastoExtras(row) {
  const extras = {
    trabajador_rut: null,
    trabajador_nombre: null,
    caja: null,
    cc: null,
    tarjeta_ultimos4: null
  }
  if (row.trabajador_id) {
    const t = await query(
      `SELECT rut, nombre_completo FROM trabajadores WHERE id = ? LIMIT 1`,
      [Number(row.trabajador_id)]
    )
    if (t[0]) {
      extras.trabajador_rut = t[0].rut || null
      extras.trabajador_nombre = t[0].nombre_completo || null
    }
  }
  if (row.caja_id) {
    const c = await query(
      `SELECT c.clave_interna, COALESCE(cc.nombre, '') AS cc_nombre
       FROM cajas_chicas c
       LEFT JOIN centros_costo cc ON cc.id = c.centro_cobro_id AND cc.is_deleted = FALSE
       WHERE c.id = ? LIMIT 1`,
      [Number(row.caja_id)]
    )
    if (c[0]) {
      extras.caja = c[0].clave_interna || null
      extras.cc = c[0].cc_nombre || null
    }
  }
  if (row.tarjeta_id) {
    const tar = await query(
      `SELECT ultimos_digitos FROM tarjetas_empresa WHERE id = ? LIMIT 1`,
      [Number(row.tarjeta_id)]
    )
    if (tar[0]) extras.tarjeta_ultimos4 = String(tar[0].ultimos_digitos || '')
  }
  return extras
}

/**
 * Importa gastos desde Excel. Exige todas las columnas de la plantilla.
 * Comprobante queda pendiente (se adjunta después).
 *
 * N° documento único:
 * - Duplicado idéntico (BD o dentro del Excel) → auto-omitido (omitidos_json)
 * - Duplicado con discrepancias → no inserta; queda en conflictos_json pendiente
 */
async function importRendicionesExcel(req, res) {
  try {
    if (!ADMINS.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Solo administradores pueden importar Excel' })
    }

    await ensureImportacionesSchema()

    const parsed = parseExcelConHeaders(req.file?.buffer, HEADERS_GASTOS, 'Gastos')
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
        (tipo, archivo_nombre, usuario_id, usuario_nombre, estado, creados, errores_count, omitidos_count)
       VALUES ('gastos', ?, ?, ?, ?, 0, 0, 0)`,
      [archivoNombre, req.user.id ?? null, req.user.nombre ?? null, ESTADOS_FLUJO.PENDIENTE]
    )
    const loteId = loteInsert.insertId

    const creados = []
    const errores = []
    const omitidos = []
    const conflictos = []
    /** @type {Map<string, { id: number, codigo: string, fila: number, payload: object }>} */
    const numerosEnLote = new Map()
    let conflictoSeq = 0

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
        if (!tipo) throw new Error('tipo_documento inválido (b/f/p/g/oc/v/op)')

        // forma_pago (plantilla nueva) o legado vía alias → valor DB origen_pago
        let origen = mapOrigenPago(row.forma_pago)
        if (tipoFuerzaEfectivo(tipo)) origen = 'Efectivo'
        if (!origen) throw new Error('forma_pago inválido (e/d/c)')

        const monto = parseMonto(row.__raw?.monto ?? row.monto)
        if (monto == null) throw new Error('monto inválido')

        const descripcion = cellToString(row.descripcion)
        if (!descripcion) throw new Error('descripcion es obligatoria')
        if (descripcion.length > 500) throw new Error('descripcion supera 500 caracteres')

        const numeroDoc = valorNumeroDocumentoPersistible(tipo, row.numero_documento)
        if (tipoRequiereNumeroDocumento(tipo) && !numeroDoc) {
          throw new Error(`numero_documento obligatorio para ${tipo}`)
        }

        // patente: no aplica en Viático; opcional en el resto
        const patente = tipoOcultaPatente(tipo)
          ? null
          : normalizePatente(row.patente) || null

        const trabajadorId = await findTrabajadorIdByRut(rut)
        if (!trabajadorId) throw new Error(`trabajador_rut no encontrado (${row.trabajador_rut})`)

        const cajaId = await findCajaIdByCcYCaja(cc, caja)
        if (!cajaId) throw new Error(`caja/cc no encontrados (${cc} / ${caja})`)

        let tarjetaId = null
        let tarjetaUltimos4 = null
        if (origen === 'Efectivo') {
          tarjetaId = null
        } else if (origen === 'Debito' || origen === 'Credito') {
          const ult4 = normalizeTarjetaUltimos4(row.tarjeta_ultimos4)
          if (ult4.length !== 4) {
            throw new Error('tarjeta_ultimos4 obligatorio (4 dígitos) si forma_pago es d/c')
          }
          tarjetaUltimos4 = ult4
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

        const payload = {
          caja_id: cajaId,
          trabajador_id: trabajadorId,
          fecha_documento: fecha,
          tipo_documento: tipo,
          numero_documento: numeroDoc,
          patente,
          monto,
          origen_pago: origen,
          tarjeta_id: tarjetaId,
          descripcion
        }

        const uiExtras = {
          trabajador_rut: rut,
          caja,
          cc,
          tarjeta_ultimos4: tarjetaUltimos4
        }

        // Conflicto N° documento (BD o fila previa del mismo Excel)
        if (numeroDoc) {
          const enLote = numerosEnLote.get(numeroDoc)
          const enBd = enLote
            ? null
            : await findGastoActivoByNumeroDocumento(numeroDoc)

          if (enLote || enBd) {
            const existenteRow = enLote
              ? { ...enLote.payload, id: enLote.id, codigo_rinde: enLote.codigo }
              : enBd
            const identico = gastosSonIdenticos(existenteRow, payload)

            if (identico) {
              omitidos.push({
                fila,
                motivo: 'duplicado_identico',
                numero_documento: numeroDoc,
                existente_id: Number(existenteRow.id),
                existente_codigo: existenteRow.codigo_rinde || null,
                origen: enLote ? 'excel' : 'bd',
                mensaje:
                  'Duplicado idéntico (mismo N° documento y mismos datos relevantes): omitido'
              })
              continue
            }

            let existenteExtras = uiExtras
            if (!enLote && enBd) {
              existenteExtras = await enrichGastoExtras(enBd)
            } else if (enLote) {
              existenteExtras = {
                trabajador_rut: enLote.payload._rut || null,
                caja: enLote.payload._caja || null,
                cc: enLote.payload._cc || null,
                tarjeta_ultimos4: enLote.payload._tarjeta_ultimos4 || null
              }
            }

            conflictoSeq += 1
            const diferencias = listarDiferenciasGasto(existenteRow, payload)
            conflictos.push({
              id: `c${conflictoSeq}`,
              fila,
              tipo: 'discrepancia',
              estado: 'pendiente',
              numero_documento: numeroDoc,
              origen: enLote ? 'excel' : 'bd',
              existente_id: Number(existenteRow.id),
              diferencias,
              existente: snapshotParaUi(existenteRow, existenteExtras),
              importado: snapshotParaUi(
                { ...payload, numero_documento: numeroDoc },
                uiExtras
              ),
              payload
            })
            continue
          }
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
             patente, monto, origen_pago, tarjeta_id, comprobante_url, descripcion, estado,
             arrastre_mes, es_legacy, importacion_lote_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'Sin Devolución', ?, 1, ?)`,
          [
            codigo,
            cajaId,
            trabajadorId,
            fecha,
            tipo,
            numeroDoc,
            patente,
            monto,
            origen,
            tarjetaId,
            descripcion,
            arrastre,
            loteId
          ]
        )

        creados.push({ fila, id: result.insertId, codigo })
        if (numeroDoc) {
          numerosEnLote.set(numeroDoc, {
            id: result.insertId,
            codigo,
            fila,
            payload: {
              ...payload,
              id: result.insertId,
              codigo_rinde: codigo,
              _rut: rut,
              _caja: caja,
              _cc: cc,
              _tarjeta_ultimos4: tarjetaUltimos4
            }
          })
        }
      } catch (err) {
        errores.push({ fila, error: err?.message || 'Error en fila' })
      }
    }

    await query(
      `UPDATE importaciones_lotes
       SET estado = ?, creados = ?, errores_count = ?, omitidos_count = ?,
           errores_json = ?, detalle_creados_json = ?,
           conflictos_json = ?, omitidos_json = ?
       WHERE id = ?`,
      [
        ESTADOS_FLUJO.PENDIENTE,
        creados.length,
        errores.length,
        omitidos.length,
        JSON.stringify(errores),
        JSON.stringify(creados),
        JSON.stringify(conflictos),
        JSON.stringify(omitidos),
        loteId
      ]
    )

    await registrarAuditoria(
      req.user.id,
      req.user.nombre,
      'CREAR',
      'Gastos',
      `Import Excel lote=${loteId}: ${creados.length} ok, ${omitidos.length} omitido(s), ` +
        `${conflictos.length} conflicto(s), ${errores.length} error(es)`
    )

    return res.json({
      ok: errores.length === 0 && conflictos.length === 0,
      lote_id: loteId,
      estado: ESTADOS_FLUJO.PENDIENTE,
      creados: creados.length,
      omitidos: omitidos.length,
      conflictos: conflictos.length,
      errores,
      detalle_creados: creados,
      detalle_omitidos: omitidos,
      detalle_conflictos: conflictos
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
