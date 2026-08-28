<template>
  <div class="toast-stack" aria-live="polite">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast-item"
      :class="`toast-${t.type}`"
      role="status"
    >
      <div class="toast-head">
        <strong>{{ t.title || titleByType(t.type) }}</strong>
        <button type="button" class="toast-close" aria-label="Cerrar" @click="dismissToast(t.id)">
          ×
        </button>
      </div>
      <div>{{ t.message }}</div>
    </div>
  </div>
</template>

<script setup>
import { useUi } from '../composables/useUi'

const { toasts, dismissToast } = useUi()

function titleByType(type) {
  if (type === 'success') return 'Listo'
  if (type === 'error') return 'Error'
  if (type === 'warning') return 'Aviso'
  return 'Info'
}
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: calc(16px + var(--rend-top-offset, 0px));
  right: 16px;
  z-index: 12000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  padding: 12px 14px;
  border-radius: 10px;
  background: #1e293b;
  color: #f1f5f9;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.35);
  border: 1px solid #334155;
  font-size: 0.875rem;
  line-height: 1.4;
}

.toast-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.toast-close {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  opacity: 0.7;
}

.toast-success {
  border-color: #059669;
  background: #064e3b;
}

.toast-error {
  border-color: #dc2626;
  background: #7f1d1d;
}

.toast-warning {
  border-color: #d97706;
  background: #78350f;
}

.toast-info {
  border-color: #2563eb;
  background: #1e3a5f;
}
</style>
