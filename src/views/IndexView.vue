<template>
  <div class="shell">
    <aside class="brand-panel">
      <div class="brand-grid" aria-hidden="true"></div>
      <div class="brand-top" aria-hidden="true"></div>

      <div class="brand-hero">
        <span class="brand-pill">Módulo Operativo</span>
        <h1>Gestión de Rendiciones y Caja Chica</h1>
        <p>
          Plataforma centralizada para la digitación, control y reporte de gastos
          de faenas y anticipos a conductores.
        </p>
      </div>

      <div class="brand-footer">&copy; 2026 Basalto Drilling SpA</div>
    </aside>

    <section class="auth-panel">
      <div class="auth-logo auth-logo-end">
        <img src="/logoBASALTO.png" alt="Basalto Drilling" />
      </div>

      <div class="auth-body">
        <div class="auth-card">
          <template v-if="!bootstrapped || (loading && !user)">
            <div class="auth-intro">
              <h2>Iniciar Sesión</h2>
              <p>Comprobando sesión…</p>
            </div>
          </template>

          <template v-else>
            <div class="auth-intro">
              <h2>Iniciar Sesión</h2>
              <p>Ingresa tus credenciales para acceder al sistema.</p>
            </div>

            <form
              id="rendiciones-login-form"
              class="login-form"
              name="rendiciones-login"
              autocomplete="on"
              novalidate
              @submit.prevent="handleLogin"
            >
              <div
                class="login-mode-switch"
                role="tablist"
                aria-label="Método de inicio de sesión"
              >
                <button
                  type="button"
                  role="tab"
                  class="login-mode-btn"
                  :class="{ 'is-active': loginMode === 'rut' }"
                  :aria-selected="loginMode === 'rut'"
                  @click="setLoginMode('rut')"
                >
                  RUT
                </button>
                <button
                  type="button"
                  role="tab"
                  class="login-mode-btn"
                  :class="{ 'is-active': loginMode === 'correo' }"
                  :aria-selected="loginMode === 'correo'"
                  @click="setLoginMode('correo')"
                >
                  Correo
                </button>
              </div>

              <div class="field">
                <label for="username">{{ loginMode === 'rut' ? 'RUT' : 'Correo' }}</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  :value="identifier"
                  autocomplete="username"
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck="false"
                  :inputmode="loginMode === 'rut' ? 'text' : 'email'"
                  :placeholder="loginMode === 'rut' ? '12.345.678-9' : 'usuario@empresa.cl'"
                  @input="onIdentifierInput"
                />
              </div>

              <div class="field">
                <label for="password">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  v-model="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                />
              </div>

              <p v-if="error || formError" class="error" role="alert">{{ error || formError }}</p>

              <button class="btn btn-primary" type="submit" :disabled="loading">
                <span>{{ loading ? 'Entrando…' : 'INGRESAR AL SISTEMA' }}</span>
                <svg
                  v-if="!loading"
                  class="btn-icon"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </form>
          </template>
        </div>
      </div>

      <div class="auth-footer-mobile">&copy; 2026 Basalto Drilling SpA</div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
// TEMP_AUTH_BYPASS - revertir antes de commit
import { TEMP_AUTH_BYPASS } from '../TEMP_AUTH_BYPASS'
import { cleanRut, fromRutInput } from '../utils/rut'

const { user, loading, error, bootstrapped, bootstrap, login } = useAuth()

/** 'rut' | 'correo' */
const loginMode = ref('rut')
/** Display (RUT con puntos/guión o correo filtrado) */
const identifier = ref('')
/** RUT limpio para API (solo dígitos+K) */
const rutClean = ref('')
const password = ref('')
const formError = ref('')

/** Solo letras, números, @ y . */
function filterCorreoChars(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9@.]/g, '')
    .slice(0, 120)
}

function onIdentifierInput(event) {
  const raw = event.target.value
  if (loginMode.value === 'rut') {
    // Solo acepta 0-9/K; el display vuelve a formatear con puntos y guión
    const { clean, display } = fromRutInput(raw)
    rutClean.value = clean
    identifier.value = display
  } else {
    rutClean.value = ''
    identifier.value = filterCorreoChars(raw)
  }
}

function setLoginMode(mode) {
  if (loginMode.value === mode) return
  loginMode.value = mode
  identifier.value = ''
  rutClean.value = ''
  formError.value = ''
}

onMounted(async () => {
  await bootstrap()
  if (user.value) redirectAfterLogin()
})

async function handleLogin() {
  formError.value = ''
  const value =
    loginMode.value === 'rut'
      ? rutClean.value || cleanRut(identifier.value)
      : identifier.value.trim()
  if (!value) {
    formError.value =
      loginMode.value === 'rut' ? 'Ingresa tu RUT.' : 'Ingresa tu correo.'
    return
  }
  if (loginMode.value === 'correo' && !value.includes('@')) {
    formError.value = 'Ingresa un correo válido.'
    return
  }
  if (!password.value) {
    formError.value = 'Ingresa tu contraseña.'
    return
  }

  try {
    // TEMP_AUTH_BYPASS - revertir antes de commit
    if (TEMP_AUTH_BYPASS) {
      sessionStorage.setItem('TEMP_AUTH_BYPASS_OK', '1')
    }

    await login(value, password.value, loginMode.value)
    password.value = ''
    redirectAfterLogin()
  } catch (e) {
    formError.value = e.message || 'No se pudo iniciar sesión'
  }
}

function getSafeReturnTo() {
  const value = new URLSearchParams(window.location.search).get('returnTo')
  if (!value) return ''

  try {
    const url = new URL(value, window.location.origin)
    const allowedOrigin = url.origin === window.location.origin
    return allowedOrigin && url.href !== window.location.href ? url.toString() : ''
  } catch {
    return ''
  }
}

function redirectAfterLogin() {
  const returnTo = getSafeReturnTo()
  window.location.href = returnTo || '/'
}
</script>
