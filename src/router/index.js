import { createRouter, createWebHistory } from 'vue-router'
import * as authApi from '../api/auth'
import IndexView from '../views/IndexView.vue'
import SinPermisoView from '../views/SinPermisoView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'index', component: IndexView, meta: { requiresAuth: true } },
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

  try {
    const response = await authApi.fetchMe()
    const user = response?.success ? authApi.persistSessionProfile(response) : null

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
