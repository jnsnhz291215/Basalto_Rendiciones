import { createRouter, createWebHistory } from 'vue-router'
import * as authApi from '../api/auth'
import IndexView from '../views/IndexView.vue'
import DashboardView from '../views/DashboardView.vue'
import SinPermisoView from '../views/SinPermisoView.vue'
// TEMP_AUTH_BYPASS — solo UI sin API; con server local debe ser false
import { TEMP_AUTH_BYPASS, TEMP_BYPASS_USER } from '../TEMP_AUTH_BYPASS'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: IndexView },
    { path: '/sin-permiso', name: 'sin-permiso', component: SinPermisoView }
  ]
})

function hasRequiredRole(userRole, requiredRole) {
  if (!requiredRole) return true
  return Array.isArray(requiredRole)
    ? requiredRole.includes(userRole)
    : userRole === requiredRole
}

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  if (TEMP_AUTH_BYPASS) {
    if (sessionStorage.getItem('TEMP_AUTH_BYPASS_OK') === '1') {
      authApi.persistSessionProfile({
        user: {
          rut: TEMP_BYPASS_USER.rut,
          nombre: TEMP_BYPASS_USER.nombre,
          rol: 'SUPER_ADMIN_DEV',
          correo: ''
        }
      })
      return true
    }
    return { path: '/login', query: { returnTo: to.fullPath } }
  }

  try {
    const response = await authApi.fetchMe()
    const user = response ? authApi.persistSessionProfile(response) : null

    if (!user) {
      authApi.clearProfile()
      return { path: '/login', query: { returnTo: to.fullPath } }
    }

    if (!hasRequiredRole(user.role, to.meta.role)) {
      return { name: 'sin-permiso' }
    }

    return true
  } catch {
    authApi.clearProfile()
    return { path: '/login', query: { returnTo: to.fullPath } }
  }
})

export default router
