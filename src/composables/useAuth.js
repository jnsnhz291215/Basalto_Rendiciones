import { reactive, computed } from 'vue'
import * as authApi from '../api/auth'
// TEMP_AUTH_BYPASS — solo para maquetar UI sin API; en local con server debe ser false
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
      if (TEMP_AUTH_BYPASS) {
        if (sessionStorage.getItem('TEMP_AUTH_BYPASS_OK') === '1') {
          state.user = { ...TEMP_BYPASS_USER }
          authApi.persistSessionProfile({
            user: {
              rut: TEMP_BYPASS_USER.rut,
              nombre: TEMP_BYPASS_USER.nombre,
              rol: 'SUPER_ADMIN_DEV',
              correo: ''
            }
          })
        } else {
          state.user = null
        }
        return
      }

      const me = await authApi.fetchMe()
      const user = me ? authApi.persistSessionProfile(me) : null
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
      if (TEMP_AUTH_BYPASS) {
        state.user = { ...TEMP_BYPASS_USER }
        authApi.persistSessionProfile({
          user: {
            rut: TEMP_BYPASS_USER.rut,
            nombre: TEMP_BYPASS_USER.nombre,
            rol: 'SUPER_ADMIN_DEV',
            correo: ''
          }
        })
        return state.user
      }

      const data = await authApi.login(rut, password)
      state.user = authApi.persistSessionProfile(data)
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
