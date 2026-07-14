# Basalto Rendiciones (Vue 3 + Vite)

App hermana de **proyecto_basalto**. Comparte la sesión JWT (cookie httpOnly `token`).

## Requisitos

1. `proyecto_basalto` corriendo en `:3000` con:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

2. Node 18+.

## Arranque

```bash
npm install
npm run dev
```

Abre http://localhost:5174 — el index permite login y muestra el usuario de `/api/auth/me`.

## SSO local

- En desarrollo, Vite hace proxy de `/api` → `http://localhost:3000`.
- La cookie queda en el host `localhost` y es visible en Inicio (:5173), Rendiciones (:5174) y proyecto_basalto (:3000).
- Perfil de UI en `localStorage` (como en proyecto_basalto); la fuente de verdad es la cookie.

## Producción (subdominios)

En el API:

```env
COOKIE_DOMAIN=.tudominio.cl
COOKIE_SAMESITE=lax
CORS_ALLOWED_ORIGINS=https://inicio.tudominio.cl,https://rendiciones.tudominio.cl
```

Y en esta app:

```env
VITE_API_BASE_URL=https://app.tudominio.cl
```
