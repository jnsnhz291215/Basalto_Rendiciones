<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">Basalto <span>Rendiciones</span></div>
      <nav v-if="user">
        <router-link to="/">Sesión</router-link>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuth } from './composables/useAuth'

const { user } = useAuth()
</script>
