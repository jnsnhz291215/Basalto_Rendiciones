<template>
  <div v-if="promptOpen" class="gate-modal" role="dialog" aria-modal="true">
    <div class="gate-modal__card">
      <h3>Confirma tu información de contacto</h3>
      <p>
        Necesitamos un correo válido y tu aceptación de la
        <button type="button" class="gate-link" @click="showPolicy = true">política de privacidad</button>
        para continuar.
      </p>
      <form class="gate-modal__form" @submit.prevent="onSave">
        <label>
          Correo electrónico
          <input v-model="correo" type="email" required maxlength="120" />
        </label>
        <label class="gate-check">
          <input v-model="acceptPrivacy" type="checkbox" required />
          Acepto la política de privacidad
        </label>
        <label class="gate-check">
          <input v-model="acceptEmail" type="checkbox" required />
          Confirmo que este correo es correcto y puede usarse para avisos operativos
        </label>
        <p v-if="error" class="gate-modal__error">{{ error }}</p>
        <div class="gate-modal__actions">
          <button type="submit" class="gate-btn" :disabled="loading">Guardar y continuar</button>
        </div>
      </form>
    </div>

    <div v-if="showPolicy" class="gate-modal gate-modal--nested" @click.self="showPolicy = false">
      <div class="gate-modal__card">
        <h3>Política de privacidad (resumen)</h3>
        <div class="gate-policy">
          <p>
            Basalto Drilling SpA trata tus datos de contacto (RUT, nombre, correo) para operar el
            sistema de rendiciones: autenticación, avisos operativos y soporte administrativo.
          </p>
          <p>
            No vendemos tus datos. Puedes solicitar la actualización de tu correo desde «Mi Perfil».
            El uso del sistema implica aceptar este tratamiento conforme a la normativa aplicable.
          </p>
        </div>
        <div class="gate-modal__actions">
          <button type="button" class="gate-btn" @click="showPolicy = false">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useUi } from '../composables/useUi'
import { updateMe } from '../api/resources'
import * as authApi from '../api/auth'

const SESSION_KEY = 'rend_consent_dismiss'

const { user, state: authState } = useAuth()
const ui = useUi()

const promptOpen = ref(false)
const correo = ref('')
const acceptPrivacy = ref(false)
const acceptEmail = ref(false)
const showPolicy = ref(false)
const error = ref('')
const loading = ref(false)

function needsConsent(u) {
  if (!u) return false
  if (u.must_change_password) return false
  const mail = String(u.correo || '').trim()
  if (!mail) return true
  const acceptedMail = String(u.accepted_email || '').trim().toLowerCase()
  if (!acceptedMail || acceptedMail !== mail.toLowerCase()) return true
  if (!u.accepted_privacy_at) return true
  return false
}

function dismissKey() {
  return `${SESSION_KEY}:${user.value?.rut || ''}`
}

function syncPrompt() {
  if (!user.value) {
    promptOpen.value = false
    return
  }
  if (!needsConsent(user.value)) {
    promptOpen.value = false
    return
  }
  if (sessionStorage.getItem(dismissKey()) === '1') {
    // Consent is mandatory — do not allow permanent dismiss without saving
  }
  correo.value = user.value.correo || ''
  promptOpen.value = true
}

watch(
  () => [
    user.value?.rut,
    user.value?.correo,
    user.value?.accepted_email,
    user.value?.accepted_privacy_at,
    user.value?.must_change_password
  ],
  () => syncPrompt(),
  { immediate: true }
)

async function onSave() {
  error.value = ''
  const mail = correo.value.trim()
  if (!mail.includes('@')) {
    error.value = 'Ingresa un correo válido.'
    return
  }
  if (!acceptPrivacy.value || !acceptEmail.value) {
    error.value = 'Debes aceptar ambos checks.'
    return
  }
  loading.value = true
  try {
    const data = await updateMe({
      correo: mail,
      accepted_privacy: true,
      accepted_email: true
    })
    if (data?.user) {
      authApi.persistSessionProfile(data)
      authState.user = authApi.normalizeAuthUser(data)
    }
    promptOpen.value = false
    ui.showToast('Contacto confirmado', 'success')
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
  z-index: 13400;
  background: rgba(15, 23, 42, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.gate-modal--nested {
  z-index: 13450;
  background: rgba(15, 23, 42, 0.55);
}

.gate-modal__card {
  width: min(440px, 100%);
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
  line-height: 1.45;
}

.gate-link {
  border: none;
  background: none;
  color: #ea580c;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.gate-modal__form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.gate-modal__form > label:not(.gate-check) {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.gate-modal__form input[type='email'] {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
}

.gate-check {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.82rem;
  font-weight: 500;
  color: #334155;
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

.gate-policy {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.5;
  margin-bottom: 1rem;
}
</style>
