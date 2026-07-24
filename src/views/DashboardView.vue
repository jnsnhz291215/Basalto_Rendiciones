<template>
  <div class="dash">
    <header class="dash-header">
      <div class="dash-brand">
        <img class="dash-logo" src="/logoBASALTO.png" alt="Basalto Drilling" />
      </div>

      <div class="dash-header-actions">
        <div class="dash-user">
          <div class="dash-avatar">{{ initials }}</div>
          <button class="dash-logout" type="button" @click="onLogout">Salir</button>
        </div>
      </div>
    </header>

    <div class="dash-body">
      <div
        v-if="sidebarOpen"
        class="dash-backdrop"
        aria-hidden="true"
        @click="closeSidebar"
      ></div>

      <aside class="dash-sidebar" :class="{ 'dash-sidebar--open': sidebarOpen }">
        <div class="dash-sidebar-top">
          <div class="dash-sidebar-menu-toggle">
            <span class="dash-sidebar-label">Menú</span>
            <button
              class="dash-menu-btn"
              type="button"
              aria-label="Abrir o cerrar menú"
              @click="toggleSidebar"
            >
              <svg class="dash-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          <div class="dash-sidebar-modules">
            <button
              type="button"
              class="dash-nav-item"
              :class="
                activeModule === 'caja' ? 'dash-nav-item--active' : 'dash-nav-item--ghost'
              "
              title="Control Caja Chica"
              @click="selectModule('caja')"
            >
              <svg class="dash-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span
                class="dash-nav-text"
                :class="{ 'dash-sidebar-text--invisible': !sidebarOpen }"
              >
                Control Caja Chica
              </span>
            </button>
          </div>
        </div>

        <div class="dash-sidebar-bottom">
          <button
            type="button"
            class="dash-nav-item"
            :class="
              activeModule === 'admin' ? 'dash-nav-item--active' : 'dash-nav-item--ghost'
            "
            title="Administración"
            @click="selectModule('admin')"
          >
            <svg
              class="dash-nav-icon"
              :class="{ 'dash-nav-icon--accent': activeModule !== 'admin' }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span
              class="dash-nav-text"
              :class="{ 'dash-sidebar-text--invisible': !sidebarOpen }"
            >
              Administración
            </span>
          </button>
        </div>
      </aside>

      <main class="dash-main">
        <p v-if="dataLoading" class="dash-banner dash-banner--info">Cargando datos…</p>
        <p v-if="dataError" class="dash-banner dash-banner--danger">{{ dataError }}</p>
        <p v-if="saveError" class="dash-banner dash-banner--danger">{{ saveError }}</p>
        <template v-if="activeModule === 'caja'">
        <section class="dash-metrics">
          <div class="dash-metrics-head">
            <div class="dash-metrics-title">
              <span class="dash-metrics-dot" aria-hidden="true"></span>
              <span>Estado de Caja y Presupuesto</span>
            </div>

            <div class="dash-metrics-controls">
              <div class="dash-caja">
                <span class="dash-caja-label">Caja:</span>
                <select v-model="cajaActiva" class="dash-caja-select">
                  <option
                    v-for="c in cajasActivasOpciones"
                    :key="c.groupKey"
                    :value="c.groupKey"
                  >
                    {{ c.label }}
                  </option>
                </select>
              </div>

              <div class="dash-caja">
                <span class="dash-caja-mes-label">Mes:</span>
                <select v-model="mesActivo" class="dash-caja-select dash-caja-select--mes">
                  <option v-for="m in mesesDisponibles" :key="m.value" :value="m.value">
                    {{ m.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="dash-metrics-inner">
            <div class="dash-metric-card">
              <div>
                <p class="dash-metric-label">Saldo en Caja</p>
                <p class="dash-metric-value dash-metric-value--ok">$ 1.450.000</p>
              </div>
              <span class="dash-chip dash-chip--ok">Disponible</span>
            </div>

            <div class="dash-metric-card">
              <div>
                <p class="dash-metric-label">Gastos Rendidos (Mes)</p>
                <p class="dash-metric-value">$ 820.500</p>
              </div>
              <span class="dash-chip">14 Doctos</span>
            </div>

            <div class="dash-metric-card">
              <div>
                <p class="dash-metric-label">Anticipos Conductores</p>
                <p class="dash-metric-value dash-metric-value--accent">$ 350.000</p>
              </div>
              <span class="dash-chip dash-chip--accent">3 Pendientes</span>
            </div>
          </div>
        </section>

        <div class="dash-tabs-bar">
          <div class="dash-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="dash-tab"
              :class="{ 'dash-tab--active': activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

      <!-- Rendición de Gastos -->
      <template v-if="activeTab === 'rendicion'">
        <div class="dash-rendicion-gestion">
          <div class="dash-cajas-toolbar">
            <div>
              <h3 class="dash-cajas-toolbar-title">Rendición de Gastos</h3>
              <p class="dash-cajas-toolbar-hint">
                Declaración y seguimiento de gastos para reembolso.
              </p>
            </div>
            <div class="dash-toolbar-actions">
              <button class="dash-btn-excel" type="button">
                <span>📥</span>
                <span>Importar Excel</span>
              </button>
              <button
                class="dash-btn-primary dash-btn-toggle-caja"
                type="button"
                @click="toggleFormGasto"
              >
                <span>{{ gastoFormOpen ? '▲' : '＋' }}</span>
                <span>{{ gastoFormOpen ? 'Ocultar Formulario' : 'Nuevo Ingreso de Gasto' }}</span>
              </button>
            </div>
          </div>

          <div
            class="dash-collapse"
            :class="{ 'dash-collapse--open': gastoFormOpen }"
          >
            <div class="dash-collapse-inner">
              <div class="dash-panel dash-gasto-form-panel dash-collapse-panel">
            <div class="dash-caja-form-head">
              <div>
                <h2 class="dash-assign-title dash-assign-title--flush">Nuevo Ingreso de Gasto</h2>
                <p class="dash-hint">
                  Ingresa los detalles del comprobante para solicitar la devolución.
                </p>
              </div>
              <button
                class="dash-modal-close"
                type="button"
                aria-label="Cerrar formulario"
                @click="closeFormGasto"
              >
                ×
              </button>
            </div>

            <form class="dash-rendicion-form" @submit.prevent="onSaveGasto">
              <div class="dash-form dash-gasto-grid-4">
                <div class="dash-field">
                  <label>Fecha</label>
                  <input v-model="gasto.fecha" type="date" />
                </div>
                <div class="dash-field">
                  <label>Trabajador</label>
                  <select
                    v-if="canIngresarPorOtros"
                    v-model="gasto.trabajadorId"
                    @change="onGastoTrabajadorChange"
                  >
                    <option value="me">{{ nombreSesion }} (Yo)</option>
                    <option
                      v-for="t in trabajadores"
                      :key="t.id"
                      :value="String(t.id)"
                    >
                      {{ t.nombre }}
                    </option>
                  </select>
                  <input
                    v-else
                    :value="gasto.trabajador"
                    type="text"
                    readonly
                    class="dash-input-locked"
                    title="Asignado automáticamente según el usuario en sesión"
                  />
                </div>
                <div class="dash-field">
                  <label>Tipo Docto</label>
                  <select v-model="gasto.tipo" @change="onGastoTipoChange">
                    <option>Boleta</option>
                    <option>Factura</option>
                    <option>Ticket Peaje</option>
                  </select>
                </div>
                <div v-if="gasto.tipo === 'Factura'" class="dash-field">
                  <label>N° Docto</label>
                  <input v-model="gasto.numero" type="text" placeholder="12345" />
                </div>
                <div class="dash-field">
                  <label>Monto Total ($)</label>
                  <input
                    v-model="gasto.monto"
                    type="number"
                    placeholder="0"
                    class="dash-input-strong"
                  />
                </div>
              </div>

              <div class="dash-form dash-gasto-grid-4 dash-form--section">
                <div class="dash-field">
                  <label>Caja / Fondo</label>
                  <select v-model="gasto.cajaGroupKey">
                    <option value="" disabled>Seleccionar caja...</option>
                    <option
                      v-for="c in cajasDisponiblesParaGasto"
                      :key="c.groupKey"
                      :value="c.groupKey"
                    >
                      {{ c.label }}
                    </option>
                  </select>
                  <p
                    v-if="!cajasDisponiblesParaGasto.length"
                    class="dash-hint dash-hint--inline"
                  >
                    Sin cajas asignadas. Un administrador debe asignarlas en Trabajadores.
                  </p>
                </div>

                <div class="dash-field">
                  <label>Origen de Pago</label>
                  <select v-model="gasto.metodoPago">
                    <option value="efectivo">Efectivo</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>

                <div class="dash-field dash-gasto-span-2">
                  <label>Adjuntar Comprobante (PDF / PNG / JPG)</label>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    class="dash-file"
                    @change="onGastoFile"
                  />
                </div>
              </div>

              <div class="dash-form--section">
                <div class="dash-desc-head">
                  <label class="dash-field-label">Descripción / Observación</label>
                  <span
                    class="dash-word-count"
                    :class="{ 'dash-word-count--over': palabrasDescripcion > 500 }"
                  >
                    {{ palabrasDescripcion }} / 500 palabras
                  </span>
                </div>
                <textarea
                  v-model="gasto.descripcion"
                  rows="3"
                  maxlength="3000"
                  placeholder="Detalle amplio del gasto..."
                  class="dash-textarea"
                ></textarea>
              </div>

              <div class="dash-caja-form-actions">
                <button class="dash-btn-secondary" type="button" @click="closeFormGasto">
                  Cancelar
                </button>
                <button class="dash-btn-primary" type="submit">
                  <span>Guardar Rendición</span>
                </button>
              </div>
            </form>
              </div>
            </div>
          </div>
        </div>

        <div class="dash-table-wrap">
          <div class="dash-panel-head dash-cajas-head">
            <div>
              <h3>Historial de Rendiciones</h3>
              <p>Seguimiento de gastos declarados y su estado de reembolso al trabajador.</p>
            </div>
            <div class="dash-historial-filters">
              <div class="dash-historial-filter">
                <label class="dash-sr-only" for="historial-caja">Caja</label>
                <select
                  id="historial-caja"
                  v-model="historialFiltroCaja"
                  class="dash-historial-select"
                >
                  <option value="">Todas las Cajas</option>
                  <option
                    v-for="c in cajasActivasOpciones"
                    :key="c.groupKey"
                    :value="c.groupKey"
                  >
                    {{ c.label }}
                  </option>
                </select>
              </div>
              <div class="dash-historial-filter">
                <label class="dash-sr-only" for="historial-mes">Mes</label>
                <select
                  id="historial-mes"
                  v-model="historialFiltroMes"
                  class="dash-historial-select dash-historial-select--mes"
                >
                  <option value="">Todos los Meses</option>
                  <option v-for="m in mesesDisponibles" :key="m.value" :value="m.value">
                    {{ m.label }}
                  </option>
                </select>
              </div>
              <div class="dash-historial-search">
                <label class="dash-sr-only" for="historial-buscar">Buscar trabajador</label>
                <input
                  id="historial-buscar"
                  v-model="historialBusqueda"
                  type="search"
                  placeholder="Buscar por trabajador..."
                  class="dash-search-input"
                />
              </div>
            </div>
          </div>

          <div v-if="historialFiltroActivo" class="dash-historial-totales">
            <div class="dash-historial-total">
              <span class="dash-historial-total-label">Total Anticipo</span>
              <span class="dash-historial-total-value">{{ formatMontoCl(totalesHistorial.anticipo) }}</span>
            </div>
            <div class="dash-historial-total">
              <span class="dash-historial-total-label">Total Gastos</span>
              <span class="dash-historial-total-value">{{ formatMontoCl(totalesHistorial.gastos) }}</span>
            </div>
            <div class="dash-historial-total">
              <span class="dash-historial-total-label">Total por Devolver</span>
              <span class="dash-historial-total-value dash-historial-total-value--accent">
                {{ formatMontoCl(totalesHistorial.porDevolver) }}
              </span>
            </div>
          </div>

          <div v-else class="dash-historial-banner">
            <div class="dash-historial-banner-label">
              <span class="dash-historial-banner-dot" aria-hidden="true"></span>
              <span>Mostrando Últimos Ingresos Generales</span>
            </div>
            <p class="dash-historial-banner-hint">
              Selecciona una caja o mes para calcular totales específicos
            </p>
          </div>

          <table class="dash-table">
            <thead>
              <tr>
                <th>Fecha Docto</th>
                <th>Subido el</th>
                <th>ID / Origen</th>
                <th>Arrastre</th>
                <th>Trabajador</th>
                <th>Pago / Docto</th>
                <th class="dash-table-right">Monto</th>
                <th class="dash-table-center">Estado Devolución</th>
                <th class="dash-table-center">Acciones (Admin)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in movimientosFiltrados"
                :key="row.rinde"
                :class="{
                  'dash-row-legacy': row.legacy,
                  'dash-row-arrastre': !!row.arrastreMes
                }"
              >
                <td class="dash-mono">{{ row.fecha }}</td>
                <td class="dash-mono dash-nowrap">{{ row.subidoEl || '—' }}</td>
                <td>
                  <span v-if="row.legacy" class="dash-badge dash-badge--legacy">Legacy</span>
                  <span v-else class="dash-rinde">{{ row.rinde }}</span>
                </td>
                <td>
                  <span
                    v-if="row.arrastreMes"
                    class="dash-badge dash-badge--arrastre"
                  >
                    Arrastre ({{ row.arrastreMes }})
                  </span>
                  <span v-else class="dash-muted">—</span>
                </td>
                <td class="dash-table-strong">{{ row.trabajador }}</td>
                <td>
                  <span>{{ row.pago }}</span>
                  <span v-if="row.docto" class="dash-subline">{{ row.docto }}</span>
                </td>
                <td class="dash-table-right dash-table-amount">{{ row.monto }}</td>
                <td class="dash-table-center">
                  <span class="dash-status" :class="row.estadoClass">{{ row.estado }}</span>
                </td>
                <td class="dash-table-center">
                  <div class="dash-actions-cell">
                    <button
                      v-if="row.estado === 'Por Corregir' && !row.legacy"
                      class="dash-btn-edit"
                      type="button"
                      @click="openModalCorregir(row)"
                    >
                      Corregir Rendición
                    </button>
                    <button
                      v-else-if="row.estado !== 'Rechazado' && !row.legacy"
                      class="dash-btn-edit"
                      type="button"
                      @click="openModalResponder(row)"
                    >
                      {{
                        row.estado === 'Devuelto' || row.estado === 'Aprobado'
                          ? 'Ver Detalle'
                          : 'Responder'
                      }}
                    </button>
                    <span v-else-if="row.legacy" class="dash-badge dash-badge--legacy">Solo lectura</span>
                    <span v-else class="dash-muted">—</span>
                    <button
                      v-if="row.estado === 'Por Corregir' && !row.legacy"
                      class="dash-btn-ghost-sm"
                      type="button"
                      title="Responder como administrador"
                      @click="openModalResponder(row)"
                    >
                      Admin
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modal Responder Admin -->
        <div
          v-if="modalResponder.open"
          class="dash-modal-backdrop"
          @click.self="closeModalResponder"
        >
          <div
            class="dash-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-responder-title"
          >
            <div class="dash-modal-head">
              <div>
                <h3 id="modal-responder-title">
                  Revisar Rendición
                  <span class="dash-rinde">{{ modalResponder.rinde }}</span>
                </h3>
                <p class="dash-hint">Evaluar comprobante y emitir resolución.</p>
              </div>
              <button class="dash-modal-close" type="button" @click="closeModalResponder">
                &times;
              </button>
            </div>

            <form class="dash-stack-form" @submit.prevent="onSaveRespuesta">
              <div class="dash-field">
                <label>Estado de Aprobación</label>
                <select v-model="modalResponder.estado">
                  <option value="aprobado">Aprobado / Conforme</option>
                  <option value="corregir">Requiere Corrección</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>

              <div v-if="modalResponder.estado === 'corregir'" class="dash-campos-corregir">
                <label class="dash-campos-corregir-title">
                  Seleccionar Campos Habilitados para Corrección:
                </label>
                <div class="dash-campos-corregir-grid">
                  <label class="dash-check">
                    <input v-model="modalResponder.campos.monto" type="checkbox" />
                    <span>Monto Total</span>
                  </label>
                  <label class="dash-check">
                    <input v-model="modalResponder.campos.comprobante" type="checkbox" />
                    <span>Comprobante / Foto</span>
                  </label>
                  <label class="dash-check">
                    <input v-model="modalResponder.campos.tipo_docto" type="checkbox" />
                    <span>Tipo de Documento</span>
                  </label>
                  <label class="dash-check">
                    <input v-model="modalResponder.campos.origen_pago" type="checkbox" />
                    <span>Origen de Pago</span>
                  </label>
                  <label class="dash-check dash-check--span2">
                    <input v-model="modalResponder.campos.descripcion" type="checkbox" />
                    <span>Descripción / Observación</span>
                  </label>
                </div>
                <p class="dash-campos-corregir-note">
                  🔒 <strong>Campos protegidos:</strong> Trabajador, N° Docto y N° Rinde
                  permanecen inmutables.
                </p>
              </div>

              <div v-if="modalResponder.estado === 'aprobado'" class="dash-field">
                <label>Comprobante de Transferencia (si se pagó)</label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  class="dash-file"
                  @change="onRespuestaFile"
                />
              </div>

              <div class="dash-modal-comment-block">
                <div class="dash-desc-head">
                  <label class="dash-field-label">
                    Comentarios
                    <span
                      class="dash-label-optional"
                      :class="{
                        'dash-label-required--amber': modalResponder.estado === 'corregir',
                        'dash-label-required--red': modalResponder.estado === 'rechazado'
                      }"
                    >
                      {{ comentarioRequeridoAdmin ? '(requerido)' : '(opcional)' }}
                    </span>
                  </label>
                  <span
                    class="dash-word-count"
                    :class="{ 'dash-word-count--over': palabrasComentarioAdmin > 500 }"
                  >
                    {{ palabrasComentarioAdmin }} / 500 palabras
                  </span>
                </div>

                <div class="dash-vis-box">
                  <span class="dash-vis-label">Visibilidad:</span>
                  <label class="dash-radio">
                    <input v-model="modalResponder.visibilidad" type="radio" value="todos" />
                    <span>Todos (Usuario)</span>
                  </label>
                  <label
                    class="dash-radio"
                    :class="{ 'dash-radio--disabled': fuerzaVisibilidadTodos }"
                  >
                    <input
                      v-model="modalResponder.visibilidad"
                      type="radio"
                      value="admin"
                      :disabled="fuerzaVisibilidadTodos"
                    />
                    <span>Solo Admin</span>
                  </label>
                </div>

                <textarea
                  v-model="modalResponder.comentario"
                  rows="3"
                  maxlength="3000"
                  placeholder="Ej: Factura ilegible, favor subir foto donde se aprecie claramente el RUT y monto..."
                  class="dash-textarea"
                  :required="comentarioRequeridoAdmin"
                ></textarea>
              </div>

              <div class="dash-modal-actions">
                <button class="dash-btn-secondary" type="button" @click="closeModalResponder">
                  Cancelar
                </button>
                <button class="dash-btn-primary" type="submit">
                  <span>Guardar Respuesta</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Modal Corrección Usuario -->
        <div
          v-if="modalCorregir.open"
          class="dash-modal-backdrop"
          @click.self="closeModalCorregir"
        >
          <div
            class="dash-modal dash-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-corregir-title"
          >
            <div class="dash-modal-head">
              <div>
                <h3 id="modal-corregir-title">
                  Corregir Rendición
                  <span class="dash-rinde">{{ modalCorregir.rinde }}</span>
                </h3>
                <p class="dash-hint">
                  Revisa la observación del administrador y vuelve a ingresar los datos
                  requeridos.
                </p>
              </div>
              <button class="dash-modal-close" type="button" @click="closeModalCorregir">
                &times;
              </button>
            </div>

            <div class="dash-obs-admin">
              <span class="dash-obs-admin-label">Observación del Administrador</span>
              <p class="dash-obs-admin-text">“{{ modalCorregir.observacionAdmin }}”</p>
            </div>

            <div class="dash-intento-prev">
              <span class="dash-intento-prev-label">
                Datos Declarados Anteriormente (Intento #{{ modalCorregir.intento }})
              </span>
              <div class="dash-intento-prev-grid">
                <div>
                  <span class="dash-intento-prev-key">Fecha:</span>
                  {{ modalCorregir.prevFecha }}
                </div>
                <div>
                  <span class="dash-intento-prev-key">Tipo:</span>
                  {{ modalCorregir.prevDocto }}
                </div>
                <div>
                  <span class="dash-intento-prev-key">Pago:</span>
                  {{ modalCorregir.prevPago }}
                </div>
                <div>
                  <span class="dash-intento-prev-key">Monto:</span>
                  <strong class="dash-table-amount">{{ modalCorregir.prevMonto }}</strong>
                </div>
              </div>
              <div class="dash-intento-prev-desc">
                <span class="dash-intento-prev-key">Descripción anterior:</span>
                {{ modalCorregir.prevDescripcion }}
              </div>
            </div>

            <div class="dash-campos-protegidos">
              <div class="dash-field">
                <label class="dash-label-locked">Trabajador 🔒</label>
                <input
                  :value="modalCorregir.trabajador"
                  type="text"
                  readonly
                  class="dash-input-locked"
                />
              </div>
              <div class="dash-field">
                <label class="dash-label-locked">N° Docto 🔒</label>
                <input
                  :value="modalCorregir.numeroLocked"
                  type="text"
                  readonly
                  class="dash-input-locked dash-mono"
                />
              </div>
              <div class="dash-field">
                <label class="dash-label-locked">N° Rinde 🔒</label>
                <input
                  :value="modalCorregir.rinde"
                  type="text"
                  readonly
                  class="dash-input-locked dash-mono"
                />
              </div>
            </div>

            <form class="dash-stack-form dash-corregir-form" @submit.prevent="onSaveCorreccion">
              <span class="dash-corregir-form-title">Nuevos Datos de Corrección</span>

              <div class="dash-form dash-form--corregir">
                <div v-if="modalCorregir.campos.tipo_docto" class="dash-field">
                  <label>Tipo Docto</label>
                  <select v-model="modalCorregir.tipo">
                    <option>Boleta</option>
                    <option>Factura</option>
                    <option>Ticket Peaje</option>
                  </select>
                </div>
                <div v-if="modalCorregir.campos.monto" class="dash-field">
                  <label>Monto Corregido ($)</label>
                  <input
                    v-model="modalCorregir.monto"
                    type="number"
                    class="dash-input-strong"
                  />
                </div>
                <div v-if="modalCorregir.campos.origen_pago" class="dash-field">
                  <label>Origen de Pago</label>
                  <select v-model="modalCorregir.metodoPago">
                    <option value="efectivo">Efectivo</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>
                <div v-if="modalCorregir.campos.comprobante" class="dash-field">
                  <label>Nuevo Comprobante</label>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    class="dash-file"
                    @change="onCorreccionFile"
                  />
                </div>
              </div>

              <div v-if="modalCorregir.campos.descripcion" class="dash-field">
                <label>Descripción / Observación</label>
                <textarea
                  v-model="modalCorregir.descripcion"
                  rows="2"
                  placeholder="Actualiza el detalle del gasto..."
                  class="dash-textarea"
                ></textarea>
              </div>

              <div class="dash-field">
                <label>Respuesta / Aclaración al Admin</label>
                <textarea
                  v-model="modalCorregir.respuesta"
                  rows="2"
                  placeholder="Ej: Subo nueva foto enfocada con el número de boleta legible..."
                  class="dash-textarea"
                ></textarea>
              </div>

              <div class="dash-modal-actions">
                <button class="dash-btn-secondary" type="button" @click="closeModalCorregir">
                  Cancelar
                </button>
                <button class="dash-btn-primary" type="submit">
                  <span>Re-enviar Rendición</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </template>

      <!-- Asignación a Conductor -->
      <div v-else-if="activeTab === 'asignacion'" class="dash-assign">
        <div class="dash-rendicion-gestion">
          <div class="dash-cajas-toolbar">
            <div>
              <h3 class="dash-cajas-toolbar-title">
                Asignación a Conductor (Anticipos / Fondos)
              </h3>
              <p class="dash-cajas-toolbar-hint">
                Registro de habilitaciones y anticipos entregados a conductores o trabajadores.
              </p>
            </div>
            <div class="dash-toolbar-actions">
              <button class="dash-btn-excel" type="button">
                <span>📥</span>
                <span>Importar Excel</span>
              </button>
              <button
                class="dash-btn-primary dash-btn-toggle-caja"
                type="button"
                @click="toggleFormAnticipo"
              >
                <span>{{ anticipoFormOpen ? '▲' : '＋' }}</span>
                <span>
                  {{ anticipoFormOpen ? 'Ocultar Formulario' : 'Registrar Anticipo / Fondo' }}
                </span>
              </button>
            </div>
          </div>

          <div
            class="dash-collapse"
            :class="{ 'dash-collapse--open': anticipoFormOpen }"
          >
            <div class="dash-collapse-inner">
              <div class="dash-panel dash-gasto-form-panel dash-collapse-panel">
            <div class="dash-caja-form-head">
              <div>
                <h2 class="dash-assign-title dash-assign-title--flush">
                  Nuevo Registro de Anticipo
                </h2>
                <p class="dash-hint">
                  Completa los datos de la asignación o fondo entregado.
                </p>
              </div>
              <button
                class="dash-modal-close"
                type="button"
                aria-label="Cerrar formulario"
                @click="closeFormAnticipo"
              >
                ×
              </button>
            </div>

            <form class="dash-anticipo-form" @submit.prevent="onSaveAsignacion">
              <div class="dash-form dash-gasto-grid-4">
                <div class="dash-field">
                  <label>Fondo Fijo / Caja</label>
                  <select v-model="asignacion.fondo">
                    <option
                      v-for="c in cajasActivasOpciones"
                      :key="c.groupKey"
                      :value="c.groupKey"
                    >
                      {{ c.label }}
                    </option>
                  </select>
                </div>
                <div class="dash-field">
                  <label>Fecha</label>
                  <input v-model="asignacion.fecha" type="date" />
                </div>
                <div class="dash-field">
                  <label>Conductor / Trabajador</label>
                  <select v-model="asignacion.conductorId">
                    <option value="">Seleccionar Conductor...</option>
                    <option v-for="t in trabajadores" :key="t.id" :value="String(t.id)">
                      {{ t.nombre }}
                    </option>
                  </select>
                </div>
                <div class="dash-field">
                  <label>N° Doc / Vale</label>
                  <input
                    v-model="asignacion.doc"
                    type="text"
                    placeholder="N° de comprobante..."
                  />
                </div>
              </div>

              <div class="dash-form dash-gasto-grid-4 dash-form--section">
                <div class="dash-field">
                  <label>Monto ($)</label>
                  <input
                    v-model="asignacion.monto"
                    type="number"
                    placeholder="0"
                    class="dash-input-strong"
                  />
                </div>
                <div class="dash-field">
                  <label>Observaciones / Motivo</label>
                  <input
                    v-model="asignacion.observaciones"
                    type="text"
                    placeholder="Motivo o faena..."
                  />
                </div>
                <div class="dash-field dash-gasto-span-2">
                  <label>Adjuntar Comprobante / Vale (opcional)</label>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    class="dash-file"
                    @change="onAsignacionFile"
                  />
                </div>
              </div>

              <div class="dash-caja-form-actions">
                <button class="dash-btn-secondary" type="button" @click="closeFormAnticipo">
                  Cancelar
                </button>
                <button class="dash-btn-primary" type="submit">
                  <span>Guardar Asignación</span>
                </button>
              </div>
            </form>
              </div>
            </div>
          </div>
        </div>

        <div class="dash-table-wrap">
          <div class="dash-panel-head dash-cajas-head">
            <div>
              <h3>Habilitaciones y Asignaciones Recientes</h3>
              <p>Listado de anticipos y fondos entregados a conductores.</p>
            </div>
            <div class="dash-historial-filters">
              <div class="dash-historial-filter">
                <label class="dash-sr-only" for="anticipo-caja">Caja</label>
                <select
                  id="anticipo-caja"
                  v-model="anticipoFiltroCaja"
                  class="dash-historial-select"
                >
                  <option value="">Todas las Cajas</option>
                  <option
                    v-for="c in cajasActivasOpciones"
                    :key="c.groupKey"
                    :value="c.groupKey"
                  >
                    {{ c.label }}
                  </option>
                </select>
              </div>
              <div class="dash-historial-filter">
                <label class="dash-sr-only" for="anticipo-mes">Mes</label>
                <select
                  id="anticipo-mes"
                  v-model="anticipoFiltroMes"
                  class="dash-historial-select dash-historial-select--mes"
                >
                  <option value="">Todos los Meses</option>
                  <option v-for="m in mesesDisponibles" :key="m.value" :value="m.value">
                    {{ m.label }}
                  </option>
                </select>
              </div>
              <div class="dash-historial-search">
                <label class="dash-sr-only" for="anticipo-buscar">Buscar conductor</label>
                <input
                  id="anticipo-buscar"
                  v-model="anticipoBusqueda"
                  type="search"
                  placeholder="Buscar por conductor..."
                  class="dash-search-input"
                />
              </div>
            </div>
          </div>

          <table class="dash-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Conductor</th>
                <th>N° Doc / Vale</th>
                <th>Observaciones</th>
                <th class="dash-table-center">Adjunto</th>
                <th class="dash-table-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in asignacionesFiltradas" :key="row.doc">
                <td class="dash-mono">{{ row.fecha }}</td>
                <td class="dash-table-strong">{{ row.conductor }}</td>
                <td>{{ row.doc }}</td>
                <td>{{ row.observaciones }}</td>
                <td class="dash-table-center">
                  <button
                    v-if="row.comprobanteNombre"
                    type="button"
                    class="dash-adjunto-btn"
                    :title="row.comprobanteNombre"
                  >
                    📄 {{ labelAdjunto(row.comprobanteNombre) }}
                  </button>
                  <span v-else class="dash-adjunto-empty">—</span>
                </td>
                <td class="dash-table-right dash-rinde">{{ row.monto }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Informes y Cartola -->
      <div v-else-if="activeTab === 'informes'" class="dash-informes">
        <div class="dash-cajas-toolbar">
          <div>
            <h3 class="dash-cajas-toolbar-title">Centro de Informes y Cartolas</h3>
            <p class="dash-cajas-toolbar-hint">
              Consolidado mensual de movimientos e importación/exportación masiva.
            </p>
          </div>
          <div class="dash-toolbar-actions">
            <button class="dash-btn-excel" type="button">
              <span>📥</span>
              <span>Importar Excel</span>
            </button>
            <button
              class="dash-btn-primary dash-btn-toggle-caja"
              type="button"
              @click="toggleFormInforme"
            >
              <span>{{ informeFormOpen ? '▲' : '＋' }}</span>
              <span>{{ informeFormOpen ? 'Ocultar Filtros' : 'Filtros de Informe' }}</span>
            </button>
          </div>
        </div>

        <div
          class="dash-collapse"
          :class="{ 'dash-collapse--open': informeFormOpen }"
        >
          <div class="dash-collapse-inner">
            <div class="dash-panel dash-gasto-form-panel dash-collapse-panel">
          <div class="dash-caja-form-head">
            <div>
              <h2 class="dash-assign-title dash-assign-title--flush">
                Configurar Generación de Informe
              </h2>
              <p class="dash-hint">La consulta es por período de mes cerrado completo.</p>
            </div>
            <button
              class="dash-modal-close"
              type="button"
              aria-label="Cerrar filtros"
              @click="closeFormInforme"
            >
              ×
            </button>
          </div>

          <form class="dash-informe-form" @submit.prevent="onAplicarFiltrosInforme">
            <div class="dash-form dash-form--three">
              <div class="dash-field">
                <label>Caja Chica</label>
                <select v-model="informe.caja">
                  <option value="">Todas las Cajas</option>
                  <option
                    v-for="c in cajasActivasOpciones"
                    :key="c.groupKey"
                    :value="c.groupKey"
                  >
                    {{ c.label }}
                  </option>
                </select>
              </div>

              <div class="dash-field">
                <label class="dash-label-accent">Mes Cerrado (1 al 31) 📅</label>
                <select v-model="informe.mes">
                  <option
                    v-for="m in mesesCerradosOpciones"
                    :key="m.value"
                    :value="m.value"
                  >
                    {{ m.label }}
                  </option>
                </select>
              </div>

              <div class="dash-field">
                <label>Trabajador / Conductor</label>
                <select v-model="informe.persona">
                  <option value="">** Todos los Trabajadores **</option>
                  <option v-for="t in trabajadores" :key="t.id" :value="t.nombre">
                    {{ t.nombre }}
                  </option>
                  <option value="Juan Pérez">Juan Pérez</option>
                </select>
              </div>
            </div>

            <div class="dash-informe-tipos">
              <div class="dash-informe-tipos-head">
                <label>Tipos de Movimiento a Incluir:</label>
                <div class="dash-informe-tipos-toggles">
                  <button
                    class="dash-link-btn"
                    type="button"
                    @click="seleccionarTodosTiposInforme(true)"
                  >
                    Seleccionar Todos
                  </button>
                  <button
                    class="dash-link-btn"
                    type="button"
                    @click="seleccionarTodosTiposInforme(false)"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              <div class="dash-informe-tipos-grid">
                <label class="dash-informe-check">
                  <input v-model="informe.tipos.apertura" type="checkbox" />
                  <span>Inyección / Fondo Fijo</span>
                </label>
                <label class="dash-informe-check">
                  <input v-model="informe.tipos.rendicion" type="checkbox" />
                  <span>Rendición (Gasto)</span>
                </label>
                <label class="dash-informe-check">
                  <input v-model="informe.tipos.anticipo" type="checkbox" />
                  <span>Anticipo / Vale</span>
                </label>
                <label class="dash-informe-check">
                  <input v-model="informe.tipos.devolucion" type="checkbox" />
                  <span>Devolución Trabajador</span>
                </label>
                <label class="dash-informe-check">
                  <input v-model="informe.tipos.sobrante" type="checkbox" />
                  <span>Devolución Sobrante</span>
                </label>
              </div>
            </div>

            <div class="dash-informe-form-actions">
              <div class="dash-toolbar-actions">
                <button class="dash-btn-secondary" type="button">
                  <span>📊</span>
                  <span>Exportar Excel</span>
                </button>
                <button class="dash-btn-pdf" type="button">
                  <span>📄</span>
                  <span>Exportar PDF</span>
                </button>
              </div>
              <div class="dash-toolbar-actions">
                <button class="dash-btn-secondary" type="button" @click="closeFormInforme">
                  Cancelar
                </button>
                <button class="dash-btn-primary" type="submit">
                  <span>Aplicar Filtros</span>
                </button>
              </div>
            </div>
          </form>
            </div>
          </div>
        </div>

        <div class="dash-panel">
          <div class="dash-informe-result-head">
            <div>
              <h3>{{ informeResultado.titulo }}</h3>
              <p>{{ informeResultado.periodo }}</p>
            </div>
            <span class="dash-informe-count">{{ informeResultado.total }}</span>
          </div>

          <div class="dash-table-scroll">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Rinde / Doc</th>
                  <th>Tipo</th>
                  <th>Detalle / Observación</th>
                  <th>Responsable</th>
                  <th class="dash-table-right">Abono</th>
                  <th class="dash-table-right">Cargo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in cartolaFiltrada" :key="row.doc + row.fecha">
                  <td class="dash-mono">{{ row.fecha }}</td>
                  <td class="dash-mono" :class="row.docClass">{{ row.doc }}</td>
                  <td>
                    <span class="dash-badge" :class="row.badgeClass">{{ row.tipo }}</span>
                  </td>
                  <td>{{ row.detalle }}</td>
                  <td>{{ row.responsable }}</td>
                  <td class="dash-table-right" :class="row.abonoClass">{{ row.abono }}</td>
                  <td class="dash-table-right" :class="row.cargoClass">{{ row.cargo }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" class="dash-table-right dash-tfoot-label">
                    Totales acumulados:
                  </td>
                  <td class="dash-table-right dash-metric-value--ok">
                    {{ cartolaTotales.abono }}
                  </td>
                  <td class="dash-table-right dash-rinde">{{ cartolaTotales.cargo }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Gestión de Cajas -->
      <div v-else-if="activeTab === 'cajas'" class="dash-cajas-gestion">
        <div class="dash-cajas-toolbar">
          <div>
            <h3 class="dash-cajas-toolbar-title">Presupuestos y Cajas Chicas</h3>
            <p class="dash-cajas-toolbar-hint">
              Listado histórico y proyección de fondos por caja.
            </p>
          </div>
          <button
            class="dash-btn-primary dash-btn-toggle-caja"
            type="button"
            @click="toggleFormCaja"
          >
            <span>{{ cajaFormOpen ? '▲' : '＋' }}</span>
            <span>{{ cajaFormOpen ? 'Ocultar Formulario' : 'Nueva Caja Chica' }}</span>
          </button>
        </div>

        <div
          class="dash-collapse"
          :class="{ 'dash-collapse--open': cajaFormOpen }"
        >
          <div class="dash-collapse-inner">
            <div
              ref="formCajaEl"
              class="dash-panel dash-caja-form-panel dash-collapse-panel"
            >
          <div class="dash-caja-form-head">
            <div>
              <h2 class="dash-assign-title dash-assign-title--flush">
                {{ cajaForm.editIndex !== null ? 'Editar Presupuesto de Caja' : 'Configuración de Caja Chica' }}
              </h2>
              <p class="dash-hint">
                Asigna la clave interna de agrupación y el presupuesto mensual.
              </p>
            </div>
            <button
              class="dash-modal-close"
              type="button"
              aria-label="Cerrar formulario"
              @click="closeFormCaja"
            >
              ×
            </button>
          </div>

          <form class="dash-caja-form" @submit.prevent="onSaveCaja">
            <div class="dash-caja-block">
              <span class="dash-caja-block-label dash-caja-block-label--accent">
                1. Identificación General
              </span>

              <div class="dash-caja-grid-2">
                <div class="dash-field">
                  <label>Nombre Visible (Exterior)</label>
                  <input
                    v-model="cajaForm.displayName"
                    type="text"
                    placeholder="Ej: caja pagos x mes julio"
                    required
                  />
                </div>

                <div class="dash-field">
                  <label class="dash-label-accent">Clave Interna (Agrupador) 🔑</label>
                  <div class="dash-stack-tight">
                    <select
                      v-model="cajaForm.groupKeySelect"
                      class="dash-mono"
                      :disabled="cajaForm.editIndex !== null"
                      @change="onGroupKeySelectChange"
                    >
                      <option value="">-- Seleccionar Grupo Existente --</option>
                      <option
                        v-for="g in gruposInternosExistentes"
                        :key="g.groupKey"
                        :value="g.groupKey"
                      >
                        {{ g.groupKey }} ({{ g.ejemploExterior }})
                      </option>
                      <option value="__NUEVO__">+ Crear Nueva Clave</option>
                    </select>
                    <input
                      v-if="cajaForm.groupKeySelect === '__NUEVO__'"
                      v-model="cajaForm.groupKeyNuevo"
                      type="text"
                      placeholder="Ej: FAENA_SUR"
                      class="dash-mono dash-input-accent-border"
                      @input="onGroupKeyNuevoInput"
                    />
                  </div>
                </div>
              </div>

              <div class="dash-caja-grid-2">
                <div class="dash-field">
                  <label>Responsable</label>
                  <select v-model="cajaForm.responsableId">
                    <option value="">Seleccionar Responsable...</option>
                    <option v-for="t in trabajadores" :key="t.id" :value="String(t.id)">
                      {{ t.nombre }}
                    </option>
                  </select>
                </div>

                <div class="dash-field">
                  <label>Centro de Costo</label>
                  <input
                    v-model="cajaForm.centroCosto"
                    type="text"
                    placeholder="Ej: CC-101 / Basalto"
                  />
                </div>
              </div>
            </div>

            <div class="dash-caja-block dash-caja-block--budget">
              <span class="dash-caja-block-label">2. Asignación Mensual</span>

              <div class="dash-caja-grid-3">
                <div class="dash-field">
                  <label>Mes</label>
                  <select v-model="cajaForm.mes" class="dash-input-strong">
                    <option v-for="m in mesesDisponibles" :key="m.value" :value="m.value">
                      {{ m.label }}
                    </option>
                  </select>
                </div>

                <div class="dash-field">
                  <label>Fondo ($)</label>
                  <input
                    v-model="cajaForm.fondoEstimado"
                    type="number"
                    placeholder="2000000"
                    class="dash-input-strong"
                  />
                </div>

                <div class="dash-field">
                  <label>Estado</label>
                  <select v-model="cajaForm.estado">
                    <option value="activa">Activa</option>
                    <option value="inactiva">Inactiva</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="dash-caja-form-actions">
              <button class="dash-btn-secondary" type="button" @click="closeFormCaja">
                Cancelar
              </button>
              <button class="dash-btn-primary" type="submit">
                <span>Guardar Presupuesto</span>
              </button>
            </div>
          </form>
            </div>
          </div>
        </div>

        <div class="dash-table-wrap dash-cajas-list">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Clave Interna</th>
                <th>Nombre Visible (Exterior)</th>
                <th>Mes</th>
                <th>CC</th>
                <th>Responsable</th>
                <th class="dash-table-right">Fondo Estimado</th>
                <th class="dash-table-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(caja, index) in cajasOrdenadas"
                :key="`${caja.groupKey}-${caja.mes}`"
                :class="{ 'dash-row-muted': caja.estado === 'inactiva' }"
              >
                <td class="dash-mono dash-rinde">{{ caja.groupKey }}</td>
                <td class="dash-table-strong">{{ caja.displayName }}</td>
                <td class="dash-mono">{{ labelMes(caja.mes) }}</td>
                <td class="dash-mono">{{ caja.centroCosto }}</td>
                <td>{{ caja.responsable }}</td>
                <td class="dash-table-right dash-table-amount dash-metric-value--ok">
                  {{ caja.fondoEstimado }}
                </td>
                <td class="dash-table-center">
                  <button class="dash-btn-edit" type="button" @click="onEditCaja(index)">
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
        </template>

        <div v-else class="dash-admin">
          <div class="dash-tabs-bar">
            <div class="dash-tabs">
              <button
                v-for="tab in adminTabs"
                :key="tab.id"
                type="button"
                class="dash-tab"
                :class="{ 'dash-tab--active': activeAdminTab === tab.id }"
                @click="activeAdminTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <!-- Admin Users -->
          <div v-if="activeAdminTab === 'admin-users'" class="dash-admin-tab">
            <div class="dash-cajas-toolbar">
              <div>
                <h3 class="dash-cajas-toolbar-title">Administradores del Sistema</h3>
                <p class="dash-cajas-toolbar-hint">
                  Gestión de usuarios con permisos globales de configuración.
                </p>
              </div>
              <button
                v-if="canCreateAdmins"
                class="dash-btn-primary dash-btn-toggle-caja"
                type="button"
                @click="toggleFormAdminUser"
              >
                <span>{{ adminFormOpen ? '▲' : '＋' }}</span>
                <span>{{ adminFormOpen ? 'Ocultar Formulario' : 'Nuevo Administrador' }}</span>
              </button>
            </div>

            <div
              v-if="canCreateAdmins"
              class="dash-collapse"
              :class="{ 'dash-collapse--open': adminFormOpen }"
            >
              <div class="dash-collapse-inner">
                <div class="dash-panel dash-gasto-form-panel dash-collapse-panel">
              <div class="dash-caja-form-head">
                <div>
                  <h2 class="dash-assign-title dash-assign-title--flush">
                    Crear Nuevo Administrador
                  </h2>
                  <p class="dash-hint">{{ adminCreateHint }}</p>
                </div>
                <button
                  class="dash-modal-close"
                  type="button"
                  aria-label="Cerrar"
                  @click="closeFormAdminUser"
                >
                  ×
                </button>
              </div>

              <form class="dash-admin-form" @submit.prevent="onSaveAdmin">
                <div class="dash-caja-grid-3">
                  <div class="dash-field">
                    <div class="dash-desc-head">
                      <label>RUT</label>
                      <span
                        class="dash-rut-status"
                        :class="`dash-rut-status--${adminRutStatus.state}`"
                      >
                        {{ adminRutStatus.text }}
                      </span>
                    </div>
                    <input
                      v-model="adminForm.rut"
                      type="text"
                      placeholder="12345678-9"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Nombre Completo</label>
                    <input
                      v-model="adminForm.nombre"
                      type="text"
                      placeholder="Juan Sanhueza"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Correo Electrónico</label>
                    <input
                      v-model="adminForm.correo"
                      type="email"
                      placeholder="jsanhueza@basaltodrilling.cl"
                    />
                  </div>
                </div>

                <div class="dash-caja-grid-2 dash-admin-form-section">
                  <div class="dash-field">
                    <label>Rol</label>
                    <select v-model="adminForm.rol">
                      <option v-for="rol in creatableAdminRoles" :key="rol" :value="rol">
                        {{ rol }}
                      </option>
                    </select>
                  </div>
                  <div class="dash-field">
                    <label>Contraseña Temporal</label>
                    <div class="dash-radio-row">
                      <label class="dash-radio">
                        <input v-model="adminForm.passType" type="radio" value="rut" />
                        <span>Basada en RUT</span>
                      </label>
                      <label class="dash-radio">
                        <input v-model="adminForm.passType" type="radio" value="manual" />
                        <span>Manual</span>
                      </label>
                    </div>
                    <input
                      v-if="adminForm.passType === 'manual'"
                      v-model="adminForm.password"
                      type="password"
                      class="dash-input-dark"
                      placeholder="•••••••• (Temporal)"
                      autocomplete="new-password"
                    />
                  </div>
                </div>

                <div class="dash-caja-form-actions">
                  <button class="dash-btn-secondary" type="button" @click="closeFormAdminUser">
                    Cancelar
                  </button>
                  <button class="dash-btn-primary" type="submit">
                    <span>Crear Administrador</span>
                  </button>
                </div>
              </form>
                </div>
              </div>
            </div>

            <div v-else class="dash-panel dash-panel--placeholder">
              <p>
                Tu rol ({{ sessionAdminNivel }}) no puede crear administradores. Solo
                <strong>Super Admin - Dev</strong> crea Super Admins, y
                <strong>Super Admin / Super Admin - Dev</strong> crean Administradores de Caja.
              </p>
            </div>

            <div class="dash-table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>RUT / Usuario</th>
                    <th>Rol</th>
                    <th class="dash-table-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="admin in admins" :key="admin.rut">
                    <td class="dash-table-strong">
                      {{ admin.rut }}
                      <span class="dash-subline">{{ admin.nombre }}</span>
                    </td>
                    <td>
                      <span class="dash-badge dash-badge--accent">{{ admin.rol }}</span>
                    </td>
                    <td class="dash-table-center">
                      <span class="dash-status dash-status--ok">{{ admin.estado }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Usuarios -->
          <div v-else-if="activeAdminTab === 'usuarios'" class="dash-admin-tab">
            <div class="dash-cajas-toolbar">
              <div>
                <h3 class="dash-cajas-toolbar-title">Usuarios de Rendición</h3>
                <p class="dash-cajas-toolbar-hint">
                  Usuarios asociados a una ficha de trabajador para rendir gastos.
                </p>
              </div>
              <button
                v-if="canCreateUsuarios"
                class="dash-btn-primary dash-btn-toggle-caja"
                type="button"
                @click="toggleFormUsuario"
              >
                <span>{{ usuarioFormOpen ? '▲' : '＋' }}</span>
                <span>{{ usuarioFormOpen ? 'Ocultar Formulario' : 'Crear Usuario' }}</span>
              </button>
            </div>

            <div
              v-if="canCreateUsuarios"
              class="dash-collapse"
              :class="{ 'dash-collapse--open': usuarioFormOpen }"
            >
              <div class="dash-collapse-inner">
                <div class="dash-panel dash-gasto-form-panel dash-collapse-panel">
              <div class="dash-caja-form-head">
                <div>
                  <h2 class="dash-assign-title dash-assign-title--flush">
                    Crear Usuario Rendidor
                  </h2>
                  <p class="dash-hint">
                    Todo usuario debe estar asociado a una ficha de trabajador.
                  </p>
                </div>
                <button
                  class="dash-modal-close"
                  type="button"
                  aria-label="Cerrar"
                  @click="closeFormUsuario"
                >
                  ×
                </button>
              </div>

              <form class="dash-admin-form" @submit.prevent="onSaveUsuario">
                <div class="dash-caja-grid-2">
                  <div class="dash-field">
                    <label>Trabajador Asociado</label>
                    <select v-model="usuarioForm.trabajadorId">
                      <option value="">-- Seleccionar Trabajador Existente --</option>
                      <option value="nuevo">+ CREAR NUEVO TRABAJADOR SIMULTÁNEAMENTE</option>
                      <option
                        v-for="t in trabajadores"
                        :key="t.id"
                        :value="String(t.id)"
                      >
                        {{ t.nombre }} ({{ t.rut }}) - {{ t.cargo }}
                      </option>
                    </select>
                  </div>
                  <div class="dash-field">
                    <label>Correo de Acceso</label>
                    <input
                      v-model="usuarioForm.correo"
                      type="email"
                      placeholder="usuario@basaltodrilling.cl"
                    />
                  </div>
                </div>

                <div
                  v-if="usuarioForm.trabajadorId === 'nuevo'"
                  class="dash-nested-box dash-caja-grid-3"
                >
                  <div class="dash-field">
                    <div class="dash-desc-head">
                      <label>RUT</label>
                      <span
                        class="dash-rut-status"
                        :class="`dash-rut-status--${usuarioNuevoRutStatus.state}`"
                      >
                        {{ usuarioNuevoRutStatus.text }}
                      </span>
                    </div>
                    <input
                      v-model="usuarioForm.nuevoRut"
                      type="text"
                      placeholder="12345678-9"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Nombre Completo</label>
                    <input
                      v-model="usuarioForm.nuevoNombre"
                      type="text"
                      placeholder="Nombre Completo"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Cargo / Faena</label>
                    <input
                      v-model="usuarioForm.nuevoCargo"
                      type="text"
                      placeholder="Cargo / Faena"
                    />
                  </div>
                </div>

                <div class="dash-admin-form-section">
                  <label class="dash-field-label">Contraseña Temporal</label>
                  <div class="dash-radio-row">
                    <label class="dash-radio">
                      <input v-model="usuarioForm.passType" type="radio" value="rut" />
                      <span>Basada en RUT</span>
                    </label>
                    <label class="dash-radio">
                      <input v-model="usuarioForm.passType" type="radio" value="manual" />
                      <span>Manual</span>
                    </label>
                  </div>
                  <input
                    v-if="usuarioForm.passType === 'manual'"
                    v-model="usuarioForm.password"
                    type="password"
                    class="dash-input-dark"
                    placeholder="•••••••• (Temporal)"
                    autocomplete="new-password"
                  />
                </div>

                <div class="dash-caja-form-actions">
                  <button class="dash-btn-secondary" type="button" @click="closeFormUsuario">
                    Cancelar
                  </button>
                  <button class="dash-btn-primary" type="submit">
                    <span>Guardar Usuario</span>
                  </button>
                </div>
              </form>
                </div>
              </div>
            </div>

            <div class="dash-table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Correo / Login</th>
                    <th>Trabajador Vinculado</th>
                    <th>Cargo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in usuarios" :key="u.correo">
                    <td class="dash-table-strong">{{ u.correo }}</td>
                    <td>{{ u.trabajador }}</td>
                    <td class="dash-muted">{{ u.cargo }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Trabajadores -->
          <div v-else-if="activeAdminTab === 'trabajadores'" class="dash-admin-tab">
            <div class="dash-cajas-toolbar">
              <div>
                <h3 class="dash-cajas-toolbar-title">Nómina de Trabajadores</h3>
                <p class="dash-cajas-toolbar-hint">
                  Personal habilitado para rendir gastos o recibir anticipos.
                </p>
              </div>
              <button
                class="dash-btn-primary dash-btn-toggle-caja"
                type="button"
                @click="toggleFormTrabajador"
              >
                <span>{{ trabajadorFormOpen ? '▲' : '＋' }}</span>
                <span>{{ trabajadorFormOpen ? 'Ocultar Formulario' : 'Nueva Ficha Trabajador' }}</span>
              </button>
            </div>

            <div
              class="dash-collapse"
              :class="{ 'dash-collapse--open': trabajadorFormOpen }"
            >
              <div class="dash-collapse-inner">
                <div class="dash-panel dash-gasto-form-panel dash-collapse-panel">
              <div class="dash-caja-form-head">
                <div>
                  <h2 class="dash-assign-title dash-assign-title--flush">
                    Nueva Ficha de Trabajador
                  </h2>
                  <p class="dash-hint">
                    Para personal que rinde o recibe anticipos sin requerir usuario.
                  </p>
                </div>
                <button
                  class="dash-modal-close"
                  type="button"
                  aria-label="Cerrar"
                  @click="closeFormTrabajador"
                >
                  ×
                </button>
              </div>

              <form class="dash-admin-form" @submit.prevent="onSaveTrabajador">
                <div class="dash-caja-grid-3">
                  <div class="dash-field">
                    <label>RUT</label>
                    <input
                      v-model="trabajadorForm.rut"
                      type="text"
                      placeholder="12.345.678-9"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Nombres y Apellidos</label>
                    <input
                      v-model="trabajadorForm.nombre"
                      type="text"
                      placeholder="Mario Silva"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Cargo / Rol en Faena</label>
                    <input
                      v-model="trabajadorForm.cargo"
                      type="text"
                      placeholder="Conductor Camión Riego"
                    />
                  </div>
                </div>

                <div class="dash-caja-form-actions">
                  <button class="dash-btn-secondary" type="button" @click="closeFormTrabajador">
                    Cancelar
                  </button>
                  <button class="dash-btn-primary" type="submit">
                    <span>Guardar Trabajador</span>
                  </button>
                </div>
              </form>
                </div>
              </div>
            </div>

            <div class="dash-table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>RUT</th>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th>Cajas asignadas</th>
                    <th class="dash-table-center">Tiene Usuario</th>
                    <th class="dash-table-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in trabajadores" :key="t.id">
                    <td class="dash-mono">{{ t.rut }}</td>
                    <td class="dash-table-strong">{{ t.nombre }}</td>
                    <td>{{ t.cargo }}</td>
                    <td>
                      <div v-if="t.cajasAsignadas?.length" class="dash-cajas-tags">
                        <span
                          v-for="gk in t.cajasAsignadas"
                          :key="gk"
                          class="dash-badge dash-badge--neutral"
                        >
                          {{ labelCajaGroup(gk) }}
                        </span>
                      </div>
                      <span v-else class="dash-muted">Sin cajas</span>
                    </td>
                    <td class="dash-table-center">
                      <span
                        class="dash-badge"
                        :class="t.tieneUsuario ? 'dash-badge--ok' : 'dash-badge--neutral'"
                      >
                        {{ t.tieneUsuario ? 'Sí' : 'No' }}
                      </span>
                    </td>
                    <td class="dash-table-center">
                      <button
                        class="dash-btn-edit"
                        type="button"
                        @click="openModalAsignarCajas(t)"
                      >
                        Asignar cajas
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Modal asignar cajas -->
            <div
              v-if="modalAsignarCajas.open"
              class="dash-modal-backdrop"
              @click.self="closeModalAsignarCajas"
            >
              <div class="dash-modal" role="dialog" aria-modal="true">
                <div class="dash-modal-head">
                  <h3>Asignar cajas — {{ modalAsignarCajas.nombre }}</h3>
                  <button
                    class="dash-modal-close"
                    type="button"
                    aria-label="Cerrar"
                    @click="closeModalAsignarCajas"
                  >
                    ×
                  </button>
                </div>
                <p class="dash-hint">
                  Al rendir por su cuenta, el trabajador solo verá estas cajas.
                </p>
                <div class="dash-checkbox-list">
                  <label
                    v-for="c in cajasActivasOpciones"
                    :key="c.groupKey"
                    class="dash-check"
                  >
                    <input
                      v-model="modalAsignarCajas.seleccionadas"
                      type="checkbox"
                      :value="c.groupKey"
                    />
                    <span>{{ c.label }}</span>
                  </label>
                </div>
                <div class="dash-modal-actions">
                  <button class="dash-btn-secondary" type="button" @click="closeModalAsignarCajas">
                    Cancelar
                  </button>
                  <button class="dash-btn-primary" type="button" @click="onSaveAsignarCajas">
                    <span>Guardar cajas</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Tarjetas Empresa -->
          <div v-else-if="activeAdminTab === 'tarjetas'" class="dash-admin-tab">
            <div class="dash-cajas-toolbar">
              <div>
                <h3 class="dash-cajas-toolbar-title">Tarjetas Corporativas Habilitadas</h3>
                <p class="dash-cajas-toolbar-hint">
                  Gastos asociados a estas tarjetas no generan devolución al trabajador.
                </p>
              </div>
              <button
                class="dash-btn-primary dash-btn-toggle-caja"
                type="button"
                @click="toggleFormTarjeta"
              >
                <span>{{ tarjetaFormOpen ? '▲' : '＋' }}</span>
                <span>{{ tarjetaFormOpen ? 'Ocultar Formulario' : 'Registrar Tarjeta' }}</span>
              </button>
            </div>

            <div
              class="dash-collapse"
              :class="{ 'dash-collapse--open': tarjetaFormOpen }"
            >
              <div class="dash-collapse-inner">
                <div class="dash-panel dash-gasto-form-panel dash-collapse-panel">
              <div class="dash-caja-form-head">
                <div>
                  <h2 class="dash-assign-title dash-assign-title--flush">
                    Registrar Tarjeta de la Empresa
                  </h2>
                  <p class="dash-hint">
                    Los gastos asignados a estas tarjetas no generarán devolución al trabajador.
                  </p>
                </div>
                <button
                  class="dash-modal-close"
                  type="button"
                  aria-label="Cerrar"
                  @click="closeFormTarjeta"
                >
                  ×
                </button>
              </div>

              <form class="dash-admin-form" @submit.prevent="onSaveTarjeta">
                <div class="dash-caja-grid-3">
                  <div class="dash-field">
                    <label>Nombre / Alias Tarjeta</label>
                    <input
                      v-model="tarjetaForm.alias"
                      type="text"
                      placeholder="Ej: Visa Operaciones Norte"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Tipo</label>
                    <select v-model="tarjetaForm.tipo">
                      <option>Crédito</option>
                      <option>Débito</option>
                    </select>
                  </div>
                  <div class="dash-field">
                    <label>Últimos 4 Dígitos</label>
                    <input
                      v-model="tarjetaForm.ultimos4"
                      type="text"
                      maxlength="4"
                      placeholder="9941"
                      class="dash-mono"
                    />
                  </div>
                </div>

                <div class="dash-caja-grid-2 dash-admin-form-section">
                  <div class="dash-field">
                    <label>Banco / Emisor</label>
                    <input
                      v-model="tarjetaForm.banco"
                      type="text"
                      placeholder="Ej: Banco de Chile"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Asignada A (Titular)</label>
                    <input
                      v-model="tarjetaForm.titular"
                      type="text"
                      placeholder="Ej: Juan Sanhueza / Caja Chica"
                    />
                  </div>
                </div>

                <div class="dash-caja-form-actions">
                  <button class="dash-btn-secondary" type="button" @click="closeFormTarjeta">
                    Cancelar
                  </button>
                  <button class="dash-btn-primary" type="submit">
                    <span>Guardar Tarjeta</span>
                  </button>
                </div>
              </form>
                </div>
              </div>
            </div>

            <div class="dash-table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Tarjeta / Alias</th>
                    <th>Tipo / N°</th>
                    <th>Banco</th>
                    <th>Titular / Asignado</th>
                    <th class="dash-table-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in tarjetasEmpresa" :key="t.ultimos4 + t.alias">
                    <td class="dash-table-strong">💳 {{ t.alias }}</td>
                    <td class="dash-mono dash-rinde">{{ t.tipo }} (•••• {{ t.ultimos4 }})</td>
                    <td>{{ t.banco }}</td>
                    <td>{{ t.titular }}</td>
                    <td class="dash-table-center">
                      <span class="dash-status dash-status--ok">{{ t.estado }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Auditoría -->
          <div v-else-if="activeAdminTab === 'auditoria'" class="dash-informes">
            <div class="dash-panel">
              <div class="dash-panel-head">
                <div>
                  <h2>Registro de Auditoría del Sistema (Audit Log)</h2>
                  <p class="dash-hint">
                    Historial inmutable de creaciones, modificaciones, eliminaciones e inicios
                    de sesión.
                  </p>
                </div>
                <button class="dash-btn-secondary" type="button">
                  <span>📊</span>
                  <span>Exportar Logs</span>
                </button>
              </div>

              <form class="dash-audit-filters" @submit.prevent>
                <div class="dash-field">
                  <label>Módulo / Entidad</label>
                  <select v-model="auditoriaFiltro.modulo">
                    <option>**Todos los Módulos**</option>
                    <option>Gastos y Rendiciones</option>
                    <option>Asignaciones / Anticipos</option>
                    <option>Cajas Chicas</option>
                    <option>Usuarios y Permisos</option>
                    <option>Trabajadores</option>
                    <option>Autenticación (Logins)</option>
                  </select>
                </div>

                <div class="dash-field">
                  <label>Tipo de Acción</label>
                  <select v-model="auditoriaFiltro.accion">
                    <option>**Todas las Acciones**</option>
                    <option>CREAR (Insert)</option>
                    <option>MODIFICAR (Update)</option>
                    <option>ELIMINAR (Delete)</option>
                    <option>LOGIN / ACCESO</option>
                  </select>
                </div>

                <div class="dash-field">
                  <label>Usuario / Actor</label>
                  <select v-model="auditoriaFiltro.actor">
                    <option>**Todos los Usuarios**</option>
                    <option>Juan Sanhueza (Super Admin - Dev)</option>
                    <option>Carlos Muñoz (Admin Caja)</option>
                  </select>
                </div>

                <div class="dash-field">
                  <label>Fecha</label>
                  <input v-model="auditoriaFiltro.fecha" type="date" />
                </div>
              </form>
            </div>

            <div class="dash-table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Fecha / Hora</th>
                    <th>Usuario (Actor)</th>
                    <th>Acción</th>
                    <th>Módulo</th>
                    <th>Detalle del Cambio (Antes → Después)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in auditoriaLogs" :key="index">
                    <td class="dash-mono dash-nowrap">{{ row.fechaHora }}</td>
                    <td class="dash-table-strong">
                      {{ row.actor }}
                      <span class="dash-subline">{{ row.rol }}</span>
                    </td>
                    <td>
                      <span class="dash-badge" :class="row.accionClass">{{ row.accion }}</span>
                    </td>
                    <td class="dash-table-strong">{{ row.modulo }}</td>
                    <td>
                      <span v-html="row.detalleHtml"></span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-else class="dash-panel dash-panel--placeholder">
            <p>Sección “{{ currentAdminTabLabel }}” — próximamente.</p>
          </div>
        </div>
    </main>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
// TEMP_AUTH_BYPASS — revertir antes de commit
import { TEMP_AUTH_BYPASS } from '../TEMP_AUTH_BYPASS'
import { passwordFromRut, rutStatusLabel, validarRutChileno } from '../utils/rut'
import * as api from '../api/resources'
import {
  buildCartola,
  mapAdminFromUsuario,
  mapAnticipo,
  mapAuditLog,
  mapCaja,
  mapLegacy,
  mapRendicion,
  mapTarjeta,
  mapTrabajador,
  mapUsuario,
  origenFromMetodo,
  parseMontoInput,
  rolApiFromUi
} from '../api/mappers'

const { user, bootstrap, logout } = useAuth()

const dataLoading = ref(false)
const dataError = ref('')
const saveError = ref('')

const cajaActiva = ref('')
const mesActivo = ref('')

const mesesDisponibles = ref([
  { value: '2026-06', label: 'Junio 2026' },
  { value: '2026-07', label: 'Julio 2026' },
  { value: '2026-08', label: 'Agosto 2026' },
  { value: '2026-09', label: 'Septiembre 2026' },
  { value: '2026-10', label: 'Octubre 2026' },
  { value: '2026-11', label: 'Noviembre 2026' },
  { value: '2026-12', label: 'Diciembre 2026' }
])

function labelMes(value) {
  return mesesDisponibles.value.find((m) => m.value === value)?.label || value
}

function diasEnMes(yyyyMm) {
  const [y, m] = String(yyyyMm).split('-').map(Number)
  if (!y || !m) return 31
  return new Date(y, m, 0).getDate()
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function labelMesCerrado(yyyyMm) {
  const [y, m] = String(yyyyMm).split('-')
  const last = pad2(diasEnMes(yyyyMm))
  return `${labelMes(yyyyMm)} (01/${m} al ${last}/${m})`
}

function labelMesCerradoCompleto(yyyyMm) {
  const [y, m] = String(yyyyMm).split('-')
  const last = pad2(diasEnMes(yyyyMm))
  return `${labelMes(yyyyMm)} (01/${m}/${y} al ${last}/${m}/${y})`
}

const mesesCerradosOpciones = computed(() =>
  mesesDisponibles.value.map((m) => ({
    value: m.value,
    label: labelMesCerrado(m.value)
  }))
)

function normalizarGroupKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
}
const activeTab = ref('rendicion')
const sidebarOpen = ref(false)
const activeModule = ref('caja')

const tabs = [
  { id: 'rendicion', label: 'Rendición de Gastos' },
  { id: 'asignacion', label: 'Asignación a Conductor' },
  { id: 'informes', label: 'Informes y Cartola' },
  { id: 'cajas', label: 'Gestión de Cajas' }
]

const adminTabs = [
  { id: 'admin-users', label: 'Admin Users' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'trabajadores', label: 'Trabajadores' },
  { id: 'tarjetas', label: 'Tarjetas Empresa' },
  { id: 'auditoria', label: 'Auditoría' }
]

const activeAdminTab = ref('admin-users')

const currentAdminTabLabel = computed(
  () => adminTabs.find((t) => t.id === activeAdminTab.value)?.label || ''
)

const initials = computed(() => {
  const name = user.value?.nombre || 'Usuario'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

const gasto = reactive({
  fecha: new Date().toISOString().slice(0, 10),
  trabajadorId: 'me',
  trabajador: '',
  tipo: 'Boleta',
  numero: '',
  monto: '',
  cajaGroupKey: '',
  metodoPago: 'efectivo',
  comprobanteNombre: '',
  descripcion: ''
})

const historialBusqueda = ref('')
const historialFiltroCaja = ref('')
const historialFiltroMes = ref('')
const gastoFormOpen = ref(false)

const anticipoFormOpen = ref(false)
const anticipoBusqueda = ref('')
const anticipoFiltroCaja = ref('')
const anticipoFiltroMes = ref('')

const adminFormOpen = ref(false)
const usuarioFormOpen = ref(false)
const trabajadorFormOpen = ref(false)
const tarjetaFormOpen = ref(false)

const palabrasDescripcion = computed(() => {
  const palabras = gasto.descripcion.trim().split(/\s+/).filter((w) => w.length > 0)
  return gasto.descripcion.trim() ? palabras.length : 0
})

const nombreSesion = computed(() => user.value?.nombre || 'Usuario Demo')

const camposCorregirDefault = () => ({
  monto: true,
  comprobante: true,
  tipo_docto: false,
  origen_pago: false,
  descripcion: false
})

const modalResponder = reactive({
  open: false,
  rinde: '',
  estado: 'aprobado',
  comentario: '',
  visibilidad: 'todos',
  comprobanteNombre: '',
  campos: camposCorregirDefault()
})

const modalCorregir = reactive({
  open: false,
  rinde: '',
  trabajador: '',
  numeroLocked: '',
  observacionAdmin: '',
  intento: 1,
  prevFecha: '',
  prevDocto: '',
  prevPago: '',
  prevMonto: '',
  prevDescripcion: '',
  tipo: 'Boleta',
  monto: '',
  metodoPago: 'efectivo',
  descripcion: '',
  respuesta: '',
  comprobanteNombre: '',
  campos: camposCorregirDefault()
})

const fuerzaVisibilidadTodos = computed(
  () => modalResponder.estado === 'corregir' || modalResponder.estado === 'rechazado'
)

const comentarioRequeridoAdmin = computed(() => fuerzaVisibilidadTodos.value)

const palabrasComentarioAdmin = computed(() => {
  const texto = modalResponder.comentario.trim()
  if (!texto) return 0
  return texto.split(/\s+/).filter((w) => w.length > 0).length
})

watch(
  () => modalResponder.estado,
  (val) => {
    if (val === 'corregir' || val === 'rechazado') {
      modalResponder.visibilidad = 'todos'
      modalResponder.comprobanteNombre = ''
    }
    if (val !== 'corregir') {
      Object.assign(modalResponder.campos, camposCorregirDefault())
    }
  }
)

const asignacion = reactive({
  fondo: '',
  fecha: new Date().toISOString().slice(0, 10),
  conductorId: '',
  doc: '',
  observaciones: '',
  monto: '',
  comprobanteNombre: ''
})

const modalAsignarCajas = reactive({
  open: false,
  trabajadorId: null,
  nombre: '',
  seleccionadas: []
})

const informeFormOpen = ref(false)

const informeTiposDefault = () => ({
  apertura: true,
  rendicion: true,
  anticipo: true,
  devolucion: true,
  sobrante: true
})

const informe = reactive({
  caja: '',
  mes: '2026-07',
  persona: '',
  tipos: informeTiposDefault()
})

const filtrosInforme = reactive({
  caja: '',
  mes: '2026-07',
  persona: '',
  tipos: informeTiposDefault()
})

const cajaFormOpen = ref(false)
const formCajaEl = ref(null)

const cajaForm = reactive({
  groupKeySelect: '',
  groupKeyNuevo: '',
  displayName: '',
  centroCosto: '',
  responsableId: '',
  fondoEstimado: '',
  mes: '',
  estado: 'activa',
  editIndex: null,
  editId: null,
  mesOriginal: null,
  groupKeyOriginal: null
})

const adminForm = reactive({
  rut: '',
  nombre: '',
  correo: '',
  rol: 'Administrador de Caja',
  passType: 'rut',
  password: ''
})

const adminRutStatus = computed(() => rutStatusLabel(adminForm.rut))

/**
 * Jerarquía de Administración (preparado para BD):
 * - Super Admin - Dev: crea Super Admin - Dev, Super Admin y Admin de Caja
 * - Super Admin: crea solo Admin de Caja (no puede crear Super Admins)
 * - Administrador de Caja: no crea admins; sí puede crear Usuarios
 * - Usuarios rendidores: los crean Admin, Super Admin y Super Admin - Dev
 */
const ROLE_DEV = 'Super Admin - Dev'
const ROLE_SUPER = 'Super Admin'
const ROLE_ADMIN_CAJA = 'Administrador de Caja'

const API_ROL_TO_NIVEL = {
  SUPER_ADMIN_DEV: ROLE_DEV,
  SUPER_ADMIN: ROLE_SUPER,
  ADMIN_CAJA: ROLE_ADMIN_CAJA
}

const sessionAdminNivel = computed(() => {
  if (user.value?.adminNivel) return user.value.adminNivel
  const fromApi = API_ROL_TO_NIVEL[user.value?.rol]
  if (fromApi) return fromApi
  if (TEMP_AUTH_BYPASS) return ROLE_DEV
  return ROLE_ADMIN_CAJA
})

const canCreateAdmins = computed(() => {
  const nivel = sessionAdminNivel.value
  return nivel === ROLE_DEV || nivel === ROLE_SUPER
})

const canCreateUsuarios = computed(() => {
  const nivel = sessionAdminNivel.value
  return nivel === ROLE_DEV || nivel === ROLE_SUPER || nivel === ROLE_ADMIN_CAJA
})

/** Admin / Super Admin / Dev pueden rendir a nombre de cualquier trabajador */
const canIngresarPorOtros = computed(() => {
  const nivel = sessionAdminNivel.value
  return nivel === ROLE_DEV || nivel === ROLE_SUPER || nivel === ROLE_ADMIN_CAJA
})

function syncGastoLockedFields() {
  if (!canIngresarPorOtros.value || gasto.trabajadorId === 'me') {
    gasto.trabajador = nombreSesion.value
  }
}

function onGastoTipoChange() {
  if (gasto.tipo !== 'Factura') {
    gasto.numero = ''
  }
}

function onGastoTrabajadorChange() {
  if (gasto.trabajadorId === 'me') {
    gasto.trabajador = nombreSesion.value
  } else {
    const t = trabajadores.value.find((x) => String(x.id) === gasto.trabajadorId)
    gasto.trabajador = t?.nombre || nombreSesion.value
  }
  syncGastoCajaDisponible()
}

function trabajadorParaGasto() {
  if (!canIngresarPorOtros.value || gasto.trabajadorId === 'me') {
    return trabajadores.value.find((t) => t.nombre === nombreSesion.value) || null
  }
  return trabajadores.value.find((x) => String(x.id) === gasto.trabajadorId) || null
}

function syncGastoCajaDisponible() {
  const opts = cajasDisponiblesParaGasto.value
  if (!opts.length) {
    gasto.cajaGroupKey = ''
    return
  }
  if (!opts.some((c) => c.groupKey === gasto.cajaGroupKey)) {
    gasto.cajaGroupKey = opts[0].groupKey
  }
}

watch(
  () => [user.value?.nombre, canIngresarPorOtros.value],
  () => syncGastoLockedFields(),
  { immediate: true }
)

const creatableAdminRoles = computed(() => {
  if (sessionAdminNivel.value === ROLE_DEV) {
    return [
      'Super Admin - Dev (Acceso Total + Eliminación)',
      'Super Admin',
      'Administrador de Caja'
    ]
  }
  if (sessionAdminNivel.value === ROLE_SUPER) {
    return ['Administrador de Caja']
  }
  return []
})

const adminCreateHint = computed(() => {
  if (sessionAdminNivel.value === ROLE_DEV) {
    return 'Como Super Admin - Dev puedes crear Super Admins y Administradores de Caja.'
  }
  if (sessionAdminNivel.value === ROLE_SUPER) {
    return 'Como Super Admin solo puedes crear Administradores de Caja.'
  }
  return ''
})

const admins = ref([])

watch(
  creatableAdminRoles,
  (roles) => {
    if (roles.length && !roles.includes(adminForm.rol)) {
      adminForm.rol = roles[0]
    }
  },
  { immediate: true }
)

const trabajadores = ref([])

const usuarioForm = reactive({
  trabajadorId: '',
  nuevoRut: '',
  nuevoNombre: '',
  nuevoCargo: '',
  correo: '',
  passType: 'rut',
  password: '',
  editIndex: null
})

const usuarioNuevoRutStatus = computed(() => rutStatusLabel(usuarioForm.nuevoRut))

const rutTrabajadorSeleccionado = computed(() => {
  if (usuarioForm.trabajadorId === 'nuevo') return usuarioForm.nuevoRut
  const t = trabajadores.value.find((x) => String(x.id) === usuarioForm.trabajadorId)
  return t?.rut || ''
})

const usuarios = ref([])

const trabajadorForm = reactive({
  rut: '',
  nombre: '',
  cargo: ''
})

const tarjetaForm = reactive({
  alias: '',
  tipo: 'Crédito',
  ultimos4: '',
  banco: '',
  titular: ''
})

const tarjetasEmpresa = ref([])

const auditoriaFiltro = reactive({
  modulo: '**Todos los Módulos**',
  accion: '**Todas las Acciones**',
  actor: '**Todos los Usuarios**',
  fecha: new Date().toISOString().slice(0, 10)
})

const auditoriaLogs = ref([])

const cajas = ref([])

async function safeList(fn, fallback = []) {
  try {
    return await fn()
  } catch (err) {
    console.warn('[dashboard load]', err?.message || err)
    return fallback
  }
}

function applyTieneUsuario(trabajadoresList, usuariosList) {
  const ids = new Set(
    usuariosList.filter((u) => u.trabajadorId != null).map((u) => Number(u.trabajadorId))
  )
  for (const t of trabajadoresList) {
    t.tieneUsuario = ids.has(Number(t.id))
  }
}

function syncSelectoresCajaMes() {
  if (!cajas.value.length) {
    cajaActiva.value = ''
    mesActivo.value = ''
    return
  }

  const nombres = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ]
  const known = new Set(mesesDisponibles.value.map((m) => m.value))
  for (const c of cajas.value) {
    if (c.mes && !known.has(c.mes)) {
      const [y, m] = String(c.mes).split('-')
      const mi = Number(m) - 1
      mesesDisponibles.value.push({
        value: c.mes,
        label: `${nombres[mi] || m} ${y}`
      })
      known.add(c.mes)
    }
  }
  mesesDisponibles.value.sort((a, b) => a.value.localeCompare(b.value))

  const keys = [...new Set(cajas.value.map((c) => c.groupKey))]
  if (!keys.includes(cajaActiva.value)) {
    cajaActiva.value = keys[0] || ''
  }
  const meses = [
    ...new Set(cajas.value.filter((c) => c.groupKey === cajaActiva.value).map((c) => c.mes))
  ].sort()
  if (!meses.includes(mesActivo.value)) {
    mesActivo.value = meses[0] || ''
  }
  if (!asignacion.fondo && cajaActiva.value) {
    asignacion.fondo = cajaActiva.value
  }
  if (!cajaForm.mes && mesActivo.value) {
    cajaForm.mes = mesActivo.value
  }
}

function rebuildCartola() {
  cartola.value = buildCartola({
    cajas: cajas.value,
    movimientos: movimientos.value,
    asignaciones: asignaciones.value
  })
}

async function loadDashboardData() {
  dataLoading.value = true
  dataError.value = ''
  saveError.value = ''
  try {
    const [cajasRaw, rendRaw, trabRaw, legRaw] = await Promise.all([
      safeList(api.listCajas),
      safeList(api.listRendiciones),
      safeList(api.listTrabajadores),
      safeList(api.listLegacy)
    ])

    cajas.value = cajasRaw.map(mapCaja)
    trabajadores.value = trabRaw.map(mapTrabajador)

    const movOps = rendRaw.map(mapRendicion)
    const legOps = legRaw.map(mapLegacy)
    movimientos.value = [...movOps, ...legOps]

    const anticiposRaw = await safeList(api.listAnticipos)
    asignaciones.value = anticiposRaw.map(mapAnticipo)

    const usuariosRaw = await safeList(api.listUsuarios)
    const mappedUsers = usuariosRaw.map(mapUsuario)
    applyTieneUsuario(trabajadores.value, mappedUsers)

    admins.value = mappedUsers
      .filter((u) =>
        ['SUPER_ADMIN_DEV', 'SUPER_ADMIN', 'ADMIN_CAJA'].includes(u.rol)
      )
      .map((u) =>
        mapAdminFromUsuario({
          id: u.id,
          rut: u.rut,
          correo: u.correo,
          rol: u.rol,
          estado: u.estado,
          trabajador_nombre: u.trabajador
        })
      )

    usuarios.value = mappedUsers
      .filter((u) => u.rol === 'USER_RENDIDOR')
      .map((u) => ({
        id: u.id,
        correo: u.correo,
        trabajador: u.trabajador,
        cargo: u.cargo,
        trabajadorId: u.trabajadorId
      }))

    const tarjetasRaw = await safeList(api.listTarjetas)
    tarjetasEmpresa.value = tarjetasRaw.map(mapTarjeta)

    const logsRaw = await safeList(api.listAuditLogs)
    auditoriaLogs.value = logsRaw.map(mapAuditLog)

    syncSelectoresCajaMes()
    rebuildCartola()
    syncInformeResultado()
  } catch (err) {
    dataError.value = err?.message || 'No se pudieron cargar los datos'
  } finally {
    dataLoading.value = false
  }
}

function findCajaIdByGroupMes(groupKey, mes) {
  const c = cajas.value.find((x) => x.groupKey === groupKey && x.mes === mes)
  return c?.id ?? null
}

function findCajaIdForGasto(groupKey) {
  return (
    findCajaIdByGroupMes(groupKey, mesActivo.value) ||
    cajas.value.find((x) => x.groupKey === groupKey && x.estado === 'activa')?.id ||
    null
  )
}

const cajasOrdenadas = computed(() =>
  [...cajas.value].sort((a, b) => {
    const byKey = a.groupKey.localeCompare(b.groupKey)
    if (byKey !== 0) return byKey
    return String(b.mes).localeCompare(String(a.mes))
  })
)

/** Grupos internos únicos para el selector (con un ejemplo de nombre exterior) */
const gruposInternosExistentes = computed(() => {
  const map = new Map()
  for (const c of cajas.value) {
    if (!map.has(c.groupKey)) {
      map.set(c.groupKey, c.displayName)
    }
  }
  return [...map.entries()].map(([groupKey, ejemploExterior]) => ({
    groupKey,
    ejemploExterior
  }))
})

const cajasActivasOpciones = computed(() => {
  const map = new Map()
  for (const c of cajas.value.filter((x) => x.estado === 'activa')) {
    if (!map.has(c.groupKey)) {
      map.set(c.groupKey, c.displayName)
    }
  }
  return [...map.entries()].map(([groupKey, displayName]) => ({
    groupKey,
    label: displayName
  }))
})

const cajasActivas = computed(() =>
  cajas.value.filter(
    (x) =>
      x.estado === 'activa' &&
      x.groupKey === cajaActiva.value &&
      x.mes === mesActivo.value
  )
)

function labelCajaGroup(groupKey) {
  const opt = cajasActivasOpciones.value.find((c) => c.groupKey === groupKey)
  return opt?.label || groupKey
}

/** Cajas disponibles al rendir: asignadas al trabajador; admin por otros ve todas las activas */
const cajasDisponiblesParaGasto = computed(() => {
  const all = cajasActivasOpciones.value
  if (canIngresarPorOtros.value && gasto.trabajadorId !== 'me') {
    const t = trabajadores.value.find((x) => String(x.id) === gasto.trabajadorId)
    const keys = t?.cajasAsignadas || []
    if (!keys.length) return []
    return all.filter((c) => keys.includes(c.groupKey))
  }
  if (canIngresarPorOtros.value && gasto.trabajadorId === 'me') {
    return all
  }
  const t = trabajadorParaGasto()
  const keys = t?.cajasAsignadas || []
  if (!keys.length) return all
  return all.filter((c) => keys.includes(c.groupKey))
})

const historialFiltroActivo = computed(
  () =>
    historialFiltroCaja.value !== '' ||
    historialFiltroMes.value !== '' ||
    historialBusqueda.value.trim() !== ''
)

const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

/** DD/MM/YYYY → YYYY-MM */
function mesFromFechaDDMMYYYY(fecha) {
  const parts = String(fecha || '').split('/')
  if (parts.length !== 3) return ''
  const [, mm, yyyy] = parts
  if (!mm || !yyyy) return ''
  return `${yyyy}-${String(mm).padStart(2, '0')}`
}

function nombreMesDesdeFechaDDMMYYYY(fecha) {
  const parts = String(fecha || '').split('/')
  if (parts.length !== 3) return ''
  const mm = Number(parts[1])
  if (!mm || mm < 1 || mm > 12) return ''
  return MESES_ES[mm - 1]
}

/** Formato: "24/07/2026 10:17 hrs" */
function formatSubidoEl(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min} hrs`
}

/** Si el mes del documento es anterior al de subida, retorna nombre del mes del documento. */
function arrastreMesFromFechas(fechaDoctoDDMMYYYY, uploadDate = new Date()) {
  const docMes = mesFromFechaDDMMYYYY(fechaDoctoDDMMYYYY)
  if (!docMes) return ''
  const uploadMes = `${uploadDate.getFullYear()}-${String(uploadDate.getMonth() + 1).padStart(2, '0')}`
  if (docMes < uploadMes) return nombreMesDesdeFechaDDMMYYYY(fechaDoctoDDMMYYYY)
  return ''
}

function matchHistorialFiltros({ nombre, cajaGroupKey, fecha }) {
  const q = historialBusqueda.value.trim().toLowerCase()
  if (q && !String(nombre || '').toLowerCase().includes(q)) return false
  if (historialFiltroCaja.value) {
    if (!cajaGroupKey || cajaGroupKey !== historialFiltroCaja.value) return false
  }
  if (historialFiltroMes.value) {
    if (mesFromFechaDDMMYYYY(fecha) !== historialFiltroMes.value) return false
  }
  return true
}

const movimientosFiltrados = computed(() =>
  movimientos.value.filter((m) =>
    matchHistorialFiltros({
      nombre: m.trabajador,
      cajaGroupKey: m.cajaGroupKey,
      fecha: m.fecha
    })
  )
)

function matchAnticipoFiltros({ nombre, cajaGroupKey, fecha }) {
  const q = anticipoBusqueda.value.trim().toLowerCase()
  if (q && !String(nombre || '').toLowerCase().includes(q)) return false
  if (anticipoFiltroCaja.value) {
    if (!cajaGroupKey || cajaGroupKey !== anticipoFiltroCaja.value) return false
  }
  if (anticipoFiltroMes.value) {
    if (mesFromFechaDDMMYYYY(fecha) !== anticipoFiltroMes.value) return false
  }
  return true
}

const asignacionesFiltradas = computed(() =>
  asignaciones.value.filter((a) =>
    matchAnticipoFiltros({
      nombre: a.conductor,
      cajaGroupKey: a.cajaGroupKey || a.fondo,
      fecha: a.fecha
    })
  )
)

function parseMontoNumber(montoStr) {
  const n = Number(String(montoStr || '').replace(/\D/g, ''))
  return Number.isFinite(n) ? n : 0
}

const totalesHistorial = computed(() => {
  const movs = movimientosFiltrados.value
  const gastos = movs.reduce((acc, m) => acc + parseMontoNumber(m.monto), 0)
  const porDevolver = movs
    .filter((m) => m.estado === 'Sin Devolución' || m.estado === 'Por Corregir')
    .reduce((acc, m) => acc + parseMontoNumber(m.monto), 0)

  const anticiposFiltrados = asignaciones.value.filter((a) =>
    matchHistorialFiltros({
      nombre: a.conductor,
      cajaGroupKey: a.cajaGroupKey || a.fondo,
      fecha: a.fecha
    })
  )
  const anticipo = anticiposFiltrados.reduce((acc, a) => acc + parseMontoNumber(a.monto), 0)

  return { anticipo, gastos, porDevolver }
})

watch(
  () => [gasto.trabajadorId, canIngresarPorOtros.value, cajasActivasOpciones.value.length],
  () => syncGastoCajaDisponible(),
  { immediate: true }
)

const informeResultado = reactive({
  titulo: 'Cartola Consolidada del Mes',
  periodo: 'Período: — | Caja: Todas',
  total: '0 Registros'
})

const cartola = ref([])

const cartolaFiltrada = computed(() =>
  cartola.value.filter((row) => {
    if (filtrosInforme.mes && row.mes !== filtrosInforme.mes) return false
    if (filtrosInforme.caja && row.cajaGroupKey !== filtrosInforme.caja) return false
    if (!filtrosInforme.tipos[row.tipoKey]) return false
    if (filtrosInforme.persona && row.responsable !== filtrosInforme.persona) return false
    return true
  })
)

const cartolaTotales = computed(() => {
  let abono = 0
  let cargo = 0
  for (const row of cartolaFiltrada.value) {
    abono += parseMontoNumber(row.abono)
    cargo += parseMontoNumber(row.cargo)
  }
  return {
    abono: formatMonto(abono),
    cargo: formatMonto(cargo)
  }
})

const movimientos = ref([])

const asignaciones = ref([])

onMounted(async () => {
  await bootstrap()
  syncGastoLockedFields()
  await loadDashboardData()
})

function peekNextRinde() {
  const nums = movimientos.value
    .map((m) => Number(String(m.rinde).replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 99
  return `R-${max + 1}`
}

function onGastoFile(event) {
  const file = event.target.files?.[0]
  gasto.comprobanteNombre = file ? file.name : ''
}

function onAsignacionFile(event) {
  const file = event.target.files?.[0]
  asignacion.comprobanteNombre = file ? file.name : ''
}

function labelAdjunto(nombre) {
  const name = String(nombre || '')
  const ext = name.split('.').pop()?.toUpperCase() || ''
  if (ext === 'PDF') return 'PDF'
  if (ext === 'PNG' || ext === 'JPG' || ext === 'JPEG') return ext === 'JPEG' ? 'JPG' : ext
  if (name.length <= 14) return name
  return `${name.slice(0, 10)}…`
}

function openModalResponder(row) {
  modalResponder.open = true
  modalResponder.rinde = row.rinde
  modalResponder.estado = 'aprobado'
  modalResponder.comentario = ''
  modalResponder.visibilidad = 'todos'
  modalResponder.comprobanteNombre = ''
  Object.assign(modalResponder.campos, camposCorregirDefault())
}

function closeModalResponder() {
  modalResponder.open = false
}

function onRespuestaFile(event) {
  const file = event.target.files?.[0]
  modalResponder.comprobanteNombre = file ? file.name : ''
}

async function onSaveRespuesta() {
  if (comentarioRequeridoAdmin.value && !modalResponder.comentario.trim()) {
    return
  }

  const row = movimientos.value.find((m) => m.rinde === modalResponder.rinde)
  if (!row || row.legacy || !row.id) {
    closeModalResponder()
    return
  }

  let estado = 'Aprobado'
  if (modalResponder.estado === 'corregir') estado = 'Por Corregir'
  else if (modalResponder.estado === 'rechazado') estado = 'Rechazado'
  else if (modalResponder.comprobanteNombre) estado = 'Devuelto'

  const payload = { estado }
  if (modalResponder.comprobanteNombre) {
    payload.comprobante_url = modalResponder.comprobanteNombre
  }
  // Persistimos el comentario admin en descripción solo si no hay una (columna dedicada aún no existe)
  if (modalResponder.comentario.trim() && !row.descripcion) {
    payload.descripcion = `[Admin] ${modalResponder.comentario.trim()}`
  }

  try {
    saveError.value = ''
    await api.updateRendicion(row.id, payload)
    await loadDashboardData()
    closeModalResponder()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo actualizar la rendición'
  }
}

function openModalCorregir(row) {
  const numeroMatch = String(row.docto || '').match(/#?\s*(\d+)/)
  const montoNum = String(row.monto || '').replace(/\D/g, '')
  const tipoBase = String(row.docto || 'Boleta').split('#')[0].trim() || 'Boleta'
  const campos = { ...camposCorregirDefault(), ...(row.camposCorregir || {}) }

  modalCorregir.open = true
  modalCorregir.rinde = row.rinde
  modalCorregir.trabajador = row.trabajador || ''
  modalCorregir.numeroLocked = numeroMatch ? numeroMatch[1] : String(row.docto || '')
  modalCorregir.observacionAdmin =
    row.observacionAdmin || 'Se solicita corrección de la rendición.'
  modalCorregir.intento = row.intento || 1
  modalCorregir.prevFecha = row.fecha
  modalCorregir.prevDocto = row.docto
  modalCorregir.prevPago = row.pago
  modalCorregir.prevMonto = row.monto
  modalCorregir.prevDescripcion = row.descripcion || '—'
  modalCorregir.tipo = tipoBase
  modalCorregir.monto = montoNum || ''
  modalCorregir.metodoPago = row.metodoPago || 'efectivo'
  modalCorregir.descripcion = row.descripcion || ''
  modalCorregir.respuesta = ''
  modalCorregir.comprobanteNombre = ''
  Object.assign(modalCorregir.campos, campos)
}

function closeModalCorregir() {
  modalCorregir.open = false
}

function onCorreccionFile(event) {
  const file = event.target.files?.[0]
  modalCorregir.comprobanteNombre = file ? file.name : ''
}

function formatMontoCl(value) {
  const n = Number(String(value).replace(/\D/g, ''))
  if (!Number.isFinite(n) || n <= 0) return '$ 0'
  return `$ ${n.toLocaleString('es-CL')}`
}

function labelPago(metodoPago) {
  if (metodoPago === 'debito') return 'Débito'
  if (metodoPago === 'credito') return 'Crédito'
  return 'Efectivo'
}

async function onSaveCorreccion() {
  const row = movimientos.value.find((m) => m.rinde === modalCorregir.rinde)
  if (!row || row.legacy || !row.id) {
    closeModalCorregir()
    return
  }

  const campos = modalCorregir.campos
  const payload = { estado: 'Sin Devolución' }

  if (campos.tipo_docto) {
    payload.tipo_documento = modalCorregir.tipo
    payload.numero_documento =
      modalCorregir.tipo === 'Factura' ? modalCorregir.numeroLocked || null : null
  }
  if (campos.monto) {
    payload.monto = parseMontoInput(modalCorregir.monto)
  }
  if (campos.origen_pago) {
    payload.origen_pago = origenFromMetodo(modalCorregir.metodoPago)
  }
  if (campos.descripcion) {
    payload.descripcion = modalCorregir.descripcion.trim()
  }
  if (campos.comprobante && modalCorregir.comprobanteNombre) {
    payload.comprobante_url = modalCorregir.comprobanteNombre
  }

  try {
    saveError.value = ''
    await api.updateRendicion(row.id, payload)
    await loadDashboardData()
    closeModalCorregir()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo guardar la corrección'
  }
}

function openSidebar() {
  sidebarOpen.value = true
}

function closeSidebar() {
  sidebarOpen.value = false
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function selectModule(moduleName) {
  if (!sidebarOpen.value) openSidebar()
  activeModule.value = moduleName
}

async function onSaveGasto() {
  if (palabrasDescripcion.value > 500) return
  if (gasto.tipo === 'Factura' && !gasto.numero.trim()) return
  if (!gasto.cajaGroupKey) return

  onGastoTrabajadorChange()

  const cajaId = findCajaIdForGasto(gasto.cajaGroupKey)
  if (!cajaId) {
    saveError.value = 'No hay caja/presupuesto para la clave y mes seleccionados'
    return
  }

  let trabajadorId = null
  if (canIngresarPorOtros.value && gasto.trabajadorId !== 'me') {
    trabajadorId = Number(gasto.trabajadorId)
  } else {
    trabajadorId = user.value?.trabajador_id || null
  }
  if (!trabajadorId) {
    saveError.value = 'No hay trabajador asociado para registrar el gasto'
    return
  }

  try {
    saveError.value = ''
    await api.createRendicion({
      caja_id: cajaId,
      trabajador_id: trabajadorId,
      fecha_documento: gasto.fecha,
      tipo_documento: gasto.tipo,
      numero_documento: gasto.tipo === 'Factura' ? gasto.numero.trim() : null,
      monto: parseMontoInput(gasto.monto),
      origen_pago: origenFromMetodo(gasto.metodoPago),
      comprobante_url: gasto.comprobanteNombre || null,
      descripcion: gasto.descripcion || null
    })
    await loadDashboardData()
    closeFormGasto()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo guardar el gasto'
  }
}

function resetGastoFormFields() {
  gasto.tipo = 'Boleta'
  gasto.numero = ''
  gasto.monto = ''
  gasto.metodoPago = 'efectivo'
  gasto.descripcion = ''
  gasto.comprobanteNombre = ''
  syncGastoLockedFields()
  syncGastoCajaDisponible()
}

function toggleFormGasto() {
  if (gastoFormOpen.value) {
    closeFormGasto()
    return
  }
  resetGastoFormFields()
  gastoFormOpen.value = true
}

function closeFormGasto() {
  gastoFormOpen.value = false
  resetGastoFormFields()
}

function resetAsignacionFormFields() {
  asignacion.conductorId = ''
  asignacion.doc = ''
  asignacion.observaciones = ''
  asignacion.monto = ''
  asignacion.comprobanteNombre = ''
  if (cajaActiva.value) asignacion.fondo = cajaActiva.value
}

function toggleFormAnticipo() {
  if (anticipoFormOpen.value) {
    closeFormAnticipo()
    return
  }
  resetAsignacionFormFields()
  anticipoFormOpen.value = true
}

function closeFormAnticipo() {
  anticipoFormOpen.value = false
  resetAsignacionFormFields()
}

async function onSaveAsignacion() {
  if (!asignacion.conductorId || !asignacion.monto) return

  const cajaId =
    findCajaIdByGroupMes(asignacion.fondo, mesActivo.value) ||
    findCajaIdForGasto(asignacion.fondo)
  if (!cajaId) {
    saveError.value = 'Selecciona una caja con presupuesto para el mes activo'
    return
  }

  try {
    saveError.value = ''
    await api.createAnticipo({
      caja_id: cajaId,
      trabajador_id: Number(asignacion.conductorId),
      fecha: asignacion.fecha,
      monto: parseMontoInput(asignacion.monto),
      observacion: asignacion.observaciones.trim() || null,
      comprobante_url: asignacion.comprobanteNombre || null,
      codigo_vale: asignacion.doc.trim() || undefined
    })
    await loadDashboardData()
    closeFormAnticipo()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo guardar el anticipo'
  }
}

function openModalAsignarCajas(t) {
  modalAsignarCajas.open = true
  modalAsignarCajas.trabajadorId = t.id
  modalAsignarCajas.nombre = t.nombre
  modalAsignarCajas.seleccionadas = [...(t.cajasAsignadas || [])]
}

function closeModalAsignarCajas() {
  modalAsignarCajas.open = false
  modalAsignarCajas.trabajadorId = null
  modalAsignarCajas.nombre = ''
  modalAsignarCajas.seleccionadas = []
}

async function onSaveAsignarCajas() {
  const id = modalAsignarCajas.trabajadorId
  if (!id) return
  try {
    saveError.value = ''
    await api.setTrabajadorCajas(id, [...modalAsignarCajas.seleccionadas])
    await loadDashboardData()
    closeModalAsignarCajas()
    syncGastoCajaDisponible()
  } catch (err) {
    saveError.value = err?.message || 'No se pudieron asignar las cajas'
  }
}

function toggleFormInforme() {
  if (informeFormOpen.value) {
    closeFormInforme()
    return
  }
  informeFormOpen.value = true
}

function closeFormInforme() {
  informeFormOpen.value = false
}

function seleccionarTodosTiposInforme(value) {
  for (const key of Object.keys(informe.tipos)) {
    informe.tipos[key] = value
  }
}

function syncInformeResultado() {
  const cajaLabel = filtrosInforme.caja ? labelCajaGroup(filtrosInforme.caja) : 'Todas'
  informeResultado.titulo = 'Cartola Consolidada del Mes'
  informeResultado.periodo = `Período: ${labelMesCerradoCompleto(filtrosInforme.mes)} | Caja: ${cajaLabel}`
  informeResultado.total = `${cartolaFiltrada.value.length} Registros`
}

function onAplicarFiltrosInforme() {
  filtrosInforme.caja = informe.caja
  filtrosInforme.mes = informe.mes
  filtrosInforme.persona = informe.persona
  Object.assign(filtrosInforme.tipos, informe.tipos)
  syncInformeResultado()
  closeFormInforme()
}

function formatMonto(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value || '$ 0'
  return `$ ${n.toLocaleString('es-CL')}`
}

function resetCajaForm() {
  cajaForm.groupKeySelect = ''
  cajaForm.groupKeyNuevo = ''
  cajaForm.displayName = ''
  cajaForm.centroCosto = ''
  cajaForm.responsableId = ''
  cajaForm.fondoEstimado = ''
  cajaForm.mes = mesActivo.value
  cajaForm.estado = 'activa'
  cajaForm.editIndex = null
  cajaForm.editId = null
  cajaForm.mesOriginal = null
  cajaForm.groupKeyOriginal = null
}

function toggleFormCaja() {
  if (cajaFormOpen.value) {
    closeFormCaja()
    return
  }
  resetCajaForm()
  cajaFormOpen.value = true
}

function closeFormCaja() {
  cajaFormOpen.value = false
  resetCajaForm()
}

function openFormCajaForEdit() {
  cajaFormOpen.value = true
  nextTick(() => {
    formCajaEl.value?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  })
}

function onGroupKeySelectChange() {
  if (cajaForm.groupKeySelect !== '__NUEVO__') {
    cajaForm.groupKeyNuevo = ''
  }
}

function onGroupKeyNuevoInput() {
  cajaForm.groupKeyNuevo = normalizarGroupKey(cajaForm.groupKeyNuevo)
}

function resolveGroupKey() {
  if (cajaForm.editIndex !== null && cajaForm.groupKeyOriginal) {
    return cajaForm.groupKeyOriginal
  }
  if (cajaForm.groupKeySelect === '__NUEVO__') {
    return normalizarGroupKey(cajaForm.groupKeyNuevo)
  }
  return normalizarGroupKey(cajaForm.groupKeySelect)
}

function onEditCaja(sortedIndex) {
  const caja = cajasOrdenadas.value[sortedIndex]
  if (!caja) return
  const realIndex = cajas.value.findIndex(
    (c) => c.groupKey === caja.groupKey && c.mes === caja.mes
  )
  if (realIndex < 0) return

  cajaForm.groupKeySelect = caja.groupKey
  cajaForm.groupKeyNuevo = ''
  cajaForm.displayName = caja.displayName
  cajaForm.centroCosto = caja.centroCosto
  cajaForm.responsableId = caja.responsableId != null ? String(caja.responsableId) : ''
  cajaForm.fondoEstimado = String(caja.fondoEstimado).replace(/\D/g, '')
  cajaForm.mes = caja.mes
  cajaForm.estado = caja.estado
  cajaForm.editIndex = realIndex
  cajaForm.editId = caja.id
  cajaForm.mesOriginal = caja.mes
  cajaForm.groupKeyOriginal = caja.groupKey
  openFormCajaForEdit()
}

async function onSaveCaja() {
  const groupKey = resolveGroupKey()
  const displayName = cajaForm.displayName.trim()
  if (!groupKey || !displayName) return
  if (!cajaForm.fondoEstimado) return

  const payload = {
    clave_interna: groupKey,
    nombre_exterior: displayName,
    centro_costo: cajaForm.centroCosto.trim() || '—',
    responsable_id: cajaForm.responsableId ? Number(cajaForm.responsableId) : null,
    mes_asignado: cajaForm.mes,
    fondo_estimado_mes: parseMontoInput(cajaForm.fondoEstimado),
    estado: cajaForm.estado
  }

  try {
    saveError.value = ''
    if (cajaForm.editId && cajaForm.mesOriginal === cajaForm.mes) {
      const { clave_interna, ...updatePayload } = payload
      await api.updateCaja(cajaForm.editId, updatePayload)
    } else {
      await api.createCaja(payload)
    }
    if (!cajaActiva.value) cajaActiva.value = groupKey
    await loadDashboardData()
    closeFormCaja()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo guardar la caja'
  }
}

function resetAdminForm() {
  adminForm.rut = ''
  adminForm.nombre = ''
  adminForm.correo = ''
  adminForm.rol = creatableAdminRoles.value[0] || ROLE_ADMIN_CAJA
  adminForm.passType = 'rut'
  adminForm.password = ''
}

function toggleFormAdminUser() {
  if (adminFormOpen.value) {
    closeFormAdminUser()
    return
  }
  resetAdminForm()
  adminFormOpen.value = true
}

function closeFormAdminUser() {
  adminFormOpen.value = false
  resetAdminForm()
}

function toggleFormUsuario() {
  if (usuarioFormOpen.value) {
    closeFormUsuario()
    return
  }
  resetUsuarioForm()
  usuarioFormOpen.value = true
}

function closeFormUsuario() {
  usuarioFormOpen.value = false
  resetUsuarioForm()
}

function toggleFormTrabajador() {
  if (trabajadorFormOpen.value) {
    closeFormTrabajador()
    return
  }
  trabajadorForm.rut = ''
  trabajadorForm.nombre = ''
  trabajadorForm.cargo = ''
  trabajadorFormOpen.value = true
}

function closeFormTrabajador() {
  trabajadorFormOpen.value = false
  trabajadorForm.rut = ''
  trabajadorForm.nombre = ''
  trabajadorForm.cargo = ''
}

function toggleFormTarjeta() {
  if (tarjetaFormOpen.value) {
    closeFormTarjeta()
    return
  }
  tarjetaForm.alias = ''
  tarjetaForm.tipo = 'Crédito'
  tarjetaForm.ultimos4 = ''
  tarjetaForm.banco = ''
  tarjetaForm.titular = ''
  tarjetaFormOpen.value = true
}

function closeFormTarjeta() {
  tarjetaFormOpen.value = false
  tarjetaForm.alias = ''
  tarjetaForm.tipo = 'Crédito'
  tarjetaForm.ultimos4 = ''
  tarjetaForm.banco = ''
  tarjetaForm.titular = ''
}

function shortAdminRol(rol) {
  if (rol.includes('Dev')) return ROLE_DEV
  if (rol.includes('Administrador de Caja') || rol.includes('Admin Caja')) {
    return 'Admin Caja'
  }
  return ROLE_SUPER
}

async function onSaveAdmin() {
  if (!canCreateAdmins.value) return
  if (!adminForm.rut.trim() || !adminForm.nombre.trim() || !adminForm.correo.trim()) return
  if (!validarRutChileno(adminForm.rut)) return
  if (!creatableAdminRoles.value.includes(adminForm.rol)) return
  if (adminForm.passType === 'manual' && !adminForm.password.trim()) return

  const passwordTemporal =
    adminForm.passType === 'manual'
      ? adminForm.password
      : passwordFromRut(adminForm.rut)

  if (!passwordTemporal) return

  try {
    saveError.value = ''
    await api.createUsuario({
      rut: adminForm.rut.trim(),
      correo: adminForm.correo.trim(),
      password: passwordTemporal,
      rol: rolApiFromUi(adminForm.rol),
      estado: 'activo'
    })
    await loadDashboardData()
    closeFormAdminUser()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo crear el admin'
  }
}

function resetUsuarioForm() {
  usuarioForm.trabajadorId = ''
  usuarioForm.nuevoRut = ''
  usuarioForm.nuevoNombre = ''
  usuarioForm.nuevoCargo = ''
  usuarioForm.correo = ''
  usuarioForm.passType = 'rut'
  usuarioForm.password = ''
  usuarioForm.editIndex = null
}

async function onSaveUsuario() {
  if (!canCreateUsuarios.value) return
  if (!usuarioForm.correo.trim() || !usuarioForm.trabajadorId) return

  let trabajadorId = null
  let rutTrabajador = ''

  try {
    saveError.value = ''

    if (usuarioForm.trabajadorId === 'nuevo') {
      if (!usuarioForm.nuevoRut.trim() || !usuarioForm.nuevoNombre.trim()) return
      if (!validarRutChileno(usuarioForm.nuevoRut)) return
      const created = await api.createTrabajador({
        rut: usuarioForm.nuevoRut.trim(),
        nombre_completo: usuarioForm.nuevoNombre.trim(),
        cargo: usuarioForm.nuevoCargo.trim() || null
      })
      trabajadorId = created.id
      rutTrabajador = usuarioForm.nuevoRut.trim()
    } else {
      const t = trabajadores.value.find((x) => String(x.id) === usuarioForm.trabajadorId)
      if (!t) return
      trabajadorId = t.id
      rutTrabajador = t.rut
    }

    if (usuarioForm.passType === 'manual' && !usuarioForm.password.trim()) return

    const passwordTemporal =
      usuarioForm.passType === 'manual'
        ? usuarioForm.password
        : passwordFromRut(rutTrabajador)

    if (!passwordTemporal) return

    await api.createUsuario({
      trabajador_id: trabajadorId,
      rut: rutTrabajador,
      correo: usuarioForm.correo.trim(),
      password: passwordTemporal,
      rol: 'USER_RENDIDOR',
      estado: 'activo'
    })

    await loadDashboardData()
    resetUsuarioForm()
    closeFormUsuario()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo crear el usuario'
  }
}

async function onSaveTrabajador() {
  if (!trabajadorForm.rut.trim() || !trabajadorForm.nombre.trim()) return
  try {
    saveError.value = ''
    await api.createTrabajador({
      rut: trabajadorForm.rut.trim(),
      nombre_completo: trabajadorForm.nombre.trim(),
      cargo: trabajadorForm.cargo.trim() || null
    })
    await loadDashboardData()
    closeFormTrabajador()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo crear el trabajador'
  }
}

async function onSaveTarjeta() {
  if (!tarjetaForm.alias.trim() || !tarjetaForm.ultimos4.trim()) return
  try {
    saveError.value = ''
    await api.createTarjeta({
      alias: tarjetaForm.alias.trim(),
      tipo: tarjetaForm.tipo === 'Débito' ? 'Debito' : 'Credito',
      ultimos_digitos: tarjetaForm.ultimos4.trim(),
      banco: tarjetaForm.banco.trim() || null,
      titular_nombre: tarjetaForm.titular.trim() || null,
      estado: 'activa'
    })
    await loadDashboardData()
    closeFormTarjeta()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo crear la tarjeta'
  }
}

async function onLogout() {
  // TEMP_AUTH_BYPASS — revertir antes de commit
  if (TEMP_AUTH_BYPASS) {
    sessionStorage.removeItem('TEMP_AUTH_BYPASS_OK')
  }
  await logout()
}
</script>
