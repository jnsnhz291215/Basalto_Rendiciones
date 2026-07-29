<template>
  <div>
    <div
      v-if="visible"
      class="update-banner"
      role="status"
      aria-live="polite"
    >
      <p class="update-banner__text">
        Se han realizado cambios en el sistema.
      </p>
      <button
        type="button"
        class="update-banner__btn"
        @click="reloadPage"
      >
        Recargar Página
      </button>
    </div>
    <div v-if="visible" class="update-banner-spacer" aria-hidden="true" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getSystemVersion } from '../api/resources'

const STORAGE_KEY = 'basalto_system_version'
const POLL_MS = 45_000

const visible = ref(false)
const serverVersion = ref('')
const route = useRoute()

let pollTimer = null

function readLocalVersion() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

function writeLocalVersion(version) {
  if (version) localStorage.setItem(STORAGE_KEY, String(version))
}

function compareVersions(server, local) {
  if (!server) return false
  if (!local) return false
  const sNum = Number(server)
  const lNum = Number(local)
  if (Number.isFinite(sNum) && Number.isFinite(lNum)) {
    return sNum > lNum
  }
  return String(server) !== String(local)
}

async function checkVersion() {
  try {
    const data = await getSystemVersion()
    const version = data?.version != null ? String(data.version) : ''
    if (!version) return

    serverVersion.value = version
    const local = readLocalVersion()

    if (!local) {
      writeLocalVersion(version)
      visible.value = false
      return
    }

    if (compareVersions(version, local)) {
      visible.value = true
    }
  } catch {
    /* polling silencioso: no molestar si la API no responde */
  }
}

function reloadPage() {
  if (serverVersion.value) writeLocalVersion(serverVersion.value)
  window.location.reload()
}

function startPolling() {
  stopPolling()
  pollTimer = window.setInterval(checkVersion, POLL_MS)
}

function stopPolling() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  await checkVersion()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

watch(
  () => route.fullPath,
  () => {
    checkVersion()
  }
)
</script>
