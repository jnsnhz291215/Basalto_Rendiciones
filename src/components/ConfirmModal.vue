<template>
  <div
    v-if="confirmOpen"
    class="confirm-modal show"
    role="dialog"
    aria-modal="true"
    @click.self="resolveConfirm(false)"
  >
    <div class="confirm-modal-content" @click.stop>
      <h3>{{ confirmTitle }}</h3>
      <p>{{ confirmMessage }}</p>
      <div class="confirm-modal-buttons">
        <button type="button" class="confirm-btn confirm-btn-secondary" @click="resolveConfirm(false)">
          {{ confirmCancelLabel }}
        </button>
        <button
          type="button"
          class="confirm-btn"
          :class="confirmDanger ? 'confirm-btn-danger' : 'confirm-btn-primary'"
          @click="resolveConfirm(true)"
        >
          {{ confirmOkLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUi } from '../composables/useUi'

const {
  confirmOpen,
  confirmTitle,
  confirmMessage,
  confirmOkLabel,
  confirmCancelLabel,
  confirmDanger,
  resolveConfirm
} = useUi()
</script>

<style scoped>
.confirm-modal {
  position: fixed;
  inset: 0;
  z-index: 13000;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.confirm-modal-content {
  width: min(420px, 100%);
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem 1.35rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.confirm-modal-content h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.confirm-modal-content p {
  margin: 0 0 1.1rem;
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.45;
  white-space: pre-wrap;
}

.confirm-modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.confirm-btn {
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.confirm-btn-secondary {
  background: #334155;
  color: #e2e8f0;
}

.confirm-btn-primary {
  background: #ea580c;
  color: #fff;
}

.confirm-btn-danger {
  background: #dc2626;
  color: #fff;
}
</style>
