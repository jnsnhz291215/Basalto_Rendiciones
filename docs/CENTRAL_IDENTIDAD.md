# Identidad Central — Rendiciones

Rendiciones soporta login **dual-read** (Fase 1) y dual-write de identidad (Fase 2) contra `Basaltodrilling_Central`.

## Activación

En `server/.env`:

```bash
AUTH_SOURCE=dual   # local | dual | central

CENTRAL_DB_HOST=127.0.0.1
CENTRAL_DB_PORT=3306
CENTRAL_DB_USER=...
CENTRAL_DB_PASS=...
CENTRAL_DB_NAME=Basaltodrilling_Central

JWT_SECRET=...   # mismo valor Panel + Turnos + Rendiciones
```

| `AUTH_SOURCE` | Comportamiento |
|---------------|----------------|
| `local` (default) | Solo `Basalto_Rendiciones.usuarios` — sin cambios |
| `dual` | Central primero; fallback local |
| `central` | Solo Central |

**Rollback:** `AUTH_SOURCE=local` + `pm2 restart … --update-env`.

## Archivos implementados

| Archivo | Rol |
|---------|-----|
| `server/src/config/dbCentral.js` | Pool `CENTRAL_DB_*` |
| `server/src/config/runtimeConfig.js` | `AUTH_SOURCE`, `authUsesCentral()` |
| `server/src/utils/centralAuth.js` | Login + map roles Central → ENUM legacy |
| `server/src/utils/passwordCheck.js` | bcrypt (`$2y$` compatible) |
| `server/src/utils/authLogger.js` | Prefijos `[AUTH:central\|dual\|local]` |
| `server/src/utils/centralPasswordSync.js` | Dual-write contraseñas |
| `server/src/utils/centralIdentitySync.js` | Provision, activo, perfil |
| `server/src/controllers/auth.controller.js` | Login dual + `updateMe` / dismiss temp |
| `server/src/middlewares/auth.middleware.js` | `session_version` Central si `identity_source=central` |
| `server/src/controllers/admin.controller.js` | CRUD usuarios/admins/personal → Central |
| `server/src/utils/syncBidireccional.js` | Omite sync password/email si Central activo |

## Qué lee cada BD

| Dato | Central | Local (`Basalto_Rendiciones`) |
|------|---------|-------------------------------|
| Password / activo / session | ✅ | fallback dual |
| JWT `id` | ❌ | ✅ PK `usuarios.id` (FKs cajas/gastos) |
| Rol front (ENUM) | mapeado | ✅ persistido local |
| Cajas, gastos, trabajador_cajas | ❌ | ✅ |

## Mapeo rol Central → ENUM (compat front)

| Central | Rendiciones ENUM |
|---------|------------------|
| `super_admin_dev` | `SUPER_ADMIN_DEV` |
| `super_admin` | `SUPER_ADMIN` |
| `admin` | `ADMIN_CAJA` |
| `usuario` | `USER_RENDIDOR` |

## Fase 1 — Smoke login

1. `AUTH_SOURCE=local` → sin cambios.
2. `AUTH_SOURCE=dual` + credencial Central → log `[AUTH:central] login OK`.
3. Usuario solo local → fallback OK.
4. Bump `session_version` en Central → 401 `invalid_session_version`.
5. Rollback env.

## Fase 2 — Dual-write

| Flujo | Handler |
|-------|---------|
| Cambio perfil / contraseña propia | `auth.controller.js` → `updateMe`, `dismissTempPassword` |
| CRUD usuarios admin | `createUsuario`, `updateUsuario`, `softDeleteUsuario`, `resetPasswordUsuario` |
| Personal con cuenta | `createPersonal`, `updatePersonal` |

Sync Turnos ↔ Rend: con `AUTH_SOURCE=dual|central` **no** replica password/email entre BDs locales (Central es fuente). Nombres y altas siguen sincronizándose. Ver [SYNC_BIDIRECCIONAL_RENDICIONES_TURNOS.md](./SYNC_BIDIRECCIONAL_RENDICIONES_TURNOS.md).

## Logs esperados al arrancar

```
[CENTRAL-DB] OK db=Basaltodrilling_Central
[ENV] AUTH_SOURCE=dual · central=on
```

## Guía completa

[Panel administrativo — CABLEADO_CENTRAL.md](../../Panel%20administrativo/docs/CABLEADO_CENTRAL.md)
