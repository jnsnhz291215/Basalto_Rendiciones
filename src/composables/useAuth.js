import { reactive, computed } from 'vue'
import * as authApi from '../api/auth'

const state = reactive({
  user: authApi.readCachedUser(),
  loading: false,
  bootstrapped: false,
  error: ''
})

export function useAuth() {
  const user = computed(() => state.user)
  const loading = computed(() => state.loading)
  const error = computed(() => state.error)
  const bootstrapped = computed(() => state.bootstrapped)

  async function bootstrap() {
    state.loading = true
    state.error = ''
    try {
      const me = await authApi.fetchMe()
      if (me?.success && me.rut) {
        const rut = me.rut
        const nombre = me.nombre || ''
        const role = me.role || ''
        state.user = { rut, nombre, role }
        localStorage.setItem('user_rut', rut)
        if (nombre) localStorage.setItem('user_name', nombre)
        if (role) localStorage.setItem('user_role', role)
        if (me.session_version) {
          localStorage.setItem('session_version', String(me.session_version))
        }
      } else {
        authApi.clearProfile()
        state.user = null
      }
    } catch {
      authApi.clearProfile()
      state.user = null
    } finally {
      state.bootstrapped = true
      state.loading = false
    }
  }

  async function login(rut, password) {
    state.loading = true
    state.error = ''
    try {
      const data = await authApi.login(rut, password)
      state.user = {
        rut: data.rut,
        nombre: data.nombre,
        role: data.role
      }
      return data
    } catch (e) {
      state.error = e.message || 'Error al iniciar sesión'
      throw e
    } finally {
      state.loading = false
    }
  }

  async function logout() {
    state.loading = true
    try {
      await authApi.logout()
      state.user = null
    } finally {
      state.loading = false
    }
  }

  return { user, loading, error, bootstrapped, bootstrap, login, logout, state }
}
