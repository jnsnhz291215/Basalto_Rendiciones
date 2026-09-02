<template>
  <div class="notif-bell" ref="rootEl">
    <button
      type="button"
      class="notif-bell__btn"
      :aria-expanded="open ? 'true' : 'false'"
      aria-label="Notificaciones"
      title="Notificaciones"
      @click="toggle"
    >
      <span class="notif-bell__icon" aria-hidden="true">🔔</span>
      <span v-if="count > 0" class="notif-bell__badge">{{ count > 99 ? '99+' : count }}</span>
    </button>

    <div v-if="open" class="notif-bell__panel" role="dialog" aria-label="Bandeja de notificaciones">
      <div class="notif-bell__head">
        <strong>Notificaciones</strong>
        <button type="button" class="notif-bell__link" @click="onMarkAll">Marcar leídas</button>
      </div>
      <div v-if="loading" class="notif-bell__empty">Cargando…</div>
      <div v-else-if="!items.length" class="notif-bell__empty">Sin notificaciones</div>
      <ul v-else class="notif-bell__list">
        <li v-for="item in items" :key="item.id" :class="{ 'is-unread': !item.leida }">
          <div class="notif-bell__item-title">{{ item.titulo }}</div>
          <p class="notif-bell__item-msg">{{ item.mensaje }}</p>
          <div class="notif-bell__item-meta">{{ item.created_at || '' }}</div>
          <button
            v-if="item.notif_id && !item.leida"
            type="button"
            class="notif-bell__link"
            @click="onMarkOne(item)"
          >
            Marcar leída
          </button>
        </li>
      </ul>
      <div v-if="isSuper" class="notif-bell__foot">
        <button type="button" class="notif-bell__link" @click="onEnviarAviso">Enviar aviso</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useUi } from '../composables/useUi'
import {
  fetchNotificacionesCount,
  fetchNotificacionesInbox,
  markAllNotificacionesLeidas,
  markNotificacionLeida,
} from '../api/notificaciones'

const emit = defineEmits(['enviar'])

const { user } = useAuth()
const ui = useUi()

const open = ref(false)
const loading = ref(false)
const items = ref([])
const count = ref(0)
const rootEl = ref(null)
let pollTimer = null
let baselineIds = null

const isSuper = computed(() => {
  const r = user.value?.rol || ''
  return r === 'SUPER_ADMIN' || r === 'SUPER_ADMIN_DEV'
})

async function refresh() {
  if (!user.value) {
    items.value = []
    count.value = 0
    return
  }
  try {
    const [list, c] = await Promise.all([
      fetchNotificacionesInbox(40),
      fetchNotificacionesCount()
    ])
    const prev = baselineIds
    items.value = list
    count.value = c
    const ids = new Set(list.filter((i) => !i.leida).map((i) => i.id))
    if (prev && !open.value) {
      const news = list.filter((i) => !i.leida && !prev.has(i.id)).slice(0, 3)
      for (const n of news) {
        ui.showToast(n.mensaje || n.titulo, 'info', n.titulo || 'Aviso')
      }
    }
    baselineIds = ids
  } catch (err) {
    console.error('[notif-bell]', err)
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) void refresh()
}

async function onMarkAll() {
  try {
    await markAllNotificacionesLeidas()
    await refresh()
  } catch (e) {
    ui.showErrorToast('Error', e)
  }
}

async function onMarkOne(item) {
  if (!item.notif_id) return
  try {
    await markNotificacionLeida(item.notif_id)
    await refresh()
  } catch (e) {
    ui.showErrorToast('Error', e)
  }
}

function onEnviarAviso() {
  open.value = false
  emit('enviar')
}

function onDocClick(ev) {
  if (!open.value) return
  const el = rootEl.value
  if (el && !el.contains(ev.target)) open.value = false
}

function startPoll() {
  stopPoll()
  if (!user.value) return
  pollTimer = window.setInterval(() => void refresh(), 20_000)
}

function stopPoll() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(
  () => (user.value ? user.value.rut || user.value.id : null),
  (ok) => {
    if (ok) {
      void refresh()
      startPoll()
    } else {
      stopPoll()
      items.value = []
      count.value = 0
      baselineIds = null
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  stopPoll()
  document.removeEventListener('click', onDocClick)
})
</script>

<style scoped>
.notif-bell {
  position: relative;
}

.notif-bell__btn {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid #334155;
  background: #0f172a;
  color: #e2e8f0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notif-bell__icon {
  font-size: 1rem;
  line-height: 1;
}

.notif-bell__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 4px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notif-bell__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: min(360px, calc(100vw - 24px));
  max-height: min(70vh, 480px);
  overflow: auto;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  z-index: 80;
  color: #f1f5f9;
}

.notif-bell__head,
.notif-bell__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid #334155;
}

.notif-bell__foot {
  border-bottom: none;
  border-top: 1px solid #334155;
}

.notif-bell__link {
  border: none;
  background: transparent;
  color: #fb923c;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0;
}

.notif-bell__empty {
  padding: 1.25rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
}

.notif-bell__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notif-bell__list li {
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid #334155;
}

.notif-bell__list li.is-unread {
  background: rgba(234, 88, 12, 0.08);
}

.notif-bell__item-title {
  font-weight: 700;
  font-size: 0.85rem;
}

.notif-bell__item-msg {
  margin: 0.25rem 0;
  font-size: 0.8rem;
  color: #cbd5e1;
  line-height: 1.4;
}

.notif-bell__item-meta {
  font-size: 0.7rem;
  color: #64748b;
}

.notif-bell__actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.notif-bell__action {
  border: 1px solid #475569;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.notif-bell__action--ok {
  background: #ea580c;
  border-color: #ea580c;
  color: #fff;
}
</style>
