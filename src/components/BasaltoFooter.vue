<template>
  <footer id="basalto-footer" class="basalto-footer basalto-footer--compact">
    <div class="footer-compact-row">
      <p class="footer-compact-copy">© {{ year }} Basalto Drilling SpA</p>

      <div class="footer-compact-right">
        <div class="footer-compact-status" title="Estado del servidor">
          <span class="status-indicator status-online" aria-hidden="true" />
          <span class="footer-compact-status-text">Servidor Online</span>
        </div>
        <button type="button" class="footer-compact-support" @click="supportOpen = true">
          Soporte Técnico
        </button>
      </div>
    </div>

    <div
      v-if="supportOpen"
      class="footer-support-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="footer-soporte-title"
      @click.self="supportOpen = false"
    >
      <div class="footer-support-card">
        <div class="footer-support-card-head">
          <h3 id="footer-soporte-title">Soporte Técnico</h3>
          <button
            type="button"
            class="footer-support-close"
            aria-label="Cerrar"
            @click="supportOpen = false"
          >
            ×
          </button>
        </div>
        <div class="footer-support-modal">
          <p class="footer-support-modal-lead">
            Contacto para incidencias técnicas y soporte del sistema.
          </p>
          <p><strong>Juan Sanhueza</strong> – TI &amp; Sistemas</p>
          <p>
            <i class="fa-solid fa-envelope" aria-hidden="true" />
            <a href="mailto:jsanhueza@basaltodrilling.cl">jsanhueza@basaltodrilling.cl</a>
          </p>
          <p>
            <i class="fa-brands fa-whatsapp" aria-hidden="true" />
            <a href="https://wa.me/56951613693" target="_blank" rel="noopener noreferrer"
              >+569 5161 3693</a
            >
          </p>
          <p class="footer-support-modal-hours">
            Jornada de atención: lunes a viernes, de 9:00 a 13:00. Fuera de ese horario no se
            responderán consultas; quedarán para el siguiente turno.
          </p>
          <p class="footer-support-modal-meta">{{ TECH_STACK }}</p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue'

const TECH_STACK = 'Powered by Vue 3 + Express + MariaDB'
const year = ref(new Date().getFullYear())
const supportOpen = ref(false)
</script>

<style scoped>
.basalto-footer--compact {
  margin-top: auto;
  background: #f1f5f9;
  color: #475569;
  border-top: 1px solid #e2e8f0;
  padding: 12px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  box-sizing: border-box;
  flex-shrink: 0;
  width: 100%;
  position: relative;
}

.footer-compact-row {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 20px;
}

.footer-compact-copy {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: #64748b;
}

.footer-compact-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}

.footer-compact-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.footer-compact-status-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #059669;
  letter-spacing: 0.02em;
}

.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.status-online {
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45);
  animation: pulse-status 2s ease-in-out infinite;
}

@keyframes pulse-status {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
  }
}

.footer-compact-support {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: #cbd5e1;
}

.footer-compact-support:hover {
  color: #1e293b;
  text-decoration-color: #64748b;
}

.footer-support-backdrop {
  position: fixed;
  inset: 0;
  z-index: 15000;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.footer-support-card {
  width: min(420px, 100%);
  background: #fff;
  border-radius: 12px;
  padding: 1.15rem 1.25rem 1.25rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  color: #1e293b;
}

.footer-support-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.footer-support-card-head h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.footer-support-close {
  border: none;
  background: transparent;
  font-size: 1.35rem;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 0.15rem;
}

.footer-support-modal-lead {
  margin: 0 0 12px;
  color: #6b7280;
  font-size: 0.92rem;
}

.footer-support-modal p {
  margin: 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
  font-size: 0.95rem;
}

.footer-support-modal i {
  width: 16px;
  text-align: center;
  color: #2563eb;
}

.footer-support-modal a {
  color: #2563eb;
  text-decoration: none;
}

.footer-support-modal a:hover {
  text-decoration: underline;
}

.footer-support-modal-hours {
  display: block !important;
  align-items: unset;
  gap: 0;
  margin-top: 12px !important;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569 !important;
  font-size: 0.88rem !important;
  line-height: 1.45;
}

.footer-support-modal-meta {
  margin-top: 14px !important;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  font-size: 0.8rem !important;
  color: #9ca3af !important;
  display: block !important;
}

@media (max-width: 640px) {
  .basalto-footer--compact {
    padding: 12px 16px;
  }

  .footer-compact-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
