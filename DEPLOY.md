# Deploy — Basalto Rendiciones

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
- **Sync Turnos ↔ Rendiciones:**
  - Env Turnos: `TURNOS_DB_HOST`, `TURNOS_DB_PORT`, `TURNOS_DB_USER`, `TURNOS_DB_PASS`, `TURNOS_DB_NAME` (default `basalto`)
  - API: `POST /api/admin/sync-bidireccional` (Super Admin), body opcional `{ "dryRun": true }`
  - CLI: `cd server && node scripts/sync-bidireccional.js [--dry-run]`
- En producción, `CORS_ORIGIN` debería incluir `https://rendiciones.basalto.app` (además o en lugar de localhost).
- Archivos `*.ndjson` / `debug-*.ndjson` están en `.gitignore` (logs de debug).

## Probar login local

1. Arrancar API (`cd server && npm run dev`) y front (`npm run dev`).
2. Confirmar `GET http://localhost:3002/api/health` → `{ ok: true, ... }`.
3. Abrir http://localhost:5174/login e ingresar `rut` + `password` de un usuario en `usuarios` (`estado=activo`, `is_deleted=FALSE`).
4. En DevTools → Application → Local Storage debe aparecer `rendiciones_token`.
5. Requests autenticados llevan `Authorization: Bearer <token>`.
