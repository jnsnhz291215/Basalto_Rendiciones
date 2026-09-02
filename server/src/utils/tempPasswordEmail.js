'use strict'

const { sendMailViaCentral, isCentralMailConfigured } = require('./centralMailClient')

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function buildEmailHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f2f3f8;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f8;padding:36px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="background:#5754a8;padding:28px 36px;">
            <span style="font-size:20px;font-weight:800;color:#ffffff;">Basalto Drilling</span>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.82);font-size:14px;">${title}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;color:#1f2937;font-size:15px;line-height:1.75;">${bodyHtml}</td>
        </tr>
        <tr>
          <td style="background:#f2f3f8;padding:20px 36px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#6b7280;">
              Mensaje automático — Basalto Drilling (Rendiciones)
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Envía clave temporal vía Central. No lanza.
 * @returns {Promise<{ ok: boolean, email: string | null }>}
 */
async function sendTempPasswordEmail({ to, nombre, password } = {}) {
  const email = String(to || '').trim().toLowerCase()
  const clave = String(password || '').trim()
  if (!isValidEmail(email) || !clave) {
    return { ok: false, email: isValidEmail(email) ? email : null }
  }
  if (!isCentralMailConfigured()) {
    console.warn('[MAIL] CENTRAL_MAIL_* no configurado; no se envía clave temporal')
    return { ok: false, email }
  }

  const nombreSafe = String(nombre || '').trim()
  const saludo = nombreSafe ? `Hola ${escapeHtml(nombreSafe)},` : 'Hola,'
  try {
    await sendMailViaCentral({
      to: email,
      subject: 'Clave temporal de acceso — Basalto Drilling',
      html: buildEmailHtml(
        'Clave temporal de acceso',
        `<p>${saludo}</p>
         <p>Se generó una clave temporal de ingreso a <strong>Rendiciones</strong>. Úsala y cámbiala en tu primer ingreso:</p>
         <p style="margin:22px 0;text-align:center;">
           <span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;
                        border-radius:8px;padding:12px 22px;font-size:20px;letter-spacing:1px;
                        font-weight:800;color:#1f2937;font-family:ui-monospace,Menlo,Consolas,monospace;">
             ${escapeHtml(clave)}
           </span>
         </p>
         <p>Si no pediste este cambio, avisa a Administración.</p>`,
      ),
    })
    return { ok: true, email }
  } catch (err) {
    console.error('[MAIL] No se pudo enviar clave temporal:', err?.message || err)
    return { ok: false, email }
  }
}

module.exports = { sendTempPasswordEmail, isValidEmail, buildEmailHtml }
