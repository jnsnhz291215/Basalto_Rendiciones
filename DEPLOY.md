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

- Raíz `.env`: `VITE_API_BASE_URL=http://localhost:3002` (origen **sin** `/api` al final; el cliente ya agrega `/api/...`)
- `server/.env`: `PORT=3002`, DB, `JWT_SECRET`, `CORS_ORIGIN=http://localhost:5174`

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
- Si `VITE_API_BASE_URL` termina en `/api`, las rutas quedan duplicadas (`/api/api/...`).
- Sustituye `basalto_rendiciones` / `basalto_rendiciones_api` por los nombres de `pm2 list` si difieren.
