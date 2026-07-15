# Basalto Rendiciones (Vue 3 + Vite)

App hermana de **proyecto_basalto**. Comparte la sesión JWT (cookie httpOnly `token`).

## Requisitos

1. Backend centralizado disponible en `https://turnos.basalto.app` con:

```env
CORS_ALLOWED_ORIGINS=https://inicio.basalto.app,https://rendiciones.basalto.app
COOKIE_DOMAIN=.basalto.app
COOKIE_SAMESITE=none
COOKIE_SECURE=true
```

2. Node 18+.

## Arranque

```bash
npm install
npm run dev
```

Abre la app — el index valida sesión y muestra el usuario de `/api/auth/me`.

## SSO

- Las llamadas van a `https://turnos.basalto.app`.
- La cookie httpOnly queda disponible para los subdominios de `basalto.app`.
- Perfil de UI en `localStorage` (como en proyecto_basalto); la fuente de verdad es la cookie.

## Producción (subdominios)

En el API:

```env
COOKIE_DOMAIN=.basalto.app
COOKIE_SAMESITE=none
COOKIE_SECURE=true
CORS_ALLOWED_ORIGINS=https://inicio.basalto.app,https://rendiciones.basalto.app
```

Y en esta app:

```env
VITE_API_BASE_URL=https://turnos.basalto.app
VITE_LOGIN_URL=https://inicio.basalto.app/login
```
