<template>
  <section class="panel">
    <div class="badge">SSO · cookie JWT</div>
    <h1>{{ appName }}</h1>
    <p class="lead">
      Inicia sesión con la misma API de proyecto_basalto. La cookie httpOnly se
      comparte entre los subdominios de Basalto.
    </p>

    <template v-if="!bootstrapped || loading && !user">
      <p class="lead">Comprobando sesión…</p>
    </template>

    <template v-else-if="user">
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
        Cerrar sesión
      </button>
      <p class="hint">
        Abre la otra app Vue: la sesión debería seguir activa usando la misma cookie
        del backend centralizado.
      </p>
    </template>

    <form v-else @submit.prevent="onLogin">
      <div class="field">
        <label for="rut">RUT</label>
        <input id="rut" v-model.trim="rut" autocomplete="username" required placeholder="12.345.678-9" />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <p class="error" role="alert">{{ error || formError }}</p>
      <button class="btn btn-primary" type="submit" :disabled="loading">
        {{ loading ? 'Entrando…' : 'Iniciar sesión' }}
      </button>
      <p class="hint">
        Backend: <code>{{ apiHint }}</code>. El backend debe permitir este origen
        con CORS y credenciales.
      </p>
    </form>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { API_BASE_URL } from '../api/auth'

const appName = import.meta.env.VITE_APP_NAME || 'Basalto Rendiciones'
const apiHint = API_BASE_URL

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
