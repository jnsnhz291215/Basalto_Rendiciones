import { computed, reactive } from 'vue'
import { useApiLoading } from './useApiLoading'

let toastSeq = 0

const state = reactive({
  toasts: [],
  loadingExtra: 0,
  confirmOpen: false,
  confirmTitle: 'Confirmar',
  confirmMessage: '',
  confirmOkLabel: 'Confirmar',
  confirmCancelLabel: 'Cancelar',
  confirmDanger: false,
  _confirmResolve: null
})

/**
 * UI global (toasts, confirm, loading) sin Pinia.
 */
export function useUi() {
  const { isApiLoading } = useApiLoading()

  const isLoading = computed(() => isApiLoading.value || state.loadingExtra > 0)
  const toasts = computed(() => state.toasts)
  const confirmOpen = computed(() => state.confirmOpen)
  const confirmTitle = computed(() => state.confirmTitle)
  const confirmMessage = computed(() => state.confirmMessage)
  const confirmOkLabel = computed(() => state.confirmOkLabel)
  const confirmCancelLabel = computed(() => state.confirmCancelLabel)
  const confirmDanger = computed(() => state.confirmDanger)

  function dismissToast(id) {
    const idx = state.toasts.findIndex((t) => t.id === id)
    if (idx >= 0) state.toasts.splice(idx, 1)
  }

  function showToast(message, type = 'info', title = '') {
    const id = ++toastSeq
    state.toasts.push({ id, message: String(message || ''), type, title: String(title || '') })
    window.setTimeout(() => dismissToast(id), type === 'error' ? 7000 : 4500)
    return id
  }

  function showErrorToast(title, err) {
    const msg =
      (err && (err.message || err.error)) ||
      (typeof err === 'string' ? err : 'Ocurrió un error')
    return showToast(msg, 'error', title || 'Error')
  }

  function showLoading() {
    state.loadingExtra += 1
  }

  function hideLoading() {
    state.loadingExtra = Math.max(0, state.loadingExtra - 1)
  }

  function confirm(options = {}) {
    if (state._confirmResolve) {
      state._confirmResolve(false)
      state._confirmResolve = null
    }
    state.confirmTitle = options.title || 'Confirmar'
    state.confirmMessage = options.message || ''
    state.confirmOkLabel = options.okLabel || 'Confirmar'
    state.confirmCancelLabel = options.cancelLabel || 'Cancelar'
    state.confirmDanger = Boolean(options.danger)
    state.confirmOpen = true
    return new Promise((resolve) => {
      state._confirmResolve = resolve
    })
  }

  function resolveConfirm(ok) {
    state.confirmOpen = false
    const r = state._confirmResolve
    state._confirmResolve = null
    if (r) r(Boolean(ok))
  }

  return {
    toasts,
    isLoading,
    confirmOpen,
    confirmTitle,
    confirmMessage,
    confirmOkLabel,
    confirmCancelLabel,
    confirmDanger,
    showToast,
    showErrorToast,
    dismissToast,
    showLoading,
    hideLoading,
    confirm,
    resolveConfirm
  }
}
