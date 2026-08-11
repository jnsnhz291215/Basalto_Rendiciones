# Deploy — Basalto Rendiciones

## Flags temporales Dev (leer primero)

Flags de prueba para Super Admin Dev. **Apagarlos antes de dejar reglas de producción estrictas.**

| Flag | Front (`src/devFlags.js`) | API (`server/.env`) | Efecto |
|------|---------------------------|---------------------|--------|
| Bypass RUT `211919116` | `RUT_BYPASS_ENABLED` | `DEV_RUT_BYPASS` (`0` = off) | Acepta el RUT incompleto / sin DV antes del módulo 11 |
| Hard delete Dev | `HARD_DELETE_ENABLED` | `DEV_HARD_DELETE` (`0` = off) | `SUPER_ADMIN_DEV` puede borrar de verdad rendiciones, anticipos, cajas/CC (también con datos) |
| Bypass IA comprobante | `COMPROBANTE_VERIFY_BYPASS` | `DEV_COMPROBANTE_VERIFY_BYPASS` (`0` = off) | `SUPER_ADMIN_DEV` salta validación IA de **monto** y **N° documento** en rendición y anticipo (sigue obligatorio adjuntar archivo) |

**Restaurar comportamiento estricto**

1. Front — en `src/devFlags.js`:
   ```js
   RUT_BYPASS_ENABLED: false,
   HARD_DELETE_ENABLED: false,
   COMPROBANTE_VERIFY_BYPASS: false,
   ```
2. API — en `server/.env`:
   ```env
   DEV_RUT_BYPASS=0
   DEV_HARD_DELETE=0
   DEV_COMPROBANTE_VERIFY_BYPASS=0
   ```
3. Rebuild front + reiniciar API (ver secciones abajo).

Buscar en el repo: `DEV_FLAGS`, `devFlags.js`, `server/src/config/devFlags.js`.

---

App con **dos procesos**: front Vue/Vite (raíz) + API Express (`/server`).

Desde la carpeta del proyecto:

```bash
cd /ruta/a/Basalto_Rendiciones
```

| Capa | Carpeta | Puerto | Script |
|------|---------|--------|--------|
| Front (dev / preview) | raíz | **5174** | `npm run dev` / `npm run preview` |
| API | `server/` | **3002** | `npm run dev` / `npm start` |

Variables típicas:

- Raíz `.env`: `VITE_API_BASE_URL=http://localhost:3002` (origen **sin** `/api` al final; el cliente ya agrega `/api/...`). Alternativa en dev: vacío → proxy Vite `/api` → `:3002`.
- `server/.env`: `PORT=3002`, DB (`DB_PASS` o `DB_PASSWORD`), `JWT_SECRET_RENDICIONES` (o fallback `JWT_SECRET`), `CORS_ORIGIN=http://localhost:5174`
- Front: `TEMP_AUTH_BYPASS=false` en `src/TEMP_AUTH_BYPASS.js` para login real contra la API.

> Confirma los nombres reales de PM2 con `pm2 list`. Los de abajo son placeholders (`basalto_rendiciones` / `basalto_rendiciones_api`).

---

## Dev local (front + server)

```bash
# Terminal 1 — API
cd /ruta/a/Basalto_Rendiciones/server
npm install
npm run dev
# → http://localhost:3002  (health: /api/health)

# Terminal 2 — Front
cd /ruta/a/Basalto_Rendiciones
npm install
npm run dev
# → http://localhost:5174
```

---

## Solo rebuild + reiniciar PM2 (front)

Tras cambios de Vue / estilos:

```bash
cd /ruta/a/Basalto_Rendiciones
npm run build && pm2 restart basalto_rendiciones
```

---

## Solo reiniciar API (Express)

Tras cambios en `/server`:

```bash
cd /ruta/a/Basalto_Rendiciones/server
# npm install   # solo si cambió package.json
pm2 restart basalto_rendiciones_api
```

---

## Front + API

```bash
cd /ruta/a/Basalto_Rendiciones
npm run build
pm2 restart basalto_rendiciones
pm2 restart basalto_rendiciones_api
```

---

## Flujo completo después de un `git pull`

```bash
cd /ruta/a/Basalto_Rendiciones
git pull

# Front
npm install
npm run build
pm2 restart basalto_rendiciones

# API
cd server
npm install
pm2 restart basalto_rendiciones_api
```

Si solo cambió una capa, reinicia solo ese proceso PM2.

---

## Notas

- El front de producción es el build estático (`dist/`) servido por el proceso PM2 del front (mismo patrón que Basalto Inicio).
- La API **no** embebe el front; corre aparte en **:3002**.
- Auth: JWT Bearer (`Authorization`), no cookie de Turnos. El cliente normaliza bases que terminen en `/api` para evitar `/api/api/...`.
- Sustituye `basalto_rendiciones` / `basalto_rendiciones_api` por los nombres de `pm2 list` si difieren.
- El Dashboard ya no usa mocks: carga cajas, gastos, anticipos, admin y legacy desde la API. Sin datos en BD, las tablas se ven vacías.
- **Storage (fuera de git):** `/home/basalto/apps/Basalto_rendiciones/Rendiciones_Storage`
  - Override en `server/.env`: `STORAGE_PATH=/home/basalto/apps/Basalto_rendiciones/Rendiciones_Storage`
  - Subcarpetas: `comprobantes/`, `anticipos/`, `exports/`, `tmp/`
  - Lectura vía `GET /api/files/...`
- **IA (Gemini) — verificación de comprobantes:**
  - En `server/.env`: `GEMINI_API_KEY`, `GEMINI_ENABLED=1`, opcional `GEMINI_MODEL` / `GEMINI_MODEL_FALLBACKS`
  - Endpoint: `POST /api/rendiciones/verificar-comprobante` (multipart). Exige monto legible; en Factura también N° de documento.
  - Plantilla: `server/.env.example`
- **Sync Turnos ↔ Rendiciones:**
  - Env Turnos: `TURNOS_DB_HOST`, `TURNOS_DB_PORT`, `TURNOS_DB_USER`, `TURNOS_DB_PASS`, `TURNOS_DB_NAME` (default `basalto`)
  - API: `POST /api/admin/sync-bidireccional` (Super Admin), body opcional `{ "dryRun": true }`
  - CLI: `cd server && node scripts/sync-bidireccional.js [--dry-run]`
  - ALTER Turnos `updated_at`: en Turnos `npm run migrate:sync-updated-at` (o `server/scripts/sql/add_updated_at_turnos.sql` desde este repo).
  - Limpieza duplicados admin+trabajador (Turnos): `npm run cleanup:admin-trabajador-duplicates` / `-- --apply`.
  - `estado`/`activo` **no** se sincronizan. Altas Turnos→Rendiciones crean usuario con `estado='inactivo'`.
  - UPDATE comunes: email↔correo, password↔password_hash; trabajadores solo nombre. Conflictos: `updated_at` más reciente gana; empate → Turnos.
  - Exclusividad Turnos: admin XOR trabajador. La ficha `trabajadores` de un admin en Rendiciones **no** se copia a Turnos (solo `admin_users`).
  - **Avisos emergencia:** banner compartido. Rendiciones lee `avisos_emergencia` de Turnos vía `TURNOS_DB_*` (`GET /api/avisos/emergencia/activa`). Crear solo en Turnos.
- En producción, `CORS_ORIGIN` debería incluir `https://rendiciones.basalto.app` (además o en lugar de localhost).
- Archivos `*.ndjson` / `debug-*.ndjson` están en `.gitignore` (logs de debug).

## Probar login local

1. Arrancar API (`cd server && npm run dev`) y front (`npm run dev`).
2. Confirmar `GET http://localhost:3002/api/health` → `{ ok: true, ... }`.
3. Abrir http://localhost:5174/login e ingresar `rut` + `password` de un usuario en `usuarios` (`estado=activo`, `is_deleted=FALSE`).
4. En DevTools → Application → Local Storage debe aparecer `rendiciones_token`.
5. Requests autenticados llevan `Authorization: Bearer <token>`.
