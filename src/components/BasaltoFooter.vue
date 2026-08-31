<template>
  <footer id="basalto-footer" class="basalto-footer basalto-footer--rend">
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
/* Tema oscuro alineado al dashboard de Rendiciones */
.basalto-footer--rend {
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  background: #0f172a;
  color: #94a3b8;
  border-top: 1px solid #1e293b;
  padding: 0.55rem 1.25rem;
  font-family: var(--font, inherit);
}

.footer-compact-row {
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem 1rem;
}

.footer-compact-copy {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.3;
  color: #64748b;
}

.footer-compact-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
}

.footer-compact-status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.footer-compact-status-text {
  font-size: 0.7rem;
  font-weight: 600;
  color: #34d399;
  letter-spacing: 0.02em;
}

.status-indicator {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.status-online {
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  animation: pulse-status 2s ease-in-out infinite;
}

@keyframes pulse-status {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.footer-compact-support {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: #475569;
}

.footer-compact-support:hover {
  color: #e2e8f0;
  text-decoration-color: #94a3b8;
}

.footer-support-backdrop {
  position: fixed;
  inset: 0;
  z-index: 15000;
  background: rgba(15, 23, 42, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.footer-support-card {
  width: min(420px, 100%);
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.15rem 1.25rem 1.25rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  color: #e2e8f0;
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
  color: #f1f5f9;
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
  color: #94a3b8;
  font-size: 0.9rem;
}

.footer-support-modal p {
  margin: 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 0.92rem;
}

.footer-support-modal i {
  width: 16px;
  text-align: center;
  color: #fb923c;
}

.footer-support-modal a {
  color: #fb923c;
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
  background: #0f172a;
  border: 1px solid #334155;
  color: #94a3b8 !important;
  font-size: 0.85rem !important;
  line-height: 1.45;
}

.footer-support-modal-meta {
  margin-top: 14px !important;
  padding-top: 12px;
  border-top: 1px solid #334155;
  font-size: 0.75rem !important;
  color: #64748b !important;
  display: block !important;
}

@media (max-width: 640px) {
  .basalto-footer--rend {
    padding: 0.5rem 1rem;
  }

  .footer-compact-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
