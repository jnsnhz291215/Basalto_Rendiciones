<template>
  <div class="dash">
    <header class="dash-header">
      <div class="dash-brand">
        <img class="dash-logo" src="/logoBASALTO.png" alt="Basalto Drilling" />
      </div>

      <div class="dash-header-actions">
        <div class="dash-user-menu" ref="userMenuEl">
          <button
            class="dash-user-menu-btn"
            type="button"
            :aria-expanded="userMenuOpen"
            aria-haspopup="menu"
            @click="userMenuOpen = !userMenuOpen"
          >
            <div class="dash-avatar">{{ initials }}</div>
            <span class="dash-user-menu-caret">▾</span>
          </button>
          <div v-if="userMenuOpen" class="dash-user-dropdown" role="menu">
            <button class="dash-user-dropdown-item" type="button" role="menuitem" @click="openModalPerfil">
              Mi Perfil / Cambiar Contraseña
            </button>
            <button class="dash-user-dropdown-item dash-user-dropdown-item--danger" type="button" role="menuitem" @click="onLogout">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Modal credenciales tras crear usuario -->
    <div
      v-if="modalCredenciales.open"
      class="dash-modal-backdrop"
      @click.self="closeModalCredenciales"
    >
      <div class="dash-modal" role="dialog" aria-modal="true">
        <div class="dash-modal-head">
          <h3>Usuario creado</h3>
          <button class="dash-modal-close" type="button" aria-label="Cerrar" @click="closeModalCredenciales">
            ×
          </button>
        </div>
        <p class="dash-hint">Guarda estas credenciales. La contraseña no se volverá a mostrar.</p>
        <div class="dash-cred-grid">
          <div><span class="dash-cred-label">Nombre</span><strong>{{ modalCredenciales.nombre }}</strong></div>
          <div><span class="dash-cred-label">RUT</span><strong class="dash-mono">{{ modalCredenciales.rut }}</strong></div>
          <div><span class="dash-cred-label">Correo</span><strong>{{ modalCredenciales.correo }}</strong></div>
          <div><span class="dash-cred-label">Rol</span><strong>{{ modalCredenciales.rol }}</strong></div>
          <div class="dash-cred-pass">
            <span class="dash-cred-label">Contraseña</span>
            <strong class="dash-mono">{{ modalCredenciales.password }}</strong>
          </div>
        </div>
        <div class="dash-modal-actions">
          <button class="dash-btn-secondary" type="button" @click="closeModalCredenciales">Cerrar</button>
          <button class="dash-btn-primary" type="button" @click="copyCredenciales">
            {{ credencialesCopied ? '✓ Copiado' : 'Copiar Credenciales' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Mi Perfil -->
    <div
      v-if="modalPerfil.open"
      class="dash-modal-backdrop"
      @click.self="closeModalPerfil"
    >
      <div class="dash-modal" role="dialog" aria-modal="true">
        <div class="dash-modal-head">
          <h3>Mi Perfil</h3>
          <button class="dash-modal-close" type="button" aria-label="Cerrar" @click="closeModalPerfil">
            ×
          </button>
        </div>
        <form class="dash-admin-form" @submit.prevent="onSavePerfil">
          <div class="dash-field">
            <label>RUT</label>
            <input :value="formatRut(user?.rut || '')" type="text" disabled class="dash-mono" />
          </div>
          <div class="dash-field">
            <label>Correo</label>
            <input v-model="modalPerfil.correo" type="email" required placeholder="correo@empresa.cl" />
          </div>
          <p class="dash-hint">Cambiar contraseña (opcional)</p>
          <div class="dash-field">
            <label>Contraseña actual</label>
            <input v-model="modalPerfil.passwordActual" type="password" autocomplete="current-password" />
          </div>
          <div class="dash-field">
            <label>Nueva contraseña</label>
            <input v-model="modalPerfil.passwordNueva" type="password" autocomplete="new-password" />
          </div>
          <p v-if="modalPerfil.error" class="error" role="alert">{{ modalPerfil.error }}</p>
          <p v-if="modalPerfil.ok" class="dash-hint dash-hint--ok">{{ modalPerfil.ok }}</p>
          <div class="dash-modal-actions">
            <button class="dash-btn-secondary" type="button" @click="closeModalPerfil">Cancelar</button>
            <button class="dash-btn-primary" type="submit">Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Personal / Usuarios (crear o editar) -->
    <div
      v-if="modalPersonal.open"
      class="dash-modal-backdrop"
      @click.self="closeModalPersonal"
    >
      <div class="dash-modal dash-modal--wide" role="dialog" aria-modal="true">
        <div class="dash-modal-head">
          <h3>{{ modalPersonal.id ? 'Editar Personal' : 'Nuevo Personal' }}</h3>
          <button
            class="dash-modal-close"
            type="button"
            aria-label="Cerrar"
            @click="closeModalPersonal"
          >
            ×
          </button>
        </div>
        <form class="dash-admin-form" @submit.prevent="onSavePersonal">
          <h4 class="dash-modal-section-title">Ficha</h4>
          <div class="dash-caja-grid-3">
            <div class="dash-field">
              <div class="dash-desc-head">
                <label>RUT</label>
                <span
                  class="dash-rut-status"
                  :class="`dash-rut-status--${personalModalRutStatus.state}`"
                >
                  {{ personalModalRutStatus.text }}
                </span>
              </div>
              <input
                :value="modalPersonal.rut"
                type="text"
                placeholder="12.345.678-9"
                required
                @input="modalPersonal.rut = fromRutInput($event.target.value).display"
              />
            </div>
            <div class="dash-field">
              <label>Nombre</label>
              <input
                v-model="modalPersonal.nombre"
                type="text"
                required
                placeholder="Mario Silva"
              />
            </div>
            <div class="dash-field">
              <label>Cargo</label>
              <input
                v-model="modalPersonal.cargo"
                type="text"
                placeholder="Conductor Camión Riego"
              />
            </div>
          </div>

          <div class="dash-field dash-admin-form-section">
            <label>Cajas asignadas</label>
            <p class="dash-hint">Al rendir por su cuenta, solo verá estas cajas.</p>
            <div class="dash-checkbox-list">
              <label
                v-for="c in cajasActivasOpciones"
                :key="c.groupKey"
                class="dash-check"
              >
                <input
                  v-model="modalPersonal.cajas"
                  type="checkbox"
                  :value="c.groupKey"
                />
                <span>{{ c.label }}</span>
              </label>
            </div>
          </div>

          <div class="dash-personal-access-toggle dash-admin-form-section">
            <label class="dash-switch">
              <input v-model="modalPersonal.crearUsuario" type="checkbox" />
              <span class="dash-switch-ui" aria-hidden="true"></span>
              <span class="dash-switch-label">
                {{
                  modalPersonal.usuarioId
                    ? 'Gestionar acceso al sistema'
                    : 'Habilitar acceso al sistema (crear usuario)'
                }}
              </span>
            </label>
          </div>

          <template v-if="modalPersonal.crearUsuario">
            <h4 class="dash-modal-section-title">Acceso de usuario</h4>
            <div class="dash-caja-grid-2">
              <div class="dash-field">
                <label>Correo</label>
                <input
                  v-model="modalPersonal.correo"
                  type="email"
                  :required="modalPersonal.crearUsuario"
                  placeholder="usuario@basaltodrilling.cl"
                />
              </div>
              <div class="dash-field">
                <label>Rol</label>
                <select v-model="modalPersonal.rol">
                  <option value="USER_RENDIDOR">Usuario Rendidor</option>
                </select>
              </div>
            </div>
            <div class="dash-field" v-if="modalPersonal.usuarioId">
              <label>Estado</label>
              <select v-model="modalPersonal.estado">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div class="dash-admin-form-section">
              <label class="dash-field-label">
                {{ modalPersonal.usuarioId ? 'Nueva contraseña (opcional)' : 'Contraseña temporal' }}
              </label>
              <div class="dash-radio-row">
                <label class="dash-radio">
                  <input v-model="modalPersonal.passType" type="radio" value="rut" />
                  <span>Basada en RUT</span>
                </label>
                <label class="dash-radio">
                  <input v-model="modalPersonal.passType" type="radio" value="manual" />
                  <span>Manual</span>
                </label>
                <label v-if="modalPersonal.usuarioId" class="dash-radio">
                  <input v-model="modalPersonal.passType" type="radio" value="keep" />
                  <span>Sin cambiar</span>
                </label>
              </div>
              <input
                v-if="modalPersonal.passType === 'manual'"
                v-model="modalPersonal.password"
                type="password"
                class="dash-input-dark"
                placeholder="••••••••"
                autocomplete="new-password"
              />
            </div>
          </template>

          <p v-if="modalPersonal.error" class="error" role="alert">
            {{ modalPersonal.error }}
          </p>
          <div class="dash-modal-actions">
            <button class="dash-btn-secondary" type="button" @click="closeModalPersonal">
              Cancelar
            </button>
            <button class="dash-btn-primary" type="submit">Guardar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal editar admin -->
    <div
      v-if="modalEditAdmin.open"
      class="dash-modal-backdrop"
      @click.self="closeModalEditAdmin"
    >
      <div class="dash-modal" role="dialog" aria-modal="true">
        <div class="dash-modal-head">
          <h3>Editar Administrador</h3>
          <button
            class="dash-modal-close"
            type="button"
            aria-label="Cerrar"
            @click="closeModalEditAdmin"
          >
            ×
          </button>
        </div>
        <form class="dash-admin-form" @submit.prevent="onSaveEditAdmin">
          <div class="dash-field">
            <label>RUT</label>
            <input :value="formatRut(modalEditAdmin.rut)" type="text" disabled class="dash-mono" />
          </div>
          <div class="dash-field">
            <label>Nombre Completo</label>
            <input
              v-model="modalEditAdmin.nombre"
              type="text"
              required
              placeholder="Juan Sanhueza"
            />
          </div>
          <div class="dash-field">
            <label>Correo Electrónico</label>
            <input
              v-model="modalEditAdmin.correo"
              type="email"
              required
              placeholder="jsanhueza@basaltodrilling.cl"
            />
          </div>
          <div class="dash-field">
            <label>Rol</label>
            <select v-model="modalEditAdmin.rol" :disabled="!editableAdminRoles.length">
              <option v-for="rol in editableAdminRoles" :key="rol" :value="rol">
                {{ rol }}
              </option>
            </select>
          </div>
          <div class="dash-field">
            <label>Estado</label>
            <select v-model="modalEditAdmin.estado">
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <p v-if="modalEditAdmin.error" class="error" role="alert">{{ modalEditAdmin.error }}</p>
          <div class="dash-modal-actions">
            <button class="dash-btn-secondary" type="button" @click="closeModalEditAdmin">
              Cancelar
            </button>
            <button class="dash-btn-primary" type="submit">Guardar</button>
          </div>
        </form>
      </div>
    </div>

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

        <div v-if="isAdminSession" class="dash-sidebar-bottom">
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
                <p class="dash-metric-label">
                  {{ cajaSeleccionadaCc || 'Centro de cobro / empresa' }}
                </p>
                <p class="dash-metric-value dash-metric-value--ok dash-metric-value--text">
                  {{ cajaSeleccionadaExterior }}
                </p>
              </div>
              <span
                class="dash-chip"
                :class="cajaSeleccionadaEstadoClass"
              >
                {{ resumenLoading ? '…' : cajaSeleccionadaEstado }}
              </span>
            </div>

            <div class="dash-metric-card">
              <div>
                <p class="dash-metric-label">Gastos Rendidos (Mes)</p>
                <p class="dash-metric-value">
                  {{ formatMonto(resumenCaja.gastos_rendidos.total) }}
                </p>
              </div>
              <span class="dash-chip">
                {{ resumenCaja.gastos_rendidos.cantidad }} Doctos
              </span>
            </div>

            <div class="dash-metric-card">
              <div>
                <p class="dash-metric-label">Gastos agregados (Mes)</p>
                <p class="dash-metric-value">
                  {{ resumenCaja.gastos_rendidos.cantidad }}
                </p>
              </div>
              <span class="dash-chip">
                {{ labelMesCorto(mesActivo) }}
              </span>
            </div>

            <div class="dash-metric-card">
              <div>
                <p class="dash-metric-label">Anticipos Conductores</p>
                <p class="dash-metric-value dash-metric-value--accent">
                  {{ formatMonto(resumenCaja.anticipos_pendientes.total) }}
                </p>
              </div>
              <span class="dash-chip dash-chip--accent">
                {{ resumenCaja.anticipos_pendientes.cantidad }} Pendientes
              </span>
            </div>
          </div>
        </section>

        <div v-if="visibleTabs.length > 1" class="dash-tabs-bar">
          <div class="dash-tabs">
            <button
              v-for="tab in visibleTabs"
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
              <button v-if="isAdminSession" class="dash-btn-excel" type="button">
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
                <div class="dash-alert dash-alert--warn">
                  <p>
                    <strong>Importante:</strong> una vez subida, la rendición
                    <strong>no se puede editar ni eliminar</strong>. Revise bien los datos antes de
                    guardar.
                  </p>
                  <p>
                    Si adjunta una <strong>foto</strong> (no PDF), asegúrese de que se vea
                    claramente el <strong>cobro/total</strong>. En facturas, también debe verse el
                    <strong>número de factura</strong>.
                  </p>
                </div>
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
                  <div v-if="canIngresarPorOtros" class="dash-combobox">
                    <input
                      v-model="gastoTrabajadorQuery"
                      type="text"
                      class="dash-combobox-input"
                      placeholder="Buscar por nombre…"
                      autocomplete="off"
                      @focus="onGastoTrabajadorFocus"
                      @input="onGastoTrabajadorQueryInput"
                      @keydown.down.prevent="highlightGastoTrabajador(1)"
                      @keydown.up.prevent="highlightGastoTrabajador(-1)"
                      @keydown.enter.prevent="confirmGastoTrabajadorHighlight"
                      @keydown.escape="gastoTrabajadorOpen = false"
                      @blur="onGastoTrabajadorBlur"
                    />
                    <ul
                      v-if="gastoTrabajadorOpen && gastoTrabajadorOpciones.length"
                      class="dash-combobox-list"
                      role="listbox"
                    >
                      <li
                        v-for="(opt, idx) in gastoTrabajadorOpciones"
                        :key="opt.id"
                        class="dash-combobox-option"
                        :class="{ 'dash-combobox-option--active': idx === gastoTrabajadorHighlight }"
                        role="option"
                        @mousedown.prevent="selectGastoTrabajador(opt)"
                      >
                        {{ opt.label }}
                      </li>
                    </ul>
                    <p
                      v-else-if="gastoTrabajadorOpen && gastoTrabajadorQuery.trim()"
                      class="dash-field-hint"
                    >
                      Sin coincidencias.
                    </p>
                  </div>
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
                    v-if="!cajasDisponiblesParaGasto.length && hintCajasGasto"
                    class="dash-hint dash-hint--inline"
                  >
                    {{ hintCajasGasto }}
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
                  <label>Adjuntar Comprobante (PDF / PNG / JPG) *</label>
                  <input
                    ref="gastoFileInputEl"
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    class="dash-file"
                    required
                    @change="onGastoFile"
                  />
                  <span v-if="gasto.comprobanteNombre" class="dash-field-hint">
                    Archivo: {{ gasto.comprobanteNombre }}
                  </span>
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
              <p>
                Seguimiento de
                {{ isAdminSession ? 'gastos declarados' : 'tus gastos declarados' }}
                y su estado de reembolso.
              </p>
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
              <div v-if="isAdminSession" class="dash-historial-search">
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
                <th class="dash-table-center">
                  {{ isAdminSession ? 'Acciones (Admin)' : 'Acciones' }}
                </th>
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
                <td class="dash-mono dash-nowrap">{{ row.subidoEl || '-' }}</td>
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
                  <span v-else class="dash-muted">-</span>
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
                    <template v-if="isAdminSession">
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
                      <span v-else-if="row.legacy" class="dash-badge dash-badge--legacy"
                        >Solo lectura</span
                      >
                      <span v-else class="dash-muted">-</span>
                      <button
                        v-if="row.estado === 'Por Corregir' && !row.legacy"
                        class="dash-btn-ghost-sm"
                        type="button"
                        title="Responder como administrador"
                        @click="openModalResponder(row)"
                      >
                        Admin
                      </button>
                      <button
                        v-if="canDevForceDelete && !row.legacy && row.id"
                        class="dash-btn-icon dash-btn-icon--danger"
                        type="button"
                        title="Hard delete (Dev)"
                        @click="onHardDeleteRendicion(row)"
                      >
                        <i class="fa-solid fa-trash" aria-hidden="true"></i>
                      </button>
                    </template>
                    <template v-else>
                      <button
                        v-if="row.estado === 'Por Corregir' && !row.legacy"
                        class="dash-btn-edit"
                        type="button"
                        @click="openModalCorregir(row)"
                      >
                        Corregir Rendición
                      </button>
                      <button
                        v-if="canDevForceDelete && !row.legacy && row.id"
                        class="dash-btn-icon dash-btn-icon--danger"
                        type="button"
                        title="Hard delete (Dev)"
                        @click="onHardDeleteRendicion(row)"
                      >
                        <i class="fa-solid fa-trash" aria-hidden="true"></i>
                      </button>
                      <span v-else-if="!(row.estado === 'Por Corregir' && !row.legacy)" class="dash-muted">-</span>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modal verificación IA del comprobante -->
        <div
          v-if="modalVerificar.open"
          class="dash-modal-backdrop"
          @click.self="onCloseModalVerificar"
        >
          <div
            class="dash-modal dash-modal--verify"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-verificar-title"
          >
            <div class="dash-modal-head">
              <div>
                <h3 id="modal-verificar-title">Confirmando carga de documento</h3>
                <p class="dash-hint">
                  La IA revisa que el monto
                  <template v-if="gasto.tipo === 'Factura'"> y el N° de factura</template>
                  sean legibles y coincidan.
                </p>
              </div>
              <button
                v-if="modalVerificar.phase !== 'loading'"
                class="dash-modal-close"
                type="button"
                @click="onCloseModalVerificar"
              >
                &times;
              </button>
            </div>

            <div v-if="modalVerificar.phase === 'loading'" class="dash-verify-body">
              <div class="dash-verify-spinner" aria-hidden="true"></div>
              <p class="dash-verify-status">Analizando comprobante…</p>
              <p class="dash-field-hint">Esto puede tomar unos segundos.</p>
            </div>

            <div v-else-if="modalVerificar.phase === 'error'" class="dash-verify-body">
              <p class="dash-verify-error" role="alert">
                {{ modalVerificar.error }}
              </p>
              <ul v-if="modalVerificar.errores.length > 1" class="dash-verify-errores">
                <li v-for="(e, i) in modalVerificar.errores" :key="i">{{ e }}</li>
              </ul>
              <div class="dash-field">
                <label>Reemplazar documento (foto/PDF más claro)</label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  class="dash-file"
                  @change="onVerificarReplaceFile"
                />
                <span v-if="gasto.comprobanteNombre" class="dash-field-hint">
                  Actual: {{ gasto.comprobanteNombre }}
                </span>
              </div>
              <div class="dash-modal-actions">
                <button class="dash-btn-secondary" type="button" @click="onCloseModalVerificar">
                  Cancelar
                </button>
                <button
                  class="dash-btn-primary"
                  type="button"
                  :disabled="!gastoComprobanteFile"
                  @click="retryVerificarYGuardar"
                >
                  Reintentar verificación
                </button>
              </div>
            </div>

            <div v-else-if="modalVerificar.phase === 'ok'" class="dash-verify-body">
              <p class="dash-verify-ok">Documento validado. Guardando rendición…</p>
            </div>
          </div>
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
      <div v-else-if="activeTab === 'asignacion' && isAdminSession" class="dash-assign">
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
                <th v-if="canDevForceDelete" class="dash-table-center">Acciones</th>
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
                  <span v-else class="dash-adjunto-empty">-</span>
                </td>
                <td class="dash-table-right dash-rinde">{{ row.monto }}</td>
                <td v-if="canDevForceDelete" class="dash-table-center dash-table-actions">
                  <button
                    v-if="row.id"
                    class="dash-btn-icon dash-btn-icon--danger"
                    type="button"
                    title="Hard delete (Dev)"
                    @click="onHardDeleteAnticipo(row)"
                  >
                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Informes y Cartola -->
      <div v-else-if="activeTab === 'informes' && isAdminSession" class="dash-informes">
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

      <!-- Cajas -->
      <div v-else-if="activeTab === 'cajas' && isAdminSession" class="dash-cajas-gestion">
        <div class="dash-cajas-toolbar">
          <div>
            <h3 class="dash-cajas-toolbar-title">Cajas</h3>
            <p class="dash-cajas-toolbar-hint">
              El centro de cobro / empresa es el agrupador (antes nombre interior). Si ya tienen
              datos, no se pueden editar ni eliminar.
            </p>
          </div>
          <button
            class="dash-btn-primary dash-btn-toggle-caja"
            type="button"
            @click="toggleFormCaja"
          >
            <span>{{ cajaFormOpen ? '▲' : '＋' }}</span>
            <span>{{ cajaFormOpen ? 'Ocultar Formulario' : 'Nueva Caja' }}</span>
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
                {{ cajaForm.editId ? 'Editar Caja' : 'Nueva Caja' }}
              </h2>
              <p class="dash-hint">
                Centro de cobro / empresa + nombre visible. Si la caja acumula datos, no se podrá
                editar ni eliminar.
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
            <div class="dash-caja-grid-2">
              <div class="dash-field">
                <label>Centro de cobro / empresa</label>
                <select v-model="cajaForm.centroCobroId" required :disabled="Boolean(cajaForm.editId)">
                  <option disabled value="">Seleccionar…</option>
                  <option v-for="cc in centrosCosto" :key="cc.id" :value="cc.id">
                    {{ cc.nombre }}
                  </option>
                </select>
                <span v-if="cajaForm.editId" class="dash-field-hint">
                  El centro de cobro / empresa no se puede cambiar.
                </span>
              </div>
              <div class="dash-field">
                <label>Nombre Exterior</label>
                <input
                  v-model="cajaForm.displayName"
                  type="text"
                  placeholder="Ej: Caja Faena Norte"
                  required
                />
              </div>
            </div>

            <div class="dash-caja-form-actions">
              <button class="dash-btn-secondary" type="button" @click="closeFormCaja">
                Cancelar
              </button>
              <button class="dash-btn-primary" type="submit">
                <span>{{ cajaForm.editId ? 'Guardar Cambios' : 'Guardar Caja' }}</span>
              </button>
            </div>
          </form>
            </div>
          </div>
        </div>

        <div v-if="!cajasPorCentro.length" class="dash-cajas-empty">
          No hay cajas ni centros de cobro / empresa.
        </div>
        <div v-else class="dash-cc-accordion">
          <div
            v-for="grupo in cajasPorCentro"
            :key="grupo.key"
            class="dash-cc-accordion-item"
          >
            <button
              class="dash-cc-accordion-head"
              type="button"
              @click="toggleCcAccordion(grupo.key)"
            >
              <span class="dash-cc-accordion-chevron">
                {{ ccAccordionOpen[grupo.key] ? '▼' : '▶' }}
              </span>
              <span class="dash-cc-accordion-title">{{ grupo.titulo }}</span>
              <span class="dash-cc-accordion-count">{{ grupo.cajas.length }} caja(s)</span>
            </button>
            <div
              class="dash-collapse"
              :class="{ 'dash-collapse--open': ccAccordionOpen[grupo.key] }"
            >
              <div class="dash-collapse-inner">
                <div class="dash-table-wrap dash-cajas-list dash-cc-accordion-body">
                  <table v-if="grupo.cajas.length" class="dash-table">
                    <thead>
                      <tr>
                        <th>Nombre Exterior</th>
                        <th class="dash-table-right">Total Mes</th>
                        <th class="dash-table-right">Total Año</th>
                        <th class="dash-table-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="caja in grupo.cajas" :key="caja.id || caja.groupKey">
                        <td class="dash-table-strong">{{ caja.displayName }}</td>
                        <td class="dash-table-right dash-table-amount">{{ formatMonto(caja.totalMes) }}</td>
                        <td class="dash-table-right dash-table-amount">{{ formatMonto(caja.totalAnio) }}</td>
                        <td class="dash-table-center dash-table-actions">
                          <template v-if="caja.tieneDatos && !canDevForceDelete">
                            <span class="dash-field-hint" title="Ya tiene datos asociados">
                              Bloqueada
                            </span>
                          </template>
                          <template v-else>
                            <button
                              class="dash-btn-edit"
                              type="button"
                              @click="onEditCaja(caja)"
                            >
                              Editar
                            </button>
                            <button
                              class="dash-btn-icon dash-btn-icon--danger"
                              type="button"
                              :title="canDevForceDelete ? 'Hard delete (Dev)' : 'Eliminar'"
                              @click="onDeleteCaja(caja)"
                            >
                              <i class="fa-solid fa-trash" aria-hidden="true"></i>
                            </button>
                          </template>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-else class="dash-cc-accordion-empty">Sin cajas en este centro.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Centro de cobro / empresa -->
      <div v-else-if="activeTab === 'centros-costo' && isAdminSession" class="dash-cajas-gestion">
        <div class="dash-cajas-toolbar">
          <div>
            <h3 class="dash-cajas-toolbar-title">Centro de cobro / empresa</h3>
            <p class="dash-cajas-toolbar-hint">
              ID automático y nombre. Si ya tiene cajas o datos, no se puede editar ni eliminar.
            </p>
          </div>
          <button
            class="dash-btn-primary dash-btn-toggle-caja"
            type="button"
            @click="toggleFormCc"
          >
            <span>{{ ccFormOpen ? '▲' : '＋' }}</span>
            <span>{{ ccFormOpen ? 'Ocultar Formulario' : 'Nuevo centro' }}</span>
          </button>
        </div>

        <div class="dash-collapse" :class="{ 'dash-collapse--open': ccFormOpen }">
          <div class="dash-collapse-inner">
            <div class="dash-panel dash-caja-form-panel dash-collapse-panel">
              <div class="dash-caja-form-head">
                <div>
                  <h2 class="dash-assign-title dash-assign-title--flush">
                    {{
                      ccForm.editId
                        ? 'Editar centro de cobro / empresa'
                        : 'Nuevo centro de cobro / empresa'
                    }}
                  </h2>
                  <p class="dash-hint">
                    Solo el nombre. El ID se asigna solo. Elige bien el nombre: si luego tiene
                    cajas o datos, no se podrá cambiar ni borrar.
                  </p>
                </div>
                <button
                  class="dash-modal-close"
                  type="button"
                  aria-label="Cerrar formulario"
                  @click="closeFormCc"
                >
                  ×
                </button>
              </div>

              <form class="dash-caja-form" @submit.prevent="onSaveCentroCosto">
                <div class="dash-field">
                  <label>Nombre</label>
                  <input
                    v-model="ccForm.nombre"
                    type="text"
                    placeholder="Ej: Basalto Norte"
                    required
                  />
                </div>
                <div class="dash-caja-form-actions">
                  <button class="dash-btn-secondary" type="button" @click="closeFormCc">
                    Cancelar
                  </button>
                  <button class="dash-btn-primary" type="submit">
                    {{ ccForm.editId ? 'Guardar Cambios' : 'Guardar' }}
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
                <th>ID</th>
                <th>Nombre</th>
                <th class="dash-table-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cc in centrosCosto" :key="cc.id">
                <td class="dash-mono">{{ cc.id }}</td>
                <td>{{ cc.nombre || '-' }}</td>
                <td class="dash-table-center dash-table-actions">
                  <template v-if="cc.tieneDatos && !canDevForceDelete">
                    <span class="dash-field-hint" title="Ya tiene cajas o datos asociados">
                      Bloqueada
                    </span>
                  </template>
                  <template v-else>
                    <button
                      class="dash-btn-icon"
                      type="button"
                      title="Editar"
                      @click="onEditCentroCosto(cc)"
                    >
                      <i class="fa-solid fa-pen" aria-hidden="true"></i>
                    </button>
                    <button
                      class="dash-btn-icon dash-btn-icon--danger"
                      type="button"
                      :title="canDevForceDelete ? 'Hard delete (Dev)' : 'Eliminar'"
                      @click="onDeleteCentroCosto(cc)"
                    >
                      <i class="fa-solid fa-trash" aria-hidden="true"></i>
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
        </template>

        <div v-else-if="isAdminSession" class="dash-admin">
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
                      :value="adminForm.rut"
                      type="text"
                      placeholder="12.345.678-9"
                      @input="adminForm.rut = fromRutInput($event.target.value).display"
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

            <div class="dash-admin-filters">
              <div class="dash-historial-search">
                <label class="dash-sr-only" for="admin-buscar">Buscar administrador</label>
                <input
                  id="admin-buscar"
                  v-model="adminBusqueda"
                  type="search"
                  placeholder="Buscar por nombre o RUT…"
                  class="dash-search-input"
                />
              </div>
            </div>

            <div class="dash-table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>RUT</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th class="dash-table-center">Estado</th>
                    <th v-if="canCreateAdmins" class="dash-table-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="admin in adminsFiltrados" :key="admin.id || admin.rut">
                    <td class="dash-table-strong dash-mono">{{ admin.rut || '-' }}</td>
                    <td>{{ admin.nombre || '-' }}</td>
                    <td>{{ admin.correo || '-' }}</td>
                    <td>
                      <span class="dash-badge dash-badge--accent">{{ admin.rol }}</span>
                    </td>
                    <td class="dash-table-center">
                      <button
                        v-if="canToggleAdminEstado && admin.id"
                        type="button"
                        class="dash-status dash-status--toggle"
                        :class="admin.estado === 'Activo' ? 'dash-status--ok' : 'dash-status--warn'"
                        :title="
                          admin.id === user?.id
                            ? 'No puedes cambiar tu propio estado'
                            : admin.estado === 'Activo'
                              ? 'Click para desactivar'
                              : 'Click para activar'
                        "
                        :disabled="admin.id === user?.id || togglingEstadoId === admin.id"
                        @click="onToggleEstadoAdmin(admin)"
                      >
                        {{ admin.estado }}
                      </button>
                      <span
                        v-else
                        class="dash-status"
                        :class="admin.estado === 'Activo' ? 'dash-status--ok' : 'dash-status--warn'"
                      >
                        {{ admin.estado }}
                      </span>
                    </td>
                    <td v-if="canCreateAdmins" class="dash-table-center dash-table-actions">
                      <button
                        v-if="canEditAdmins"
                        class="dash-btn-icon"
                        type="button"
                        title="Editar"
                        @click="onEditAdmin(admin)"
                      >
                        <i class="fa-solid fa-pen" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="canResetPassword"
                        class="dash-btn-icon"
                        type="button"
                        title="Reiniciar contraseña"
                        :disabled="admin.id === user?.id"
                        @click="onResetPasswordAdmin(admin)"
                      >
                        <i class="fa-solid fa-key" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="canHardDelete"
                        class="dash-btn-icon dash-btn-icon--danger"
                        type="button"
                        title="Eliminar"
                        :disabled="admin.id === user?.id"
                        @click="onDeleteAdmin(admin)"
                      >
                        <i class="fa-solid fa-trash" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Personal / Usuarios -->
          <div v-else-if="activeAdminTab === 'personal'" class="dash-admin-tab">
            <div class="dash-cajas-toolbar">
              <div>
                <h3 class="dash-cajas-toolbar-title">Gestión de Personal</h3>
                <p class="dash-cajas-toolbar-hint">
                  Fichas de trabajadores y acceso opcional al sistema de rendiciones.
                </p>
              </div>
              <button
                v-if="canEditPersonal"
                class="dash-btn-primary dash-btn-toggle-caja"
                type="button"
                @click="openModalPersonalCreate"
              >
                <i class="fa-solid fa-plus" aria-hidden="true"></i>
                <span>Nuevo Personal</span>
              </button>
            </div>

            <div class="dash-admin-filters">
              <div class="dash-historial-search">
                <label class="dash-sr-only" for="personal-buscar">Buscar personal</label>
                <input
                  id="personal-buscar"
                  v-model="personalBusqueda"
                  type="search"
                  placeholder="Buscar por nombre o RUT…"
                  class="dash-search-input"
                />
              </div>
            </div>

            <div class="dash-table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>RUT</th>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th>Correo</th>
                    <th class="dash-table-center">Acceso Sistema</th>
                    <th class="dash-table-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in personalFiltrado" :key="p.id">
                    <td class="dash-table-strong dash-mono">{{ formatRut(p.rut) || '-' }}</td>
                    <td>{{ p.nombre || '-' }}</td>
                    <td>{{ p.cargo || '-' }}</td>
                    <td>{{ p.correo || '-' }}</td>
                    <td class="dash-table-center">
                      <button
                        v-if="p.accesoKind !== 'none' && canTogglePersonalAcceso && p.usuarioId"
                        type="button"
                        class="dash-status dash-status--toggle"
                        :class="
                          p.accesoKind === 'activo' ? 'dash-status--ok' : 'dash-status--danger'
                        "
                        :title="
                          p.usuarioId === user?.id
                            ? 'No puedes cambiar tu propio estado'
                            : p.accesoKind === 'activo'
                              ? 'Click para desactivar'
                              : 'Click para activar'
                        "
                        :disabled="p.usuarioId === user?.id || togglingEstadoId === p.usuarioId"
                        @click="onToggleEstadoPersonal(p)"
                      >
                        {{ p.accesoLabel }}
                      </button>
                      <button
                        v-else-if="p.accesoKind === 'none' && canEditPersonal"
                        type="button"
                        class="dash-status dash-status--off dash-status--toggle"
                        title="Crear acceso de usuario"
                        @click="openModalPersonalCrearUsuario(p)"
                      >
                        Solo Ficha
                      </button>
                      <span
                        v-else
                        class="dash-status"
                        :class="{
                          'dash-status--ok': p.accesoKind === 'activo',
                          'dash-status--danger': p.accesoKind === 'inactivo',
                          'dash-status--off': p.accesoKind === 'none'
                        }"
                      >
                        {{ p.accesoLabel }}
                      </span>
                    </td>
                    <td class="dash-table-center dash-table-actions">
                      <button
                        v-if="canEditPersonal"
                        class="dash-btn-icon"
                        type="button"
                        title="Editar"
                        @click="openModalPersonalEdit(p)"
                      >
                        <i class="fa-solid fa-pen" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="canEditPersonal && !p.tieneUsuario"
                        class="dash-btn-icon"
                        type="button"
                        title="Crear usuario"
                        @click="openModalPersonalCrearUsuario(p)"
                      >
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                      </button>
                      <button
                        class="dash-btn-icon"
                        type="button"
                        title="Asignar cajas"
                        @click="openModalAsignarCajas(p)"
                      >
                        <i class="fa-solid fa-table-cells" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="canResetPassword && p.usuarioId"
                        class="dash-btn-icon"
                        type="button"
                        title="Reiniciar contraseña"
                        @click="onResetPasswordPersonal(p)"
                      >
                        <i class="fa-solid fa-key" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="canHardDelete"
                        class="dash-btn-icon dash-btn-icon--danger"
                        type="button"
                        title="Eliminar ficha"
                        @click="onDeletePersonal(p)"
                      >
                        <i class="fa-solid fa-trash" aria-hidden="true"></i>
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
                  <h3>Asignar cajas - {{ modalAsignarCajas.nombre }}</h3>
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
                    {{ tarjetaForm.editId ? 'Editar Tarjeta de la Empresa' : 'Registrar Tarjeta de la Empresa' }}
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
                    <span>{{ tarjetaForm.editId ? 'Actualizar Tarjeta' : 'Guardar Tarjeta' }}</span>
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
                    <th>Tipo</th>
                    <th>N°</th>
                    <th>Banco</th>
                    <th>Titular / Asignado</th>
                    <th class="dash-table-center">Estado</th>
                    <th class="dash-table-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in tarjetasEmpresa" :key="t.id || t.ultimos4 + t.alias">
                    <td class="dash-table-strong">{{ t.alias }}</td>
                    <td>{{ t.tipo }}</td>
                    <td class="dash-mono dash-rinde">•••• {{ t.ultimos4 }}</td>
                    <td>{{ t.banco }}</td>
                    <td>{{ t.titular }}</td>
                    <td class="dash-table-center">
                      <button
                        v-if="t.id"
                        type="button"
                        class="dash-status dash-status--toggle"
                        :class="t.estadoApi === 'activa' ? 'dash-status--ok' : 'dash-status--danger'"
                        :title="
                          t.estadoApi === 'activa'
                            ? 'Click para desactivar'
                            : t.fechaDesactivacion
                              ? `Inactiva desde ${t.fechaDesactivacion} — click para activar`
                              : 'Click para activar'
                        "
                        :disabled="togglingTarjetaId === t.id"
                        @click="onToggleEstadoTarjeta(t)"
                      >
                        {{ t.estado }}
                      </button>
                      <span
                        v-else
                        class="dash-status"
                        :class="t.estadoApi === 'activa' ? 'dash-status--ok' : 'dash-status--danger'"
                      >
                        {{ t.estado }}
                      </span>
                    </td>
                    <td class="dash-table-center dash-table-actions">
                      <button class="dash-btn-icon" type="button" title="Editar" @click="onEditTarjeta(t)">
                        <i class="fa-solid fa-pen" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="canHardDelete"
                        class="dash-btn-icon dash-btn-icon--danger"
                        type="button"
                        title="Eliminar"
                        @click="onDeleteTarjeta(t)"
                      >
                        <i class="fa-solid fa-trash" aria-hidden="true"></i>
                      </button>
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
            <p>Sección “{{ currentAdminTabLabel }}” - próximamente.</p>
          </div>
        </div>
    </main>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
// TEMP_AUTH_BYPASS - revertir antes de commit
import { TEMP_AUTH_BYPASS } from '../TEMP_AUTH_BYPASS'
import { canDevHardDelete, canSkipComprobanteVerify } from '../devFlags'
import {
  cleanRut,
  formatRut,
  fromRutInput,
  passwordFromRut,
  rutStatusLabel,
  validarRutChileno
} from '../utils/rut'
import * as api from '../api/resources'
import { persistSessionProfile } from '../api/auth'
import {
  buildCartola,
  mapAdminFromUsuario,
  mapAnticipo,
  mapAuditLog,
  mapCaja,
  mapCentroCobro,
  mapLegacy,
  mapPersonal,
  mapRendicion,
  mapTarjeta,
  mapTrabajador,
  mapUsuario,
  origenFromMetodo,
  parseMontoInput,
  rolApiFromUi,
  rolUiFromApi
} from '../api/mappers'

const { user, bootstrap, logout } = useAuth()

const userMenuOpen = ref(false)
const userMenuEl = ref(null)
const credencialesCopied = ref(false)

const modalCredenciales = reactive({
  open: false,
  nombre: '',
  rut: '',
  correo: '',
  rol: '',
  password: ''
})

const modalPerfil = reactive({
  open: false,
  correo: '',
  passwordActual: '',
  passwordNueva: '',
  error: '',
  ok: ''
})

const modalPersonal = reactive({
  open: false,
  id: null,
  usuarioId: null,
  rut: '',
  nombre: '',
  cargo: '',
  cajas: [],
  crearUsuario: false,
  correo: '',
  rol: 'USER_RENDIDOR',
  estado: 'activo',
  passType: 'rut',
  password: '',
  error: ''
})

const modalEditAdmin = reactive({
  open: false,
  id: null,
  rut: '',
  nombre: '',
  correo: '',
  rol: '',
  estado: 'activo',
  error: ''
})

function onDocClick(event) {
  if (!userMenuOpen.value) return
  if (userMenuEl.value && !userMenuEl.value.contains(event.target)) {
    userMenuOpen.value = false
  }
}

function openModalCredenciales(payload) {
  modalCredenciales.open = true
  modalCredenciales.nombre = payload.nombre || payload.trabajador_nombre || '-'
  modalCredenciales.rut = formatRut(payload.rut || '')
  modalCredenciales.correo = payload.correo || ''
  modalCredenciales.rol = rolUiFromApi(payload.rol) || payload.rol || ''
  modalCredenciales.password = payload.password || ''
  credencialesCopied.value = false
}

function closeModalCredenciales() {
  modalCredenciales.open = false
  credencialesCopied.value = false
}

async function copyCredenciales() {
  const text = `RUT: ${modalCredenciales.rut} | Correo: ${modalCredenciales.correo} | Clave: ${modalCredenciales.password}`
  try {
    await navigator.clipboard.writeText(text)
    credencialesCopied.value = true
  } catch {
    saveError.value = 'No se pudo copiar al portapapeles'
  }
}

function openModalPerfil() {
  userMenuOpen.value = false
  modalPerfil.open = true
  modalPerfil.correo = user.value?.correo || ''
  modalPerfil.passwordActual = ''
  modalPerfil.passwordNueva = ''
  modalPerfil.error = ''
  modalPerfil.ok = ''
}

function closeModalPerfil() {
  modalPerfil.open = false
  modalPerfil.error = ''
  modalPerfil.ok = ''
}

async function onSavePerfil() {
  modalPerfil.error = ''
  modalPerfil.ok = ''
  try {
    const payload = { correo: modalPerfil.correo.trim() }
    if (modalPerfil.passwordNueva) {
      payload.password_actual = modalPerfil.passwordActual
      payload.password_nueva = modalPerfil.passwordNueva
    }
    const data = await api.updateMe(payload)
    persistSessionProfile(data)
    await bootstrap()
    modalPerfil.ok = 'Perfil actualizado'
    modalPerfil.passwordActual = ''
    modalPerfil.passwordNueva = ''
  } catch (err) {
    modalPerfil.error = err?.message || 'No se pudo actualizar el perfil'
  }
}

const dataLoading = ref(false)
const dataError = ref('')
const saveError = ref('')

const cajaActiva = ref('')
const mesActivo = ref('')

const resumenLoading = ref(false)
const resumenCaja = reactive({
  saldo_caja: 0,
  fondo_estimado: 0,
  gastos_rendidos: { total: 0, cantidad: 0 },
  anticipos_pendientes: { total: 0, cantidad: 0 }
})

function resetResumen() {
  resumenCaja.saldo_caja = 0
  resumenCaja.fondo_estimado = 0
  resumenCaja.gastos_rendidos = { total: 0, cantidad: 0 }
  resumenCaja.anticipos_pendientes = { total: 0, cantidad: 0 }
}

async function loadResumenCaja() {
  if (!cajaActiva.value || !mesActivo.value) {
    resetResumen()
    return
  }
  resumenLoading.value = true
  try {
    const data = await api.resumenCaja({
      clave_interna: cajaActiva.value,
      mes: mesActivo.value
    })
    resumenCaja.saldo_caja = Number(data?.saldo_caja) || 0
    resumenCaja.fondo_estimado = Number(data?.fondo_estimado) || 0
    resumenCaja.gastos_rendidos = {
      total: Number(data?.gastos_rendidos?.total) || 0,
      cantidad: Number(data?.gastos_rendidos?.cantidad) || 0
    }
    resumenCaja.anticipos_pendientes = {
      total: Number(data?.anticipos_pendientes?.total) || 0,
      cantidad: Number(data?.anticipos_pendientes?.cantidad) || 0
    }
  } catch (err) {
    console.warn('[loadResumenCaja]', err?.message || err)
    resetResumen()
  } finally {
    resumenLoading.value = false
  }
}

watch([cajaActiva, mesActivo], () => {
  loadResumenCaja()
})

const cajaSeleccionada = computed(
  () => cajas.value.find((c) => c.groupKey === cajaActiva.value) || null
)

const cajaSeleccionadaCc = computed(
  () => cajaSeleccionada.value?.centroCobroNombre || ''
)

const cajaSeleccionadaExterior = computed(() => {
  if (!cajaSeleccionada.value) return 'Selecciona una caja'
  return cajaSeleccionada.value.displayName || '—'
})

/** Estado operativo de la caja (sin columna estado en BD: derivado). */
const cajaSeleccionadaEstado = computed(() => {
  if (!cajaSeleccionada.value) return '—'
  return cajaSeleccionada.value.tieneDatos ? 'En uso' : 'Disponible'
})

const cajaSeleccionadaEstadoClass = computed(() => {
  if (!cajaSeleccionada.value) return ''
  return cajaSeleccionada.value.tieneDatos ? 'dash-chip--accent' : 'dash-chip--ok'
})

function labelMesCorto(value) {
  const full = labelMes(value)
  return full ? full.split(' ')[0] : 'Mes'
}

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

const ALL_CAJA_TABS = [
  { id: 'rendicion', label: 'Rendición de Gastos' },
  { id: 'asignacion', label: 'Asignación a Conductor' },
  { id: 'informes', label: 'Informes y Cartola' },
  { id: 'cajas', label: 'Cajas' },
  { id: 'centros-costo', label: 'Centro de cobro / empresa' }
]

const adminTabs = [
  { id: 'admin-users', label: 'Admin Users' },
  { id: 'personal', label: 'Personal / Usuarios' },
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

const gastoComprobanteFile = ref(null)
const gastoFileInputEl = ref(null)
const modalVerificar = reactive({
  open: false,
  phase: 'loading', // loading | error | ok
  error: '',
  errores: []
})
let pendingGastoSave = null

const gastoTrabajadorQuery = ref('')
const gastoTrabajadorOpen = ref(false)
const gastoTrabajadorHighlight = ref(0)

const historialBusqueda = ref('')
const historialFiltroCaja = ref('')
const historialFiltroMes = ref('')
const gastoFormOpen = ref(false)

const anticipoFormOpen = ref(false)
const anticipoBusqueda = ref('')
const anticipoFiltroCaja = ref('')
const anticipoFiltroMes = ref('')

const adminFormOpen = ref(false)
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
  displayName: '',
  centroCobroId: '',
  editIndex: null,
  editId: null,
  groupKeyOriginal: null
})

const ccFormOpen = ref(false)
const ccAccordionOpen = reactive({})

const ccForm = reactive({
  editId: null,
  nombre: ''
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
  return ''
})

/** Admin / Super Admin / Dev (no usuario rendidor) */
const isAdminSession = computed(() => {
  if (TEMP_AUTH_BYPASS) return true
  const rol = user.value?.rol
  return (
    rol === 'SUPER_ADMIN_DEV' ||
    rol === 'SUPER_ADMIN' ||
    rol === 'ADMIN_CAJA' ||
    user.value?.role === 'admin' ||
    Boolean(sessionAdminNivel.value)
  )
})

const isUsuarioNormal = computed(() => !isAdminSession.value)

const visibleTabs = computed(() => {
  if (!isAdminSession.value) {
    return ALL_CAJA_TABS.filter((t) => t.id === 'rendicion')
  }
  return ALL_CAJA_TABS
})

watch(
  isAdminSession,
  (admin) => {
    if (!admin) {
      activeModule.value = 'caja'
      activeTab.value = 'rendicion'
    }
  },
  { immediate: true }
)

const canCreateAdmins = computed(() => {
  const nivel = sessionAdminNivel.value
  return nivel === ROLE_DEV || nivel === ROLE_SUPER
})

const canCreateUsuarios = computed(() => {
  const nivel = sessionAdminNivel.value
  return nivel === ROLE_DEV || nivel === ROLE_SUPER || nivel === ROLE_ADMIN_CAJA
})

const canEditAdmins = canCreateAdmins
const canEditUsuarios = canCreateUsuarios
/** Solo Super Admins pueden activar/desactivar administradores */
const canToggleAdminEstado = canCreateAdmins
/** Super Admins y Admin Caja pueden activar/desactivar usuarios rendidores */
const canToggleUsuarioEstado = canCreateUsuarios
const canEditPersonal = canCreateUsuarios
const canTogglePersonalAcceso = canCreateUsuarios
const canEditTrabajadores = canEditPersonal
/** Soft/hard delete (papelera): solo Super Admin / Super Admin Dev */
const canHardDelete = canCreateAdmins
/** Flag temporal: Super Admin Dev puede hard-delete gastos/anticipos/cajas con datos */
const canDevForceDelete = computed(
  () => canDevHardDelete(user.value?.rol) || canDevHardDelete(sessionAdminNivel.value)
)
/** Flag temporal: salta IA monto / N° documento al subir comprobante */
const canSkipComprobanteIa = computed(
  () =>
    canSkipComprobanteVerify(user.value?.rol) ||
    canSkipComprobanteVerify(sessionAdminNivel.value)
)
/** Reiniciar contraseña de usuarios: solo Super Admin / Super Admin Dev */
const canResetPassword = canCreateAdmins
const togglingEstadoId = ref(null)
const togglingTarjetaId = ref(null)

/** Admin / Super Admin / Dev pueden rendir a nombre de cualquier trabajador */
const canIngresarPorOtros = computed(() => isAdminSession.value)

function syncGastoLockedFields() {
  if (!canIngresarPorOtros.value || gasto.trabajadorId === 'me') {
    gasto.trabajador = nombreSesion.value
  }
  syncGastoTrabajadorQueryFromSelection()
}

function syncGastoTrabajadorQueryFromSelection() {
  if (!canIngresarPorOtros.value) {
    gastoTrabajadorQuery.value = gasto.trabajador || ''
    return
  }
  if (gasto.trabajadorId === 'me') {
    gastoTrabajadorQuery.value = `${nombreSesion.value} (Yo)`
    return
  }
  const t = trabajadores.value.find((x) => String(x.id) === String(gasto.trabajadorId))
  gastoTrabajadorQuery.value = t?.nombre || gasto.trabajador || ''
}

const gastoTrabajadorOpciones = computed(() => {
  const q = gastoTrabajadorQuery.value.trim().toLowerCase()
  const opts = [
    {
      id: 'me',
      label: `${nombreSesion.value} (Yo)`,
      nombre: nombreSesion.value
    }
  ]
  const seen = new Set()
  for (const t of trabajadores.value) {
    const id = String(t.id)
    if (seen.has(id)) continue
    seen.add(id)
    opts.push({ id, label: t.nombre, nombre: t.nombre })
  }
  if (!q) return opts
  return opts.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      o.nombre.toLowerCase().includes(q) ||
      (o.id === 'me' && 'yo'.includes(q))
  )
})

function onGastoTrabajadorFocus(e) {
  gastoTrabajadorOpen.value = true
  gastoTrabajadorHighlight.value = 0
  e?.target?.select?.()
}

function onGastoTrabajadorQueryInput() {
  gastoTrabajadorOpen.value = true
  gastoTrabajadorHighlight.value = 0
}

function highlightGastoTrabajador(delta) {
  const n = gastoTrabajadorOpciones.value.length
  if (!n) return
  gastoTrabajadorOpen.value = true
  gastoTrabajadorHighlight.value = (gastoTrabajadorHighlight.value + delta + n) % n
}

function confirmGastoTrabajadorHighlight() {
  const opt = gastoTrabajadorOpciones.value[gastoTrabajadorHighlight.value]
  if (opt) selectGastoTrabajador(opt)
}

function selectGastoTrabajador(opt) {
  if (!opt) return
  gasto.trabajadorId = opt.id
  gasto.trabajador = opt.nombre
  gastoTrabajadorQuery.value = opt.label
  gastoTrabajadorOpen.value = false
  gastoTrabajadorHighlight.value = 0
  syncGastoCajaDisponible()
}

function onGastoTrabajadorBlur() {
  setTimeout(() => {
    gastoTrabajadorOpen.value = false
    // Si el texto no coincide con la selección, restaurar etiqueta de la selección actual
    const selectedLabel =
      gasto.trabajadorId === 'me'
        ? `${nombreSesion.value} (Yo)`
        : trabajadores.value.find((x) => String(x.id) === String(gasto.trabajadorId))?.nombre
    if (
      selectedLabel &&
      gastoTrabajadorQuery.value.trim().toLowerCase() !== selectedLabel.toLowerCase() &&
      !(gasto.trabajadorId === 'me' && gastoTrabajadorQuery.value.includes('(Yo)'))
    ) {
      // Si hay coincidencia exacta por nombre, adoptar esa opción
      const q = gastoTrabajadorQuery.value.trim().toLowerCase()
      const match = gastoTrabajadorOpciones.value.find(
        (o) => o.nombre.toLowerCase() === q || o.label.toLowerCase() === q
      )
      if (match) {
        selectGastoTrabajador(match)
      } else {
        syncGastoTrabajadorQueryFromSelection()
      }
    }
  }, 120)
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
  syncGastoTrabajadorQueryFromSelection()
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

/** Roles disponibles al editar: creatables + el rol actual del admin (para no forzar cambio) */
const editableAdminRoles = computed(() => {
  const base = [...creatableAdminRoles.value]
  const current = modalEditAdmin.rol
  if (current && !base.includes(current)) {
    // Mapear labels cortos de la tabla a opciones del select
    if (current === 'Super Admin - Dev' || current.includes('Dev')) {
      const full = 'Super Admin - Dev (Acceso Total + Eliminación)'
      if (sessionAdminNivel.value === ROLE_DEV && !base.includes(full)) base.unshift(full)
      else if (!base.includes(current)) base.unshift(current)
    } else if (!base.includes(current)) {
      base.unshift(current)
    }
  }
  return base
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
const adminBusqueda = ref('')
const personalBusqueda = ref('')

function coincideNombreORut(row, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
  if (!q) return true
  const nombre = String(row.nombre || '').toLowerCase()
  const rutDisplay = String(row.rut || '').toLowerCase()
  const rutClean = cleanRut(row.rut || '').toLowerCase()
  const qClean = cleanRut(q).toLowerCase() || q.replace(/[^0-9k]/gi, '').toLowerCase()
  return (
    nombre.includes(q) ||
    rutDisplay.includes(q) ||
    (qClean && rutClean.includes(qClean))
  )
}

const adminsFiltrados = computed(() =>
  admins.value.filter((a) => coincideNombreORut(a, adminBusqueda.value))
)

const personalFiltrado = computed(() =>
  personal.value.filter((p) => coincideNombreORut(p, personalBusqueda.value))
)

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
const personal = ref([])
const usuarios = ref([])

const tarjetaForm = reactive({
  editId: null,
  alias: '',
  tipo: 'Crédito',
  ultimos4: '',
  banco: '',
  titular: ''
})

const personalModalRutStatus = computed(() => rutStatusLabel(modalPersonal.rut))

const tarjetasEmpresa = ref([])

const auditoriaFiltro = reactive({
  modulo: '**Todos los Módulos**',
  accion: '**Todas las Acciones**',
  actor: '**Todos los Usuarios**',
  fecha: new Date().toISOString().slice(0, 10)
})

const auditoriaLogs = ref([])

const cajas = ref([])
const centrosCosto = ref([])

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
  } else {
    const keys = [...new Set(cajas.value.map((c) => c.groupKey))]
    if (!keys.includes(cajaActiva.value)) {
      cajaActiva.value = keys[0] || ''
    }
  }

  if (!mesesDisponibles.value.some((m) => m.value === mesActivo.value)) {
    const now = new Date()
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    mesActivo.value =
      mesesDisponibles.value.find((m) => m.value === cur)?.value ||
      mesesDisponibles.value[0]?.value ||
      ''
  }

  if (!asignacion.fondo && cajaActiva.value) {
    asignacion.fondo = cajaActiva.value
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
    const hostNow = new Date()
    const hostMes = `${hostNow.getFullYear()}-${String(hostNow.getMonth() + 1).padStart(2, '0')}`
    const hostAnio = String(hostNow.getFullYear())

    const [cajasRaw, rendRaw, trabRaw, legRaw, personalRaw, ccRaw] = await Promise.all([
      safeList(() => api.listCajas({ mes: hostMes, anio: hostAnio })),
      safeList(api.listRendiciones),
      safeList(api.listTrabajadores),
      safeList(api.listLegacy),
      safeList(api.listPersonal),
      safeList(api.listCentrosCosto)
    ])

    cajas.value = cajasRaw.map(mapCaja)
    centrosCosto.value = ccRaw.map(mapCentroCobro)
    for (const cc of centrosCosto.value) {
      const key = `cc-${cc.id}`
      if (ccAccordionOpen[key] === undefined) ccAccordionOpen[key] = true
    }
    trabajadores.value = trabRaw.map(mapTrabajador)
    personal.value = personalRaw.map(mapPersonal)
    applyTieneUsuario(
      trabajadores.value,
      personal.value
        .filter((p) => p.usuarioId != null)
        .map((p) => ({ trabajadorId: p.id }))
    )

    const movOps = rendRaw.map(mapRendicion)
    const legOps = legRaw.map(mapLegacy)
    movimientos.value = [...movOps, ...legOps]

    const anticiposRaw = await safeList(api.listAnticipos)
    asignaciones.value = anticiposRaw.map(mapAnticipo)

    const usuariosRaw = await safeList(api.listUsuarios)
    const mappedUsers = usuariosRaw.map(mapUsuario)

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
          estado: u.estadoApi,
          trabajador_nombre: u.nombre || null,
          trabajador_id: u.trabajadorId
        })
      )

    usuarios.value = mappedUsers.filter((u) => u.rol === 'USER_RENDIDOR')

    const tarjetasRaw = await safeList(api.listTarjetas)
    tarjetasEmpresa.value = tarjetasRaw.map(mapTarjeta)

    const logsRaw = await safeList(api.listAuditLogs)
    auditoriaLogs.value = logsRaw.map(mapAuditLog)

    syncSelectoresCajaMes()
    rebuildCartola()
    syncInformeResultado()
    await loadResumenCaja()
  } catch (err) {
    dataError.value = err?.message || 'No se pudieron cargar los datos'
  } finally {
    dataLoading.value = false
  }
}

function findCajaIdByGroupKey(groupKey) {
  return cajas.value.find((x) => x.groupKey === groupKey)?.id ?? null
}

function findCajaIdForGasto(groupKey) {
  return findCajaIdByGroupKey(groupKey)
}

const cajasOrdenadas = computed(() =>
  [...cajas.value].sort((a, b) => a.groupKey.localeCompare(b.groupKey))
)

const cajasPorCentro = computed(() => {
  const groups = centrosCosto.value.map((cc) => ({
    key: `cc-${cc.id}`,
    titulo: cc.nombre,
    ccId: cc.id,
    cajas: cajas.value
      .filter((c) => Number(c.centroCobroId) === Number(cc.id))
      .sort((a, b) => a.groupKey.localeCompare(b.groupKey))
  }))
  const sinCc = cajas.value
    .filter((c) => c.centroCobroId == null)
    .sort((a, b) => a.groupKey.localeCompare(b.groupKey))
  if (sinCc.length) {
    groups.push({
      key: 'cc-none',
      titulo: 'Sin centro de cobro / empresa',
      ccId: null,
      cajas: sinCc
    })
  }
  return groups
})

function toggleCcAccordion(key) {
  ccAccordionOpen[key] = !ccAccordionOpen[key]
}

const cajasActivasOpciones = computed(() => {
  const map = new Map()
  for (const c of cajas.value) {
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
  cajas.value.filter((x) => x.groupKey === cajaActiva.value)
)

function labelCajaGroup(groupKey) {
  const opt = cajasActivasOpciones.value.find((c) => c.groupKey === groupKey)
  return opt?.label || groupKey
}

/** Cajas disponibles al rendir: usuario normal = solo asignadas (API ya filtra);
 *  admin por otros = asignadas del trabajador; admin por sí = todas */
const cajasDisponiblesParaGasto = computed(() => {
  const all = cajasActivasOpciones.value
  if (!isAdminSession.value) {
    return all
  }
  if (gasto.trabajadorId !== 'me') {
    const t = trabajadores.value.find((x) => String(x.id) === gasto.trabajadorId)
    const keys = t?.cajasAsignadas || []
    if (!keys.length) return []
    return all.filter((c) => keys.includes(c.groupKey))
  }
  return all
})

/** Aviso bajo el selector: el de Personal/Usuarios solo aplica a usuario normal */
const hintCajasGasto = computed(() => {
  if (cajasDisponiblesParaGasto.value.length) return ''
  if (!isAdminSession.value) {
    return 'Sin cajas asignadas. Un administrador debe asignarlas en Personal / Usuarios.'
  }
  if (gasto.trabajadorId !== 'me') {
    return 'Este trabajador no tiene cajas asignadas. Asígnelas en Personal / Usuarios.'
  }
  if (!cajas.value.length) {
    return 'No hay cajas creadas. Créelas en la pestaña Cajas.'
  }
  return ''
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
  periodo: 'Período: - | Caja: Todas',
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
  document.addEventListener('click', onDocClick)
  await bootstrap()
  syncGastoLockedFields()
  await loadDashboardData()
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})

function peekNextRinde() {
  const nums = movimientos.value
    .map((m) => Number(String(m.rinde).replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 99
  return `R-${max + 1}`
}

function onGastoFile(event) {
  const file = event.target.files?.[0] || null
  gastoComprobanteFile.value = file
  gasto.comprobanteNombre = file ? file.name : ''
}

function onVerificarReplaceFile(event) {
  const file = event.target.files?.[0] || null
  gastoComprobanteFile.value = file
  gasto.comprobanteNombre = file ? file.name : ''
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function onCloseModalVerificar() {
  if (modalVerificar.phase === 'loading') return
  modalVerificar.open = false
  modalVerificar.phase = 'loading'
  modalVerificar.error = ''
  modalVerificar.errores = []
  pendingGastoSave = null
}

async function verificarComprobanteConIa() {
  if (!gastoComprobanteFile.value) {
    throw Object.assign(new Error('Debes adjuntar un comprobante (PDF, PNG o JPG).'), {
      errores: ['Debes adjuntar un comprobante (PDF, PNG o JPG).']
    })
  }
  const fd = new FormData()
  fd.append('comprobante', gastoComprobanteFile.value)
  fd.append('monto', String(parseMontoInput(gasto.monto) || gasto.monto || ''))
  fd.append('tipo_documento', gasto.tipo)
  if (gasto.tipo === 'Factura') {
    fd.append('numero_documento', gasto.numero.trim())
  }
  return api.verificarComprobante(fd)
}

async function ejecutarVerificacionYGuardado() {
  modalVerificar.open = true
  modalVerificar.phase = 'loading'
  modalVerificar.error = ''
  modalVerificar.errores = []

  try {
    const waitMs = canSkipComprobanteIa.value ? 400 : 5000
    const [verifyResult] = await Promise.all([
      verificarComprobanteConIa(),
      sleep(waitMs)
    ])

    if (!verifyResult?.ok || !verifyResult?.comprobante_url) {
      throw Object.assign(new Error('No se pudo validar el comprobante'), {
        errores: ['No se pudo validar el comprobante']
      })
    }

    modalVerificar.phase = 'ok'
    const payload = {
      ...pendingGastoSave,
      comprobante_url: verifyResult.comprobante_url
    }
    await api.createRendicion(payload)
    await loadDashboardData()
    modalVerificar.open = false
    pendingGastoSave = null
    closeFormGasto()
  } catch (err) {
    modalVerificar.phase = 'error'
    modalVerificar.error =
      err?.message || 'No se pudo verificar el comprobante. Sube un documento más claro.'
    modalVerificar.errores = Array.isArray(err?.errores) ? err.errores : [modalVerificar.error]
  }
}

async function retryVerificarYGuardar() {
  if (!gastoComprobanteFile.value || !pendingGastoSave) return
  await ejecutarVerificacionYGuardado()
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
  if (!isAdminSession.value) return
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
  modalCorregir.prevDescripcion = row.descripcion || '-'
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
  if (!isAdminSession.value && moduleName === 'admin') return
  if (!sidebarOpen.value) openSidebar()
  activeModule.value = moduleName
}

async function onSaveGasto() {
  if (palabrasDescripcion.value > 500) return
  if (gasto.tipo === 'Factura' && !gasto.numero.trim() && !canSkipComprobanteIa.value) return
  if (!gasto.cajaGroupKey) return
  if (!gastoComprobanteFile.value) {
    saveError.value = 'El comprobante es obligatorio. Adjunta PDF, PNG o JPG.'
    return
  }
  const montoNum = parseMontoInput(gasto.monto)
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    saveError.value = 'Ingresa un monto total válido.'
    return
  }

  onGastoTrabajadorChange()

  const cajaId = findCajaIdForGasto(gasto.cajaGroupKey)
  if (!cajaId) {
    saveError.value = 'No hay caja/presupuesto para la clave y mes seleccionados'
    return
  }

  let trabajadorId = null
  if (!isAdminSession.value) {
    trabajadorId = user.value?.trabajador_id || null
  } else if (gasto.trabajadorId !== 'me') {
    trabajadorId = Number(gasto.trabajadorId)
  } else {
    trabajadorId = user.value?.trabajador_id || null
  }
  if (!trabajadorId) {
    saveError.value = isAdminSession.value
      ? 'No hay trabajador asociado para registrar el gasto'
      : 'Tu usuario no tiene ficha de trabajador vinculada'
    return
  }

  saveError.value = ''
  pendingGastoSave = {
    caja_id: cajaId,
    trabajador_id: trabajadorId,
    fecha_documento: gasto.fecha,
    tipo_documento: gasto.tipo,
    numero_documento: gasto.tipo === 'Factura' ? gasto.numero.trim() : null,
    monto: montoNum,
    origen_pago: origenFromMetodo(gasto.metodoPago),
    descripcion: gasto.descripcion || null
  }
  await ejecutarVerificacionYGuardado()
}

function resetGastoFormFields() {
  gasto.tipo = 'Boleta'
  gasto.numero = ''
  gasto.monto = ''
  gasto.metodoPago = 'efectivo'
  gasto.descripcion = ''
  gasto.comprobanteNombre = ''
  gastoComprobanteFile.value = null
  if (gastoFileInputEl.value) gastoFileInputEl.value.value = ''
  gasto.trabajadorId = 'me'
  gastoTrabajadorOpen.value = false
  gastoTrabajadorHighlight.value = 0
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
    findCajaIdByGroupKey(asignacion.fondo) || findCajaIdForGasto(asignacion.fondo)
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
  cajaForm.displayName = ''
  cajaForm.centroCobroId = ''
  cajaForm.editIndex = null
  cajaForm.editId = null
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

function onEditCaja(caja) {
  if (!caja || (caja.tieneDatos && !canDevForceDelete.value)) return
  const realIndex = cajas.value.findIndex((c) => c.id === caja.id)
  if (realIndex < 0) return

  cajaForm.displayName = caja.displayName
  cajaForm.centroCobroId = caja.centroCobroId || ''
  cajaForm.editIndex = realIndex
  cajaForm.editId = caja.id
  cajaForm.groupKeyOriginal = caja.groupKey
  openFormCajaForEdit()
}

async function onSaveCaja() {
  const displayName = cajaForm.displayName.trim()
  const centroCobroId = Number(cajaForm.centroCobroId)
  if (!displayName) return
  if (!Number.isFinite(centroCobroId) || centroCobroId <= 0) {
    saveError.value = 'Debes seleccionar un centro de cobro / empresa'
    return
  }

  try {
    saveError.value = ''
    if (cajaForm.editId) {
      await api.updateCaja(cajaForm.editId, {
        nombre_exterior: displayName
      })
    } else {
      const created = await api.createCaja({
        nombre_exterior: displayName,
        centro_cobro_id: centroCobroId
      })
      const key = created?.clave_interna || created?.nombre_interior
      if (key && !cajaActiva.value) cajaActiva.value = key
    }
    await loadDashboardData()
    closeFormCaja()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo guardar la caja'
  }
}

async function onDeleteCaja(caja) {
  if (!caja?.id || (caja.tieneDatos && !canDevForceDelete.value)) return
  const hardHint = canDevForceDelete.value ? ' (hard delete Dev)' : ''
  if (!confirm(`¿Eliminar la caja "${caja.displayName}"?${hardHint}`)) return
  try {
    saveError.value = ''
    await api.deleteCaja(caja.id)
    await loadDashboardData()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo eliminar la caja'
  }
}

function resetCcForm() {
  ccForm.editId = null
  ccForm.nombre = ''
}

function closeFormCc() {
  ccFormOpen.value = false
  resetCcForm()
}

function toggleFormCc() {
  if (ccFormOpen.value) {
    closeFormCc()
    return
  }
  resetCcForm()
  ccFormOpen.value = true
}

function onEditCentroCosto(cc) {
  if (!cc || (cc.tieneDatos && !canDevForceDelete.value)) return
  ccForm.editId = cc.id
  ccForm.nombre = cc.nombre || ''
  ccFormOpen.value = true
}

async function onSaveCentroCosto() {
  const nombre = String(ccForm.nombre || '').trim()
  if (!nombre) return
  try {
    saveError.value = ''
    const payload = { nombre }
    if (ccForm.editId) {
      await api.updateCentroCosto(ccForm.editId, payload)
    } else {
      await api.createCentroCosto(payload)
    }
    await loadDashboardData()
    closeFormCc()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo guardar el centro de cobro / empresa'
  }
}

async function onDeleteCentroCosto(cc) {
  if (!cc?.id || (cc.tieneDatos && !canDevForceDelete.value)) return
  const hardHint = canDevForceDelete.value
    ? ' (hard delete Dev — también borra cajas/gastos asociados)'
    : ''
  if (!confirm(`¿Eliminar el centro de cobro / empresa "${cc.nombre}"?${hardHint}`)) return
  try {
    saveError.value = ''
    await api.deleteCentroCosto(cc.id)
    await loadDashboardData()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo eliminar el centro de cobro / empresa'
  }
}

async function onHardDeleteRendicion(row) {
  if (!canDevForceDelete.value || !row?.id || row.legacy) return
  if (
    !confirm(
      `¿HARD DELETE de la rendición ${row.rinde}? Esta acción no se puede deshacer.`
    )
  ) {
    return
  }
  try {
    saveError.value = ''
    await api.deleteRendicion(row.id)
    await loadDashboardData()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo eliminar la rendición'
  }
}

async function onHardDeleteAnticipo(row) {
  if (!canDevForceDelete.value || !row?.id) return
  if (
    !confirm(`¿HARD DELETE del anticipo ${row.doc}? Esta acción no se puede deshacer.`)
  ) {
    return
  }
  try {
    saveError.value = ''
    await api.deleteAnticipo(row.id)
    await loadDashboardData()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo eliminar el anticipo'
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

function resetPersonalModal() {
  modalPersonal.open = false
  modalPersonal.id = null
  modalPersonal.usuarioId = null
  modalPersonal.rut = ''
  modalPersonal.nombre = ''
  modalPersonal.cargo = ''
  modalPersonal.cajas = []
  modalPersonal.crearUsuario = false
  modalPersonal.correo = ''
  modalPersonal.rol = 'USER_RENDIDOR'
  modalPersonal.estado = 'activo'
  modalPersonal.passType = 'rut'
  modalPersonal.password = ''
  modalPersonal.error = ''
}

function closeModalPersonal() {
  resetPersonalModal()
}

function openModalPersonalCreate() {
  if (!canEditPersonal.value) return
  resetPersonalModal()
  modalPersonal.open = true
  modalPersonal.passType = 'rut'
}

function openModalPersonalEdit(p) {
  if (!canEditPersonal.value || !p?.id) return
  modalPersonal.open = true
  modalPersonal.id = p.id
  modalPersonal.usuarioId = p.usuarioId || null
  modalPersonal.rut = formatRut(p.rut || '')
  modalPersonal.nombre = p.nombre || ''
  modalPersonal.cargo = p.cargo === '-' ? '' : p.cargo || ''
  modalPersonal.cajas = [...(p.cajasAsignadas || [])]
  modalPersonal.crearUsuario = Boolean(p.usuarioId)
  modalPersonal.correo = p.correo || ''
  modalPersonal.rol = p.usuarioRol || 'USER_RENDIDOR'
  modalPersonal.estado =
    p.usuarioEstado === 'inactivo' || p.accesoKind === 'inactivo' ? 'inactivo' : 'activo'
  modalPersonal.passType = p.usuarioId ? 'keep' : 'rut'
  modalPersonal.password = ''
  modalPersonal.error = ''
}

function openModalPersonalCrearUsuario(p) {
  if (!canEditPersonal.value || !p?.id) return
  openModalPersonalEdit(p)
  modalPersonal.crearUsuario = true
  modalPersonal.passType = 'rut'
}

async function onSavePersonal() {
  if (!canEditPersonal.value) return
  const rutLimpio = cleanRut(modalPersonal.rut)
  if (!rutLimpio || !modalPersonal.nombre.trim()) return
  if (!validarRutChileno(rutLimpio)) {
    modalPersonal.error = 'RUT inválido'
    return
  }

  const crearUsuario = Boolean(modalPersonal.crearUsuario)
  let passwordTemporal = null
  if (crearUsuario) {
    if (!modalPersonal.correo.trim()) {
      modalPersonal.error = 'Correo requerido para acceso al sistema'
      return
    }
    const needsPassword = !modalPersonal.usuarioId || modalPersonal.passType !== 'keep'
    if (needsPassword) {
      if (modalPersonal.passType === 'manual' && !modalPersonal.password.trim()) {
        modalPersonal.error = 'Ingresa una contraseña'
        return
      }
      passwordTemporal =
        modalPersonal.passType === 'manual'
          ? modalPersonal.password.trim()
          : passwordFromRut(rutLimpio)
      if (!passwordTemporal) {
        modalPersonal.error = 'No se pudo generar la contraseña'
        return
      }
    }
  }

  const payload = {
    rut: rutLimpio,
    nombre_completo: modalPersonal.nombre.trim(),
    cargo: modalPersonal.cargo.trim() || null,
    caja_ids: [...modalPersonal.cajas],
    crear_usuario: crearUsuario && !modalPersonal.usuarioId
  }

  if (crearUsuario) {
    payload.correo = modalPersonal.correo.trim()
    payload.rol = 'USER_RENDIDOR'
    if (modalPersonal.usuarioId) {
      payload.estado = modalPersonal.estado
      if (passwordTemporal) payload.password = passwordTemporal
      // En edit con switch ON y usuario existente, el backend actualiza si hay campos
      payload.crear_usuario = true
    } else if (passwordTemporal) {
      payload.password = passwordTemporal
    }
  }

  try {
    modalPersonal.error = ''
    saveError.value = ''
    const createdNewUser = Boolean(crearUsuario && !modalPersonal.usuarioId && passwordTemporal)
    let created = null
    if (modalPersonal.id) {
      created = await api.updatePersonal(modalPersonal.id, payload)
    } else {
      created = await api.createPersonal(payload)
    }
    const credNombre = created?.nombre_completo || modalPersonal.nombre.trim()
    const credRut = formatRut(created?.rut || rutLimpio)
    const credCorreo = created?.correo || payload.correo
    const credPass = created?.password || passwordTemporal
    await loadDashboardData()
    closeModalPersonal()
    if (createdNewUser && credPass) {
      openModalCredenciales({
        nombre: credNombre,
        rut: credRut,
        correo: credCorreo,
        rol: 'Usuario Rendidor',
        password: credPass
      })
    }
  } catch (err) {
    modalPersonal.error = err?.message || 'No se pudo guardar el personal'
  }
}

function adminRolLabelForEdit(admin) {
  const rol = admin?.rol || ''
  if (rol.includes('Dev') || admin?.rolApi === 'SUPER_ADMIN_DEV') {
    return sessionAdminNivel.value === ROLE_DEV
      ? 'Super Admin - Dev (Acceso Total + Eliminación)'
      : 'Super Admin - Dev'
  }
  if (rol.includes('Caja') || admin?.rolApi === 'ADMIN_CAJA') {
    return ROLE_ADMIN_CAJA
  }
  return ROLE_SUPER
}

function onEditAdmin(admin) {
  if (!canEditAdmins.value || !admin?.id) return
  modalEditAdmin.open = true
  modalEditAdmin.id = admin.id
  modalEditAdmin.rut = admin.rut || ''
  modalEditAdmin.nombre = admin.nombre || ''
  modalEditAdmin.correo = admin.correo || ''
  modalEditAdmin.rol = adminRolLabelForEdit(admin)
  modalEditAdmin.estado = admin.estadoApi || (admin.estado === 'Inactivo' ? 'inactivo' : 'activo')
  modalEditAdmin.error = ''
}

function closeModalEditAdmin() {
  modalEditAdmin.open = false
  modalEditAdmin.id = null
  modalEditAdmin.rut = ''
  modalEditAdmin.nombre = ''
  modalEditAdmin.correo = ''
  modalEditAdmin.rol = ''
  modalEditAdmin.estado = 'activo'
  modalEditAdmin.error = ''
}

async function onSaveEditAdmin() {
  if (!canEditAdmins.value || !modalEditAdmin.id) return
  if (!modalEditAdmin.nombre.trim() || !modalEditAdmin.correo.trim()) return
  try {
    modalEditAdmin.error = ''
    saveError.value = ''
    await api.updateUsuario(modalEditAdmin.id, {
      correo: modalEditAdmin.correo.trim(),
      rol: rolApiFromUi(shortAdminRol(modalEditAdmin.rol)),
      estado: modalEditAdmin.estado,
      nombre: modalEditAdmin.nombre.trim()
    })
    await loadDashboardData()
    closeModalEditAdmin()
  } catch (err) {
    modalEditAdmin.error = err?.message || 'No se pudo actualizar el administrador'
  }
}

/**
 * Alterna activo ↔ inactivo vía PUT /api/admin/usuarios/:id.
 * Actualiza la fila local al éxito; no permite desactivarse a sí mismo.
 */
async function toggleEstadoCuenta(row, { canToggle, listRef, label, onSuccess }) {
  if (!canToggle || !row?.id) return
  if (row.id === user.value?.id) {
    saveError.value = 'No puedes desactivarte a ti mismo'
    return
  }
  const actual = row.estadoApi || (row.estado === 'Inactivo' ? 'inactivo' : 'activo')
  const next = actual === 'activo' ? 'inactivo' : 'activo'
  if (next === 'inactivo') {
    const nombre = row.nombre || row.correo || row.rut || label
    if (!confirm(`¿Desactivar a "${nombre}"? No podrá iniciar sesión.`)) return
  }
  try {
    togglingEstadoId.value = row.id
    saveError.value = ''
    await api.updateUsuario(row.id, { estado: next })
    if (typeof onSuccess === 'function') {
      onSuccess(next)
    } else {
      const display = next === 'activo' ? 'Activo' : 'Inactivo'
      const list = listRef.value
      const idx = list.findIndex((x) => x.id === row.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], estado: display, estadoApi: next }
      }
    }
  } catch (err) {
    saveError.value = err?.message || `No se pudo ${next === 'activo' ? 'activar' : 'desactivar'} ${label}`
  } finally {
    togglingEstadoId.value = null
  }
}

function onToggleEstadoAdmin(admin) {
  return toggleEstadoCuenta(admin, {
    canToggle: canToggleAdminEstado.value,
    listRef: admins,
    label: 'el administrador'
  })
}

function onToggleEstadoPersonal(p) {
  if (!p?.usuarioId) return
  return toggleEstadoCuenta(
    {
      id: p.usuarioId,
      nombre: p.nombre,
      correo: p.correo,
      rut: p.rut,
      estadoApi: p.accesoKind === 'inactivo' ? 'inactivo' : 'activo',
      estado: p.accesoLabel
    },
    {
      canToggle: canTogglePersonalAcceso.value,
      listRef: personal,
      label: 'el usuario',
      onSuccess(next) {
        const idx = personal.value.findIndex((x) => x.id === p.id)
        if (idx < 0) return
        const accesoKind = next === 'activo' ? 'activo' : 'inactivo'
        personal.value[idx] = {
          ...personal.value[idx],
          accesoKind,
          accesoLabel: next === 'activo' ? 'Activo' : 'Inactivo',
          accesoSistema: accesoKind,
          usuarioEstado: next
        }
      }
    }
  )
}

async function onDeletePersonal(p) {
  if (!canHardDelete.value || !p?.id) return
  const msg = p.tieneUsuario
    ? `¿Eliminar la ficha de "${p.nombre}" (${formatRut(p.rut)})? También se desactivará el acceso de usuario (soft delete).`
    : `¿Eliminar la ficha de "${p.nombre}" (${formatRut(p.rut)})? (soft delete)`
  if (!confirm(msg)) return
  try {
    saveError.value = ''
    if (p.usuarioId) {
      await api.deleteUsuario(p.usuarioId)
    }
    await api.deleteTrabajador(p.id)
    await loadDashboardData()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo eliminar el personal'
  }
}

async function onResetPasswordPersonal(p) {
  if (!canResetPassword.value || !p?.usuarioId) return
  if (
    !confirm(
      `¿Reiniciar la contraseña de "${p.nombre}" (${formatRut(p.rut)})?\nSe generará una clave temporal basada en el RUT.`
    )
  ) {
    return
  }
  try {
    saveError.value = ''
    const result = await api.resetPasswordUsuario(p.usuarioId, { mode: 'rut' })
    openModalCredenciales({
      nombre: result.nombre || p.nombre,
      rut: result.rut || p.rut,
      correo: result.correo || p.correo,
      password: result.password,
      rol: result.rol || p.usuarioRol || 'USER_RENDIDOR'
    })
  } catch (err) {
    saveError.value = err?.message || 'No se pudo reiniciar la contraseña'
  }
}

async function onDeleteAdmin(admin) {
  if (!canHardDelete.value || !admin?.id) return
  if (admin.id === user.value?.id) {
    saveError.value = 'No puedes eliminarte a ti mismo'
    return
  }
  if (!confirm(`¿Eliminar al administrador "${admin.nombre || admin.correo || admin.rut}"? (soft delete)`)) return
  try {
    saveError.value = ''
    await api.deleteUsuario(admin.id)
    await loadDashboardData()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo eliminar el administrador'
  }
}

async function onResetPasswordAdmin(admin) {
  if (!canResetPassword.value || !admin?.id) return
  if (admin.id === user.value?.id) {
    saveError.value = 'No puedes reiniciar tu propia contraseña desde aquí; usa Mi Perfil.'
    return
  }
  if (
    !confirm(
      `¿Reiniciar la contraseña de "${admin.nombre || admin.correo || admin.rut}"?\nSe generará una clave temporal basada en el RUT.`
    )
  ) {
    return
  }
  try {
    saveError.value = ''
    const result = await api.resetPasswordUsuario(admin.id, { mode: 'rut' })
    openModalCredenciales({
      nombre: result.nombre || admin.nombre,
      rut: result.rut || admin.rut,
      correo: result.correo || admin.correo,
      password: result.password,
      rol: result.rol || admin.rol
    })
  } catch (err) {
    saveError.value = err?.message || 'No se pudo reiniciar la contraseña'
  }
}

function toggleFormTarjeta() {
  if (tarjetaFormOpen.value) {
    closeFormTarjeta()
    return
  }
  resetTarjetaForm()
  tarjetaFormOpen.value = true
}

function resetTarjetaForm() {
  tarjetaForm.editId = null
  tarjetaForm.alias = ''
  tarjetaForm.tipo = 'Crédito'
  tarjetaForm.ultimos4 = ''
  tarjetaForm.banco = ''
  tarjetaForm.titular = ''
}

function closeFormTarjeta() {
  tarjetaFormOpen.value = false
  resetTarjetaForm()
}

function onEditTarjeta(t) {
  tarjetaForm.editId = t.id
  tarjetaForm.alias = t.alias || ''
  tarjetaForm.tipo = t.tipo === 'Débito' || t.tipo === 'Debito' ? 'Débito' : 'Crédito'
  tarjetaForm.ultimos4 = t.ultimos4 || ''
  tarjetaForm.banco = t.banco === '-' ? '' : t.banco || ''
  tarjetaForm.titular = t.titular === '-' ? '' : t.titular || ''
  tarjetaFormOpen.value = true
}

async function onDeleteTarjeta(t) {
  if (!canHardDelete.value || !t?.id) return
  if (!confirm(`¿Eliminar la tarjeta "${t.alias}"? (soft delete)`)) return
  try {
    saveError.value = ''
    await api.deleteTarjeta(t.id)
    await loadDashboardData()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo eliminar la tarjeta'
  }
}

async function onToggleEstadoTarjeta(t) {
  if (!t?.id) return
  const next = t.estadoApi === 'activa' ? 'inactiva' : 'activa'
  if (next === 'inactiva') {
    if (
      !confirm(
        `¿Desactivar la tarjeta "${t.alias}"? No se podrán asignar pagos con fecha igual o posterior a hoy.`
      )
    ) {
      return
    }
  }
  try {
    togglingTarjetaId.value = t.id
    saveError.value = ''
    const updated = await api.updateTarjeta(t.id, { estado: next })
    const mapped = mapTarjeta(updated)
    const idx = tarjetasEmpresa.value.findIndex((x) => x.id === t.id)
    if (idx >= 0) {
      tarjetasEmpresa.value[idx] = mapped
    } else {
      await loadDashboardData()
    }
  } catch (err) {
    saveError.value =
      err?.message || `No se pudo ${next === 'activa' ? 'activar' : 'desactivar'} la tarjeta`
  } finally {
    togglingTarjetaId.value = null
  }
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
  const rutLimpio = cleanRut(adminForm.rut)
  if (!rutLimpio || !adminForm.nombre.trim() || !adminForm.correo.trim()) return
  if (!validarRutChileno(rutLimpio)) return
  if (!creatableAdminRoles.value.includes(adminForm.rol)) return
  if (adminForm.passType === 'manual' && !adminForm.password.trim()) return

  const passwordTemporal =
    adminForm.passType === 'manual'
      ? adminForm.password
      : passwordFromRut(rutLimpio)

  if (!passwordTemporal) return

  try {
    saveError.value = ''
    const created = await api.createUsuario({
      rut: rutLimpio,
      correo: adminForm.correo.trim(),
      password: passwordTemporal,
      rol: rolApiFromUi(shortAdminRol(adminForm.rol)),
      estado: 'activo',
      nombre: adminForm.nombre.trim()
    })
    await loadDashboardData()
    closeFormAdminUser()
    openModalCredenciales({
      ...created,
      rut: created.rut || rutLimpio,
      nombre: adminForm.nombre.trim(),
      password: created.password || passwordTemporal
    })
  } catch (err) {
    saveError.value = err?.message || 'No se pudo crear el admin'
  }
}

async function onSaveTarjeta() {
  if (!tarjetaForm.alias.trim() || !tarjetaForm.ultimos4.trim()) return
  try {
    saveError.value = ''
    const payload = {
      alias: tarjetaForm.alias.trim(),
      tipo: tarjetaForm.tipo === 'Débito' ? 'Debito' : 'Credito',
      ultimos_digitos: tarjetaForm.ultimos4.trim(),
      banco: tarjetaForm.banco.trim() || null,
      titular_nombre: tarjetaForm.titular.trim() || null,
      estado: 'activa'
    }
    if (tarjetaForm.editId) {
      await api.updateTarjeta(tarjetaForm.editId, payload)
    } else {
      await api.createTarjeta(payload)
    }
    await loadDashboardData()
    closeFormTarjeta()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo guardar la tarjeta'
  }
}

async function onLogout() {
  userMenuOpen.value = false
  // TEMP_AUTH_BYPASS - revertir antes de commit
  if (TEMP_AUTH_BYPASS) {
    sessionStorage.removeItem('TEMP_AUTH_BYPASS_OK')
  }
  await logout()
}
</script>
