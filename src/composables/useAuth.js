import { reactive, computed } from 'vue'
import * as authApi from '../api/auth'
// TEMP_AUTH_BYPASS — revertir antes de commit
import { TEMP_AUTH_BYPASS, TEMP_BYPASS_USER } from '../TEMP_AUTH_BYPASS'

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
      // TEMP_AUTH_BYPASS — revertir antes de commit
      if (TEMP_AUTH_BYPASS) {
        if (sessionStorage.getItem('TEMP_AUTH_BYPASS_OK') === '1') {
          state.user = { ...TEMP_BYPASS_USER }
          authApi.persistSessionProfile({
            success: true,
            ...TEMP_BYPASS_USER,
            es_super_admin: 1
          })
        } else {
          state.user = null
        }
        return
      }

      const me = await authApi.fetchMe()
      const user = me?.success ? authApi.persistSessionProfile(me) : null
      if (user) {
        state.user = user
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
      // TEMP_AUTH_BYPASS — revertir antes de commit (no llama API/BD)
      if (TEMP_AUTH_BYPASS) {
        state.user = { ...TEMP_BYPASS_USER }
        authApi.persistSessionProfile({
          success: true,
          ...TEMP_BYPASS_USER,
          es_super_admin: 1
        })
        return state.user
      }

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
      // TEMP_AUTH_BYPASS — revertir antes de commit
      if (TEMP_AUTH_BYPASS) {
        sessionStorage.removeItem('TEMP_AUTH_BYPASS_OK')
        authApi.clearProfile()
      } else {
        await authApi.logout()
      }
    } finally {
      state.user = null
      state.loading = false
      window.location.href = authApi.LOGIN_URL
    }
  }

  return { user, loading, error, bootstrapped, bootstrap, login, logout, state }
}
