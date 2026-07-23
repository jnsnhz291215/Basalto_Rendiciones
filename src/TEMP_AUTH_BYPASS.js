/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEMP / REVERTIR ANTES DE COMMIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bypass local para probar UI sin backend/BD.
 * Para restaurar auth real: pon `false` o elimina este archivo y los usos
 * marcados con `TEMP_AUTH_BYPASS` en:
 *   - src/composables/useAuth.js
 *   - src/router/index.js
 *   - src/views/IndexView.vue
 *   - src/views/DashboardView.vue
 *
 * Buscar en el repo: TEMP_AUTH_BYPASS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const TEMP_AUTH_BYPASS = true

export const TEMP_BYPASS_USER = {
  rut: '11.111.111-1',
  nombre: 'Juan Sanhueza',
  role: 'admin',
  // Jerarquía mock: acceso total de Super Admin - Dev
  adminNivel: 'Super Admin - Dev'
}
