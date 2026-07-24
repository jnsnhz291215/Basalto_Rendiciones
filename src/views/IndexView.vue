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

            <!-- TEMP_AUTH_BYPASS: novalidate + inputs sin required — revertir antes de commit -->
            <form class="login-form" novalidate @submit.prevent="onLogin">
              <div class="field">
                <label for="rut">RUT</label>
                <input
                  id="rut"
                  :value="rutDisplay"
                  autocomplete="username"
                  inputmode="text"
                  placeholder="12.345.678-9"
                  @input="onRutInput"
                />
              </div>

              <div class="field">
                <label for="password">Contraseña</label>
                <input
                  id="password"
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
// TEMP_AUTH_BYPASS — revertir antes de commit
import { TEMP_AUTH_BYPASS } from '../TEMP_AUTH_BYPASS'
import { cleanRut, formatRut } from '../utils/rut'

const { user, loading, error, bootstrapped, bootstrap, login } = useAuth()

/** Solo visual (puntos + guión) */
const rutDisplay = ref('')
/** Valor limpio para API (sin puntos/guión) */
const rutClean = ref('')
const password = ref('')
const formError = ref('')

function onRutInput(event) {
  const cleaned = cleanRut(event.target.value).slice(0, 9)
  rutClean.value = cleaned
  rutDisplay.value = formatRut(cleaned)
}

onMounted(async () => {
  await bootstrap()
  if (user.value) redirectAfterLogin()
})

async function onLogin() {
  formError.value = ''
  try {
    // TEMP_AUTH_BYPASS — revertir antes de commit
    if (TEMP_AUTH_BYPASS) {
      sessionStorage.setItem('TEMP_AUTH_BYPASS_OK', '1')
    }

    const rut = rutClean.value || cleanRut(rutDisplay.value)
    await login(rut, password.value)
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
