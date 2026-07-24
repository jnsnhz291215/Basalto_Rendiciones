# Basalto Rendiciones (Vue 3 + Vite)

App de **Rendiciones / Caja Chica**. Auth propia vía API Express en `/server` (JWT Bearer), independiente de Turnos.

## Requisitos

1. Node 18+.
2. API local (`server/`) en el puerto **3002** con MariaDB configurada.
3. Variables (crear tú los `.env`; no van al repo):

**Raíz `.env`:**

```env
# Origen sin /api al final (el cliente agrega /api/...). Vacío = proxy Vite.
VITE_API_BASE_URL=http://localhost:3002
```

**`server/.env`:**

```env
PORT=3002
CORS_ORIGIN=http://localhost:5174
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=Basalto_Rendiciones
JWT_SECRET_RENDICIONES=
# o JWT_SECRET=  (fallback aceptado por el middleware)
```

## Arranque

```bash
# Terminal 1 — API
cd server && npm install && npm run dev

# Terminal 2 — Front
npm install && npm run dev
```

- Front: http://localhost:5174  
- Health API: http://localhost:3002/api/health  

## Auth

- Login: `POST /api/auth/login` con `{ rut, password }` (también acepta `correo`).
- Token en `localStorage` (`rendiciones_token`) y header `Authorization: Bearer …`.
- `TEMP_AUTH_BYPASS` en `src/TEMP_AUTH_BYPASS.js` debe ser `false` para login real.

Ver `DEPLOY.md` y `docs/REGLAS_SISTEMA_Y_BD.md`.
