<template>
  <div class="app-root">
    <EmergenciaBanner />
    <UpdateBanner />
    <router-view />
  </div>
</template>

<script setup>
import UpdateBanner from './components/UpdateBanner.vue'
import EmergenciaBanner from './components/EmergenciaBanner.vue'
</script>
