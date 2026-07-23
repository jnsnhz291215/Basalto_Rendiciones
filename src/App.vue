<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-bar" aria-hidden="true"></span>
        <span class="brand-text">BASALTO <span>RENDICIONES</span></span>
      </div>
      <span class="access-badge">Acceso Sistema</span>
    </header>

    <main class="main">
      <router-view />
    </main>

    <footer class="footer">
      &copy; 2026 Basalto Drilling SpA
    </footer>
  </div>
</template>

<script setup>
</script>
