<template>
  <div v-if="promptOpen" class="gate-modal" role="dialog" aria-modal="true">
    <div class="gate-modal__card">
      <h3>Cambia tu contraseña temporal</h3>
      <p>
        Debes definir una contraseña nueva.
        <template v-if="daysLeft != null">
          Te quedan <strong>{{ daysLeft }}</strong> día(s) de gracia.
        </template>
      </p>
      <form class="gate-modal__form" @submit.prevent="onSave">
        <label>
          Contraseña actual (temporal)
          <input v-model="actual" type="password" autocomplete="current-password" required />
        </label>
        <label>
          Nueva contraseña
          <input v-model="nueva" type="password" autocomplete="new-password" minlength="6" required />
        </label>
        <label>
          Confirmar nueva
          <input v-model="nueva2" type="password" autocomplete="new-password" minlength="6" required />
        </label>
        <p v-if="error" class="gate-modal__error">{{ error }}</p>
        <div class="gate-modal__actions">
          <button type="button" class="gate-btn gate-btn--ghost" @click="onDismiss">Más tarde</button>
          <button type="submit" class="gate-btn" :disabled="loading">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useUi } from '../composables/useUi'
import { updateMe } from '../api/resources'
import { dismissTempPassword } from '../api/notificaciones'
import * as authApi from '../api/auth'

const SESSION_KEY = 'rend_temp_pw_dismiss'

const { user, state: authState } = useAuth()
const ui = useUi()

const promptOpen = ref(false)
const actual = ref('')
const nueva = ref('')
const nueva2 = ref('')
const error = ref('')
const loading = ref(false)

const daysLeft = computed(() => {
  const v = user.value?.temp_password_days_left
  return v == null ? null : Number(v)
})

function dismissedKey() {
  const rut = user.value?.rut || ''
  return `${SESSION_KEY}:${rut}`
}

function syncPrompt() {
  if (!user.value?.must_change_password) {
    promptOpen.value = false
    return
  }
  if (sessionStorage.getItem(dismissedKey()) === '1') {
    promptOpen.value = false
    return
  }
  promptOpen.value = true
}

watch(
  () => [
    user.value?.must_change_password,
    user.value?.rut,
    user.value?.temp_password_grace_started_at
  ],
  () => syncPrompt(),
  { immediate: true }
)

async function onDismiss() {
  try {
    const data = await dismissTempPassword()
    if (data?.user) {
      authApi.persistSessionProfile({ user: data.user })
      authState.user = authApi.normalizeAuthUser({ user: data.user })
    }
    sessionStorage.setItem(dismissedKey(), '1')
    promptOpen.value = false
    ui.showToast('Tienes 7 días para cambiar la clave temporal.', 'warning')
  } catch (e) {
    ui.showErrorToast('Error', e)
  }
}

async function onSave() {
  error.value = ''
  if (nueva.value !== nueva2.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  if (nueva.value.length < 6) {
    error.value = 'Mínimo 6 caracteres.'
    return
  }
  loading.value = true
  try {
    const data = await updateMe({
      password_actual: actual.value,
      password_nueva: nueva.value
    })
    if (data?.user) {
      authApi.persistSessionProfile(data)
      authState.user = authApi.normalizeAuthUser(data)
    }
    sessionStorage.removeItem(dismissedKey())
    promptOpen.value = false
    ui.showToast('Contraseña actualizada', 'success')
  } catch (e) {
    error.value = e.message || 'No se pudo guardar'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.gate-modal {
  position: fixed;
  inset: 0;
  z-index: 13500;
  background: rgba(15, 23, 42, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.gate-modal__card {
  width: min(420px, 100%);
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  color: #1e293b;
}

.gate-modal__card h3 {
  margin: 0 0 0.4rem;
}

.gate-modal__card > p {
  margin: 0 0 1rem;
  color: #64748b;
  font-size: 0.875rem;
}

.gate-modal__form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.gate-modal__form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.gate-modal__form input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
}

.gate-modal__error {
  margin: 0;
  color: #dc2626;
  font-size: 0.85rem;
}

.gate-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.gate-btn {
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.85rem;
  font-weight: 700;
  cursor: pointer;
  background: #ea580c;
  color: #fff;
}

.gate-btn--ghost {
  background: #e2e8f0;
  color: #334155;
}
</style>
