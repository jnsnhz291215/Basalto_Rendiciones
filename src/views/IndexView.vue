<template>
  <section class="panel">
    <div class="badge">SSO · cookie JWT</div>
    <h1>{{ appName }}</h1>
    <p class="lead">
      Inicia sesión con la misma API de proyecto_basalto. La cookie httpOnly se
      comparte en localhost entre las tres apps.
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
        Abre la otra app Vue o proyecto_basalto (:3000): la sesión debería seguir activa
        (mismo host <code>localhost</code>).
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
        Backend: <code>{{ apiHint }}</code>. En proyecto_basalto configura
        <code>CORS_ALLOWED_ORIGINS</code> con este origen.
      </p>
    </form>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const appName = import.meta.env.VITE_APP_NAME || 'Basalto Rendiciones'
const apiHint = import.meta.env.VITE_API_BASE_URL || '/api → localhost:3000 (proxy)'

const { user, loading, error, bootstrapped, bootstrap, login, logout } = useAuth()

const rut = ref('')
const password = ref('')
const formError = ref('')

onMounted(() => {
  bootstrap()
})

async function onLogin() {
  formError.value = ''
  try {
    await login(rut.value, password.value)
    password.value = ''
  } catch (e) {
    formError.value = e.message || 'No se pudo iniciar sesión'
  }
}

async function onLogout() {
  await logout()
}
</script>
