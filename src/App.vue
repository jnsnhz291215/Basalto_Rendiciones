<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand-chip">
          <img
            class="brand-logo"
            src="/logoBASALTO.png"
            alt="Basalto Drilling"
          />
        </div>
      </div>
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
