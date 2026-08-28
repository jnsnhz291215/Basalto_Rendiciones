<template>
  <div v-if="open" class="pr-modal" role="dialog" aria-modal="true" @click.self="close">
    <div class="pr-modal__card" @click.stop>
      <div class="pr-modal__head">
        <h3>Restablecer contraseña</h3>
        <button type="button" class="pr-modal__close" aria-label="Cerrar" @click="close">×</button>
      </div>
      <p class="pr-modal__hint">
        Indica tu RUT y correo. Un administrador revisará la solicitud en el sistema
        de Turnos y te entregará una clave temporal.
      </p>
      <form class="pr-modal__form" @submit.prevent="onSubmit">
        <label>
          RUT
          <input v-model="rutDisplay" type="text" maxlength="12" placeholder="12.345.678-9" required @input="onRut" />
        </label>
        <label>
          Correo
          <input v-model="email" type="email" maxlength="120" placeholder="usuario@empresa.cl" required />
        </label>
        <!-- honeypot -->
        <input v-model="hp" type="text" class="pr-modal__hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <p v-if="error" class="pr-modal__error">{{ error }}</p>
        <p v-if="okMsg" class="pr-modal__ok">{{ okMsg }}</p>
        <div class="pr-modal__actions">
          <button type="button" class="pr-modal__btn pr-modal__btn--ghost" @click="close">Cancelar</button>
          <button type="submit" class="pr-modal__btn" :disabled="loading">
            {{ loading ? 'Enviando…' : 'Enviar solicitud' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { fromRutInput, cleanRut } from '../utils/rut'
import { solicitarResetPassword } from '../api/notificaciones'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rutDisplay = ref('')
const rutClean = ref('')
const email = ref('')
const hp = ref('')
const error = ref('')
const okMsg = ref('')
const loading = ref(false)

watch(
  () => props.modelValue,
  (v) => {
    open.value = Boolean(v)
    if (v) {
      error.value = ''
      okMsg.value = ''
    }
  },
  { immediate: true }
)

function close() {
  open.value = false
  emit('update:modelValue', false)
}

function onRut(ev) {
  const { clean, display } = fromRutInput(ev.target.value)
  rutClean.value = clean
  rutDisplay.value = display
}

async function onSubmit() {
  error.value = ''
  okMsg.value = ''
  if (hp.value) {
    okMsg.value =
      'Si los datos coinciden con una cuenta activa, un administrador revisará tu solicitud.'
    return
  }
  const rut = rutClean.value || cleanRut(rutDisplay.value)
  const mail = email.value.trim()
  if (!rut || rut.length < 7) {
    error.value = 'Ingresa un RUT válido.'
    return
  }
  if (!mail.includes('@')) {
    error.value = 'Ingresa un correo válido.'
    return
  }
  loading.value = true
  try {
    const data = await solicitarResetPassword({
      rut,
      email: mail,
      website_hp: hp.value
    })
    okMsg.value =
      data?.message ||
      'Si los datos coinciden con una cuenta activa, un administrador revisará tu solicitud.'
  } catch (e) {
    error.value = e.message || 'No se pudo enviar la solicitud'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.pr-modal {
  position: fixed;
  inset: 0;
  z-index: 14000;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.pr-modal__card {
  width: min(420px, 100%);
  background: #fff;
  color: #1e293b;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

.pr-modal__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.pr-modal__head h3 {
  margin: 0;
  font-size: 1.1rem;
}

.pr-modal__close {
  border: none;
  background: transparent;
  font-size: 1.4rem;
  cursor: pointer;
  color: #64748b;
}

.pr-modal__hint {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.4;
}

.pr-modal__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pr-modal__form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

.pr-modal__form input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  font-size: 0.9rem;
}

.pr-modal__hp {
  position: absolute;
  left: -9999px;
  opacity: 0;
  height: 0;
  width: 0;
}

.pr-modal__error {
  margin: 0;
  color: #dc2626;
  font-size: 0.85rem;
}

.pr-modal__ok {
  margin: 0;
  color: #059669;
  font-size: 0.85rem;
}

.pr-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.pr-modal__btn {
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  background: #ea580c;
  color: #fff;
}

.pr-modal__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pr-modal__btn--ghost {
  background: #e2e8f0;
  color: #334155;
}
</style>
