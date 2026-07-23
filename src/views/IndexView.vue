<template>
  <section class="panel">
    <template v-if="!bootstrapped || (loading && !user)">
      <div class="panel-intro">
        <h1>Módulo de Rendiciones</h1>
        <p class="lead">Comprobando sesión…</p>
      </div>
    </template>

    <template v-else-if="user">
      <div class="panel-intro">
        <h1>Sesión activa</h1>
        <p class="lead">Ya ingresaste al módulo de rendiciones.</p>
      </div>
      <dl class="status-card">
        <div>
          <dt>Nombre</dt>
          <dd>{{ user.nombre || '—' }}</dd>
        </div>
        <div>
          <dt>RUT</dt>
          <dd>{{ user.rut || '—' }}</dd>
        </div>
        <div>
          <dt>Rol</dt>
          <dd>{{ user.role || '—' }}</dd>
        </div>
      </dl>
      <button class="btn btn-primary" type="button" :disabled="loading" @click="onLogout">
        <span>Cerrar sesión</span>
      </button>
    </template>

    <template v-else>
      <div class="panel-intro">
        <h1>Módulo de Rendiciones</h1>
        <p class="lead">Ingresa tu RUT y contraseña para acceder al sistema.</p>
      </div>

      <form class="login-form" @submit.prevent="onLogin">
        <div class="field">
          <label for="rut">RUT</label>
          <input
            id="rut"
            v-model.trim="rut"
            autocomplete="username"
            required
            placeholder="12.345.678-9"
          />
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
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
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </form>
    </template>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user, loading, error, bootstrapped, bootstrap, login, logout } = useAuth()

const rut = ref('')
const password = ref('')
const formError = ref('')

onMounted(async () => {
  await bootstrap()
  if (user.value) redirectToReturnTo()
})

async function onLogin() {
  formError.value = ''
  try {
    await login(rut.value, password.value)
    password.value = ''
    redirectToReturnTo()
  } catch (e) {
    formError.value = e.message || 'No se pudo iniciar sesión'
  }
}

async function onLogout() {
  await logout()
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

function redirectToReturnTo() {
  const returnTo = getSafeReturnTo()
  if (returnTo) window.location.href = returnTo
  else if (window.location.pathname === '/login') window.location.href = '/'
}
</script>
