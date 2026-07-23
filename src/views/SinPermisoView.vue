<template>
  <div class="dash" style="align-items: center; justify-content: center; padding: 2rem">
    <div class="dash-panel" style="max-width: 28rem; width: 100%">
      <div class="dash-panel-head">
        <h2>Sin permiso</h2>
      </div>
      <p style="margin: 0 0 1rem; color: #94a3b8; font-size: 0.875rem">
        Tu sesión está activa, pero tu rol no tiene permiso para entrar a esta página.
      </p>
      <router-link class="dash-btn-primary" to="/" style="display: inline-flex; text-decoration: none; text-align: center">
        Volver al inicio
      </router-link>
    </div>
  </div>
</template>
