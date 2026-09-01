# Identidad Central — Rendiciones

Rendiciones **aún no** usa `Basaltodrilling_Central`. Login y roles siguen en `Basalto_Rendiciones.usuarios` (ENUM `rol`).

## ¿Se rompió algo?

No. `auth.controller.js` sigue consultando `usuarios` local. Central fue poblada por import; este repo no la lee.

## Cuando migres (resumen)

| Prioridad | Archivo | Cambio |
|-----------|---------|--------|
| 1 | `server/src/config/dbCentral.js` (nuevo) | Pool Central |
| 2 | `server/src/controllers/auth.controller.js` | Login contra `usuarios` Central |
| 3 | `server/src/middlewares/auth.middleware.js` | Claims + `session_version` Central |
| 4 | `server/src/controllers/admin.controller.js` | CRUD vía Central o dual-write |
| 5 | `server/src/utils/syncBidireccional.js` | Acotar cuando Central sea fuente de verdad |

Mapeo rol Central → ENUM legacy (compat front):

| Central | Rendiciones ENUM |
|---------|------------------|
| `super_admin_dev` | `SUPER_ADMIN_DEV` |
| `super_admin` | `SUPER_ADMIN` |
| `admin` | `ADMIN_CAJA` |
| `usuario` | `USER_RENDIDOR` |

**No mover** a Central: cajas, gastos, anticipos, `trabajador_cajas`.

## Sync Turnos ↔ Rend

Sigue activo entre BDs locales. Ver [SYNC_BIDIRECCIONAL_RENDICIONES_TURNOS.md](./SYNC_BIDIRECCIONAL_RENDICIONES_TURNOS.md). Central no lo reemplaza hasta Fase 2–4.

## Env (Fase 1)

```bash
CENTRAL_DB_HOST=...
CENTRAL_DB_NAME=Basaltodrilling_Central
AUTH_SOURCE=dual
JWT_SECRET=...
```

## Guía completa

Ver [Panel administrativo — CABLEADO_CENTRAL.md](../../Panel%20administrativo/docs/CABLEADO_CENTRAL.md).
