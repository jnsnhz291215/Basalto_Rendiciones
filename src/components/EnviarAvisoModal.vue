<template>
  <div v-if="open" class="aviso-modal" role="dialog" aria-modal="true" @click.self="close">
    <div class="aviso-modal__card" @click.stop>
      <div class="aviso-modal__head">
        <h3>Enviar aviso</h3>
        <button type="button" class="aviso-modal__close" aria-label="Cerrar" @click="close">×</button>
      </div>
      <form class="aviso-modal__form" @submit.prevent="onSubmit">
        <label>
          RUT destinatario(s)
          <input
            v-model="rutsRaw"
            type="text"
            placeholder="132660077, 12.345.678-9"
            required
          />
          <span class="aviso-modal__hint">Separa varios RUT con coma.</span>
        </label>
        <label>
          Título
          <input v-model="titulo" type="text" maxlength="120" placeholder="Aviso" />
        </label>
        <label>
          Mensaje
          <textarea v-model="mensaje" rows="4" maxlength="500" required />
        </label>
        <p v-if="error" class="aviso-modal__error">{{ error }}</p>
        <div class="aviso-modal__actions">
          <button type="button" class="aviso-btn aviso-btn--ghost" @click="close">Cancelar</button>
          <button type="submit" class="aviso-btn" :disabled="loading">Enviar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { cleanRut } from '../utils/rut'
import { createNotificacion } from '../api/notificaciones'
import { useUi } from '../composables/useUi'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const ui = useUi()
const open = ref(false)
const rutsRaw = ref('')
const titulo = ref('Aviso')
const mensaje = ref('')
const error = ref('')
const loading = ref(false)

watch(
  () => props.modelValue,
  (v) => {
    open.value = Boolean(v)
    if (v) error.value = ''
  },
  { immediate: true }
)

function close() {
  open.value = false
  emit('update:modelValue', false)
}

async function onSubmit() {
  error.value = ''
  const ruts = String(rutsRaw.value || '')
    .split(/[,;\s]+/)
    .map((r) => cleanRut(r))
    .filter((r) => r.length >= 7)
  if (!ruts.length) {
    error.value = 'Ingresa al menos un RUT válido.'
    return
  }
  if (!mensaje.value.trim()) {
    error.value = 'Escribe un mensaje.'
    return
  }
  loading.value = true
  try {
    const data = await createNotificacion({
      ruts,
      titulo: titulo.value.trim() || 'Aviso',
      mensaje: mensaje.value.trim()
    })
    ui.showToast(`Aviso enviado (${data?.created || ruts.length})`, 'success')
    close()
    mensaje.value = ''
  } catch (e) {
    error.value = e.message || 'No se pudo enviar'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.aviso-modal {
  position: fixed;
  inset: 0;
  z-index: 14000;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.aviso-modal__card {
  width: min(440px, 100%);
  background: #1e293b;
  color: #f1f5f9;
  border-radius: 12px;
  border: 1px solid #334155;
  padding: 1.15rem;
}

.aviso-modal__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.aviso-modal__head h3 {
  margin: 0;
}

.aviso-modal__close {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 1.3rem;
  cursor: pointer;
}

.aviso-modal__form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.aviso-modal__form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #cbd5e1;
}

.aviso-modal__form input,
.aviso-modal__form textarea {
  border: 1px solid #475569;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  background: #0f172a;
  color: #f1f5f9;
  font: inherit;
}

.aviso-modal__hint {
  font-size: 0.7rem;
  font-weight: 500;
  color: #64748b;
}

.aviso-modal__error {
  margin: 0;
  color: #fca5a5;
  font-size: 0.85rem;
}

.aviso-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.aviso-btn {
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.85rem;
  font-weight: 700;
  cursor: pointer;
  background: #ea580c;
  color: #fff;
}

.aviso-btn--ghost {
  background: #334155;
  color: #e2e8f0;
}
</style>
