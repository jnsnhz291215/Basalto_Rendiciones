<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <svg class="brand-logo" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
          <path
            d="M50 10 C27.9 10 10 27.9 10 50 C10 72.1 27.9 90 50 90 C72.1 90 90 72.1 90 50 C90 27.9 72.1 10 50 10 Z M50 25 C63.8 25 75 36.2 75 50 C75 63.8 63.8 75 50 75 C36.2 75 25 63.8 25 50 C25 36.2 36.2 25 50 25 Z"
            opacity="0.3"
          />
          <circle cx="50" cy="50" r="14" fill="#ea580c" />
          <path
            d="M50 0 L50 20 M50 80 L50 100 M0 50 L20 50 M80 50 L100 50"
            stroke="#ea580c"
            stroke-width="8"
            fill="none"
          />
        </svg>
        <div class="brand-copy">
          <span class="brand-title">BASALTO DRILLING</span>
          <span class="brand-subtitle">Sondajes Mineros</span>
        </div>
      </div>
      <span class="access-badge">Módulo Rendiciones</span>
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
