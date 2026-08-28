<template>
  <div v-if="isLoading" class="loading-spinner-overlay" role="status" aria-live="polite">
    <div class="loading-spinner-content">
      <div class="spinner-ring" />
      <p class="spinner-message">Cargando…</p>
    </div>
  </div>
</template>

<script setup>
import { useUi } from '../composables/useUi'

const { isLoading } = useUi()
</script>

<style scoped>
.loading-spinner-overlay {
  position: fixed;
  inset: 0;
  z-index: 12500;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}

.loading-spinner-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: #1e293b;
  border-radius: 12px;
  border: 1px solid #334155;
  color: #f1f5f9;
}

.spinner-ring {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #475569;
  border-top-color: #ea580c;
  animation: spin 0.8s linear infinite;
}

.spinner-message {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
