<template>
  <div class="dash">
    <header class="dash-header">
      <div class="dash-brand">
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

        <img class="dash-logo" src="/logoBASALTO.png" alt="Basalto Drilling" />
        <div class="dash-brand-divider" aria-hidden="true"></div>
        <span class="dash-module">Rendiciones y Caja Chica</span>
      </div>

      <div class="dash-header-actions">
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

          <div class="dash-caja-divider" aria-hidden="true"></div>

          <span class="dash-caja-mes-label">Mes:</span>
          <select v-model="mesActivo" class="dash-caja-select dash-caja-select--mes">
            <option v-for="m in mesesDisponibles" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
        </div>

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
          <div class="dash-sidebar-label-slot">
            <span
              class="dash-sidebar-label"
              :class="{ 'dash-sidebar-text--invisible': !sidebarOpen }"
            >
              Módulos
            </span>
          </div>

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
        <template v-if="activeModule === 'caja'">
        <section class="dash-metrics-inner">
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
        <div class="dash-panel">
          <div class="dash-panel-head">
            <div>
              <h2>Nuevo Ingreso de Gasto</h2>
              <p class="dash-hint">
                Declaración de gastos pagados por el trabajador para reembolso.
              </p>
            </div>
            <button class="dash-btn-excel" type="button">
              <span>📥</span>
              <span>Importar Excel</span>
            </button>
          </div>

          <form class="dash-rendicion-form" @submit.prevent="onSaveGasto">
            <div class="dash-form dash-form--five">
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
                <select v-model="gasto.tipo">
                  <option>Boleta</option>
                  <option>Factura</option>
                  <option>Ticket Peaje</option>
                </select>
              </div>
              <div class="dash-field">
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

            <div class="dash-form dash-form--six dash-form--section">
              <div class="dash-field">
                <label>Origen de Pago</label>
                <select v-model="gasto.metodoPago">
                  <option value="efectivo">Efectivo Personal</option>
                  <option value="personal_tarjeta">Tarjeta Personal</option>
                  <option value="empresa_tarjeta">💳 Tarjeta Empresa</option>
                </select>
              </div>

              <div v-if="muestraTarjetaEmpresa" class="dash-field">
                <label>Tarjeta Corporativa</label>
                <select v-model="gasto.tarjetaEmpresaKey">
                  <option value="">-- Seleccionar tarjeta --</option>
                  <option
                    v-for="t in tarjetasEmpresa"
                    :key="t.ultimos4 + t.alias"
                    :value="`${t.tipo}|${t.ultimos4}|${t.alias}`"
                  >
                    {{ t.alias }} — {{ t.tipo }} (•••• {{ t.ultimos4 }})
                  </option>
                </select>
              </div>

              <template v-if="muestraTarjetaPersonal">
                <div class="dash-field">
                  <label>Tipo Tarjeta Personal</label>
                  <select v-model="gasto.tipoPersonal">
                    <option value="Débito">Débito</option>
                    <option value="Crédito">Crédito</option>
                  </select>
                </div>
                <div class="dash-field">
                  <label>Últimos 4 Dígitos</label>
                  <input
                    v-model="gasto.ultimos4"
                    type="text"
                    maxlength="4"
                    placeholder="4321"
                    class="dash-mono"
                  />
                </div>
              </template>

              <div
                class="dash-field"
                :class="{
                  'dash-field--span4': muestraTarjetaEmpresa || muestraTarjetaPersonal,
                  'dash-field--span5': !muestraTarjetaEmpresa && !muestraTarjetaPersonal
                }"
              >
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

            <div class="dash-form-actions">
              <button class="dash-btn-primary" type="submit">
                <span>Guardar Rendición</span>
              </button>
            </div>
          </form>
        </div>

        <div class="dash-table-wrap">
          <div class="dash-panel-head dash-cajas-head">
            <div>
              <h3>Historial de Rendiciones</h3>
              <p>Seguimiento de gastos declarados y su estado de reembolso al trabajador.</p>
            </div>
          </div>

          <table class="dash-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>ID / Origen</th>
                <th>Trabajador</th>
                <th>Pago / Docto</th>
                <th class="dash-table-right">Monto</th>
                <th class="dash-table-center">Estado Devolución</th>
                <th class="dash-table-center">Acciones (Admin)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in movimientos"
                :key="row.rinde"
                :class="{ 'dash-row-legacy': row.legacy }"
              >
                <td class="dash-mono">{{ row.fecha }}</td>
                <td>
                  <span v-if="row.legacy" class="dash-badge dash-badge--legacy">Legacy</span>
                  <span v-else class="dash-rinde">{{ row.rinde }}</span>
                </td>
                <td class="dash-table-strong">{{ row.trabajador }}</td>
                <td>
                  <span
                    v-if="row.esEmpresa"
                    class="dash-pago-empresa"
                    title="Tarjeta corporativa — sin devolución al trabajador"
                  >
                    💳 {{ row.pago }}
                  </span>
                  <span v-else>{{ row.pago }}</span>
                  <span class="dash-subline">{{ row.docto }}</span>
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
                    <option value="empresa_tarjeta">Tarjeta de la Empresa</option>
                    <option value="personal_tarjeta">Tarjeta Personal</option>
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
        <div class="dash-panel dash-assign-form">
          <h2 class="dash-assign-title">Registrar Anticipo / Fondo</h2>

          <form class="dash-stack-form" @submit.prevent="onSaveAsignacion">
            <div class="dash-field">
              <label>Fondo Fijo / Caja</label>
              <select v-model="asignacion.fondo">
                <option>ADMINISTRACION CAJA</option>
                <option>FAENA NORTE</option>
              </select>
            </div>

            <div class="dash-field-row">
              <div class="dash-field">
                <label>Fecha</label>
                <input v-model="asignacion.fecha" type="date" />
              </div>
              <div class="dash-field">
                <label>Hora</label>
                <input v-model="asignacion.hora" type="time" />
              </div>
            </div>

            <div class="dash-field">
              <label>Conductor</label>
              <select v-model="asignacion.conductor">
                <option value="">Seleccionar Conductor...</option>
                <option>Pedro González</option>
                <option>Mario Silva</option>
              </select>
            </div>

            <div class="dash-field-row">
              <div class="dash-field">
                <label>Tipo</label>
                <input
                  v-model="asignacion.tipo"
                  type="text"
                  placeholder="Camión / Camioneta"
                />
              </div>
              <div class="dash-field">
                <label>Patente</label>
                <input v-model="asignacion.patente" type="text" placeholder="ABCD-12" />
              </div>
            </div>

            <div class="dash-field">
              <label>N° Doc / Vale</label>
              <input
                v-model="asignacion.doc"
                type="text"
                placeholder="N° de comprobante..."
              />
            </div>

            <div class="dash-field">
              <label>Observaciones</label>
              <input
                v-model="asignacion.observaciones"
                type="text"
                placeholder="Motivo o faena..."
              />
            </div>

            <div class="dash-field">
              <label>Monto ($)</label>
              <input
                v-model="asignacion.monto"
                type="number"
                placeholder="0"
                class="dash-input-strong"
              />
            </div>

            <button class="dash-btn-primary dash-btn-block" type="submit">
              <span>Guardar asignación</span>
            </button>
          </form>
        </div>

        <div class="dash-assign-side">
          <div class="dash-import-card">
            <div>
              <h3>Importación Masiva</h3>
              <p>Carga filas copiadas directamente desde una planilla Excel.</p>
            </div>
            <button class="dash-btn-excel" type="button">
              <span>📥</span>
              <span>Importar Excel</span>
            </button>
          </div>

          <div class="dash-table-wrap">
            <h3>Habilitaciones y Asignaciones Recientes</h3>
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Conductor</th>
                  <th>Patente</th>
                  <th>N° Doc</th>
                  <th>Observaciones</th>
                  <th class="dash-table-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in asignaciones" :key="row.doc">
                  <td>{{ row.fechaHora }}</td>
                  <td class="dash-table-strong">{{ row.conductor }}</td>
                  <td class="dash-mono">{{ row.patente }}</td>
                  <td>{{ row.doc }}</td>
                  <td>{{ row.observaciones }}</td>
                  <td class="dash-table-right dash-rinde">{{ row.monto }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Informes y Cartola -->
      <div v-else-if="activeTab === 'informes'" class="dash-informes">
        <div class="dash-panel">
          <h2 class="dash-assign-title">Generador de Reportes y Cartolas</h2>

          <form class="dash-informe-form" @submit.prevent="onGenerarInforme">
            <div class="dash-field dash-field--span2">
              <label>Tipo de Informe</label>
              <select v-model="informe.tipo">
                <option>Cartola Caja Completa</option>
                <option>Cartola Caja entre Fechas</option>
                <option>Gastos por Ítem / Categoría</option>
                <option>Gastos por Conductores / Trabajador</option>
                <option>Resumen por N° Rinde (Manager)</option>
              </select>
            </div>

            <div class="dash-field">
              <label>Desde</label>
              <input v-model="informe.desde" type="date" />
            </div>

            <div class="dash-field">
              <label>Hasta</label>
              <input v-model="informe.hasta" type="date" />
            </div>

            <div class="dash-field">
              <label>Trabajador / Conductor</label>
              <select v-model="informe.persona">
                <option>**Todos**</option>
                <option>Juan Pérez</option>
                <option>Pedro González</option>
                <option>Carlos Muñoz</option>
              </select>
            </div>

            <div class="dash-informe-actions">
              <button class="dash-btn-secondary" type="button">
                <span>🖨️</span>
                <span>Imprimir PDF</span>
              </button>
              <button class="dash-btn-excel" type="button">
                <span>📊</span>
                <span>Exportar Excel</span>
              </button>
              <button class="dash-btn-primary" type="submit">
                <span>Generar Informe</span>
              </button>
            </div>
          </form>
        </div>

        <div class="dash-panel">
          <div class="dash-informe-result-head">
            <div>
              <h3>{{ informeResultado.titulo }}</h3>
              <p>{{ informeResultado.periodo }}</p>
            </div>
            <div class="dash-informe-result-meta">
              <span>Total Movimientos</span>
              <strong>{{ informeResultado.total }}</strong>
            </div>
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
                  <th class="dash-table-right">Abono (Ingreso)</th>
                  <th class="dash-table-right">Cargo (Gasto)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in cartola" :key="row.doc + row.fecha">
                  <td>{{ row.fecha }}</td>
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
                  <td class="dash-table-right dash-metric-value--ok">$ 2.000.000</td>
                  <td class="dash-table-right dash-rinde">$ 550.000</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Gestión de Cajas -->
      <div v-else-if="activeTab === 'cajas'" class="dash-assign">
        <div class="dash-panel dash-assign-form">
          <div class="dash-assign-title-block">
            <h2 class="dash-assign-title dash-assign-title--flush">Configuración de Caja Chica</h2>
            <p class="dash-hint">
              El Nombre Real Interno agrupa el histórico anual. El Nombre Exterior es
              totalmente libre.
            </p>
          </div>

          <form class="dash-stack-form" @submit.prevent="onSaveCaja">
            <div class="dash-field">
              <label class="dash-label-accent">
                Nombre Real Interno (Clave de Agrupación) 🔑
              </label>
              <div class="dash-stack-tight">
                <select
                  v-model="cajaForm.groupKeySelect"
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
                  <option value="__NUEVO__">+ CREAR NUEVO GRUPO INTERNO</option>
                </select>

                <input
                  v-if="cajaForm.groupKeySelect === '__NUEVO__'"
                  v-model="cajaForm.groupKeyNuevo"
                  type="text"
                  placeholder="Ej: FAENA_SUR (Nombre interno sin espacios)"
                  class="dash-mono dash-input-accent-border"
                  @input="onGroupKeyNuevoInput"
                />
              </div>
              <span class="dash-field-hint">
                Clave inmutable para sumatorias anuales (ej. WHERE group_key =
                'FAENA_NORTE').
              </span>
            </div>

            <div class="dash-field">
              <label>Nombre Exterior / Público (Libre)</label>
              <input
                v-model="cajaForm.displayName"
                type="text"
                placeholder="Ej: caja pagos x mes julio"
              />
            </div>

            <div class="dash-field">
              <label>Centro de Costo / Empresa</label>
              <input
                v-model="cajaForm.centroCosto"
                type="text"
                placeholder="Ej: CC-101 / Basalto Drilling SpA"
              />
            </div>

            <div class="dash-field">
              <label>Responsable de Caja</label>
              <select v-model="cajaForm.responsable">
                <option value="">Seleccionar Responsable...</option>
                <option>Carlos Muñoz</option>
                <option>Juan Sanhueza</option>
                <option>Pedro González</option>
              </select>
            </div>

            <div class="dash-field-row">
              <div class="dash-field">
                <label>Mes Asignado</label>
                <select v-model="cajaForm.mes" class="dash-input-strong">
                  <option v-for="m in mesesDisponibles" :key="m.value" :value="m.value">
                    {{ m.label }}
                  </option>
                </select>
              </div>
              <div class="dash-field">
                <label>Fondo Estimado Mes ($)</label>
                <input
                  v-model="cajaForm.fondoEstimado"
                  type="number"
                  placeholder="2000000"
                  class="dash-input-strong"
                />
              </div>
            </div>

            <div class="dash-field">
              <label>Estado</label>
              <select v-model="cajaForm.estado">
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>

            <button class="dash-btn-primary dash-btn-block" type="submit">
              <span>Guardar Presupuesto Mensual</span>
            </button>
          </form>
        </div>

        <div class="dash-table-wrap dash-cajas-list">
          <div class="dash-panel-head dash-cajas-head">
            <div>
              <h3>Presupuestos Mensuales por Agrupador</h3>
              <p>
                El group_key agrupa el año. El nombre exterior es libre y no afecta
                reportes.
              </p>
            </div>
          </div>

          <table class="dash-table">
            <thead>
              <tr>
                <th>ID Interno / Agrupador</th>
                <th>Nombre Exterior</th>
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
          <div v-if="activeAdminTab === 'admin-users'" class="dash-assign">
            <div v-if="canCreateAdmins" class="dash-panel dash-assign-form">
              <div class="dash-assign-title-block">
                <h2 class="dash-assign-title dash-assign-title--flush">Nuevo Administrador</h2>
                <p class="dash-hint">
                  Creación de administradores con credenciales temporales. {{ adminCreateHint }}
                </p>
              </div>

              <form class="dash-stack-form" @submit.prevent="onSaveAdmin">
                <div class="dash-field">
                  <div class="dash-desc-head">
                    <label>RUT</label>
                    <span class="dash-rut-status" :class="`dash-rut-status--${adminRutStatus.state}`">
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

                <div class="dash-field">
                  <label>Rol</label>
                  <select v-model="adminForm.rol">
                    <option v-for="rol in creatableAdminRoles" :key="rol" :value="rol">
                      {{ rol }}
                    </option>
                  </select>
                </div>

                <div class="dash-cred-block">
                  <label class="dash-field-label">Contraseña Temporal</label>
                  <div class="dash-radio-col">
                    <label class="dash-radio">
                      <input v-model="adminForm.passType" type="radio" value="rut" />
                      <span>Generar automáticamente basada en el RUT</span>
                    </label>
                    <label class="dash-radio">
                      <input v-model="adminForm.passType" type="radio" value="manual" />
                      <span>Ingresar clave temporal manual</span>
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

                <button class="dash-btn-primary dash-btn-block" type="submit">
                  <span>Crear Administrador</span>
                </button>
              </form>
            </div>

            <div v-else class="dash-panel dash-panel--placeholder">
              <p>
                Tu rol ({{ sessionAdminNivel }}) no puede crear administradores. Solo
                <strong>Super Admin - Dev</strong> crea Super Admins, y
                <strong>Super Admin / Super Admin - Dev</strong> crean Administradores de Caja.
              </p>
            </div>

            <div class="dash-table-wrap dash-cajas-list">
              <div class="dash-panel-head dash-cajas-head">
                <div>
                  <h3>Administradores del Sistema</h3>
                  <p>Usuarios con permisos de configuración y gestión global.</p>
                </div>
              </div>

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
          <div v-else-if="activeAdminTab === 'usuarios'" class="dash-assign">
            <div v-if="canCreateUsuarios" class="dash-panel dash-assign-form">
              <div class="dash-assign-title-block">
                <h2 class="dash-assign-title dash-assign-title--flush">Crear Usuario Rendidor</h2>
                <p class="dash-hint">
                  Todo usuario debe estar asociado a una ficha de trabajador. Pueden crearlos
                  Admin, Super Admin y Super Admin - Dev.
                </p>
              </div>

              <form class="dash-stack-form" @submit.prevent="onSaveUsuario">
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

                <div v-if="usuarioForm.trabajadorId === 'nuevo'" class="dash-nested-box">
                  <span class="dash-nested-label">Ficha Nuevo Trabajador</span>
                  <div class="dash-desc-head">
                    <span class="dash-nested-label dash-nested-label--muted">RUT</span>
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
                  <input
                    v-model="usuarioForm.nuevoNombre"
                    type="text"
                    placeholder="Nombre Completo"
                  />
                  <input
                    v-model="usuarioForm.nuevoCargo"
                    type="text"
                    placeholder="Cargo / Faena"
                  />
                </div>

                <div class="dash-cred-block">
                  <span class="dash-nested-label dash-nested-label--muted">Credenciales de Acceso</span>
                  <div class="dash-field">
                    <label>Correo de Acceso</label>
                    <input
                      v-model="usuarioForm.correo"
                      type="email"
                      placeholder="usuario@basaltodrilling.cl"
                    />
                  </div>

                  <label class="dash-field-label">Contraseña Temporal</label>
                  <div class="dash-radio-col">
                    <label class="dash-radio">
                      <input v-model="usuarioForm.passType" type="radio" value="rut" />
                      <span>Generar a partir del RUT del trabajador</span>
                    </label>
                    <label class="dash-radio">
                      <input v-model="usuarioForm.passType" type="radio" value="manual" />
                      <span>Ingresar clave temporal manual</span>
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

                <button class="dash-btn-primary dash-btn-block" type="submit">
                  <span>Guardar Usuario</span>
                </button>
              </form>
            </div>

            <div class="dash-table-wrap dash-cajas-list">
              <h3 class="dash-table-title">Usuarios de Rendición</h3>
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
          <div v-else-if="activeAdminTab === 'trabajadores'" class="dash-assign">
            <div class="dash-panel dash-assign-form">
              <div class="dash-assign-title-block">
                <h2 class="dash-assign-title dash-assign-title--flush">Nueva Ficha Trabajador</h2>
                <p class="dash-hint">
                  Para personal que rinde o recibe anticipos sin requerir usuario.
                </p>
              </div>

              <form class="dash-stack-form" @submit.prevent="onSaveTrabajador">
                <div class="dash-field">
                  <label>RUT</label>
                  <input v-model="trabajadorForm.rut" type="text" placeholder="12.345.678-9" />
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

                <button class="dash-btn-primary dash-btn-block" type="submit">
                  <span>Guardar Trabajador</span>
                </button>
              </form>
            </div>

            <div class="dash-table-wrap dash-cajas-list">
              <h3 class="dash-table-title">Nómina de Trabajadores</h3>
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>RUT</th>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th class="dash-table-center">Tiene Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in trabajadores" :key="t.id">
                    <td class="dash-mono">{{ t.rut }}</td>
                    <td class="dash-table-strong">{{ t.nombre }}</td>
                    <td>{{ t.cargo }}</td>
                    <td class="dash-table-center">
                      <span
                        class="dash-badge"
                        :class="t.tieneUsuario ? 'dash-badge--ok' : 'dash-badge--neutral'"
                      >
                        {{ t.tieneUsuario ? 'Sí' : 'No' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tarjetas Empresa -->
          <div v-else-if="activeAdminTab === 'tarjetas'" class="dash-assign">
            <div class="dash-panel dash-assign-form">
              <div class="dash-assign-title-block">
                <h2 class="dash-assign-title dash-assign-title--flush">
                  Registrar Tarjeta de la Empresa
                </h2>
                <p class="dash-hint">
                  Los gastos asignados a estas tarjetas no generarán devolución al trabajador.
                </p>
              </div>

              <form class="dash-stack-form" @submit.prevent="onSaveTarjeta">
                <div class="dash-field">
                  <label>Nombre / Alias Tarjeta</label>
                  <input
                    v-model="tarjetaForm.alias"
                    type="text"
                    placeholder="Ej: Visa Operaciones Norte"
                  />
                </div>

                <div class="dash-field-row">
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

                <div class="dash-field">
                  <label>Banco / Emisor</label>
                  <input
                    v-model="tarjetaForm.banco"
                    type="text"
                    placeholder="Ej: Banco de Chile"
                  />
                </div>

                <div class="dash-field">
                  <label>Asignada a (Titular)</label>
                  <input
                    v-model="tarjetaForm.titular"
                    type="text"
                    placeholder="Ej: Juan Sanhueza / Caja Chica"
                  />
                </div>

                <button class="dash-btn-primary dash-btn-block" type="submit">
                  <span>Guardar Tarjeta Empresa</span>
                </button>
              </form>
            </div>

            <div class="dash-table-wrap dash-cajas-list">
              <h3 class="dash-table-title">Tarjetas Corporativas Habilitadas</h3>
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
                    <th class="dash-table-right">IP Origen</th>
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
                    <td class="dash-table-right dash-mono dash-muted">{{ row.ip }}</td>
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
// TEMP_AUTH_BYPASS — revertir antes de commit
import { TEMP_AUTH_BYPASS } from '../TEMP_AUTH_BYPASS'
import { passwordFromRut, rutStatusLabel, validarRutChileno } from '../utils/rut'

const { user, bootstrap, logout } = useAuth()

const cajaActiva = ref('FAENA_NORTE')
const mesActivo = ref('2026-07')

const mesesDisponibles = [
  { value: '2026-06', label: 'Junio 2026' },
  { value: '2026-07', label: 'Julio 2026' },
  { value: '2026-08', label: 'Agosto 2026' },
  { value: '2026-09', label: 'Septiembre 2026' },
  { value: '2026-10', label: 'Octubre 2026' },
  { value: '2026-11', label: 'Noviembre 2026' },
  { value: '2026-12', label: 'Diciembre 2026' }
]

function labelMes(value) {
  return mesesDisponibles.find((m) => m.value === value)?.label || value
}

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
  fecha: '2026-07-23',
  trabajadorId: 'me',
  trabajador: '',
  tipo: 'Boleta',
  numero: '',
  monto: '',
  metodoPago: 'efectivo',
  tarjetaEmpresaKey: '',
  tipoPersonal: 'Débito',
  ultimos4: '',
  comprobanteNombre: '',
  descripcion: ''
})

const muestraTarjetaEmpresa = computed(() => gasto.metodoPago === 'empresa_tarjeta')
const muestraTarjetaPersonal = computed(() => gasto.metodoPago === 'personal_tarjeta')

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
  fondo: 'ADMINISTRACION CAJA',
  fecha: '2026-07-23',
  hora: '11:37',
  conductor: '',
  tipo: '',
  patente: '',
  doc: '',
  observaciones: '',
  monto: ''
})

const informe = reactive({
  tipo: 'Cartola Caja entre Fechas',
  desde: '2026-07-01',
  hasta: '2026-07-23',
  persona: '**Todos**'
})

const cajaForm = reactive({
  groupKeySelect: '',
  groupKeyNuevo: '',
  displayName: '',
  centroCosto: '',
  responsable: '',
  fondoEstimado: '',
  mes: '2026-07',
  estado: 'activa',
  editIndex: null,
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

const sessionAdminNivel = computed(() => {
  // TEMP_AUTH_BYPASS / futuro: vendrá de BD en el perfil de sesión
  if (user.value?.adminNivel) return user.value.adminNivel
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

function onGastoTrabajadorChange() {
  if (gasto.trabajadorId === 'me') {
    gasto.trabajador = nombreSesion.value
    return
  }
  const t = trabajadores.value.find((x) => String(x.id) === gasto.trabajadorId)
  gasto.trabajador = t?.nombre || nombreSesion.value
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

const admins = ref([
  {
    rut: '12.345.678-9',
    nombre: 'Juan Sanhueza',
    rol: ROLE_DEV,
    estado: 'Activo'
  },
  {
    rut: '11.111.111-1',
    nombre: 'Ana Super',
    rol: ROLE_SUPER,
    estado: 'Activo'
  },
  {
    rut: '22.222.222-2',
    nombre: 'Luis Caja',
    rol: 'Admin Caja',
    estado: 'Activo'
  }
])

watch(
  creatableAdminRoles,
  (roles) => {
    if (roles.length && !roles.includes(adminForm.rol)) {
      adminForm.rol = roles[0]
    }
  },
  { immediate: true }
)

const trabajadores = ref([
  {
    id: 1,
    rut: '15.444.333-2',
    nombre: 'Pedro González',
    cargo: 'Conductor',
    tieneUsuario: false
  },
  {
    id: 2,
    rut: '11.222.333-K',
    nombre: 'Carlos Muñoz',
    cargo: 'Operador',
    tieneUsuario: true
  }
])

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

const usuarios = ref([
  {
    correo: 'cmunoz@basaltodrilling.cl',
    trabajador: 'Carlos Muñoz',
    cargo: 'Operador Faena Norte',
    trabajadorId: 2
  }
])

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

const tarjetasEmpresa = ref([
  {
    alias: 'Visa Operaciones Norte',
    tipo: 'Crédito',
    ultimos4: '9941',
    banco: 'Banco de Chile',
    titular: 'Juan Sanhueza',
    estado: 'Activa'
  },
  {
    alias: 'Débito Caja Chica Central',
    tipo: 'Débito',
    ultimos4: '1050',
    banco: 'Banco Estado',
    titular: 'Carlos Muñoz',
    estado: 'Activa'
  }
])

const auditoriaFiltro = reactive({
  modulo: '**Todos los Módulos**',
  accion: '**Todas las Acciones**',
  actor: '**Todos los Usuarios**',
  fecha: '2026-07-23'
})

const auditoriaLogs = ref([
  {
    fechaHora: '23/07/2026 11:02:15',
    actor: 'Juan Sanhueza',
    rol: 'Super Admin - Dev',
    accion: 'ELIMINAR',
    accionClass: 'dash-badge--danger',
    modulo: 'Admin Users',
    detalleHtml:
      'Se eliminó al usuario <code class="dash-code dash-code--danger">admin_temp@basaltodrilling.cl</code>',
    ip: '190.160.20.11'
  },
  {
    fechaHora: '23/07/2026 10:45:00',
    actor: 'Carlos Muñoz',
    rol: 'Admin Caja',
    accion: 'MODIFICAR',
    accionClass: 'dash-badge--warn',
    modulo: 'Gastos',
    detalleHtml:
      'Rinde <span class="dash-mono dash-rinde">R-102</span> (Monto cambiado): <span class="dash-strike">$40.000</span> → <span class="dash-metric-value--ok dash-table-amount">$45.000</span>',
    ip: '201.238.12.5'
  },
  {
    fechaHora: '23/07/2026 09:30:12',
    actor: 'Carlos Muñoz',
    rol: 'Admin Caja',
    accion: 'CREAR',
    accionClass: 'dash-badge--ok',
    modulo: 'Anticipos',
    detalleHtml:
      'Asignado anticipo <span class="dash-mono dash-rinde">V-5541</span> a conductor Pedro González ($150.000)',
    ip: '201.238.12.5'
  },
  {
    fechaHora: '23/07/2026 08:30:00',
    actor: 'Juan Sanhueza',
    rol: 'Super Admin - Dev',
    accion: 'LOGIN',
    accionClass: 'dash-badge--info',
    modulo: 'Autenticación',
    detalleHtml: 'Inicio de sesión exitoso desde Chrome / macOS',
    ip: '190.160.20.11'
  }
])

const cajas = ref([
  {
    groupKey: 'FAENA_NORTE',
    displayName: 'caja pagos x mes julio',
    centroCosto: 'CC-101',
    responsable: 'Carlos Muñoz',
    fondoEstimado: '$ 2.000.000',
    mes: '2026-07',
    estado: 'activa'
  },
  {
    groupKey: 'FAENA_NORTE',
    displayName: 'Faena Norte Terreno - Junio',
    centroCosto: 'CC-101',
    responsable: 'Carlos Muñoz',
    fondoEstimado: '$ 1.800.000',
    mes: '2026-06',
    estado: 'activa'
  },
  {
    groupKey: 'ADMIN_CENTRAL',
    displayName: 'Administración Central',
    centroCosto: 'CC-100',
    responsable: 'Juan Sanhueza',
    fondoEstimado: '$ 5.000.000',
    mes: '2026-07',
    estado: 'activa'
  },
  {
    groupKey: 'FAENA_CORDILLERA',
    displayName: 'Faena Cordillera (cerrada)',
    centroCosto: 'CC-099',
    responsable: 'Pedro González',
    fondoEstimado: '$ 1.000.000',
    mes: '2026-06',
    estado: 'inactiva'
  }
])

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

const informeResultado = reactive({
  titulo: 'Resultado del Informe: Cartola Caja entre Fechas',
  periodo: 'Periodo: 01/07/2026 al 23/07/2026 • Caja: FAENA NORTE',
  total: '16 Registros'
})

const cartola = ref([
  {
    fecha: '01/07/2026',
    doc: 'DEP-001',
    docClass: 'dash-doc-muted',
    tipo: 'Fondo Fijo',
    badgeClass: 'dash-badge--ok',
    detalle: 'Apertura mensual de caja chica',
    responsable: 'Administración',
    abono: '$ 2.000.000',
    abonoClass: 'dash-metric-value--ok dash-table-amount',
    cargo: '-',
    cargoClass: 'dash-muted'
  },
  {
    fecha: '22/07/2026',
    doc: 'R-101',
    docClass: 'dash-rinde',
    tipo: 'Gasto',
    badgeClass: 'dash-badge--neutral',
    detalle: 'Peajes traslado de personal',
    responsable: 'Carlos Muñoz',
    abono: '-',
    abonoClass: 'dash-muted',
    cargo: '$ 12.800',
    cargoClass: 'dash-table-amount'
  },
  {
    fecha: '23/07/2026',
    doc: 'V-5541',
    docClass: 'dash-rinde',
    tipo: 'Anticipo',
    badgeClass: 'dash-badge--accent',
    detalle: 'Viático ruta Copiapó (Patente GH-88-12)',
    responsable: 'Pedro González',
    abono: '-',
    abonoClass: 'dash-muted',
    cargo: '$ 150.000',
    cargoClass: 'dash-rinde'
  }
])

const movimientos = ref([
  {
    fecha: '23/07/2026',
    rinde: 'R-103',
    trabajador: 'Juan Pérez',
    pago: 'Crédito Emp. (•••• 9941)',
    docto: 'Factura #4601',
    monto: '$ 62.000',
    estado: 'Sin Devolución',
    estadoClass: 'dash-status--warn',
    esEmpresa: true,
    descripcion: 'Repuestos hidráulicos faena norte.',
    intento: 1,
    observacionAdmin: ''
  },
  {
    fecha: '23/07/2026',
    rinde: 'R-102',
    trabajador: 'Juan Pérez',
    pago: 'Débito Pers. (•••• 8821)',
    docto: 'Factura #4588',
    monto: '$ 45.000',
    estado: 'Sin Devolución',
    estadoClass: 'dash-status--warn',
    esEmpresa: false,
    descripcion: 'Combustible vehículo de apoyo.',
    intento: 1,
    observacionAdmin: ''
  },
  {
    fecha: '22/07/2026',
    rinde: 'R-101',
    trabajador: 'Carlos Muñoz',
    pago: 'Efectivo',
    docto: 'Ticket Peaje',
    monto: '$ 12.800',
    estado: 'Devuelto',
    estadoClass: 'dash-status--ok',
    esEmpresa: false,
    descripcion: 'Peaje ruta 5 norte.',
    intento: 1,
    observacionAdmin: ''
  },
  {
    fecha: '21/07/2026',
    rinde: 'R-100',
    trabajador: 'Mario Silva',
    pago: 'Crédito Pers. (•••• 1024)',
    docto: 'Boleta #9912',
    monto: '$ 85.000',
    estado: 'Por Corregir',
    estadoClass: 'dash-status--danger',
    esEmpresa: false,
    descripcion: 'Compra de repuestos menores en ferretería Copiapó.',
    intento: 1,
    observacionAdmin:
      'El comprobante adjunto está borroso y no se distingue el número de folio ni el monto total. Favor subir foto clara.',
    camposCorregir: {
      monto: true,
      comprobante: true,
      tipo_docto: false,
      origen_pago: false,
      descripcion: false
    }
  },
  {
    fecha: '15/03/2025',
    rinde: 'LEG-1092',
    trabajador: 'Carlos Muñoz',
    pago: 'Efectivo',
    docto: 'Factura #1092',
    monto: '$ 150.000',
    estado: 'Devuelto',
    estadoClass: 'dash-status--ok',
    esEmpresa: false,
    descripcion: 'Registro migrado del sistema anterior.',
    intento: 1,
    observacionAdmin: '',
    legacy: true
  }
])

const asignaciones = ref([
  {
    fechaHora: '23/07 11:37',
    conductor: 'Pedro González',
    patente: 'GH-88-12',
    doc: 'V-5541',
    observaciones: 'Viático ruta Copiapó',
    monto: '$ 150.000'
  },
  {
    fechaHora: '23/07 09:15',
    conductor: 'Mario Silva',
    patente: 'KJ-99-00',
    doc: 'V-5540',
    observaciones: 'Fondo emergencias peaje',
    monto: '$ 80.000'
  }
])

onMounted(async () => {
  await bootstrap()
  syncGastoLockedFields()
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

function onSaveRespuesta() {
  if (comentarioRequeridoAdmin.value && !modalResponder.comentario.trim()) {
    return
  }

  const row = movimientos.value.find((m) => m.rinde === modalResponder.rinde)
  if (row) {
    if (modalResponder.estado === 'corregir') {
      const campos = { ...modalResponder.campos }
      const alguno =
        campos.monto ||
        campos.comprobante ||
        campos.tipo_docto ||
        campos.origen_pago ||
        campos.descripcion
      if (!alguno) {
        campos.monto = true
        campos.comprobante = true
      }
      row.estado = 'Por Corregir'
      row.estadoClass = 'dash-status--danger'
      row.observacionAdmin = modalResponder.comentario.trim()
      row.visibilidadComentario = 'todos'
      row.camposCorregir = campos
    } else if (modalResponder.estado === 'rechazado') {
      row.estado = 'Rechazado'
      row.estadoClass = 'dash-status--danger'
      row.observacionAdmin = modalResponder.comentario.trim()
      row.visibilidadComentario = 'todos'
      row.camposCorregir = null
    } else if (modalResponder.comprobanteNombre) {
      row.estado = 'Devuelto'
      row.estadoClass = 'dash-status--ok'
      row.observacionAdmin = modalResponder.comentario.trim()
      row.visibilidadComentario = modalResponder.visibilidad
      row.camposCorregir = null
    } else {
      row.estado = 'Aprobado'
      row.estadoClass = 'dash-status--ok'
      row.observacionAdmin = modalResponder.comentario.trim()
      row.visibilidadComentario = modalResponder.visibilidad
      row.camposCorregir = null
    }
  }
  closeModalResponder()
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
  if (metodoPago === 'empresa_tarjeta') return 'Tarjeta Empresa'
  if (metodoPago === 'personal_tarjeta') return 'Tarjeta Personal'
  return 'Efectivo'
}

function onSaveCorreccion() {
  const row = movimientos.value.find((m) => m.rinde === modalCorregir.rinde)
  if (!row) {
    closeModalCorregir()
    return
  }

  const campos = modalCorregir.campos
  if (campos.tipo_docto) {
    row.docto = `${modalCorregir.tipo} #${modalCorregir.numeroLocked || 'S/N'}`
  }
  if (campos.monto) {
    row.monto = formatMontoCl(modalCorregir.monto)
  }
  if (campos.origen_pago) {
    row.metodoPago = modalCorregir.metodoPago
    row.pago = labelPago(modalCorregir.metodoPago)
    row.esEmpresa = modalCorregir.metodoPago === 'empresa_tarjeta'
  }
  if (campos.descripcion) {
    row.descripcion = modalCorregir.descripcion.trim()
  }
  if (modalCorregir.respuesta.trim()) {
    row.respuestaUsuario = modalCorregir.respuesta.trim()
  }
  if (campos.comprobante && modalCorregir.comprobanteNombre) {
    row.comprobanteNombre = modalCorregir.comprobanteNombre
  }

  row.intento = (row.intento || 1) + 1
  row.estado = 'Sin Devolución'
  row.estadoClass = 'dash-status--warn'
  row.observacionAdmin = ''
  row.camposCorregir = null
  closeModalCorregir()
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

function onSaveGasto() {
  if (palabrasDescripcion.value > 500) return
  if (!gasto.numero.trim()) return

  onGastoTrabajadorChange()

  let pago = 'Efectivo Personal'
  let esEmpresa = false

  if (gasto.metodoPago === 'empresa_tarjeta' && gasto.tarjetaEmpresaKey) {
    const [tipo, ultimos4] = gasto.tarjetaEmpresaKey.split('|')
    pago = `${tipo} Emp. (•••• ${ultimos4})`
    esEmpresa = true
  } else if (gasto.metodoPago === 'personal_tarjeta') {
    pago = `${gasto.tipoPersonal} Pers. (•••• ${gasto.ultimos4 || '----'})`
  }

  // ID interno autoincremental (no se muestra en el formulario de creación)
  const rinde = peekNextRinde()

  movimientos.value.unshift({
    fecha: gasto.fecha.split('-').reverse().join('/'),
    rinde,
    trabajador: gasto.trabajador || nombreSesion.value,
    pago,
    docto: `${gasto.tipo}${gasto.numero ? ` #${gasto.numero}` : ''}`,
    monto: formatMonto(gasto.monto),
    estado: 'Sin Devolución',
    estadoClass: 'dash-status--warn',
    esEmpresa,
    metodoPago: gasto.metodoPago,
    descripcion: gasto.descripcion || '',
    intento: 1,
    observacionAdmin: '',
    camposCorregir: null,
    legacy: false
  })

  gasto.numero = ''
  gasto.monto = ''
  gasto.descripcion = ''
  gasto.comprobanteNombre = ''
}

function onSaveAsignacion() {
  // UI mock por ahora
}

function onGenerarInforme() {
  informeResultado.titulo = `Resultado del Informe: ${informe.tipo}`
  informeResultado.periodo = `Periodo: ${informe.desde} al ${informe.hasta} • Caja: FAENA NORTE`
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
  cajaForm.responsable = ''
  cajaForm.fondoEstimado = ''
  cajaForm.mes = mesActivo.value
  cajaForm.estado = 'activa'
  cajaForm.editIndex = null
  cajaForm.mesOriginal = null
  cajaForm.groupKeyOriginal = null
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
  cajaForm.responsable = caja.responsable
  cajaForm.fondoEstimado = String(caja.fondoEstimado).replace(/\D/g, '')
  cajaForm.mes = caja.mes
  cajaForm.estado = caja.estado
  cajaForm.editIndex = realIndex
  cajaForm.mesOriginal = caja.mes
  cajaForm.groupKeyOriginal = caja.groupKey
}

function onSaveCaja() {
  const groupKey = resolveGroupKey()
  const displayName = cajaForm.displayName.trim()
  if (!groupKey || !displayName) return
  if (!cajaForm.fondoEstimado) return

  const payloadBase = {
    groupKey,
    displayName,
    centroCosto: cajaForm.centroCosto.trim() || '—',
    responsable: cajaForm.responsable || '—',
    fondoEstimado: formatMonto(cajaForm.fondoEstimado),
    mes: cajaForm.mes,
    estado: cajaForm.estado
  }

  if (cajaForm.editIndex === null) {
    const existente = cajas.value.findIndex(
      (c) => c.groupKey === groupKey && c.mes === cajaForm.mes
    )
    if (existente >= 0) {
      cajas.value[existente] = payloadBase
    } else {
      cajas.value.push(payloadBase)
    }
    if (!cajaActiva.value) cajaActiva.value = groupKey
    resetCajaForm()
    return
  }

  // Edición: cambiar mes → nuevo registro del mismo group_key
  if (cajaForm.mesOriginal && cajaForm.mes !== cajaForm.mesOriginal) {
    const existente = cajas.value.findIndex(
      (c) => c.groupKey === groupKey && c.mes === cajaForm.mes
    )
    if (existente >= 0) {
      cajas.value[existente] = payloadBase
    } else {
      cajas.value.push(payloadBase)
    }
    resetCajaForm()
    return
  }

  cajas.value[cajaForm.editIndex] = payloadBase
  resetCajaForm()
}

function resetAdminForm() {
  adminForm.rut = ''
  adminForm.nombre = ''
  adminForm.correo = ''
  adminForm.rol = creatableAdminRoles.value[0] || ROLE_ADMIN_CAJA
  adminForm.passType = 'rut'
  adminForm.password = ''
}

function shortAdminRol(rol) {
  if (rol.includes('Dev')) return ROLE_DEV
  if (rol.includes('Administrador de Caja') || rol.includes('Admin Caja')) {
    return 'Admin Caja'
  }
  return ROLE_SUPER
}

function onSaveAdmin() {
  if (!canCreateAdmins.value) return
  if (!adminForm.rut.trim() || !adminForm.nombre.trim() || !adminForm.correo.trim()) return
  if (!validarRutChileno(adminForm.rut)) return
  if (!creatableAdminRoles.value.includes(adminForm.rol)) return
  if (adminForm.passType === 'manual' && !adminForm.password.trim()) return

  // Mock: clave temporal (RUT o manual) lista para BD
  const passwordTemporal =
    adminForm.passType === 'manual'
      ? adminForm.password
      : passwordFromRut(adminForm.rut)

  if (!passwordTemporal) return

  admins.value.push({
    rut: adminForm.rut.trim(),
    nombre: adminForm.nombre.trim(),
    correo: adminForm.correo.trim(),
    rol: shortAdminRol(adminForm.rol),
    estado: 'Activo',
    passwordTemporal
  })

  resetAdminForm()
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

function onSaveUsuario() {
  if (!canCreateUsuarios.value) return
  if (!usuarioForm.correo.trim() || !usuarioForm.trabajadorId) return

  let trabajadorNombre = ''
  let cargo = ''
  let trabajadorId = null
  let rutTrabajador = ''

  if (usuarioForm.trabajadorId === 'nuevo') {
    if (!usuarioForm.nuevoRut.trim() || !usuarioForm.nuevoNombre.trim()) return
    if (!validarRutChileno(usuarioForm.nuevoRut)) return
    const nextId = Math.max(0, ...trabajadores.value.map((t) => t.id)) + 1
    trabajadores.value.push({
      id: nextId,
      rut: usuarioForm.nuevoRut.trim(),
      nombre: usuarioForm.nuevoNombre.trim(),
      cargo: usuarioForm.nuevoCargo.trim() || '—',
      tieneUsuario: true
    })
    trabajadorId = nextId
    trabajadorNombre = usuarioForm.nuevoNombre.trim()
    cargo = usuarioForm.nuevoCargo.trim() || '—'
    rutTrabajador = usuarioForm.nuevoRut.trim()
  } else {
    const t = trabajadores.value.find((x) => String(x.id) === usuarioForm.trabajadorId)
    if (!t) return
    t.tieneUsuario = true
    trabajadorId = t.id
    trabajadorNombre = t.nombre
    cargo = t.cargo
    rutTrabajador = t.rut
  }

  if (usuarioForm.passType === 'manual' && !usuarioForm.password.trim()) return

  const passwordTemporal =
    usuarioForm.passType === 'manual'
      ? usuarioForm.password
      : passwordFromRut(rutTrabajador)

  if (!passwordTemporal) return

  const payload = {
    correo: usuarioForm.correo.trim(),
    trabajador: trabajadorNombre,
    cargo,
    trabajadorId,
    passwordTemporal
  }

  if (usuarioForm.editIndex === null) {
    usuarios.value.push(payload)
  } else {
    usuarios.value[usuarioForm.editIndex] = payload
  }

  resetUsuarioForm()
}

function onSaveTrabajador() {
  if (!trabajadorForm.rut.trim() || !trabajadorForm.nombre.trim()) return
  const nextId = Math.max(0, ...trabajadores.value.map((t) => t.id)) + 1
  trabajadores.value.push({
    id: nextId,
    rut: trabajadorForm.rut.trim(),
    nombre: trabajadorForm.nombre.trim(),
    cargo: trabajadorForm.cargo.trim() || '—',
    tieneUsuario: false
  })
  trabajadorForm.rut = ''
  trabajadorForm.nombre = ''
  trabajadorForm.cargo = ''
}

function onSaveTarjeta() {
  if (!tarjetaForm.alias.trim() || !tarjetaForm.ultimos4.trim()) return
  tarjetasEmpresa.value.push({
    alias: tarjetaForm.alias.trim(),
    tipo: tarjetaForm.tipo,
    ultimos4: tarjetaForm.ultimos4.trim(),
    banco: tarjetaForm.banco.trim() || '—',
    titular: tarjetaForm.titular.trim() || '—',
    estado: 'Activa'
  })
  tarjetaForm.alias = ''
  tarjetaForm.tipo = 'Crédito'
  tarjetaForm.ultimos4 = ''
  tarjetaForm.banco = ''
  tarjetaForm.titular = ''
}

async function onLogout() {
  // TEMP_AUTH_BYPASS — revertir antes de commit
  if (TEMP_AUTH_BYPASS) {
    sessionStorage.removeItem('TEMP_AUTH_BYPASS_OK')
  }
  await logout()
}
</script>
