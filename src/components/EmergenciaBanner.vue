<template>
  <div v-if="visible" class="emergencia-banner" role="alert">
    <div
      v-for="item in items"
      :key="item.id"
      class="emergencia-banner__row"
    >
      <span class="emergencia-banner__icon" aria-hidden="true">⚠</span>
      <div class="emergencia-banner__body">
        <strong class="emergencia-banner__label">Aviso de emergencia</strong>
        <span class="emergencia-banner__msg">{{ item.mensaje }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { fetchEmergenciaActiva } from '../api/resources'
import { withSilentApi } from '../api/client'

const POLL_MS = 30_000

const { user } = useAuth()
const items = ref([])
let pollTimer = null

const visible = computed(() => Boolean(user.value) && items.value.length > 0)

async function load() {
  if (!user.value) {
    items.value = []
    return
  }
  try {
    items.value = await withSilentApi(() => fetchEmergenciaActiva())
  } catch (err) {
    console.error('[emergencia-banner]', err)
  }
}

function startPolling() {
  stopPolling()
  if (!user.value) return
  pollTimer = window.setInterval(() => {
    void load()
  }, POLL_MS)
}

function stopPolling() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(
  () => (user.value ? user.value.rut || user.value.id || true : null),
  (ok) => {
    if (ok) {
      void load()
      startPolling()
    } else {
      stopPolling()
      items.value = []
    }
  }
)

onMounted(() => {
  void load()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.emergencia-banner {
  position: relative;
  z-index: 40;
  width: 100%;
  background: #b91c1c;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.emergencia-banner__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.emergencia-banner__row:last-child {
  border-bottom: none;
}

.emergencia-banner__icon {
  flex: 0 0 auto;
  font-size: 1.15rem;
  line-height: 1;
}

.emergencia-banner__body {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  min-width: 0;
}

.emergencia-banner__label {
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  opacity: 0.95;
}

.emergencia-banner__msg {
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.35;
}
</style>
