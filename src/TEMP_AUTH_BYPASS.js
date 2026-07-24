/**
 * Bypass local para maquetar UI **sin** API/BD.
 *
 * Con el server Express en `/server` y MariaDB disponibles, debe quedar en `false`
 * para probar login real (Bearer JWT).
 *
 * Usos: useAuth.js, router/index.js, IndexView.vue, DashboardView.vue
 * Buscar en el repo: TEMP_AUTH_BYPASS
 *
 * Ver también: docs/REGLAS_SISTEMA_Y_BD.md §9 y DEPLOY.md
 */
export const TEMP_AUTH_BYPASS = false

export const TEMP_BYPASS_USER = {
  rut: '11.111.111-1',
  nombre: 'Juan Sanhueza',
  role: 'admin',
  adminNivel: 'Super Admin - Dev'
}
