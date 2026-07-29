import { computed, ref } from 'vue'

/** Contador de requests no-silent en vuelo (módulo compartido). */
const pendingCount = ref(0)

export function beginApiLoading() {
  pendingCount.value += 1
}

export function endApiLoading() {
  pendingCount.value = Math.max(0, pendingCount.value - 1)
}

/**
 * Estado global de loading de la API (refs/composables; sin Pinia).
 * Las llamadas con `{ silent: true }` no incrementan este contador.
 */
export function useApiLoading() {
  const isApiLoading = computed(() => pendingCount.value > 0)
  return { isApiLoading, pendingCount }
}
