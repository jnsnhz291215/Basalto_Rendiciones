<template>
  <div ref="rootEl" class="app-root">
    <div class="app-chrome">
      <EmergenciaBanner />
    </div>
    <UpdateBanner />
    <div class="app-main">
      <router-view />
    </div>
    <BasaltoFooter v-if="showFooter" />
    <ToastHost />
    <ConfirmModal />
    <LoadingOverlay />
    <TempPasswordGate v-if="user" />
    <ContactConsentGate v-if="user" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import UpdateBanner from './components/UpdateBanner.vue'
import EmergenciaBanner from './components/EmergenciaBanner.vue'
import ToastHost from './components/ToastHost.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import TempPasswordGate from './components/TempPasswordGate.vue'
import ContactConsentGate from './components/ContactConsentGate.vue'
import BasaltoFooter from './components/BasaltoFooter.vue'
import { useAuth } from './composables/useAuth'
import { startSessionWatchdog } from './core/sessionWatchdog'

const { user } = useAuth()
const route = useRoute()

const showFooter = computed(() => !route.meta.hideFooter)

const CHROME_LAYOUT_EVENT = 'rendiciones:chrome-layout'

const rootEl = ref(null)
/** @type {ResizeObserver | null} */
let resizeObserver = null
/** @type {(() => void) | null} */
let stopWatchdog = null

function syncChromeHeight() {
  const root = rootEl.value
  if (!root || typeof document === 'undefined') return

  const banner = root.querySelector('.emergencia-banner')
  const updateSpacer = root.querySelector('.update-banner-spacer')
  const emH = banner ? Math.ceil(banner.getBoundingClientRect().height) : 0
  const upH = updateSpacer ? Math.ceil(updateSpacer.getBoundingClientRect().height) : 0

  document.documentElement.style.setProperty('--rend-emergencia-banner-height', `${Math.max(0, emH)}px`)
  document.documentElement.style.setProperty('--rend-update-banner-height', `${Math.max(0, upH)}px`)
  document.documentElement.style.setProperty('--rend-top-offset', `${Math.max(0, emH + upH)}px`)
}

function clearChromeHeight() {
  if (typeof document === 'undefined') return
  document.documentElement.style.removeProperty('--rend-emergencia-banner-height')
  document.documentElement.style.removeProperty('--rend-update-banner-height')
  document.documentElement.style.removeProperty('--rend-top-offset')
}

function onChromeLayout() {
  void nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => syncChromeHeight())
    })
  })
}

onMounted(() => {
  stopWatchdog = startSessionWatchdog()
  syncChromeHeight()
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    resizeObserver = new ResizeObserver(() => syncChromeHeight())
    resizeObserver.observe(rootEl.value)
  }
  window.addEventListener(CHROME_LAYOUT_EVENT, onChromeLayout)
  window.addEventListener('resize', syncChromeHeight)
})

onUnmounted(() => {
  stopWatchdog?.()
  stopWatchdog = null
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener(CHROME_LAYOUT_EVENT, onChromeLayout)
  window.removeEventListener('resize', syncChromeHeight)
  clearChromeHeight()
})
</script>

<style>
/* Sin scoped: alimenta layout global del dashboard */
.app-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.app-chrome {
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  z-index: 60;
  width: 100%;
}

.app-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.app-main > * {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
