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
            <input
              :value="formatRut(user?.rut || '')"
              type="text"
              readonly
              tabindex="-1"
              class="dash-mono dash-input-readonly"
              aria-readonly="true"
            />
          </div>
          <div class="dash-field">
            <label>Correo</label>
            <input v-model="modalPerfil.correo" type="email" required placeholder="correo@empresa.cl" />
          </div>
          <p class="dash-hint">Cambiar contraseña (opcional)</p>
          <div class="dash-field">
            <label>Contraseña actual</label>
            <div class="dash-password-wrap">
              <input
                v-model="modalPerfil.passwordActual"
                :type="modalPerfil.showPasswordActual ? 'text' : 'password'"
                autocomplete="current-password"
              />
              <button
                class="dash-password-toggle"
                type="button"
                :aria-label="modalPerfil.showPasswordActual ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                :aria-pressed="modalPerfil.showPasswordActual"
                @click="modalPerfil.showPasswordActual = !modalPerfil.showPasswordActual"
              >
                <i
                  class="fa-solid"
                  :class="modalPerfil.showPasswordActual ? 'fa-eye-slash' : 'fa-eye'"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
          </div>
          <div class="dash-field">
            <label>Nueva contraseña</label>
            <div class="dash-password-wrap">
              <input
                v-model="modalPerfil.passwordNueva"
                :type="modalPerfil.showPasswordNueva ? 'text' : 'password'"
                autocomplete="new-password"
              />
              <button
                class="dash-password-toggle"
                type="button"
                :aria-label="modalPerfil.showPasswordNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                :aria-pressed="modalPerfil.showPasswordNueva"
                @click="modalPerfil.showPasswordNueva = !modalPerfil.showPasswordNueva"
              >
                <i
                  class="fa-solid"
                  :class="modalPerfil.showPasswordNueva ? 'fa-eye-slash' : 'fa-eye'"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
          </div>
          <div class="dash-field">
            <label>Confirmar nueva contraseña</label>
            <div class="dash-password-wrap">
              <input
                v-model="modalPerfil.passwordConfirmar"
                :type="modalPerfil.showPasswordConfirmar ? 'text' : 'password'"
                autocomplete="new-password"
              />
              <button
                class="dash-password-toggle"
                type="button"
                :aria-label="modalPerfil.showPasswordConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                :aria-pressed="modalPerfil.showPasswordConfirmar"
                @click="modalPerfil.showPasswordConfirmar = !modalPerfil.showPasswordConfirmar"
              >
                <i
                  class="fa-solid"
                  :class="modalPerfil.showPasswordConfirmar ? 'fa-eye-slash' : 'fa-eye'"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
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

    <!-- Modal personal asignado a una caja -->
    <div
      v-if="modalPersonalCaja.open"
      class="dash-modal-backdrop"
      @click.self="closeModalPersonalCaja"
    >
      <div
        class="dash-modal dash-modal--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-personal-caja-title"
      >
        <div class="dash-modal-head">
          <div>
            <h3 id="modal-personal-caja-title">Personal asignado</h3>
            <p class="dash-hint">{{ modalPersonalCaja.cajaNombre }}</p>
          </div>
          <button
            class="dash-modal-close"
            type="button"
            aria-label="Cerrar"
            @click="closeModalPersonalCaja"
          >
            ×
          </button>
        </div>
        <div v-if="!modalPersonalCaja.lista.length" class="dash-cajas-empty">
          Nadie asignado actualmente a esta caja.
        </div>
        <div v-else class="dash-modal-personal-caja">
          <table class="dash-table dash-table--compact">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUT</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in modalPersonalCaja.lista" :key="p.id">
                <td class="dash-table-strong">{{ p.nombre }}</td>
                <td class="dash-mono dash-nowrap">{{ formatRut(p.rut) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="dash-modal-actions">
          <button class="dash-btn-secondary" type="button" @click="closeModalPersonalCaja">
            Cerrar
          </button>
        </div>
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
                :value="modalPersonal.nombre"
                type="text"
                required
                maxlength="100"
                placeholder="Mario Silva"
                @input="onPersonalNombreInput"
              />
            </div>
            <div class="dash-field">
              <label>Cargo</label>
              <input
                :value="modalPersonal.cargo"
                type="text"
                maxlength="100"
                placeholder="Conductor Camión Riego"
                @input="onPersonalCargoInput"
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

          <div
            v-if="!modalPersonal.esAdmin"
            class="dash-personal-access-toggle dash-admin-form-section"
          >
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
          <p v-else class="dash-hint dash-admin-form-section">
            Acceso de administrador: se gestiona en la pestaña Admin Users (no se crea usuario
            rendidor).
          </p>

          <template v-if="modalPersonal.crearUsuario && !modalPersonal.esAdmin">
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

    <!-- Modal historial parcial (mes trabajador+caja) -->
    <div
      v-if="modalParcialMes.open"
      class="dash-modal-backdrop"
      @click.self="closeModalParcialMes"
    >
      <div
        class="dash-modal dash-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-parcial-title"
      >
        <div class="dash-modal-head">
          <div>
            <h3 id="modal-parcial-title">Historial del mes</h3>
            <p class="dash-hint">
              {{ modalParcialMes.trabajador }} · {{ modalParcialMes.cajaLabel }} ·
              {{ modalParcialMes.mesLabel }}
            </p>
          </div>
          <button
            class="dash-modal-close"
            type="button"
            aria-label="Cerrar"
            @click="closeModalParcialMes"
          >
            ×
          </button>
        </div>

        <div class="dash-table-wrap dash-parcial-table">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Doc</th>
                <th>Detalle</th>
                <th class="dash-table-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in modalParcialMes.items" :key="idx">
                <td class="dash-mono">{{ item.fecha }}</td>
                <td class="dash-mono dash-nowrap">{{ item.hora }}</td>
                <td>
                  <span class="dash-badge" :class="item.badgeClass">{{ item.tipo }}</span>
                </td>
                <td class="dash-mono" :class="item.docClass">{{ item.doc }}</td>
                <td :title="item.detalle">{{ item.detalle }}</td>
                <td class="dash-table-right dash-table-amount dash-nowrap">{{ item.monto }}</td>
              </tr>
              <tr v-if="!modalParcialMes.items.length">
                <td colspan="6" class="dash-cajas-empty">Sin movimientos en el mes.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="dash-parcial-totales">
          <div class="dash-parcial-total">
            <span class="dash-parcial-total-label">Total asignaciones</span>
            <span class="dash-parcial-total-value">{{ modalParcialMes.totalAnticipos }}</span>
          </div>
          <div class="dash-parcial-total">
            <span class="dash-parcial-total-label">Total declarado</span>
            <span class="dash-parcial-total-value">{{ modalParcialMes.totalDeclarado }}</span>
          </div>
          <div class="dash-parcial-total dash-parcial-total--accent">
            <span class="dash-parcial-total-label">{{ modalParcialMes.labelDevolucion }}</span>
            <span class="dash-parcial-total-value">{{ modalParcialMes.totalDevolucion }}</span>
          </div>
          <p class="dash-hint dash-parcial-quien">
            <template v-if="modalParcialMes.quien === 'trabajador'">
              Debe devolver: <strong>Trabajador</strong> (quedó saldo de asignación sin gastar).
            </template>
            <template v-else-if="modalParcialMes.quien === 'empresa'">
              Debe devolver: <strong>Empresa</strong> (lo declarado supera la asignación recibida).
            </template>
            <template v-else>
              No hay saldo a devolver (asignación y declarado quedan parejos).
            </template>
          </p>
        </div>

        <div class="dash-modal-actions">
          <button class="dash-btn-secondary" type="button" @click="closeModalParcialMes">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal historial cartola -->
    <div
      v-if="modalHistorialCartola.open"
      class="dash-modal-backdrop"
      @click.self="closeModalHistorialCartola"
    >
      <div
        class="dash-modal dash-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-historial-cartola-title"
      >
        <div class="dash-modal-head">
          <div>
            <h3 id="modal-historial-cartola-title">
              Historial
              <span v-if="modalHistorialCartola.doc" class="dash-rinde">
                {{ modalHistorialCartola.doc }}
              </span>
            </h3>
            <p class="dash-hint">
              Detalle del movimiento y seguimiento de devoluciones / correcciones.
            </p>
          </div>
          <button
            class="dash-modal-close"
            type="button"
            aria-label="Cerrar"
            @click="closeModalHistorialCartola"
          >
            ×
          </button>
        </div>

        <div class="dash-historial-modal-body">
          <div class="dash-intento-prev-grid">
            <div>
              <span class="dash-intento-prev-key">Tipo:</span>
              <span>{{ modalHistorialCartola.tipo }}</span>
            </div>
            <div>
              <span class="dash-intento-prev-key">Fecha:</span>
              <span>{{ modalHistorialCartola.fecha }}</span>
            </div>
            <div>
              <span class="dash-intento-prev-key">Responsable:</span>
              <span>{{ modalHistorialCartola.responsable }}</span>
            </div>
            <div>
              <span class="dash-intento-prev-key">Monto:</span>
              <span>{{ modalHistorialCartola.monto }}</span>
            </div>
            <div v-if="modalHistorialCartola.pago">
              <span class="dash-intento-prev-key">Pago / Docto:</span>
              <span>
                {{ modalHistorialCartola.pago }}
                <template v-if="modalHistorialCartola.docto">
                  · {{ modalHistorialCartola.docto }}
                </template>
              </span>
            </div>
            <div v-if="modalHistorialCartola.estado">
              <span class="dash-intento-prev-key">Estado:</span>
              <span class="dash-status" :class="modalHistorialCartola.estadoClass">
                {{ modalHistorialCartola.estado }}
              </span>
            </div>
            <div v-if="modalHistorialCartola.intento > 1">
              <span class="dash-intento-prev-key">Intentos:</span>
              <span>#{{ modalHistorialCartola.intento }}</span>
            </div>
          </div>

          <div v-if="modalHistorialCartola.detalle" class="dash-intento-prev-desc">
            <span class="dash-intento-prev-key">Detalle / observación:</span>
            <p>{{ modalHistorialCartola.detalle }}</p>
          </div>

          <div
            v-if="modalHistorialCartola.observacionAdmin"
            class="dash-obs-admin dash-admin-form-section"
          >
            <span class="dash-obs-admin-label">Observación del Administrador</span>
            <p class="dash-obs-admin-text">“{{ modalHistorialCartola.observacionAdmin }}”</p>
          </div>

          <div class="dash-admin-form-section">
            <span class="dash-intento-prev-key">Comprobante:</span>
            <button
              v-if="modalHistorialCartola.comprobanteNombre"
              type="button"
              class="dash-adjunto-btn"
              @click="openComprobanteArchivo(modalHistorialCartola.comprobanteNombre)"
            >
              📄 {{ labelAdjunto(modalHistorialCartola.comprobanteNombre) }}
            </button>
            <span v-else class="dash-muted">Sin comprobante adjunto</span>
          </div>
        </div>

        <div class="dash-modal-actions">
          <button class="dash-btn-secondary" type="button" @click="closeModalHistorialCartola">
            Cerrar
          </button>
        </div>
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
              placeholder="Nombre Apellido"
            />
          </div>
          <div class="dash-field">
            <label>Correo Electrónico</label>
            <input
              v-model="modalEditAdmin.correo"
              type="email"
              required
              placeholder="usuario@empresa.cl"
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

          <nav class="dash-sidebar-nav">
            <div class="dash-sidebar-section">
              <span
                class="dash-sidebar-section-label"
                :class="{ 'dash-sidebar-text--invisible': !sidebarOpen }"
              >
                Operación
              </span>
              <template v-for="item in operacionNavItems" :key="item.id">
                <button
                  v-if="!item.adminOnly || isAdminSession"
                  type="button"
                  class="dash-nav-item"
                  :class="
                    activeView === item.id ? 'dash-nav-item--active' : 'dash-nav-item--ghost'
                  "
                  :title="item.label"
                  @click="selectView(item.id)"
                >
                  <i class="dash-nav-icon fa-solid" :class="item.icon" aria-hidden="true"></i>
                  <span
                    class="dash-nav-text"
                    :class="{ 'dash-sidebar-text--invisible': !sidebarOpen }"
                  >
                    {{ item.label }}
                  </span>
                </button>
              </template>
            </div>

            <div v-if="isAdminSession" class="dash-sidebar-section">
              <span
                class="dash-sidebar-section-label"
                :class="{ 'dash-sidebar-text--invisible': !sidebarOpen }"
              >
                Configuración
              </span>
              <button
                v-for="item in configuracionNavItems"
                :key="item.id"
                type="button"
                class="dash-nav-item"
                :class="
                  activeView === item.id ? 'dash-nav-item--active' : 'dash-nav-item--ghost'
                "
                :title="item.label"
                @click="selectView(item.id)"
              >
                <i class="dash-nav-icon fa-solid" :class="item.icon" aria-hidden="true"></i>
                <span
                  class="dash-nav-text"
                  :class="{ 'dash-sidebar-text--invisible': !sidebarOpen }"
                >
                  {{ item.label }}
                </span>
              </button>
            </div>

            <div v-if="isAdminSession" class="dash-sidebar-section">
              <span
                class="dash-sidebar-section-label"
                :class="{ 'dash-sidebar-text--invisible': !sidebarOpen }"
              >
                Administración
              </span>
              <button
                v-for="item in administracionNavItemsVisibles"
                :key="item.id"
                type="button"
                class="dash-nav-item"
                :class="
                  activeView === item.id ? 'dash-nav-item--active' : 'dash-nav-item--ghost'
                "
                :title="item.label"
                @click="selectView(item.id)"
              >
                <i class="dash-nav-icon fa-solid" :class="item.icon" aria-hidden="true"></i>
                <span
                  class="dash-nav-text"
                  :class="{ 'dash-sidebar-text--invisible': !sidebarOpen }"
                >
                  {{ item.label }}
                </span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      <main class="dash-main">
        <p v-if="dataLoading" class="dash-banner dash-banner--info">Cargando datos…</p>
        <div v-if="dataError" class="dash-banner dash-banner--danger dash-banner--dismiss">
          <span>{{ dataError }}</span>
          <button
            type="button"
            class="dash-banner-close"
            aria-label="Cerrar"
            @click="dataError = ''"
          >
            ×
          </button>
        </div>
        <div v-if="saveError" class="dash-banner dash-banner--danger dash-banner--dismiss">
          <span>{{ saveError }}</span>
          <button
            type="button"
            class="dash-banner-close"
            aria-label="Cerrar"
            @click="saveError = ''"
          >
            ×
          </button>
        </div>
        <div v-if="saveOk" class="dash-banner dash-banner--ok dash-banner--dismiss">
          <span>{{ saveOk }}</span>
          <button
            type="button"
            class="dash-banner-close"
            aria-label="Cerrar"
            @click="saveOk = ''"
          >
            ×
          </button>
        </div>
        <section v-if="isOperacionView && isAdminSession" class="dash-metrics">
          <div class="dash-metrics-head">
            <div class="dash-metrics-title">
              <span class="dash-metrics-dot" aria-hidden="true"></span>
              <span>Estado de Caja</span>
            </div>

            <div class="dash-metrics-controls">
              <div class="dash-caja dash-caja--search" ref="ccFiltroRootEl">
                <span class="dash-caja-label">CC:</span>
                <div class="dash-combobox dash-combobox--metrics">
                  <div class="dash-caja-search-row">
                    <input
                      ref="ccFiltroInputEl"
                      v-model="ccFiltroQuery"
                      type="text"
                      class="dash-caja-select dash-caja-search-input"
                      placeholder="Todos"
                      autocomplete="off"
                      @focus="onCcFiltroFocus"
                      @input="onCcFiltroQueryInput"
                      @keydown.down.prevent="highlightCcFiltro(1)"
                      @keydown.up.prevent="highlightCcFiltro(-1)"
                      @keydown.enter.prevent="confirmCcFiltroHighlight"
                      @keydown.escape="onCcFiltroEscape"
                      @blur="onCcFiltroBlur"
                    />
                    <button
                      v-if="ccFiltroMuestraReset"
                      type="button"
                      class="dash-caja-clear-btn"
                      title="Reiniciar a Todos"
                      aria-label="Reiniciar CC a Todos"
                      @mousedown.prevent="resetCcFiltro"
                    >
                      <svg
                        class="dash-caja-clear-icon"
                        viewBox="0 0 24 24"
                        width="13"
                        height="13"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          fill="currentColor"
                          d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6a6 6 0 0 1-6 6 6 6 0 0 1-6-6H4a8 8 0 0 0 8 8 8 8 0 0 0 8-8c0-4.42-3.58-8-8-8z"
                        />
                      </svg>
                    </button>
                  </div>
                  <ul
                    v-if="ccFiltroOpen && ccFiltroOpcionesVisibles.length"
                    class="dash-combobox-list dash-combobox-list--metrics"
                    role="listbox"
                  >
                    <li
                      v-for="(opt, idx) in ccFiltroOpcionesVisibles"
                      :key="opt.id || 'todos'"
                      class="dash-combobox-option"
                      :class="{ 'dash-combobox-option--active': idx === ccFiltroHighlight }"
                      role="option"
                      @mousedown.prevent="selectCcFiltro(opt)"
                    >
                      {{ opt.label }}
                    </li>
                  </ul>
                </div>
              </div>

              <div class="dash-caja dash-caja--search" ref="cajaFiltroRootEl">
                <span class="dash-caja-label">Caja:</span>
                <div class="dash-combobox dash-combobox--metrics">
                  <div class="dash-caja-search-row">
                    <input
                      ref="cajaFiltroInputEl"
                      v-model="cajaFiltroQuery"
                      type="text"
                      class="dash-caja-select dash-caja-search-input"
                      placeholder="Buscar caja…"
                      autocomplete="off"
                      @focus="onCajaFiltroFocus"
                      @input="onCajaFiltroQueryInput"
                      @keydown.down.prevent="highlightCajaFiltro(1)"
                      @keydown.up.prevent="highlightCajaFiltro(-1)"
                      @keydown.enter.prevent="confirmCajaFiltroHighlight"
                      @keydown.escape="onCajaFiltroEscape"
                      @blur="onCajaFiltroBlur"
                    />
                    <button
                      v-if="cajaFiltroQuery.trim()"
                      type="button"
                      class="dash-caja-clear-btn"
                      title="Borrar texto"
                      aria-label="Borrar texto de caja"
                      @mousedown.prevent="clearCajaFiltroTexto"
                    >
                      <svg
                        class="dash-caja-clear-icon"
                        viewBox="0 0 16 16"
                        width="11"
                        height="11"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          fill="currentColor"
                          d="M3.2 3.2a.75.75 0 0 1 1.06 0L8 6.94l3.74-3.74a.75.75 0 1 1 1.06 1.06L9.06 8l3.74 3.74a.75.75 0 1 1-1.06 1.06L8 9.06l-3.74 3.74a.75.75 0 0 1-1.06-1.06L6.94 8 3.2 4.26a.75.75 0 0 1 0-1.06z"
                        />
                      </svg>
                    </button>
                  </div>
                  <ul
                    v-if="cajaFiltroOpen && cajaFiltroOpcionesVisibles.length"
                    class="dash-combobox-list dash-combobox-list--metrics"
                    role="listbox"
                  >
                    <li
                      v-for="(opt, idx) in cajaFiltroOpcionesVisibles"
                      :key="opt.groupKey"
                      class="dash-combobox-option"
                      :class="{ 'dash-combobox-option--active': idx === cajaFiltroHighlight }"
                      role="option"
                      @mousedown.prevent="selectCajaFiltro(opt)"
                    >
                      {{ opt.label }}
                    </li>
                  </ul>
                </div>
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
                <p class="dash-metric-label">Asignaciones</p>
                <p class="dash-metric-value dash-metric-value--accent">
                  {{ formatMonto(resumenCaja.anticipos_pendientes.total) }}
                </p>
              </div>
              <span class="dash-chip dash-chip--accent">
                {{ resumenCaja.anticipos_pendientes.cantidad }} Asignaciones
              </span>
            </div>
          </div>
        </section>

      <!-- Rendición de Gastos -->
      <template v-if="activeView === 'rendicion'">
        <div class="dash-rendicion-gestion">
          <div class="dash-cajas-toolbar">
            <div>
              <h3 class="dash-cajas-toolbar-title">Rendición de Gastos</h3>
              <p class="dash-cajas-toolbar-hint">
                Declaración y seguimiento de gastos para reembolso.
              </p>
            </div>
            <div class="dash-toolbar-actions">
              <input
                ref="legacyComprobanteInputEl"
                type="file"
                accept=".pdf,image/png,image/jpeg,.png,.jpg,.jpeg,application/pdf"
                class="dash-sr-only"
                @change="onLegacyComprobanteFile"
              />
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
                    <strong>N° documento:</strong> Peaje, Viático y Otro pago no requieren;
                    Boleta opcional;
                    <strong>Factura</strong>, <strong>Guía Despacho</strong> y
                    <strong>Orden de compra</strong> obligatorio (debe verse en la foto).
                  </p>
                  <p>
                    <strong>Opcionales:</strong> Patente (no aplica en Viático); N° docto en Boleta;
                    comprobante en Viático / Otro pago; últimos 4 dígitos de tarjeta si la forma
                    de pago es Efectivo.
                  </p>
                  <p>
                    Si adjunta una <strong>foto</strong> (no PDF), asegúrese de que se vea
                    claramente el <strong>cobro/total</strong>.
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
                    <option>Peaje</option>
                    <option>Guía Despacho</option>
                    <option>Orden de compra</option>
                    <option>Viático</option>
                    <option>Otro pago</option>
                  </select>
                </div>
                <div v-if="gastoMuestraNumeroDocto" class="dash-field">
                  <label class="dash-label-inline">
                    N° Docto
                    <span
                      v-if="!gastoRequiereNumeroDocto"
                      class="dash-label-aside"
                    >(opcional)</span>
                  </label>
                  <input
                    v-model="gasto.numero"
                    type="text"
                    placeholder="12345"
                  />
                </div>
              </div>

              <div class="dash-form dash-gasto-grid-4 dash-form--section">
                <div class="dash-field">
                  <label>Monto Total ($)</label>
                  <input
                    :value="gasto.monto"
                    type="text"
                    inputmode="numeric"
                    placeholder="0"
                    class="dash-input-strong dash-input-monto"
                    autocomplete="off"
                    @input="onGastoMontoInput"
                  />
                </div>

                <div v-if="gastoMuestraPatente" class="dash-field">
                  <label>
                    Patente
                    <span class="dash-label-aside">(opcional)</span>
                  </label>
                  <input
                    :value="gasto.patenteDisplay"
                    type="text"
                    placeholder="AB-CD-12"
                    maxlength="8"
                    autocomplete="off"
                    class="dash-mono"
                    @input="onGastoPatenteInput"
                  />
                </div>

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
                  <label>Forma de Pago</label>
                  <select
                    v-model="gasto.metodoPago"
                    :disabled="gastoFuerzaEfectivo"
                    :class="{ 'dash-input-locked': gastoFuerzaEfectivo }"
                    @change="onGastoMetodoPagoChange"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                  </select>
                  <p v-if="gastoFuerzaEfectivo" class="dash-field-hint">
                    Viático y Otro pago se registran solo como efectivo.
                  </p>
                  <p v-else-if="gasto.metodoPago === 'efectivo'" class="dash-field-hint">
                    Con efectivo no se requieren dígitos de tarjeta.
                  </p>
                </div>

                <div v-if="gastoRequiereTarjetaDigits" class="dash-field">
                  <label>Últimos 4 dígitos *</label>
                  <input
                    v-model="gasto.tarjetaUltimos4"
                    type="text"
                    inputmode="numeric"
                    maxlength="4"
                    pattern="[0-9]{4}"
                    placeholder="1234"
                    autocomplete="off"
                    required
                    @input="onGastoTarjetaDigitsInput"
                  />
                  <p v-if="tarjetaGastoMatch" class="dash-field-hint dash-hint--ok">
                    Tarjeta empresa: {{ tarjetaGastoMatch.alias }}
                  </p>
                  <p
                    v-else-if="gasto.tarjetaUltimos4.length === 4"
                    class="dash-field-hint"
                  >
                    Sin coincidencia en tarjetas empresa (se registra como pago con esa tarjeta).
                  </p>
                </div>

                <div
                  class="dash-field"
                  :class="{ 'dash-gasto-span-4': true }"
                >
                  <label>
                    Adjuntar Comprobante (PDF / PNG / JPG)
                    <span v-if="gastoComprobanteOpcional" class="dash-label-aside">(opcional)</span>
                    <span v-else> *</span>
                  </label>
                  <input
                    ref="gastoFileInputEl"
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    class="dash-file"
                    :required="!gastoComprobanteOpcional"
                    @change="onGastoFile"
                  />
                  <span v-if="gasto.comprobanteNombre" class="dash-field-hint">
                    Archivo: {{ gasto.comprobanteNombre }}
                  </span>
                  <p v-if="canSkipComprobanteIa" class="dash-field-hint dash-hint--ok">
                    Bypass Dev activo: se omite la validación IA de monto / N° documento (sigue
                    obligatorio adjuntar archivo).
                  </p>
                </div>
              </div>

              <div class="dash-form--section">
                <div class="dash-desc-head">
                  <label class="dash-field-label">Descripción / Observación *</label>
                  <span
                    class="dash-word-count"
                    :class="{ 'dash-word-count--over': letrasDescripcion > 500 }"
                  >
                    {{ letrasDescripcion }} / 500 caracteres
                  </span>
                </div>
                <textarea
                  :value="gasto.descripcion"
                  rows="3"
                  maxlength="500"
                  placeholder="Detalle amplio del gasto..."
                  class="dash-textarea"
                  required
                  @input="onGastoDescripcionInput"
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
              <span class="dash-historial-total-label">Total Asignación</span>
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
                  <button
                    v-if="estadoDevolucionDisplay(row).parcial"
                    type="button"
                    class="dash-status dash-status--toggle dash-status--info"
                    title="Ver historial del mes (anticipos y gastos)"
                    @click="openModalParcialMes(row)"
                  >
                    Parcial
                  </button>
                  <span
                    v-else
                    class="dash-status"
                    :class="estadoDevolucionDisplay(row).class"
                  >
                    {{ estadoDevolucionDisplay(row).label }}
                  </span>
                </td>
                <td class="dash-table-center">
                  <div class="dash-actions-cell">
                    <template v-if="isAdminSession">
                      <button
                        v-if="row.estado === 'Por Corregir' && !esLegacyHistorico(row)"
                        class="dash-btn-edit"
                        type="button"
                        @click="openModalCorregir(row)"
                      >
                        Corregir Rendición
                      </button>
                      <button
                        v-else-if="row.estado !== 'Rechazado' && !esLegacyHistorico(row)"
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
                      <span v-else-if="esLegacyHistorico(row)" class="dash-badge dash-badge--legacy"
                        >Solo lectura</span
                      >
                      <span v-else class="dash-muted">-</span>
                      <button
                        v-if="puedeAdjuntarComprobanteGasto(row)"
                        class="dash-btn-ghost-sm"
                        type="button"
                        @click="triggerAdjuntarComprobante('gasto', row)"
                      >
                        {{
                          row.comprobanteNombre ? 'Cambiar comprobante' : 'Subir comprobante'
                        }}
                      </button>
                      <button
                        v-if="row.estado === 'Por Corregir' && !esLegacyHistorico(row)"
                        class="dash-btn-ghost-sm"
                        type="button"
                        title="Responder como administrador"
                        @click="openModalResponder(row)"
                      >
                        Admin
                      </button>
                      <button
                        v-if="muestraSoftDeleteAdmin(row)"
                        class="dash-btn-icon dash-btn-icon--danger"
                        type="button"
                        :disabled="!puedeSoftDeleteAdmin(row)"
                        :title="tituloSoftDeleteAdmin(row)"
                        @click="onSoftDeleteRendicion(row)"
                      >
                        <i class="fa-solid fa-trash" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="canDevForceDelete && !esLegacyHistorico(row) && row.id"
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
                        v-if="row.estado === 'Por Corregir' && !esLegacyHistorico(row)"
                        class="dash-btn-edit"
                        type="button"
                        @click="openModalCorregir(row)"
                      >
                        Corregir Rendición
                      </button>
                      <button
                        v-if="puedeAdjuntarComprobanteGasto(row)"
                        class="dash-btn-ghost-sm"
                        type="button"
                        @click="triggerAdjuntarComprobante('gasto', row)"
                      >
                        {{
                          row.comprobanteNombre ? 'Cambiar comprobante' : 'Subir comprobante'
                        }}
                      </button>
                      <button
                        v-if="canDevForceDelete && !esLegacyHistorico(row) && row.id"
                        class="dash-btn-icon dash-btn-icon--danger"
                        type="button"
                        title="Hard delete (Dev)"
                        @click="onHardDeleteRendicion(row)"
                      >
                        <i class="fa-solid fa-trash" aria-hidden="true"></i>
                      </button>
                      <span
                        v-else-if="
                          !(row.estado === 'Por Corregir' && !esLegacyHistorico(row)) &&
                          !puedeAdjuntarComprobanteGasto(row)
                        "
                        class="dash-muted"
                        >-</span
                      >
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
                  <template v-if="canSkipComprobanteIa">
                    Bypass Super Admin Dev: se guarda el comprobante sin validar monto
                    <template v-if="pendingVerifyKind === 'gasto' && gastoRequiereNumeroDocto">
                      ni N° de documento
                    </template>
                    con IA.
                  </template>
                  <template v-else>
                    La IA revisa que el monto
                    <template v-if="pendingVerifyKind === 'gasto' && gastoRequiereNumeroDocto">
                      y el N° de documento
                    </template>
                    sean legibles y coincidan con lo declarado.
                  </template>
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
              <p class="dash-verify-status">
                {{
                  canSkipComprobanteIa
                    ? 'Guardando comprobante (bypass IA)…'
                    : 'Analizando comprobante…'
                }}
              </p>
              <p class="dash-field-hint">
                {{
                  canSkipComprobanteIa
                    ? 'Modo Super Admin Dev: sin validación de monto.'
                    : 'Esto puede tomar unos segundos.'
                }}
              </p>
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
                <span v-if="verifyComprobanteNombre" class="dash-field-hint">
                  Actual: {{ verifyComprobanteNombre }}
                </span>
              </div>
              <div class="dash-modal-actions">
                <button class="dash-btn-secondary" type="button" @click="onCloseModalVerificar">
                  Cancelar
                </button>
                <button
                  class="dash-btn-primary"
                  type="button"
                  :disabled="!verifyComprobanteFile"
                  @click="retryVerificarYGuardar"
                >
                  Reintentar verificación
                </button>
              </div>
            </div>

            <div v-else-if="modalVerificar.phase === 'ok'" class="dash-verify-body">
              <p class="dash-verify-ok">
                Documento validado.
                <template v-if="pendingVerifyKind === 'gasto-adjunto' || pendingVerifyKind === 'anticipo-adjunto'">
                  Guardando comprobante…
                </template>
                <template v-else>
                  Guardando
                  {{ pendingVerifyKind === 'anticipo' ? 'asignación' : 'rendición' }}…
                </template>
              </p>
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
                    <span>Forma de Pago</span>
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
                    :class="{ 'dash-word-count--over': letrasComentarioAdmin > 500 }"
                  >
                    {{ letrasComentarioAdmin }} / 500 caracteres
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
                  :value="modalResponder.comentario"
                  rows="3"
                  maxlength="500"
                  placeholder="Ej: Factura ilegible favor subir foto donde se aprecie claramente el RUT y monto"
                  class="dash-textarea"
                  :required="comentarioRequeridoAdmin"
                  @input="onComentarioAdminInput"
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
                    <option>Peaje</option>
                    <option>Guía Despacho</option>
                    <option>Orden de compra</option>
                    <option>Viático</option>
                    <option>Otro pago</option>
                  </select>
                </div>
                <div v-if="modalCorregir.campos.monto" class="dash-field">
                  <label>Monto Corregido ($)</label>
                  <input
                    :value="modalCorregir.monto"
                    type="text"
                    inputmode="numeric"
                    class="dash-input-strong dash-input-monto"
                    autocomplete="off"
                    @input="onCorregirMontoInput"
                  />
                </div>
                <div v-if="modalCorregir.campos.origen_pago" class="dash-field">
                  <label>Forma de Pago</label>
                  <select v-model="modalCorregir.metodoPago">
                    <option value="efectivo">Efectivo</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                  </select>
                  <p v-if="modalCorregir.metodoPago === 'efectivo'" class="dash-field-hint">
                    Con efectivo no se requieren dígitos de tarjeta.
                  </p>
                </div>
                <div
                  v-if="
                    modalCorregir.campos.origen_pago &&
                    (modalCorregir.metodoPago === 'debito' || modalCorregir.metodoPago === 'credito')
                  "
                  class="dash-field"
                >
                  <label>Últimos 4 dígitos *</label>
                  <input
                    v-model="modalCorregir.tarjetaUltimos4"
                    type="text"
                    inputmode="numeric"
                    maxlength="4"
                    placeholder="1234"
                    autocomplete="off"
                    required
                    @input="
                      modalCorregir.tarjetaUltimos4 = String($event.target.value || '')
                        .replace(/\D/g, '')
                        .slice(0, 4)
                    "
                  />
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
                  :value="modalCorregir.descripcion"
                  rows="2"
                  maxlength="500"
                  placeholder="Actualiza el detalle del gasto..."
                  class="dash-textarea"
                  @input="onCorregirDescripcionInput"
                ></textarea>
              </div>

              <div class="dash-field">
                <label>Respuesta / Aclaración al Admin</label>
                <textarea
                  :value="modalCorregir.respuesta"
                  rows="2"
                  maxlength="500"
                  placeholder="Ej: Subo nueva foto enfocada con el numero de boleta legible"
                  class="dash-textarea"
                  @input="onCorregirRespuestaInput"
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

      <!-- Asignación -->
      <div v-else-if="activeView === 'asignacion' && isAdminSession" class="dash-assign">
        <div class="dash-rendicion-gestion">
          <div class="dash-cajas-toolbar">
            <div>
              <h3 class="dash-cajas-toolbar-title">Asignación</h3>
              <p class="dash-cajas-toolbar-hint">
                Registro de asignaciones entregadas a trabajadores.
              </p>
            </div>
            <div class="dash-toolbar-actions">
              <button
                class="dash-btn-primary dash-btn-toggle-caja"
                type="button"
                @click="toggleFormAnticipo"
              >
                <span>{{ anticipoFormOpen ? '▲' : '＋' }}</span>
                <span>
                  {{ anticipoFormOpen ? 'Ocultar Formulario' : 'Registrar Asignación' }}
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
                  Nueva Asignación
                </h2>
                <p class="dash-hint">
                  Completa los datos de la asignación entregada.
                </p>
                <div class="dash-alert dash-alert--warn">
                  <p>
                    <strong>Importante:</strong> una vez guardada, la asignación
                    <strong>no se puede editar ni eliminar</strong>. Revise bien los datos antes de
                    guardar.
                  </p>
                  <p>
                    <strong>Todos los campos son obligatorios</strong> (incl.
                    <strong>N° Doc / Vale</strong>, <strong>observaciones</strong> y
                    <strong>comprobante</strong>).
                  </p>
                  <p>
                    Si adjunta una <strong>foto</strong> (no PDF), asegúrese de que se vea
                    claramente el <strong>comprobante</strong>.
                  </p>
                </div>
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
                  <label>Fondo Fijo / Caja *</label>
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
                  <label>Fecha *</label>
                  <input v-model="asignacion.fecha" type="date" />
                </div>
                <div class="dash-field">
                  <label>Trabajador *</label>
                  <div class="dash-combobox">
                    <input
                      v-model="anticipoTrabajadorQuery"
                      type="text"
                      class="dash-combobox-input"
                      placeholder="Buscar por nombre o RUT…"
                      autocomplete="off"
                      @focus="onAnticipoTrabajadorFocus"
                      @input="onAnticipoTrabajadorQueryInput"
                      @keydown.down.prevent="highlightAnticipoTrabajador(1)"
                      @keydown.up.prevent="highlightAnticipoTrabajador(-1)"
                      @keydown.enter.prevent="confirmAnticipoTrabajadorHighlight"
                      @keydown.escape="anticipoTrabajadorOpen = false"
                      @blur="onAnticipoTrabajadorBlur"
                    />
                    <ul
                      v-if="anticipoTrabajadorOpen && anticipoTrabajadorOpciones.length"
                      class="dash-combobox-list"
                      role="listbox"
                    >
                      <li
                        v-for="(opt, idx) in anticipoTrabajadorOpciones"
                        :key="opt.id"
                        class="dash-combobox-option"
                        :class="{
                          'dash-combobox-option--active': idx === anticipoTrabajadorHighlight
                        }"
                        role="option"
                        @mousedown.prevent="selectAnticipoTrabajador(opt)"
                      >
                        {{ opt.label }}
                      </li>
                    </ul>
                    <p
                      v-else-if="anticipoTrabajadorOpen && anticipoTrabajadorQuery.trim()"
                      class="dash-field-hint"
                    >
                      Sin coincidencias.
                    </p>
                  </div>
                </div>
                <div class="dash-field">
                  <label>N° Doc / Vale *</label>
                  <input
                    v-model="asignacion.doc"
                    type="text"
                    placeholder="N° de comprobante..."
                    required
                  />
                </div>
              </div>

              <div class="dash-form dash-gasto-grid-4 dash-form--section">
                <div class="dash-field">
                  <label>Monto ($) *</label>
                  <input
                    :value="asignacion.monto"
                    type="text"
                    inputmode="numeric"
                    placeholder="0"
                    class="dash-input-strong dash-input-monto"
                    autocomplete="off"
                    @input="onAsignacionMontoInput"
                  />
                </div>
                <div class="dash-field">
                  <label>Número de cuenta *</label>
                  <div class="dash-combobox">
                    <input
                      :value="asignacion.numeroCuenta"
                      type="text"
                      inputmode="numeric"
                      maxlength="40"
                      placeholder="00123456789"
                      class="dash-mono dash-combobox-input"
                      autocomplete="off"
                      required
                      @focus="onNumeroCuentaFocus"
                      @input="onAsignacionCuentaInput"
                      @keydown.down.prevent="highlightNumeroCuenta(1)"
                      @keydown.up.prevent="highlightNumeroCuenta(-1)"
                      @keydown.enter.prevent="confirmNumeroCuentaHighlight"
                      @keydown.escape="numeroCuentaOpen = false"
                      @blur="onNumeroCuentaBlur"
                    />
                    <ul
                      v-if="numeroCuentaOpen && numeroCuentaSugerencias.length"
                      class="dash-combobox-list"
                      role="listbox"
                    >
                      <li
                        v-for="(c, idx) in numeroCuentaSugerencias"
                        :key="c.id || c.numeroCuenta"
                        class="dash-combobox-option"
                        :class="{ 'dash-combobox-option--active': idx === numeroCuentaHighlight }"
                        role="option"
                        @mousedown.prevent="selectNumeroCuenta(c)"
                      >
                        <span class="dash-mono">{{ c.numeroCuenta }}</span>
                        <span class="dash-combobox-option-meta">
                          {{ c.banco
                          }}<template v-if="c.centroCobroNombre"> · {{ c.centroCobroNombre }}</template>
                        </span>
                      </li>
                    </ul>
                  </div>
                  <p v-if="cuentaCatalogoMatch" class="dash-field-hint dash-hint--ok">
                    Catálogo: {{ cuentaCatalogoMatch.banco
                    }}<template v-if="cuentaCatalogoMatch.centroCobroNombre">
                      · {{ cuentaCatalogoMatch.centroCobroNombre }}
                    </template>
                  </p>
                </div>
                <div class="dash-field">
                  <label>Banco origen *</label>
                  <div class="dash-combobox">
                    <input
                      :value="asignacion.bancoOrigen"
                      type="text"
                      class="dash-combobox-input"
                      placeholder="Ej: BANCO DE CHILE"
                      autocomplete="off"
                      maxlength="120"
                      required
                      @focus="onBancoOrigenFocus"
                      @input="onBancoOrigenInput"
                      @keydown.down.prevent="highlightBancoOrigen(1)"
                      @keydown.up.prevent="highlightBancoOrigen(-1)"
                      @keydown.enter.prevent="confirmBancoOrigenHighlight"
                      @keydown.escape="bancoOrigenOpen = false"
                      @blur="onBancoOrigenBlur"
                    />
                    <ul
                      v-if="bancoOrigenOpen && bancoOrigenSugerencias.length"
                      class="dash-combobox-list"
                      role="listbox"
                    >
                      <li
                        v-for="(b, idx) in bancoOrigenSugerencias"
                        :key="b"
                        class="dash-combobox-option"
                        :class="{ 'dash-combobox-option--active': idx === bancoOrigenHighlight }"
                        role="option"
                        @mousedown.prevent="selectBancoOrigen(b)"
                      >
                        {{ b }}
                      </li>
                    </ul>
                  </div>
                </div>
                <div class="dash-field">
                  <label>Comprobante *</label>
                  <input
                    ref="anticipoFileInputEl"
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    class="dash-file"
                    required
                    @change="onAsignacionFile"
                  />
                  <span v-if="asignacion.comprobanteNombre" class="dash-field-hint">
                    Archivo: {{ asignacion.comprobanteNombre }}
                  </span>
                  <p v-if="canSkipComprobanteIa" class="dash-field-hint dash-hint--ok">
                    Bypass Dev activo: se omite la validación IA de monto (sigue obligatorio adjuntar
                    archivo).
                  </p>
                </div>
              </div>

              <div class="dash-form--section">
                <div class="dash-desc-head">
                  <label class="dash-field-label">Observaciones / Motivo *</label>
                  <span
                    class="dash-word-count"
                    :class="{ 'dash-word-count--over': letrasObservacionAnticipo > 500 }"
                  >
                    {{ letrasObservacionAnticipo }} / 500 caracteres
                  </span>
                </div>
                <textarea
                  :value="asignacion.observaciones"
                  rows="3"
                  maxlength="500"
                  placeholder="Detalle amplio de la asignación..."
                  class="dash-textarea"
                  required
                  @input="onAnticipoObservacionInput"
                ></textarea>
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
              <h3>Asignaciones recientes</h3>
              <p>Listado de asignaciones entregadas a trabajadores.</p>
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
                <label class="dash-sr-only" for="anticipo-buscar">Buscar trabajador</label>
                <input
                  id="anticipo-buscar"
                  v-model="anticipoBusqueda"
                  type="search"
                  placeholder="Buscar por nombre o RUT..."
                  class="dash-search-input"
                />
              </div>
            </div>
          </div>

          <table class="dash-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Trabajador</th>
                <th>N° Doc / Vale</th>
                <th>Banco</th>
                <th>N° Cuenta</th>
                <th>Observaciones</th>
                <th class="dash-table-center">Adjunto</th>
                <th class="dash-table-right">Monto</th>
                <th class="dash-table-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in asignacionesFiltradas"
                :key="row.doc"
                :class="{ 'dash-row-legacy': row.legacy }"
              >
                <td class="dash-mono">{{ row.fecha }}</td>
                <td class="dash-table-strong">
                  <span v-if="row.legacy" class="dash-badge dash-badge--legacy">Legacy</span>
                  {{ row.conductor }}
                </td>
                <td>{{ row.doc }}</td>
                <td>{{ row.bancoOrigen || '-' }}</td>
                <td class="dash-mono">{{ row.numeroCuenta || '-' }}</td>
                <td>{{ row.observaciones }}</td>
                <td class="dash-table-center">
                  <button
                    v-if="row.comprobanteNombre"
                    type="button"
                    class="dash-adjunto-btn"
                    :title="row.comprobanteNombre"
                    @click="openComprobanteArchivo(row.comprobanteNombre)"
                  >
                    📄 {{ labelAdjunto(row.comprobanteNombre) }}
                  </button>
                  <span v-else class="dash-adjunto-empty">-</span>
                </td>
                <td class="dash-table-right dash-rinde">{{ row.monto }}</td>
                <td class="dash-table-center dash-table-actions">
                  <div class="dash-actions-cell">
                    <button
                      v-if="puedeAdjuntarComprobanteAsignacion(row)"
                      class="dash-btn-ghost-sm"
                      type="button"
                      @click="triggerAdjuntarComprobante('anticipo', row)"
                    >
                      {{
                        row.comprobanteNombre ? 'Cambiar comprobante' : 'Subir comprobante'
                      }}
                    </button>
                    <button
                      v-if="muestraSoftDeleteAdmin(row)"
                      class="dash-btn-icon dash-btn-icon--danger"
                      type="button"
                      :disabled="!puedeSoftDeleteAdmin(row)"
                      :title="tituloSoftDeleteAdmin(row)"
                      @click="onSoftDeleteAnticipo(row)"
                    >
                      <i class="fa-solid fa-trash" aria-hidden="true"></i>
                    </button>
                    <button
                      v-if="canDevForceDelete && row.id"
                      class="dash-btn-icon dash-btn-icon--danger"
                      type="button"
                      title="Hard delete (Dev)"
                      @click="onHardDeleteAnticipo(row)"
                    >
                      <i class="fa-solid fa-trash" aria-hidden="true"></i>
                    </button>
                    <span
                      v-else-if="
                        !puedeAdjuntarComprobanteAsignacion(row) && !muestraSoftDeleteAdmin(row)
                      "
                      class="dash-muted"
                      >-</span
                    >
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Informes y Cartola -->
      <div v-else-if="activeView === 'informes' && isAdminSession" class="dash-informes">
        <div class="dash-cajas-toolbar">
          <div>
            <h3 class="dash-cajas-toolbar-title">Centro de Informes y Cartolas</h3>
            <p class="dash-cajas-toolbar-hint">
              Consolidado mensual de movimientos e importación/exportación masiva.
            </p>
          </div>
        </div>

        <div class="dash-panel">
          <div class="dash-informe-result-head">
            <div>
              <h3>{{ informeResultado.titulo }}</h3>
              <p>{{ informeResultado.periodo }}</p>
            </div>
            <div class="dash-informe-result-actions">
              <span class="dash-informe-count">{{ informeResultado.total }}</span>
              <button
                class="dash-btn-secondary"
                type="button"
                title="Exporta la cartola con los filtros actuales (Excel o PDF)"
                @click="openExportCartolaModal"
              >
                <span>📤</span>
                <span>Exportar</span>
              </button>
            </div>
          </div>

          <div class="dash-cartola-filters">
            <div class="dash-historial-filter">
              <label class="dash-sr-only" for="cartola-cc">Centro de cobro</label>
              <select
                id="cartola-cc"
                :value="filtrosInforme.centroCobroId"
                class="dash-historial-select"
                @change="onCartolaCcChange"
              >
                <option value="">Todos los CC</option>
                <option v-for="cc in centrosCosto" :key="cc.id" :value="String(cc.id)">
                  {{ cc.nombre }}
                </option>
              </select>
            </div>
            <div class="dash-historial-filter">
              <label class="dash-sr-only" for="cartola-caja">Caja</label>
              <select
                id="cartola-caja"
                :value="filtrosInforme.caja"
                class="dash-historial-select"
                @change="onCartolaCajaChange"
              >
                <option value="">Todas las cajas</option>
                <option
                  v-for="c in cajasOpcionesCartola"
                  :key="c.groupKey"
                  :value="c.groupKey"
                >
                  {{ c.label }}
                </option>
              </select>
            </div>
            <div class="dash-historial-filter">
              <label class="dash-sr-only" for="cartola-mes">Mes</label>
              <select
                id="cartola-mes"
                :value="filtrosInforme.mes"
                class="dash-historial-select dash-historial-select--mes"
                @change="onCartolaMesChange"
              >
                <option
                  v-for="m in mesesCerradosOpciones"
                  :key="m.value"
                  :value="m.value"
                >
                  {{ m.label }}
                </option>
              </select>
            </div>
            <div class="dash-historial-search dash-cartola-search">
              <label class="dash-sr-only" for="cartola-buscar">Buscar trabajador o RUT</label>
              <input
                id="cartola-buscar"
                :value="filtrosInforme.busqueda"
                type="search"
                placeholder="Buscar trabajador o RUT…"
                class="dash-search-input"
                @input="onCartolaBusquedaInput"
              />
            </div>
          </div>

          <div v-if="!cartolaPorCcYCaja.length" class="dash-cajas-empty">
            No hay movimientos para los filtros seleccionados.
          </div>

          <div v-else class="dash-cc-accordion dash-cartola-accordion">
            <div
              v-for="ccGrupo in cartolaPorCcYCaja"
              :key="ccGrupo.key"
              class="dash-cc-accordion-item"
            >
              <button
                class="dash-cc-accordion-head"
                type="button"
                @click="toggleCartolaAccordion(ccGrupo.key)"
              >
                <span class="dash-cc-accordion-chevron">
                  {{ isCartolaAccordionOpen(ccGrupo.key) ? '▼' : '▶' }}
                </span>
                <span class="dash-cc-accordion-title">{{ ccGrupo.titulo }}</span>
                <span class="dash-cc-accordion-count">
                  {{ ccGrupo.movCount }} mov. · {{ ccGrupo.cajas.length }} caja(s)
                </span>
              </button>
              <div
                class="dash-collapse"
                :class="{ 'dash-collapse--open': isCartolaAccordionOpen(ccGrupo.key) }"
              >
                <div class="dash-collapse-inner">
                  <div class="dash-cc-accordion dash-cartola-caja-accordion">
                    <div
                      v-for="cajaGrupo in ccGrupo.cajas"
                      :key="cajaGrupo.key"
                      class="dash-cc-accordion-item dash-cartola-caja-item"
                    >
                      <button
                        class="dash-cc-accordion-head dash-cartola-caja-head"
                        type="button"
                        @click="toggleCartolaAccordion(cajaGrupo.key)"
                      >
                        <span class="dash-cc-accordion-chevron">
                          {{ isCartolaAccordionOpen(cajaGrupo.key) ? '▼' : '▶' }}
                        </span>
                        <span class="dash-cc-accordion-title">{{ cajaGrupo.titulo }}</span>
                        <span class="dash-cc-accordion-count">{{ cajaGrupo.rows.length }} mov.</span>
                      </button>
                      <div
                        class="dash-collapse"
                        :class="{ 'dash-collapse--open': isCartolaAccordionOpen(cajaGrupo.key) }"
                      >
                        <div class="dash-collapse-inner">
                          <div class="dash-table-wrap dash-cc-accordion-body">
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
                                  <th class="dash-table-center">Comprobante</th>
                                  <th class="dash-table-center">Historial</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr
                                  v-for="row in cajaGrupo.rows"
                                  :key="`${row.tipoKey}-${row.id || row.doc}-${row.fecha}`"
                                >
                                  <td class="dash-mono">{{ row.fecha }}</td>
                                  <td class="dash-mono" :class="row.docClass">{{ row.doc }}</td>
                                  <td>
                                    <span class="dash-badge" :class="row.badgeClass">{{
                                      row.tipo
                                    }}</span>
                                  </td>
                                  <td>{{ row.detalle }}</td>
                                  <td>{{ row.responsable }}</td>
                                  <td class="dash-table-right" :class="row.abonoClass">
                                    {{ row.abono }}
                                  </td>
                                  <td class="dash-table-right" :class="row.cargoClass">
                                    {{ row.cargo }}
                                  </td>
                                  <td class="dash-table-center">
                                    <button
                                      v-if="row.comprobanteNombre"
                                      type="button"
                                      class="dash-adjunto-btn"
                                      :title="row.comprobanteNombre"
                                      @click="openComprobanteArchivo(row.comprobanteNombre)"
                                    >
                                      📄 {{ labelAdjunto(row.comprobanteNombre) }}
                                    </button>
                                    <span v-else class="dash-adjunto-empty">-</span>
                                  </td>
                                  <td class="dash-table-center">
                                    <button
                                      v-if="rowTieneHistorial(row)"
                                      class="dash-btn-icon"
                                      type="button"
                                      title="Ver historial / devoluciones"
                                      @click="openModalHistorialCartola(row)"
                                    >
                                      <i
                                        class="fa-solid fa-clock-rotate-left"
                                        aria-hidden="true"
                                      ></i>
                                    </button>
                                    <span v-else class="dash-muted">-</span>
                                  </td>
                                </tr>
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colspan="5" class="dash-table-right dash-tfoot-label">
                                    Totales {{ cajaGrupo.titulo }}:
                                  </td>
                                  <td class="dash-table-right dash-metric-value--ok">
                                    {{ cajaGrupo.totales.abono }}
                                  </td>
                                  <td class="dash-table-right dash-rinde">
                                    {{ cajaGrupo.totales.cargo }}
                                  </td>
                                  <td
                                    colspan="2"
                                    class="dash-table-right"
                                    :class="cajaGrupo.totales.saldoNegativo ? 'dash-rinde' : 'dash-metric-value--ok'"
                                  >
                                    Saldo {{ cajaGrupo.totales.saldo }}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="dash-cartola-cc-totales">
                    <span class="dash-tfoot-label">Totales {{ ccGrupo.titulo }}:</span>
                    <span class="dash-metric-value--ok">Abono {{ ccGrupo.totales.abono }}</span>
                    <span class="dash-rinde">Cargo {{ ccGrupo.totales.cargo }}</span>
                    <span
                      :class="ccGrupo.totales.saldoNegativo ? 'dash-rinde' : 'dash-metric-value--ok'"
                    >
                      Saldo {{ ccGrupo.totales.saldo }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="cartolaPorCcYCaja.length" class="dash-cartola-totales-global">
            <span class="dash-tfoot-label">Totales acumulados:</span>
            <span class="dash-metric-value--ok">Abono {{ cartolaTotales.abono }}</span>
            <span class="dash-rinde">Cargo {{ cartolaTotales.cargo }}</span>
            <span
              :class="cartolaTotales.saldoNegativo ? 'dash-rinde' : 'dash-metric-value--ok'"
            >
              Saldo total {{ cartolaTotales.saldo }}
            </span>
            <span v-if="cartolaTotales.saldoNegativo" class="dash-muted">
              (saldo negativo: se debe al trabajador)
            </span>
          </div>
        </div>

        <div
          v-if="exportCartolaModalOpen"
          class="dash-modal-backdrop"
          @click.self="closeExportCartolaModal"
        >
          <div
            class="dash-modal dash-modal--compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-export-cartola-title"
          >
            <div class="dash-modal-head">
              <h3 id="modal-export-cartola-title">Exportar cartola</h3>
              <button
                class="dash-modal-close"
                type="button"
                aria-label="Cerrar"
                @click="closeExportCartolaModal"
              >
                ×
              </button>
            </div>
            <p class="dash-hint dash-export-cartola-hint">
              Se exportará la cartola visible con los filtros actuales.
            </p>
            <div class="dash-segmented" role="radiogroup" aria-label="Formato de exportación">
              <button
                type="button"
                role="radio"
                class="dash-segmented-btn"
                :class="{ 'dash-segmented-btn--active': exportCartolaModalFormat === 'excel' }"
                :aria-checked="exportCartolaModalFormat === 'excel'"
                @click="exportCartolaModalFormat = 'excel'"
              >
                Excel
              </button>
              <button
                type="button"
                role="radio"
                class="dash-segmented-btn"
                :class="{ 'dash-segmented-btn--active': exportCartolaModalFormat === 'pdf' }"
                :aria-checked="exportCartolaModalFormat === 'pdf'"
                @click="exportCartolaModalFormat = 'pdf'"
              >
                PDF
              </button>
            </div>
            <div class="dash-modal-actions">
              <button class="dash-btn-secondary" type="button" @click="closeExportCartolaModal">
                Cancelar
              </button>
              <button class="dash-btn-primary" type="button" @click="confirmExportCartola">
                Exportar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Importaciones Excel -->
      <div v-else-if="activeView === 'importaciones' && isAdminSession" class="dash-importaciones">
        <div class="dash-cajas-toolbar">
          <div>
            <h3 class="dash-cajas-toolbar-title">Importaciones</h3>
            <p class="dash-cajas-toolbar-hint">
              Lotes expandibles: revisa movimientos, sube comprobantes y confirma la importación.
            </p>
          </div>
          <div class="dash-toolbar-actions">
            <button
              class="dash-btn-excel"
              type="button"
              title="Importar gastos o asignaciones desde Excel"
              :disabled="importExcelLoading"
              @click="openImportModal"
            >
              <span>📥</span>
              <span>Importar</span>
            </button>
          </div>
        </div>

        <div
          v-if="importModalOpen"
          class="dash-modal-backdrop"
          @click.self="closeImportModal"
        >
          <div class="dash-modal dash-modal--import" role="dialog" aria-modal="true" aria-labelledby="modal-import-title">
            <div class="dash-modal-head">
              <h3 id="modal-import-title">Importar Excel</h3>
              <button
                class="dash-modal-close"
                type="button"
                aria-label="Cerrar"
                @click="closeImportModal"
              >
                ×
              </button>
            </div>

            <div class="dash-import-modal-body">
              <div class="dash-segmented" role="tablist" aria-label="Tipo de importación">
                <button
                  type="button"
                  role="tab"
                  class="dash-segmented-btn"
                  :class="{ 'dash-segmented-btn--active': importModalTipo === 'gastos' }"
                  :aria-selected="importModalTipo === 'gastos'"
                  @click="setImportModalTipo('gastos')"
                >
                  Gastos
                </button>
                <button
                  type="button"
                  role="tab"
                  class="dash-segmented-btn"
                  :class="{ 'dash-segmented-btn--active': importModalTipo === 'asignaciones' }"
                  :aria-selected="importModalTipo === 'asignaciones'"
                  @click="setImportModalTipo('asignaciones')"
                >
                  Asignaciones
                </button>
              </div>

              <div class="dash-import-modal-section">
                <p class="dash-import-modal-hint">
                  {{
                    importModalTipo === 'gastos'
                      ? 'Descarga la plantilla de gastos, completa las filas y súbela aquí.'
                      : 'Descarga la plantilla de asignaciones, completa las filas y súbela aquí.'
                  }}
                </p>
                <button
                  class="dash-btn-excel dash-btn-excel--outline"
                  type="button"
                  :title="
                    importModalTipo === 'gastos'
                      ? 'Descargar plantilla Excel de gastos'
                      : 'Descargar plantilla Excel de asignaciones'
                  "
                  @click="descargarPlantillaImportModal"
                >
                  <span>📄</span>
                  <span>Descargar plantilla</span>
                </button>
              </div>

              <div class="dash-import-modal-section">
                <input
                  ref="importModalInputEl"
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  class="dash-sr-only"
                  @change="onImportModalFileChange"
                />
                <div
                  class="dash-import-dropzone"
                  :class="{
                    'dash-import-dropzone--active': importModalDragOver,
                    'dash-import-dropzone--has-file': !!importModalFile
                  }"
                  @click="triggerImportModalFilePicker"
                  @dragenter.prevent="onImportModalDragEnter"
                  @dragover.prevent="onImportModalDragOver"
                  @dragleave.prevent="onImportModalDragLeave"
                  @drop.prevent="onImportModalDrop"
                >
                  <template v-if="importModalFile">
                    <p class="dash-import-dropzone-file">
                      <strong>{{ importModalFile.name }}</strong>
                    </p>
                    <p class="dash-import-dropzone-meta">
                      {{ formatImportFileSize(importModalFile.size) }} · clic o arrastra otro archivo para reemplazar
                    </p>
                  </template>
                  <template v-else>
                    <p class="dash-import-dropzone-title">Arrastra un archivo Excel aquí</p>
                    <p class="dash-import-dropzone-meta">o haz clic para seleccionar (.xlsx / .xls)</p>
                  </template>
                </div>
                <button
                  v-if="importModalFile"
                  class="dash-btn-ghost-sm dash-import-clear-file"
                  type="button"
                  @click.stop="clearImportModalFile"
                >
                  Quitar archivo
                </button>
              </div>
            </div>

            <div class="dash-modal-actions">
              <button class="dash-btn-secondary" type="button" @click="closeImportModal">
                Cancelar
              </button>
              <button
                class="dash-btn-excel"
                type="button"
                :disabled="!importModalFile || importExcelLoading"
                @click="submitImportModal"
              >
                {{ importExcelLoading ? 'Importando…' : 'Importar' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="importacionesLoading" class="dash-cajas-empty">Cargando lotes…</div>
        <div v-else-if="!importacionesLotes.length" class="dash-cajas-empty">
          No hay importaciones registradas.
        </div>
        <div v-else class="dash-cc-accordion dash-import-lotes">
          <div
            v-for="lote in importacionesLotes"
            :key="lote.id"
            class="dash-cc-accordion-item dash-import-lote"
            :class="{ 'dash-import-lote--anulado': lote.estado === 'anulado' || lote.is_deleted }"
          >
            <div class="dash-import-lote-head">
              <button
                class="dash-import-lote-toggle"
                type="button"
                :aria-expanded="isImportLoteOpen(lote.id)"
                @click="toggleImportLote(lote)"
              >
                <span class="dash-cc-accordion-chevron">
                  {{ isImportLoteOpen(lote.id) ? '▼' : '▶' }}
                </span>
                <span class="dash-import-lote-meta">
                  <span class="dash-import-lote-title">
                    {{ labelTipoImportacion(lote.tipo) }}
                    <span class="dash-muted">#{{ lote.id }}</span>
                  </span>
                  <span class="dash-import-lote-sub">
                    {{ formatFechaHoraImport(lote.created_at) }}
                    <template v-if="lote.archivo_nombre"> · {{ lote.archivo_nombre }}</template>
                    <template v-if="lote.usuario_nombre"> · {{ lote.usuario_nombre }}</template>
                  </span>
                </span>
                <span class="dash-import-lote-counters" @click.stop>
                  <span class="dash-import-counter" title="Total de filas del lote">
                    {{ lote.contadores?.movimientos ?? 0 }} mov.
                  </span>
                  <span class="dash-import-counter dash-import-counter--ok" title="Correctos">
                    {{ lote.contadores?.correctos ?? 0 }} correctos
                  </span>
                  <span class="dash-import-counter dash-import-counter--warn" title="Parcial">
                    {{ lote.contadores?.parcial ?? 0 }} parcial
                  </span>
                  <span
                    v-if="(lote.contadores?.omitidos ?? 0) > 0"
                    class="dash-import-counter dash-import-counter--muted"
                    title="Omitidos (duplicado idéntico)"
                  >
                    {{ lote.contadores?.omitidos ?? 0 }} omitidos
                  </span>
                  <span
                    v-if="(lote.contadores?.conflictos ?? 0) > 0"
                    class="dash-import-counter dash-import-counter--danger"
                    title="Conflictos N° documento"
                  >
                    {{ lote.contadores?.conflictos ?? 0 }} conflictos
                  </span>
                  <span class="dash-import-counter dash-import-counter--danger" title="Inválidos">
                    {{ lote.contadores?.invalidos ?? 0 }} inválidos
                  </span>
                </span>
                <span class="dash-badge" :class="badgeClassEstadoImport(lote.estado)">
                  {{ labelEstadoImportacion(lote.estado) }}
                </span>
              </button>
              <div class="dash-import-lote-actions" @click.stop>
                <button
                  v-if="lote.puede_confirmar"
                  class="dash-btn-ghost-sm dash-import-btn-confirm"
                  type="button"
                  title="Confirmar importación"
                  :disabled="importacionConfirmandoId === lote.id"
                  @click="openConfirmarImportacion(lote)"
                >
                  <i class="fa-solid fa-check" aria-hidden="true"></i>
                  Confirmar
                </button>
                <button
                  v-if="lote.puede_anular"
                  class="dash-btn-icon dash-btn-icon--danger"
                  type="button"
                  :title="
                    lote.estado === 'confirmado'
                      ? 'Anular lote confirmado (solo Super Admin Dev)'
                      : 'Anular / borrar importación'
                  "
                  :disabled="importacionAnulandoId === lote.id"
                  @click="onAnularImportacion(lote)"
                >
                  <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <div
              class="dash-collapse"
              :class="{ 'dash-collapse--open': isImportLoteOpen(lote.id) }"
            >
              <div class="dash-collapse-inner">
                <div v-if="importLoteDetalleLoading[lote.id]" class="dash-cajas-empty">
                  Cargando movimientos…
                </div>
                <template v-else-if="importLoteDetalles[lote.id]">
                  <div
                    v-if="(importLoteDetalles[lote.id].filas_conflicto || []).some((c) => c.estado === 'pendiente')"
                    class="dash-import-conflictos"
                  >
                    <p class="dash-import-invalidos-title">
                      Conflictos N° documento ({{
                        (importLoteDetalles[lote.id].filas_conflicto || []).filter(
                          (c) => c.estado === 'pendiente'
                        ).length
                      }})
                    </p>
                    <div
                      v-for="conf in (importLoteDetalles[lote.id].filas_conflicto || []).filter(
                        (c) => c.estado === 'pendiente'
                      )"
                      :key="`conf-${lote.id}-${conf.id}`"
                      class="dash-import-conflicto-card"
                    >
                      <p class="dash-import-conflicto-head">
                        Fila {{ conf.fila }} · N°
                        <span class="dash-mono">{{ conf.numero_documento }}</span>
                        <span class="dash-muted">
                          · {{ conf.origen === 'excel' ? 'duplicado en Excel' : 'ya existe en BD' }}
                        </span>
                      </p>
                      <p
                        v-if="(conf.diferencias || []).length"
                        class="dash-muted dash-import-conflicto-diff"
                      >
                        Diferencias:
                        {{ (conf.diferencias || []).join(', ') }}
                      </p>
                      <div class="dash-import-conflicto-compare">
                        <div class="dash-import-conflicto-col">
                          <strong>Existente</strong>
                          <ul class="dash-import-conflicto-fields">
                            <li
                              v-for="row in conflictCompareRows(conf)"
                              :key="`ex-${conf.id}-${row.key}`"
                              :class="{ 'dash-import-conflicto-field--diff': row.diff }"
                            >
                              <span>{{ row.label }}</span>
                              <span>{{ row.existente }}</span>
                            </li>
                          </ul>
                        </div>
                        <div class="dash-import-conflicto-col">
                          <strong>Importado</strong>
                          <ul class="dash-import-conflicto-fields">
                            <li
                              v-for="row in conflictCompareRows(conf)"
                              :key="`im-${conf.id}-${row.key}`"
                              :class="{ 'dash-import-conflicto-field--diff': row.diff }"
                            >
                              <span>{{ row.label }}</span>
                              <span>{{ row.importado }}</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div class="dash-import-conflicto-actions">
                        <button
                          class="dash-btn-secondary"
                          type="button"
                          :disabled="importConflictoResolviendo === `${lote.id}:${conf.id}`"
                          @click="resolverConflictoLote(lote, conf, 'mantener_existente')"
                        >
                          Mantener existente
                        </button>
                        <button
                          class="dash-btn-primary"
                          type="button"
                          :disabled="importConflictoResolviendo === `${lote.id}:${conf.id}`"
                          @click="resolverConflictoLote(lote, conf, 'usar_importado')"
                        >
                          Usar importado
                        </button>
                        <button
                          class="dash-btn-ghost-sm"
                          type="button"
                          :disabled="importConflictoResolviendo === `${lote.id}:${conf.id}`"
                          @click="resolverConflictoLote(lote, conf, 'ignorar')"
                        >
                          Ignorar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="(importLoteDetalles[lote.id].filas_omitidas || []).length"
                    class="dash-import-invalidos dash-import-omitidos"
                  >
                    <p class="dash-import-invalidos-title">
                      Filas omitidas ({{ importLoteDetalles[lote.id].filas_omitidas.length }})
                    </p>
                    <ul class="dash-import-invalidos-list">
                      <li
                        v-for="(om, idx) in importLoteDetalles[lote.id].filas_omitidas"
                        :key="`om-${lote.id}-${om.fila}-${idx}`"
                      >
                        Fila {{ om.fila }}:
                        {{ om.mensaje || om.motivo || 'Omitida' }}
                        <span v-if="om.numero_documento" class="dash-muted">
                          (N° {{ om.numero_documento }})
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div
                    v-if="(importLoteDetalles[lote.id].filas_invalidas || []).length"
                    class="dash-import-invalidos"
                  >
                    <p class="dash-import-invalidos-title">
                      Filas inválidas ({{ importLoteDetalles[lote.id].filas_invalidas.length }})
                    </p>
                    <ul class="dash-import-invalidos-list">
                      <li
                        v-for="(err, idx) in importLoteDetalles[lote.id].filas_invalidas"
                        :key="`inv-${lote.id}-${err.fila}-${idx}`"
                      >
                        Fila {{ err.fila }}: {{ err.error }}
                      </li>
                    </ul>
                  </div>

                  <div
                    v-if="!(importLoteDetalles[lote.id].movimientos || []).length"
                    class="dash-cajas-empty"
                  >
                    Sin movimientos creados en este lote.
                  </div>

                  <div v-else class="dash-table-wrap dash-cc-accordion-body">
                    <!-- Gastos -->
                    <table
                      v-if="lote.tipo === 'gastos'"
                      class="dash-table dash-import-mov-table"
                    >
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Fecha</th>
                          <th>Trabajador</th>
                          <th>CC / Caja</th>
                          <th>Tipo / N°</th>
                          <th>Forma de pago</th>
                          <th class="dash-table-right">Monto</th>
                          <th>Descripción</th>
                          <th class="dash-table-center">Calidad</th>
                          <th class="dash-table-center">Comprobante</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="mov in importLoteDetalles[lote.id].movimientos"
                          :key="`g-${mov.id}`"
                        >
                          <td class="dash-mono">{{ mov.codigo_rinde }}</td>
                          <td class="dash-mono">{{ formatFechaCortaImport(mov.fecha_documento) }}</td>
                          <td>
                            {{ mov.trabajador_nombre || '—' }}
                            <span v-if="mov.trabajador_rut" class="dash-muted dash-block-sm">
                              {{ mov.trabajador_rut }}
                            </span>
                          </td>
                          <td>
                            {{ mov.cc_nombre || '—' }}
                            <span class="dash-muted dash-block-sm">
                              {{ mov.clave_interna || mov.nombre_exterior || '—' }}
                            </span>
                          </td>
                          <td>
                            {{ mov.tipo_documento || '—' }}
                            <span v-if="mov.numero_documento" class="dash-muted">
                              #{{ mov.numero_documento }}
                            </span>
                          </td>
                          <td>{{ mov.origen_pago || '—' }}</td>
                          <td class="dash-table-right">{{ formatMontoCl(mov.monto) }}</td>
                          <td class="dash-import-desc">{{ mov.descripcion || '—' }}</td>
                          <td class="dash-table-center">
                            <span
                              class="dash-badge"
                              :class="badgeClassCalidadMov(mov.calidad)"
                            >
                              {{ mov.calidad || '—' }}
                            </span>
                          </td>
                          <td class="dash-table-center">
                            <button
                              class="dash-btn-ghost-sm"
                              type="button"
                              title="Ver / subir comprobante"
                              @click="openImportComprobanteModal(lote, mov)"
                            >
                              <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
                              {{ mov.comprobante_url ? 'Ver' : 'Subir' }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <!-- Asignaciones -->
                    <table
                      v-else
                      class="dash-table dash-import-mov-table"
                    >
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Fecha</th>
                          <th>Trabajador</th>
                          <th>CC / Caja</th>
                          <th>Cuenta</th>
                          <th>Banco</th>
                          <th class="dash-table-right">Monto</th>
                          <th>Observación</th>
                          <th class="dash-table-center">Calidad</th>
                          <th class="dash-table-center">Comprobante</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="mov in importLoteDetalles[lote.id].movimientos"
                          :key="`a-${mov.id}`"
                        >
                          <td class="dash-mono">{{ mov.codigo_vale }}</td>
                          <td class="dash-mono">{{ formatFechaCortaImport(mov.fecha) }}</td>
                          <td>
                            {{ mov.trabajador_nombre || '—' }}
                            <span v-if="mov.trabajador_rut" class="dash-muted dash-block-sm">
                              {{ mov.trabajador_rut }}
                            </span>
                          </td>
                          <td>
                            {{ mov.cc_nombre || '—' }}
                            <span class="dash-muted dash-block-sm">
                              {{ mov.clave_interna || mov.nombre_exterior || '—' }}
                            </span>
                          </td>
                          <td class="dash-mono">{{ mov.numero_cuenta || '—' }}</td>
                          <td>{{ mov.banco_origen || '—' }}</td>
                          <td class="dash-table-right">{{ formatMontoCl(mov.monto) }}</td>
                          <td class="dash-import-desc">{{ mov.observacion || '—' }}</td>
                          <td class="dash-table-center">
                            <span
                              class="dash-badge"
                              :class="badgeClassCalidadMov(mov.calidad)"
                            >
                              {{ mov.calidad || '—' }}
                            </span>
                          </td>
                          <td class="dash-table-center">
                            <button
                              class="dash-btn-ghost-sm"
                              type="button"
                              title="Ver / subir comprobante"
                              @click="openImportComprobanteModal(lote, mov)"
                            >
                              <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
                              {{ mov.comprobante_url ? 'Ver' : 'Subir' }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal confirmar lote -->
        <div
          v-if="importConfirmModal.open"
          class="dash-modal-backdrop"
          @click.self="closeConfirmarImportacion"
        >
          <div class="dash-modal" role="dialog" aria-modal="true" aria-labelledby="modal-import-confirm-title">
            <div class="dash-modal-head">
              <h3 id="modal-import-confirm-title">Confirmar importación</h3>
              <button
                class="dash-modal-close"
                type="button"
                aria-label="Cerrar"
                @click="closeConfirmarImportacion"
              >
                ×
              </button>
            </div>
            <div class="dash-import-modal-body">
              <p>
                ¿Confirmas el lote
                <strong>#{{ importConfirmModal.lote?.id }}</strong>
                ({{ labelTipoImportacion(importConfirmModal.lote?.tipo) }})?
              </p>
              <p class="dash-hint">
                Tras confirmar no podrás anular el lote ni editar los movimientos.
                Solo se podrá subir comprobante si aún no lo tenían.
              </p>
              <p class="dash-muted">
                {{ importConfirmModal.lote?.creados ?? 0 }} movimiento(s) ·
                {{ importConfirmModal.lote?.contadores?.parcial ?? 0 }} sin comprobante ·
                {{ importConfirmModal.lote?.contadores?.invalidos ?? 0 }} inválido(s)
              </p>
            </div>
            <div class="dash-modal-actions">
              <button class="dash-btn-secondary" type="button" @click="closeConfirmarImportacion">
                Cancelar
              </button>
              <button
                class="dash-btn-primary"
                type="button"
                :disabled="importacionConfirmandoId === importConfirmModal.lote?.id"
                @click="submitConfirmarImportacion"
              >
                {{
                  importacionConfirmandoId === importConfirmModal.lote?.id
                    ? 'Confirmando…'
                    : 'Sí, confirmar'
                }}
              </button>
            </div>
          </div>
        </div>

        <!-- Modal comprobante por movimiento -->
        <div
          v-if="importComprobanteModal.open"
          class="dash-modal-backdrop"
          @click.self="closeImportComprobanteModal"
        >
          <div
            class="dash-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-import-comp-title"
          >
            <div class="dash-modal-head">
              <h3 id="modal-import-comp-title">Comprobante</h3>
              <button
                class="dash-modal-close"
                type="button"
                aria-label="Cerrar"
                @click="closeImportComprobanteModal"
              >
                ×
              </button>
            </div>
            <div class="dash-import-modal-body">
              <p class="dash-import-comp-meta">
                Lote #{{ importComprobanteModal.lote?.id }} ·
                {{
                  importComprobanteModal.lote?.tipo === 'gastos'
                    ? importComprobanteModal.mov?.codigo_rinde
                    : importComprobanteModal.mov?.codigo_vale
                }}
              </p>

              <div v-if="importComprobanteModal.mov?.comprobante_url" class="dash-import-comp-existing">
                <p class="dash-field-hint">
                  Archivo:
                  {{ labelAdjunto(importComprobanteModal.mov.comprobante_url) }}
                </p>
                <button
                  class="dash-btn-excel dash-btn-excel--outline"
                  type="button"
                  @click="openComprobanteArchivo(importComprobanteModal.mov.comprobante_url)"
                >
                  <span>📄</span>
                  <span>Descargar comprobante</span>
                </button>
              </div>
              <p v-else class="dash-muted">Sin comprobante adjunto.</p>

              <div v-if="puedeSubirComprobanteImport(importComprobanteModal)" class="dash-import-modal-section">
                <p class="dash-import-modal-hint">
                  {{
                    importComprobanteModal.mov?.comprobante_url
                      ? 'Puedes reemplazar el comprobante (lote aún no confirmado).'
                      : 'Sube el comprobante del movimiento.'
                  }}
                </p>
                <input
                  ref="importComprobanteInputEl"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  class="dash-sr-only"
                  @change="onImportComprobanteFileChange"
                />
                <button
                  class="dash-btn-primary"
                  type="button"
                  :disabled="importComprobanteUploading"
                  @click="triggerImportComprobantePicker"
                >
                  {{
                    importComprobanteUploading
                      ? 'Subiendo…'
                      : importComprobanteModal.mov?.comprobante_url
                        ? 'Reemplazar comprobante'
                        : 'Subir comprobante'
                  }}
                </button>
              </div>
              <p
                v-else-if="
                  importComprobanteModal.lote?.estado === 'confirmado' &&
                  importComprobanteModal.mov?.comprobante_url
                "
                class="dash-hint"
              >
                Lote confirmado: el comprobante no se puede reemplazar.
              </p>
            </div>
            <div class="dash-modal-actions">
              <button class="dash-btn-ghost-sm" type="button" @click="closeImportComprobanteModal">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cajas -->
      <div v-else-if="activeView === 'cajas' && isAdminSession" class="dash-cajas-gestion">
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
                        <th class="dash-table-center">Personal</th>
                        <th class="dash-table-right">Total Mes({{ labelMesHostCajas }})</th>
                        <th class="dash-table-right">Total Año</th>
                        <th class="dash-table-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="caja in grupo.cajas" :key="caja.id || caja.groupKey">
                        <td class="dash-table-strong">{{ caja.displayName }}</td>
                        <td class="dash-table-center">
                          <div class="dash-caja-personal-cell">
                            <span class="dash-caja-personal-count">{{ countPersonalCaja(caja) }}</span>
                            <button
                              class="dash-btn-icon"
                              type="button"
                              title="Ver personal asignado"
                              :disabled="countPersonalCaja(caja) === 0"
                              @click="openModalPersonalCaja(caja)"
                            >
                              <i class="fa-solid fa-eye" aria-hidden="true"></i>
                            </button>
                          </div>
                        </td>
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
      <div v-else-if="activeView === 'centros-costo' && isAdminSession" class="dash-cajas-gestion">
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

      <!-- Personal / Usuarios -->
      <div v-else-if="activeView === 'personal' && isAdminSession" class="dash-admin-tab">
        <div v-if="showPersonalAdminsToggle" class="dash-personal-subview-bar">
          <div class="dash-personal-subview-tabs">
            <button
              type="button"
              class="dash-personal-subview-tab"
              :class="{ 'dash-personal-subview-tab--active': personalSubview === 'personal' }"
              @click="personalSubview = 'personal'"
            >
              Personal
            </button>
            <button
              v-if="showPersonalAdminsToggle"
              type="button"
              class="dash-personal-subview-tab"
              :class="{ 'dash-personal-subview-tab--active': personalSubview === 'admins' }"
              @click="personalSubview = 'admins'"
            >
              Administradores
            </button>
          </div>
        </div>

        <template v-if="personalSubview === 'admins' && showPersonalAdminsToggle">
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
                      placeholder=""
                      @input="adminForm.rut = fromRutInput($event.target.value).display"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Nombre Completo</label>
                    <input
                      v-model="adminForm.nombre"
                      type="text"
                      placeholder="Nombre Apellido"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Correo Electrónico</label>
                    <input
                      v-model="adminForm.correo"
                      type="email"
                      placeholder="usuario@empresa.cl"
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
                <strong>Super Admin - Dev</strong> crea Super Admins y Administradores de Caja, y
                <strong>Super Admin</strong> crea Administradores de Caja.
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
        </template>

        <template v-else>
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
                        v-if="p.accesoKind !== 'none' && p.accesoKind !== 'admin' && canTogglePersonalAcceso && p.usuarioId"
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
                        v-else-if="p.accesoKind === 'none' && p.puedeCrearUsuarioNormal && canEditPersonal"
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
                          'dash-status--off': p.accesoKind === 'none',
                          'dash-status--info': p.accesoKind === 'admin'
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
                        v-if="canEditPersonal && p.puedeCrearUsuarioNormal"
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
        </template>
      </div>

      <!-- Cuentas de Banco (Tarjetas + Cuentas) -->
      <div v-else-if="activeView === 'tarjetas' && isAdminSession" class="dash-admin-tab">
        <div class="dash-personal-subview-bar">
          <div class="dash-personal-subview-tabs">
            <button
              type="button"
              class="dash-personal-subview-tab"
              :class="{ 'dash-personal-subview-tab--active': cuentasBancoSubview === 'tarjetas' }"
              @click="cuentasBancoSubview = 'tarjetas'"
            >
              Tarjetas
            </button>
            <button
              type="button"
              class="dash-personal-subview-tab"
              :class="{ 'dash-personal-subview-tab--active': cuentasBancoSubview === 'cuentas' }"
              @click="cuentasBancoSubview = 'cuentas'"
            >
              Cuentas de Banco
            </button>
          </div>
        </div>

        <template v-if="cuentasBancoSubview === 'tarjetas'">
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
                      :value="tarjetaForm.titular"
                      type="text"
                      maxlength="100"
                      placeholder="Ej: Nombre Titular / Caja Chica"
                      @input="onTarjetaTitularInput"
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
        </template>

        <template v-else>
            <div class="dash-cajas-toolbar">
              <div>
                <h3 class="dash-cajas-toolbar-title">Cuentas de Banco</h3>
                <p class="dash-cajas-toolbar-hint">
                  Catálogo 1:1 de número de cuenta, banco y CC para Asignaciones.
                </p>
              </div>
              <button
                class="dash-btn-primary dash-btn-toggle-caja"
                type="button"
                @click="toggleFormCuentaBanco"
              >
                <span>{{ cuentaBancoFormOpen ? '▲' : '＋' }}</span>
                <span>{{ cuentaBancoFormOpen ? 'Ocultar Formulario' : 'Registrar Cuenta' }}</span>
              </button>
            </div>

            <div
              class="dash-collapse"
              :class="{ 'dash-collapse--open': cuentaBancoFormOpen }"
            >
              <div class="dash-collapse-inner">
                <div class="dash-panel dash-gasto-form-panel dash-collapse-panel">
              <div class="dash-caja-form-head">
                <div>
                  <h2 class="dash-assign-title dash-assign-title--flush">
                    {{ cuentaBancoForm.editId ? 'Editar Cuenta de Banco' : 'Registrar Cuenta de Banco' }}
                  </h2>
                  <p class="dash-hint">
                    Cada número de cuenta pertenece a un único banco y a un CC.
                  </p>
                </div>
                <button
                  class="dash-modal-close"
                  type="button"
                  aria-label="Cerrar"
                  @click="closeFormCuentaBanco"
                >
                  ×
                </button>
              </div>

              <form class="dash-admin-form" @submit.prevent="onSaveCuentaBanco">
                <div class="dash-caja-grid-2">
                  <div class="dash-field">
                    <label>Centro de cobro / empresa (CC) *</label>
                    <select v-model="cuentaBancoForm.centroCobroId" required>
                      <option disabled value="">Seleccionar…</option>
                      <option v-for="cc in centrosCosto" :key="cc.id" :value="cc.id">
                        {{ cc.nombre }}
                      </option>
                    </select>
                  </div>
                  <div class="dash-field">
                    <label>Número de cuenta *</label>
                    <input
                      :value="cuentaBancoForm.numeroCuenta"
                      type="text"
                      inputmode="numeric"
                      maxlength="40"
                      placeholder="00123456789"
                      class="dash-mono"
                      required
                      @input="onCuentaBancoNumeroInput"
                    />
                  </div>
                  <div class="dash-field">
                    <label>Banco *</label>
                    <input
                      :value="cuentaBancoForm.banco"
                      type="text"
                      maxlength="120"
                      placeholder="Ej: BANCO DE CHILE"
                      required
                      @input="onCuentaBancoBancoInput"
                    />
                  </div>
                </div>

                <div class="dash-caja-form-actions">
                  <button class="dash-btn-secondary" type="button" @click="closeFormCuentaBanco">
                    Cancelar
                  </button>
                  <button class="dash-btn-primary" type="submit">
                    <span>{{ cuentaBancoForm.editId ? 'Actualizar Cuenta' : 'Guardar Cuenta' }}</span>
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
                    <th>CC</th>
                    <th>Número de cuenta</th>
                    <th>Banco</th>
                    <th class="dash-table-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!cuentasBanco.length">
                    <td colspan="4" class="dash-table-empty">No hay cuentas registradas.</td>
                  </tr>
                  <tr v-for="c in cuentasBanco" :key="c.id || c.numeroCuenta">
                    <td>{{ c.centroCobroNombre || '—' }}</td>
                    <td class="dash-mono dash-table-strong">{{ c.numeroCuenta }}</td>
                    <td>{{ c.banco }}</td>
                    <td class="dash-table-center dash-table-actions">
                      <button
                        class="dash-btn-icon"
                        type="button"
                        title="Editar"
                        @click="onEditCuentaBanco(c)"
                      >
                        <i class="fa-solid fa-pen" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="canHardDelete"
                        class="dash-btn-icon dash-btn-icon--danger"
                        type="button"
                        title="Eliminar"
                        @click="onDeleteCuentaBanco(c)"
                      >
                        <i class="fa-solid fa-trash" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
        </template>
      </div>

      <!-- Auditoría (solo Super Admin / Super Admin Dev) -->
      <div v-else-if="activeView === 'auditoria' && isSuperAdminSession" class="dash-informes">
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
                    <option>Administrador (ejemplo)</option>
                    <option>Usuario Caja (ejemplo)</option>
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
import { fromPatenteInput, normalizePatente } from '../utils/patente'
import {
  estaDentroVentanaEdicion,
  hintFueraVentanaEdicion,
  hintVentanaEdicionActiva
} from '../utils/ventanaEdicion'
import {
  descargarPlantillaAsignaciones,
  descargarPlantillaGastos,
  exportarCartolaVisible
} from '../utils/excelPlantillas'
import { exportarCartolaPdf } from '../utils/cartolaPdf'
import * as api from '../api/resources'
import { apiUrl, withSilentApi } from '../api/client'
import { persistSessionProfile } from '../api/auth'
import {
  buildCartola,
  mapAdminFromUsuario,
  mapAnticipo,
  mapAuditLog,
  mapCaja,
  mapCentroCobro,
  mapCuentaBanco,
  mapLegacy,
  mapPersonal,
  mapRendicion,
  mapTarjeta,
  mapTrabajador,
  mapUsuario,
  origenFromMetodo,
  parseMontoInput,
  formatMontoInputCl,
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
  passwordConfirmar: '',
  showPasswordActual: false,
  showPasswordNueva: false,
  showPasswordConfirmar: false,
  error: '',
  ok: ''
})

const modalPersonal = reactive({
  open: false,
  id: null,
  usuarioId: null,
  esAdmin: false,
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
  if (userMenuOpen.value && userMenuEl.value && !userMenuEl.value.contains(event.target)) {
    userMenuOpen.value = false
  }
}

/** Cierra combobox CC/Caja al pointerdown fuera (no depende del blur del input). */
function onDocPointerDown(event) {
  const t = event.target
  if (ccFiltroOpen.value && ccFiltroRootEl.value && !ccFiltroRootEl.value.contains(t)) {
    ccFiltroOpen.value = false
    syncCcFiltroQueryFromSelection()
  }
  if (cajaFiltroOpen.value && cajaFiltroRootEl.value && !cajaFiltroRootEl.value.contains(t)) {
    cajaFiltroOpen.value = false
    syncCajaFiltroQueryFromSelection()
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
  modalPerfil.passwordConfirmar = ''
  modalPerfil.showPasswordActual = false
  modalPerfil.showPasswordNueva = false
  modalPerfil.showPasswordConfirmar = false
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

  const quiereCambiarClave =
    !!modalPerfil.passwordActual ||
    !!modalPerfil.passwordNueva ||
    !!modalPerfil.passwordConfirmar

  if (quiereCambiarClave) {
    if (!modalPerfil.passwordActual) {
      modalPerfil.error = 'Ingresa tu contraseña actual'
      return
    }
    if (!modalPerfil.passwordNueva) {
      modalPerfil.error = 'Ingresa la nueva contraseña'
      return
    }
    if (!modalPerfil.passwordConfirmar) {
      modalPerfil.error = 'Confirma la nueva contraseña'
      return
    }
    if (modalPerfil.passwordNueva !== modalPerfil.passwordConfirmar) {
      modalPerfil.error = 'La nueva contraseña y su confirmación no coinciden'
      return
    }
  }

  try {
    const payload = { correo: modalPerfil.correo.trim() }
    if (quiereCambiarClave) {
      payload.password_actual = modalPerfil.passwordActual
      payload.password_nueva = modalPerfil.passwordNueva
    }
    const data = await api.updateMe(payload)
    persistSessionProfile(data)
    await bootstrap()
    modalPerfil.ok = 'Perfil actualizado'
    modalPerfil.passwordActual = ''
    modalPerfil.passwordNueva = ''
    modalPerfil.passwordConfirmar = ''
    modalPerfil.showPasswordActual = false
    modalPerfil.showPasswordNueva = false
    modalPerfil.showPasswordConfirmar = false
  } catch (err) {
    modalPerfil.error = err?.message || 'No se pudo actualizar el perfil'
  }
}

const dataLoading = ref(false)
const dataError = ref('')
const saveError = ref('')
const saveOk = ref('')
const importExcelLoading = ref(false)
const importModalOpen = ref(false)
const exportCartolaModalOpen = ref(false)
const exportCartolaModalFormat = ref('excel')
const importModalTipo = ref('gastos')
const importModalFile = ref(null)
const importModalDragOver = ref(false)
const importModalInputEl = ref(null)
const legacyComprobanteInputEl = ref(null)
const pendingLegacyAttach = ref(null)

const importacionesLotes = ref([])
const importacionesLoading = ref(false)
const importacionAnulandoId = ref(null)
const importacionConfirmandoId = ref(null)
const importConflictoResolviendo = ref(null)
const importLoteOpen = reactive({})
const importLoteDetalles = reactive({})
const importLoteDetalleLoading = reactive({})
const importConfirmModal = reactive({ open: false, lote: null })
const importComprobanteModal = reactive({ open: false, lote: null, mov: null })
const importComprobanteInputEl = ref(null)
const importComprobanteUploading = ref(false)
const pendingImportLoteRefreshId = ref(null)

const cajaActiva = ref('')
/** '' = Todos los centros de cobro */
const ccActivo = ref('')
const mesActivo = ref('')

const ccFiltroQuery = ref('Todos')
const ccFiltroOpen = ref(false)
const ccFiltroHighlight = ref(0)
const ccFiltroRootEl = ref(null)
const ccFiltroInputEl = ref(null)
const cajaFiltroQuery = ref('')
const cajaFiltroOpen = ref(false)
const cajaFiltroHighlight = ref(0)
const cajaFiltroRootEl = ref(null)
const cajaFiltroInputEl = ref(null)

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
const activeView = ref('rendicion')
const personalSubview = ref('personal')
const cuentasBancoSubview = ref('tarjetas')
const sidebarOpen = ref(false)

const OPERACION_VIEW_IDS = ['rendicion', 'asignacion', 'informes']

const operacionNavItems = [
  { id: 'rendicion', label: 'Rendición de Gastos', icon: 'fa-file-invoice-dollar' },
  { id: 'asignacion', label: 'Asignaciones', icon: 'fa-hand-holding-dollar', adminOnly: true },
  { id: 'informes', label: 'Informes y Cartola', icon: 'fa-chart-line', adminOnly: true },
  { id: 'importaciones', label: 'Importaciones', icon: 'fa-file-import', adminOnly: true }
]

const configuracionNavItems = [
  { id: 'cajas', label: 'Cajas', icon: 'fa-cash-register' },
  { id: 'centros-costo', label: 'Centros de Costo', icon: 'fa-building' },
  { id: 'tarjetas', label: 'Cuentas de Banco', icon: 'fa-building-columns' }
]

const administracionNavItems = [
  { id: 'personal', label: 'Personal / Usuarios', icon: 'fa-users' },
  { id: 'auditoria', label: 'Auditoría', icon: 'fa-clipboard-list', superAdminOnly: true }
]

const isOperacionView = computed(() => OPERACION_VIEW_IDS.includes(activeView.value))

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
  patente: '',
  patenteDisplay: '',
  monto: '',
  cajaGroupKey: '',
  metodoPago: 'efectivo',
  tarjetaUltimos4: '',
  comprobanteNombre: '',
  descripcion: ''
})

const gastoComprobanteFile = ref(null)
const gastoFileInputEl = ref(null)
const anticipoComprobanteFile = ref(null)
const anticipoFileInputEl = ref(null)
const modalVerificar = reactive({
  open: false,
  phase: 'loading', // loading | error | ok
  error: '',
  errores: []
})
const pendingVerifyKind = ref(null)
let pendingGastoSave = null
let pendingAnticipoSave = null

const verifyComprobanteFile = computed(() =>
  pendingVerifyKind.value === 'anticipo' || pendingVerifyKind.value === 'anticipo-adjunto'
    ? anticipoComprobanteFile.value
    : gastoComprobanteFile.value
)

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
const anticipoTrabajadorQuery = ref('')
const anticipoTrabajadorOpen = ref(false)
const anticipoTrabajadorHighlight = ref(0)

const adminFormOpen = ref(false)
const tarjetaFormOpen = ref(false)
const cuentaBancoFormOpen = ref(false)

const letrasDescripcion = computed(() => String(gasto.descripcion || '').length)

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
  comprobanteFile: null,
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
  tarjetaUltimos4: '',
  descripcion: '',
  respuesta: '',
  comprobanteNombre: '',
  comprobanteFile: null,
  campos: camposCorregirDefault()
})

const fuerzaVisibilidadTodos = computed(
  () => modalResponder.estado === 'corregir' || modalResponder.estado === 'rechazado'
)

const comentarioRequeridoAdmin = computed(() => fuerzaVisibilidadTodos.value)

const letrasComentarioAdmin = computed(() => String(modalResponder.comentario || '').length)

watch(
  () => modalResponder.estado,
  (val) => {
    if (val === 'corregir' || val === 'rechazado') {
      modalResponder.visibilidad = 'todos'
      modalResponder.comprobanteNombre = ''
      modalResponder.comprobanteFile = null
    }
    if (val !== 'corregir') {
      Object.assign(modalResponder.campos, camposCorregirDefault())
    }
  }
)

const asignacion = reactive({
  fondo: '',
  fecha: new Date().toISOString().slice(0, 10),
  trabajadorId: '',
  doc: '',
  observaciones: '',
  monto: '',
  numeroCuenta: '',
  bancoOrigen: '',
  comprobanteNombre: ''
})

const bancosOrigen = ref([])
const bancoOrigenOpen = ref(false)
const bancoOrigenHighlight = ref(0)
const numeroCuentaOpen = ref(false)
const numeroCuentaHighlight = ref(0)

const letrasObservacionAnticipo = computed(
  () => String(asignacion.observaciones || '').length
)

const verifyComprobanteNombre = computed(() => {
  if (
    pendingVerifyKind.value === 'anticipo' ||
    pendingVerifyKind.value === 'anticipo-adjunto'
  ) {
    return (
      anticipoComprobanteFile.value?.name ||
      asignacion.comprobanteNombre ||
      ''
    )
  }
  return gastoComprobanteFile.value?.name || gasto.comprobanteNombre || ''
})

const modalAsignarCajas = reactive({
  open: false,
  trabajadorId: null,
  nombre: '',
  seleccionadas: []
})

const modalPersonalCaja = reactive({
  open: false,
  cajaNombre: '',
  cajaClave: '',
  lista: []
})

const informeTiposDefault = () => ({
  apertura: true,
  rendicion: true,
  anticipo: true,
  devolucion: true,
  sobrante: true
})

/** Fuente de verdad de filtros de cartola (barra compacta). */
const filtrosInforme = reactive({
  centroCobroId: '',
  caja: '',
  mes: '2026-07',
  persona: '',
  busqueda: '',
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
 * - Super Admin - Dev: único; crea Super Admin y Admin de Caja (no se puede crear otro Dev)
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

watch(
  isAdminSession,
  (admin) => {
    if (!admin && activeView.value !== 'rendicion') {
      activeView.value = 'rendicion'
    }
  },
  { immediate: true }
)

/** Super Admin o Super Admin - Dev (gestión de admins + auditoría) */
const isSuperAdminSession = computed(() => {
  if (TEMP_AUTH_BYPASS) return true
  const rol = user.value?.rol
  if (rol === 'SUPER_ADMIN_DEV' || rol === 'SUPER_ADMIN') return true
  const nivel = sessionAdminNivel.value
  return nivel === ROLE_DEV || nivel === ROLE_SUPER
})

const canCreateAdmins = isSuperAdminSession

const administracionNavItemsVisibles = computed(() =>
  administracionNavItems.filter((item) => !item.superAdminOnly || isSuperAdminSession.value)
)

function canAccessView(id) {
  if (id === 'rendicion') return true
  if (id === 'auditoria') return isSuperAdminSession.value
  return isAdminSession.value
}

const showPersonalAdminsToggle = computed(
  () => isAdminSession.value && isSuperAdminSession.value
)

watch(activeView, (view) => {
  if (view === 'auditoria' && !isSuperAdminSession.value) {
    activeView.value = isAdminSession.value ? 'personal' : 'rendicion'
    return
  }
  if (view === 'personal' && !showPersonalAdminsToggle.value) {
    personalSubview.value = 'personal'
  }
  if (view === 'importaciones' && isAdminSession.value) {
    loadImportacionesLotes()
  }
})

watch(personalSubview, (sub) => {
  if (sub === 'admins' && !showPersonalAdminsToggle.value) {
    personalSubview.value = 'personal'
  }
})

watch(isSuperAdminSession, (ok) => {
  if (!ok) {
    if (activeView.value === 'auditoria') {
      activeView.value = isAdminSession.value ? 'personal' : 'rendicion'
    }
    if (personalSubview.value === 'admins') {
      personalSubview.value = 'personal'
    }
  }
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

function labelAnticipoTrabajador(t) {
  const rut = formatRut(t.rut || '')
  return rut ? `${t.nombre} · ${rut}` : t.nombre
}

const anticipoTrabajadorOpciones = computed(() => {
  const q = anticipoTrabajadorQuery.value
  const opts = []
  const seen = new Set()
  for (const t of trabajadores.value) {
    const id = String(t.id)
    if (seen.has(id)) continue
    seen.add(id)
    opts.push({
      id,
      nombre: t.nombre,
      rut: t.rut || '',
      label: labelAnticipoTrabajador(t)
    })
  }
  if (!String(q || '').trim()) return opts
  return opts.filter((o) => coincideNombreORut(o, q))
})

function onAnticipoTrabajadorFocus(e) {
  anticipoTrabajadorOpen.value = true
  anticipoTrabajadorHighlight.value = 0
  e?.target?.select?.()
}

function onAnticipoTrabajadorQueryInput() {
  anticipoTrabajadorOpen.value = true
  anticipoTrabajadorHighlight.value = 0
  if (!anticipoTrabajadorQuery.value.trim()) {
    asignacion.trabajadorId = ''
  }
}

function highlightAnticipoTrabajador(delta) {
  const n = anticipoTrabajadorOpciones.value.length
  if (!n) return
  anticipoTrabajadorOpen.value = true
  anticipoTrabajadorHighlight.value = (anticipoTrabajadorHighlight.value + delta + n) % n
}

function confirmAnticipoTrabajadorHighlight() {
  const opt = anticipoTrabajadorOpciones.value[anticipoTrabajadorHighlight.value]
  if (opt) selectAnticipoTrabajador(opt)
}

function selectAnticipoTrabajador(opt) {
  if (!opt) return
  asignacion.trabajadorId = opt.id
  anticipoTrabajadorQuery.value = opt.label
  anticipoTrabajadorOpen.value = false
  anticipoTrabajadorHighlight.value = 0
}

function syncAnticipoTrabajadorQueryFromSelection() {
  const t = trabajadores.value.find((x) => String(x.id) === String(asignacion.trabajadorId))
  anticipoTrabajadorQuery.value = t ? labelAnticipoTrabajador(t) : ''
}

function onAnticipoTrabajadorBlur() {
  setTimeout(() => {
    anticipoTrabajadorOpen.value = false
    if (!asignacion.trabajadorId) {
      anticipoTrabajadorQuery.value = ''
      return
    }
    const selected = trabajadores.value.find(
      (x) => String(x.id) === String(asignacion.trabajadorId)
    )
    if (!selected) {
      asignacion.trabajadorId = ''
      anticipoTrabajadorQuery.value = ''
      return
    }
    const selectedLabel = labelAnticipoTrabajador(selected)
    if (anticipoTrabajadorQuery.value.trim().toLowerCase() !== selectedLabel.toLowerCase()) {
      const match = anticipoTrabajadorOpciones.value.find(
        (o) =>
          o.nombre.toLowerCase() === anticipoTrabajadorQuery.value.trim().toLowerCase() ||
          o.label.toLowerCase() === anticipoTrabajadorQuery.value.trim().toLowerCase()
      )
      if (match) selectAnticipoTrabajador(match)
      else syncAnticipoTrabajadorQueryFromSelection()
    }
  }, 120)
}

function onGastoTipoChange() {
  if (!gastoMuestraNumeroDocto.value) {
    gasto.numero = ''
  }
  if (!gastoMuestraPatente.value) {
    gasto.patente = ''
    gasto.patenteDisplay = ''
  }
  if (gastoFuerzaEfectivo.value) {
    gasto.metodoPago = 'efectivo'
    gasto.tarjetaUltimos4 = ''
  }
}

function onGastoPatenteInput(event) {
  const { clean, display } = fromPatenteInput(event.target.value)
  gasto.patente = clean
  gasto.patenteDisplay = display
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
    return ['Super Admin', 'Administrador de Caja']
  }
  if (sessionAdminNivel.value === ROLE_SUPER) {
    return ['Administrador de Caja']
  }
  return []
})

const isEditingSuperAdminDev = computed(() => {
  const current = modalEditAdmin.rol || ''
  return current === ROLE_DEV || current.includes('Dev')
})

/** Roles disponibles al editar: creatables + el rol actual (Dev solo lectura si aplica) */
const editableAdminRoles = computed(() => {
  const current = modalEditAdmin.rol
  if (current && (current === ROLE_DEV || current.includes('Dev'))) {
    const full = 'Super Admin - Dev (Acceso Total + Eliminación)'
    return [current.includes('Acceso Total') ? current : full]
  }
  const base = [...creatableAdminRoles.value]
  if (current && !base.includes(current)) {
    base.unshift(current)
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

const cuentaBancoForm = reactive({
  editId: null,
  centroCobroId: '',
  numeroCuenta: '',
  banco: ''
})

const personalModalRutStatus = computed(() => rutStatusLabel(modalPersonal.rut))

const tarjetasEmpresa = ref([])
const cuentasBanco = ref([])

const gastoFuerzaEfectivo = computed(
  () => gasto.tipo === 'Viático' || gasto.tipo === 'Otro pago'
)

const gastoMuestraPatente = computed(() => gasto.tipo !== 'Viático')

const gastoComprobanteOpcional = computed(
  () => gasto.tipo === 'Viático' || gasto.tipo === 'Otro pago'
)

const gastoRequiereTarjetaDigits = computed(
  () =>
    !gastoFuerzaEfectivo.value &&
    (gasto.metodoPago === 'debito' || gasto.metodoPago === 'credito')
)

/** N° docto: Peaje / Viático / Otro pago no; Boleta opcional; Factura / Guía / OC obligatorio */
const gastoMuestraNumeroDocto = computed(
  () =>
    gasto.tipo === 'Boleta' ||
    gasto.tipo === 'Factura' ||
    gasto.tipo === 'Guía Despacho' ||
    gasto.tipo === 'Orden de compra'
)

const gastoRequiereNumeroDocto = computed(
  () =>
    gasto.tipo === 'Factura' ||
    gasto.tipo === 'Guía Despacho' ||
    gasto.tipo === 'Orden de compra'
)

const tarjetasParaGasto = computed(() => {
  const tipoWanted = gasto.metodoPago === 'debito' ? 'Débito' : 'Crédito'
  return tarjetasEmpresa.value.filter((t) => t.tipo === tipoWanted)
})

const tarjetaGastoMatch = computed(() => {
  if (!gastoRequiereTarjetaDigits.value) return null
  const digits = String(gasto.tarjetaUltimos4 || '').replace(/\D/g, '')
  if (digits.length !== 4) return null
  return (
    tarjetasParaGasto.value.find((t) => String(t.ultimos4) === digits) || null
  )
})

function onGastoMetodoPagoChange() {
  if (!gastoRequiereTarjetaDigits.value) {
    gasto.tarjetaUltimos4 = ''
  }
}

function onGastoTarjetaDigitsInput(event) {
  const only = String(event.target.value || '')
    .replace(/\D/g, '')
    .slice(0, 4)
  gasto.tarjetaUltimos4 = only
  event.target.value = only
}

function resolveTarjetaIdParaGasto() {
  return tarjetaGastoMatch.value?.id || null
}
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
  if (ccActivo.value) {
    const ccOk = centrosCosto.value.some((c) => String(c.id) === String(ccActivo.value))
    if (!ccOk) ccActivo.value = ''
  }
  syncCcFiltroQueryFromSelection()

  const opts = cajasFiltroHeaderOpciones.value
  if (!opts.length) {
    // Si el CC no tiene cajas, no forzar vacío del resto del sistema:
    // caer a la primera caja global disponible.
    const all = cajasActivasOpciones.value
    if (!all.some((c) => c.groupKey === cajaActiva.value)) {
      cajaActiva.value = all[0]?.groupKey || ''
    }
  } else if (!opts.some((c) => c.groupKey === cajaActiva.value)) {
    cajaActiva.value = opts[0].groupKey || ''
  }
  syncCajaFiltroQueryFromSelection()

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

async function loadDashboardData(opts = {}) {
  const silent = opts.silent === true

  const run = async () => {
    if (!silent) dataLoading.value = true
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
      const bancosRaw = await safeList(api.listBancosOrigen)
      bancosOrigen.value = bancosRaw
        .map((b) => String(b.nombre || b).trim().toUpperCase())
        .filter(Boolean)

      const usuariosRaw = await safeList(api.listUsuarios)
      const mappedUsers = usuariosRaw.map(mapUsuario)

      if (isSuperAdminSession.value) {
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
      } else {
        admins.value = []
      }

      usuarios.value = mappedUsers.filter((u) => u.rol === 'USER_RENDIDOR')

      const tarjetasRaw = await safeList(api.listTarjetas)
      tarjetasEmpresa.value = tarjetasRaw.map(mapTarjeta)

      const cuentasRaw = await safeList(api.listCuentasBanco)
      cuentasBanco.value = cuentasRaw.map(mapCuentaBanco)

      if (isSuperAdminSession.value) {
        const logsRaw = await safeList(api.listAuditLogs)
        auditoriaLogs.value = logsRaw.map(mapAuditLog)
      } else {
        auditoriaLogs.value = []
      }

      syncSelectoresCajaMes()
      rebuildCartola()
      syncInformeResultado()
      await loadResumenCaja()
    } catch (err) {
      if (!silent) {
        dataError.value = err?.message || 'No se pudieron cargar los datos'
      }
    } finally {
      if (!silent) dataLoading.value = false
    }
  }

  if (silent) {
    return withSilentApi(run)
  }
  return run()
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

const ccFiltroOpciones = computed(() => [
  { id: '', label: 'Todos' },
  ...centrosCosto.value.map((cc) => ({
    id: String(cc.id),
    label: cc.nombre || `CC #${cc.id}`
  }))
])

const ccFiltroOpcionesVisibles = computed(() => {
  const q = ccFiltroQuery.value.trim().toLowerCase()
  if (!q || q === 'todos') return ccFiltroOpciones.value
  return ccFiltroOpciones.value.filter(
    (o) =>
      o.id === '' ||
      o.label.toLowerCase().includes(q)
  )
})

const cajasActivasOpciones = computed(() => {
  const map = new Map()
  for (const c of cajas.value) {
    if (!map.has(c.groupKey)) {
      map.set(c.groupKey, {
        displayName: c.displayName,
        centroCobroId: c.centroCobroId,
        centroCobroNombre: c.centroCobroNombre
      })
    }
  }
  return [...map.entries()].map(([groupKey, meta]) => ({
    groupKey,
    label: meta.displayName,
    centroCobroId: meta.centroCobroId,
    centroCobroNombre: meta.centroCobroNombre
  }))
})

/** Cajas del buscador del header (filtradas por CC activo). */
const cajasFiltroHeaderOpciones = computed(() => {
  if (!ccActivo.value) return cajasActivasOpciones.value
  return cajasActivasOpciones.value.filter(
    (c) => String(c.centroCobroId ?? '') === String(ccActivo.value)
  )
})

const cajaFiltroOpcionesVisibles = computed(() => {
  const q = cajaFiltroQuery.value.trim().toLowerCase()
  const all = cajasFiltroHeaderOpciones.value
  if (!q) return all
  return all.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      o.groupKey.toLowerCase().includes(q) ||
      String(o.centroCobroNombre || '')
        .toLowerCase()
        .includes(q)
  )
})

function syncCcFiltroQueryFromSelection() {
  if (!ccActivo.value) {
    ccFiltroQuery.value = 'Todos'
    return
  }
  const opt = ccFiltroOpciones.value.find((o) => o.id === String(ccActivo.value))
  ccFiltroQuery.value = opt?.label || 'Todos'
}

function syncCajaFiltroQueryFromSelection() {
  const opt = cajasActivasOpciones.value.find((c) => c.groupKey === cajaActiva.value)
  cajaFiltroQuery.value = opt?.label || ''
}

function onCcFiltroFocus() {
  ccFiltroOpen.value = true
  ccFiltroHighlight.value = 0
}

function onCcFiltroQueryInput() {
  ccFiltroOpen.value = true
  ccFiltroHighlight.value = 0
}

function highlightCcFiltro(delta) {
  const n = ccFiltroOpcionesVisibles.value.length
  if (!n) return
  ccFiltroHighlight.value = (ccFiltroHighlight.value + delta + n) % n
}

function confirmCcFiltroHighlight() {
  const opt = ccFiltroOpcionesVisibles.value[ccFiltroHighlight.value]
  if (opt) selectCcFiltro(opt)
}

function selectCcFiltro(opt) {
  ccActivo.value = opt.id || ''
  ccFiltroQuery.value = opt.label
  ccFiltroOpen.value = false
  const opts = cajasFiltroHeaderOpciones.value
  if (!opts.some((c) => c.groupKey === cajaActiva.value)) {
    cajaActiva.value = opts[0]?.groupKey || ''
  }
  syncCajaFiltroQueryFromSelection()
}

function resetCcFiltro() {
  selectCcFiltro({ id: '', label: 'Todos' })
}

const ccFiltroMuestraReset = computed(() => {
  if (ccActivo.value) return true
  const q = ccFiltroQuery.value.trim().toLowerCase()
  return Boolean(q) && q !== 'todos'
})

function onCcFiltroEscape() {
  ccFiltroOpen.value = false
  syncCcFiltroQueryFromSelection()
}

function onCcFiltroBlur() {
  setTimeout(() => {
    if (ccFiltroRootEl.value?.contains(document.activeElement)) return
    ccFiltroOpen.value = false
    syncCcFiltroQueryFromSelection()
  }, 120)
}

function onCajaFiltroFocus() {
  cajaFiltroOpen.value = true
  cajaFiltroHighlight.value = 0
}

function onCajaFiltroQueryInput() {
  cajaFiltroOpen.value = true
  cajaFiltroHighlight.value = 0
}

function highlightCajaFiltro(delta) {
  const n = cajaFiltroOpcionesVisibles.value.length
  if (!n) return
  cajaFiltroHighlight.value = (cajaFiltroHighlight.value + delta + n) % n
}

function confirmCajaFiltroHighlight() {
  const opt = cajaFiltroOpcionesVisibles.value[cajaFiltroHighlight.value]
  if (opt) selectCajaFiltro(opt)
}

function selectCajaFiltro(opt) {
  cajaActiva.value = opt.groupKey
  cajaFiltroQuery.value = opt.label
  cajaFiltroOpen.value = false
}

/** Solo limpia el texto de búsqueda; la caja activa se conserva hasta elegir otra. */
function clearCajaFiltroTexto() {
  cajaFiltroQuery.value = ''
  cajaFiltroHighlight.value = 0
  // Enfocar el input: la X se usa a menudo sin foco previo; sin foco el blur
  // no cierra el listado y la UI queda “bloqueada” hasta elegir una caja.
  nextTick(() => {
    cajaFiltroInputEl.value?.focus()
    cajaFiltroOpen.value = cajaFiltroOpcionesVisibles.value.length > 0
  })
}

function onCajaFiltroEscape() {
  cajaFiltroOpen.value = false
  syncCajaFiltroQueryFromSelection()
}

function onCajaFiltroBlur() {
  setTimeout(() => {
    if (cajaFiltroRootEl.value?.contains(document.activeElement)) return
    cajaFiltroOpen.value = false
    // Sin nueva selección → restaurar etiqueta de la caja activa (ej. HOSTAL EL ABRA)
    syncCajaFiltroQueryFromSelection()
  }, 120)
}

watch(ccActivo, () => {
  const opts = cajasFiltroHeaderOpciones.value
  if (!opts.some((c) => c.groupKey === cajaActiva.value)) {
    cajaActiva.value = opts[0]?.groupKey || ''
  }
  syncCajaFiltroQueryFromSelection()
})

watch(cajaActiva, () => {
  syncCajaFiltroQueryFromSelection()
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

/** Mes del PC host en mayúsculas para encabezado de totales de cajas (ej. JULIO). */
const labelMesHostCajas = computed(() => {
  const now = new Date()
  return (MESES_ES[now.getMonth()] || '').toUpperCase()
})

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

function matchAnticipoFiltros({ nombre, rut, cajaGroupKey, fecha }) {
  const q = anticipoBusqueda.value.trim()
  if (q && !coincideNombreORut({ nombre, rut }, q)) return false
  if (anticipoFiltroCaja.value) {
    if (!cajaGroupKey || cajaGroupKey !== anticipoFiltroCaja.value) return false
  }
  if (anticipoFiltroMes.value) {
    if (mesFromFechaDDMMYYYY(fecha) !== anticipoFiltroMes.value) return false
  }
  return true
}

const asignacionesFiltradas = computed(() =>
  asignaciones.value.filter((a) => {
    const trab = trabajadores.value.find((t) => String(t.id) === String(a.trabajadorId))
    return matchAnticipoFiltros({
      nombre: a.conductor,
      rut: trab?.rut || '',
      cajaGroupKey: a.cajaGroupKey || a.fondo,
      fecha: a.fecha
    })
  })
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
const cartolaAccordionOpen = reactive({})

const modalHistorialCartola = reactive({
  open: false,
  doc: '',
  tipo: '',
  fecha: '',
  responsable: '',
  monto: '',
  pago: '',
  docto: '',
  estado: '',
  estadoClass: '',
  intento: 1,
  detalle: '',
  observacionAdmin: '',
  comprobanteNombre: ''
})

const modalParcialMes = reactive({
  open: false,
  trabajador: '',
  cajaLabel: '',
  mesLabel: '',
  items: [],
  totalAnticipos: '$ 0',
  totalDeclarado: '$ 0',
  totalDevolucion: '$ 0',
  labelDevolucion: 'Total devolución (trabajador)',
  quien: '' // trabajador | empresa | ''
})

const cartolaFiltrada = computed(() => {
  const q = String(filtrosInforme.busqueda || '').trim().toLowerCase()
  const rutQ = cleanRut(filtrosInforme.busqueda || '')

  return cartola.value.filter((row) => {
    if (filtrosInforme.mes && row.mes !== filtrosInforme.mes) return false
    if (filtrosInforme.centroCobroId) {
      if (String(row.centroCobroId ?? '') !== String(filtrosInforme.centroCobroId)) return false
    }
    if (filtrosInforme.caja && row.cajaGroupKey !== filtrosInforme.caja) return false
    if (!filtrosInforme.tipos[row.tipoKey]) return false
    if (filtrosInforme.persona && row.responsable !== filtrosInforme.persona) return false
    if (q) {
      const nombre = String(row.responsable || '').toLowerCase()
      const rut = rutTrabajadorCartola(row.trabajadorId)
      const matchNombre = nombre.includes(q)
      const matchRut = rutQ.length >= 2 && rut.includes(rutQ)
      if (!matchNombre && !matchRut) return false
    }
    return true
  })
})

function rutTrabajadorCartola(trabajadorId) {
  if (trabajadorId == null || trabajadorId === '') return ''
  const id = Number(trabajadorId)
  const fromTrab = trabajadores.value.find((t) => Number(t.id) === id)
  if (fromTrab?.rut) return cleanRut(fromTrab.rut)
  const fromPersonal = personal.value.find((p) => Number(p.id) === id)
  return cleanRut(fromPersonal?.rut || '')
}

function totalesFilasCartola(rows) {
  let abono = 0
  let cargo = 0
  for (const row of rows) {
    abono += parseMontoNumber(row.abono)
    cargo += parseMontoNumber(row.cargo)
  }
  const saldo = abono - cargo
  return {
    abono: formatMonto(abono),
    cargo: formatMonto(cargo),
    saldo: formatMonto(saldo),
    saldoNegativo: saldo < 0,
    abonoNum: abono,
    cargoNum: cargo,
    saldoNum: saldo
  }
}

/** Cartola agrupada: Centro de cobro → Caja */
const cartolaPorCcYCaja = computed(() => {
  const byCc = new Map()

  for (const row of cartolaFiltrada.value) {
    const ccId = row.centroCobroId == null ? null : Number(row.centroCobroId)
    const ccKey = ccId == null || !Number.isFinite(ccId) ? 'cc-none' : `cc-${ccId}`
    const ccTitulo =
      row.centroCobroNombre ||
      (ccId != null
        ? centrosCosto.value.find((c) => Number(c.id) === ccId)?.nombre
        : null) ||
      'Sin centro de cobro / empresa'
    const cajaKey = row.cajaGroupKey || '__sin_caja__'
    const cajaTitulo = cajaKey === '__sin_caja__' ? 'Sin caja' : labelCajaGroup(cajaKey)

    if (!byCc.has(ccKey)) {
      byCc.set(ccKey, {
        key: ccKey,
        titulo: ccTitulo,
        sortCc: ccId == null ? Number.POSITIVE_INFINITY : ccId,
        cajasMap: new Map()
      })
    }
    const ccGrupo = byCc.get(ccKey)
    if (!ccGrupo.cajasMap.has(cajaKey)) {
      ccGrupo.cajasMap.set(cajaKey, {
        key: `${ccKey}__caja-${cajaKey}`,
        titulo: cajaTitulo,
        rows: []
      })
    }
    ccGrupo.cajasMap.get(cajaKey).rows.push(row)
  }

  return [...byCc.values()]
    .map((ccGrupo) => {
      const cajas = [...ccGrupo.cajasMap.values()]
        .map((cajaGrupo) => ({
          ...cajaGrupo,
          totales: totalesFilasCartola(cajaGrupo.rows)
        }))
        .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))
      const allRows = cajas.flatMap((c) => c.rows)
      return {
        key: ccGrupo.key,
        titulo: ccGrupo.titulo,
        sortCc: ccGrupo.sortCc,
        cajas,
        movCount: allRows.length,
        totales: totalesFilasCartola(allRows)
      }
    })
    .sort((a, b) => {
      if (a.sortCc !== b.sortCc) return a.sortCc - b.sortCc
      return a.titulo.localeCompare(b.titulo, 'es')
    })
})

const cartolaTotales = computed(() => totalesFilasCartola(cartolaFiltrada.value))

/** Cajas del filtro rápido de cartola (según CC seleccionado en filtrosInforme) */
const cajasOpcionesCartola = computed(() => {
  const ccId = filtrosInforme.centroCobroId
  const map = new Map()
  for (const c of cajas.value) {
    if (ccId && String(c.centroCobroId ?? '') !== String(ccId)) continue
    if (!map.has(c.groupKey)) map.set(c.groupKey, c.displayName)
  }
  return [...map.entries()].map(([groupKey, displayName]) => ({
    groupKey,
    label: displayName
  }))
})

function labelCentroCobroInforme(ccId) {
  if (!ccId) return 'Todos'
  const cc = centrosCosto.value.find((c) => String(c.id) === String(ccId))
  return cc?.nombre || `CC ${ccId}`
}

const movimientos = ref([])

const asignaciones = ref([])

const DASHBOARD_SILENT_REFRESH_MS = 45_000
let dashboardSilentRefreshTimer = null
let dashboardSilentRefreshInFlight = false

async function silentRefreshDashboard() {
  if (dashboardSilentRefreshInFlight || dataLoading.value) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  dashboardSilentRefreshInFlight = true
  try {
    await loadDashboardData({ silent: true })
  } finally {
    dashboardSilentRefreshInFlight = false
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('visibilitychange', onDashboardVisibilityRefresh)
  await bootstrap()
  syncGastoLockedFields()
  await loadDashboardData()
  dashboardSilentRefreshTimer = window.setInterval(
    silentRefreshDashboard,
    DASHBOARD_SILENT_REFRESH_MS
  )
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('visibilitychange', onDashboardVisibilityRefresh)
  if (dashboardSilentRefreshTimer != null) {
    window.clearInterval(dashboardSilentRefreshTimer)
    dashboardSilentRefreshTimer = null
  }
})

function onDashboardVisibilityRefresh() {
  if (document.visibilityState === 'visible') {
    silentRefreshDashboard()
  }
}

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

function onAsignacionFile(event) {
  const file = event.target.files?.[0] || null
  anticipoComprobanteFile.value = file
  asignacion.comprobanteNombre = file ? file.name : ''
}

function onVerificarReplaceFile(event) {
  const file = event.target.files?.[0] || null
  if (
    pendingVerifyKind.value === 'anticipo' ||
    pendingVerifyKind.value === 'anticipo-adjunto'
  ) {
    anticipoComprobanteFile.value = file
    if (pendingVerifyKind.value === 'anticipo') {
      asignacion.comprobanteNombre = file ? file.name : ''
    }
  } else {
    gastoComprobanteFile.value = file
    if (pendingVerifyKind.value === 'gasto') {
      gasto.comprobanteNombre = file ? file.name : ''
    }
  }
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
  pendingVerifyKind.value = null
  pendingGastoSave = null
  pendingAnticipoSave = null
  pendingLegacyAttach.value = null
}

async function verificarComprobanteConIa() {
  const file = verifyComprobanteFile.value
  if (!file) {
    throw Object.assign(new Error('Debes adjuntar un comprobante (PDF, PNG o JPG).'), {
      errores: ['Debes adjuntar un comprobante (PDF, PNG o JPG).']
    })
  }
  const fd = new FormData()
  fd.append('comprobante', file)

  if (
    pendingVerifyKind.value === 'anticipo' ||
    pendingVerifyKind.value === 'anticipo-adjunto'
  ) {
    const payload = pendingAnticipoSave || {}
    const row = pendingLegacyAttach.value?.row
    fd.append(
      'monto',
      String(
        payload.monto ||
          parseMontoNumber(row?.monto) ||
          parseMontoInput(asignacion.monto) ||
          ''
      )
    )
    fd.append('tipo_documento', 'Vale')
    fd.append('tipo_movimiento', 'asignacion')
    const cajaId = payload.caja_id || row?.cajaId
    const trabajadorId = payload.trabajador_id || row?.trabajadorId
    const fecha = payload.fecha || row?.fechaSort
    if (cajaId) fd.append('caja_id', String(cajaId))
    if (trabajadorId) fd.append('trabajador_id', String(trabajadorId))
    if (fecha) fd.append('fecha', String(fecha))
  } else if (pendingVerifyKind.value === 'gasto-adjunto') {
    const row = pendingLegacyAttach.value?.row
    const tipo =
      row?.tipoDocumento ||
      String(row?.docto || 'Boleta').split('#')[0].trim() ||
      'Boleta'
    const numero =
      row?.numeroDocumento ||
      (String(row?.docto || '').match(/#\s*(.+)\s*$/) || [])[1]?.trim() ||
      ''
    fd.append('monto', String(parseMontoNumber(row?.monto) || ''))
    fd.append('tipo_documento', tipo)
    fd.append('tipo_movimiento', 'gasto')
    if (row?.cajaId) fd.append('caja_id', String(row.cajaId))
    if (row?.trabajadorId) fd.append('trabajador_id', String(row.trabajadorId))
    if (row?.fechaSort) fd.append('fecha', String(row.fechaSort))
    if (numero) fd.append('numero_documento', String(numero))
  } else {
    const payload = pendingGastoSave || {}
    fd.append('monto', String(payload.monto || parseMontoInput(gasto.monto) || ''))
    fd.append('tipo_documento', gasto.tipo)
    fd.append('tipo_movimiento', 'gasto')
    if (payload.caja_id) fd.append('caja_id', String(payload.caja_id))
    if (payload.trabajador_id) fd.append('trabajador_id', String(payload.trabajador_id))
    if (payload.fecha_documento) fd.append('fecha', String(payload.fecha_documento))
    if (gastoMuestraNumeroDocto.value && gasto.numero.trim()) {
      fd.append('numero_documento', gasto.numero.trim())
    }
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
    if (pendingVerifyKind.value === 'anticipo-adjunto') {
      const row = pendingLegacyAttach.value?.row
      if (!row?.id) throw new Error('No hay asignación para adjuntar comprobante')
      await api.updateAnticipo(row.id, {
        comprobante_url: verifyResult.comprobante_url
      })
      await loadDashboardData()
      if (pendingImportLoteRefreshId.value) {
        await refreshImportLoteDetalle(pendingImportLoteRefreshId.value)
        pendingImportLoteRefreshId.value = null
        closeImportComprobanteModal()
      }
      modalVerificar.open = false
      pendingVerifyKind.value = null
      pendingLegacyAttach.value = null
      anticipoComprobanteFile.value = null
    } else if (pendingVerifyKind.value === 'gasto-adjunto') {
      const row = pendingLegacyAttach.value?.row
      if (!row?.id) throw new Error('No hay gasto para adjuntar comprobante')
      await api.updateRendicion(row.id, {
        comprobante_url: verifyResult.comprobante_url
      })
      await loadDashboardData()
      if (pendingImportLoteRefreshId.value) {
        await refreshImportLoteDetalle(pendingImportLoteRefreshId.value)
        pendingImportLoteRefreshId.value = null
        closeImportComprobanteModal()
      }
      modalVerificar.open = false
      pendingVerifyKind.value = null
      pendingLegacyAttach.value = null
      gastoComprobanteFile.value = null
    } else if (pendingVerifyKind.value === 'anticipo') {
      if (!pendingAnticipoSave) throw new Error('No hay anticipo pendiente de guardar')
      await api.createAnticipo({
        ...pendingAnticipoSave,
        comprobante_url: verifyResult.comprobante_url
      })
      await loadDashboardData()
      modalVerificar.open = false
      pendingVerifyKind.value = null
      pendingAnticipoSave = null
      closeFormAnticipo()
    } else {
      if (!pendingGastoSave) throw new Error('No hay rendición pendiente de guardar')
      await api.createRendicion({
        ...pendingGastoSave,
        comprobante_url: verifyResult.comprobante_url
      })
      await loadDashboardData()
      modalVerificar.open = false
      pendingVerifyKind.value = null
      pendingGastoSave = null
      closeFormGasto()
    }
  } catch (err) {
    modalVerificar.phase = 'error'
    modalVerificar.error =
      err?.message || 'No se pudo verificar el comprobante. Sube un documento más claro.'
    modalVerificar.errores = Array.isArray(err?.errores) ? err.errores : [modalVerificar.error]
  }
}

async function retryVerificarYGuardar() {
  if (!verifyComprobanteFile.value) return
  if (pendingVerifyKind.value === 'anticipo' && !pendingAnticipoSave) return
  if (pendingVerifyKind.value === 'gasto' && !pendingGastoSave) return
  if (
    (pendingVerifyKind.value === 'gasto-adjunto' ||
      pendingVerifyKind.value === 'anticipo-adjunto') &&
    !pendingLegacyAttach.value?.row?.id
  ) {
    return
  }
  await ejecutarVerificacionYGuardado()
}

function triggerAdjuntarComprobante(kind, row) {
  if (!row?.id) return
  pendingLegacyAttach.value = { kind, row }
  if (legacyComprobanteInputEl.value) {
    legacyComprobanteInputEl.value.value = ''
    legacyComprobanteInputEl.value.click()
  }
}

async function onLegacyComprobanteFile(event) {
  const file = event.target.files?.[0] || null
  if (event.target) event.target.value = ''
  if (!file || !pendingLegacyAttach.value?.row?.id) {
    pendingLegacyAttach.value = null
    return
  }
  const { kind } = pendingLegacyAttach.value
  if (kind === 'anticipo') {
    anticipoComprobanteFile.value = file
    pendingVerifyKind.value = 'anticipo-adjunto'
  } else {
    gastoComprobanteFile.value = file
    pendingVerifyKind.value = 'gasto-adjunto'
  }
  await ejecutarVerificacionYGuardado()
}

function labelAdjunto(nombre) {
  const name = String(nombre || '')
  const base = name.split('/').pop() || name
  const ext = base.split('.').pop()?.toUpperCase() || ''
  if (ext === 'PDF') return 'PDF'
  if (ext === 'PNG' || ext === 'JPG' || ext === 'JPEG') return ext === 'JPEG' ? 'JPG' : ext
  if (base.length <= 14) return base
  return `${base.slice(0, 10)}…`
}

function openComprobanteArchivo(pathOrName) {
  const raw = String(pathOrName || '').trim()
  if (!raw) return
  const rel = raw.replace(/^\/+/, '')
  const url = apiUrl(`/api/files/${rel}`)
  window.open(url, '_blank', 'noopener,noreferrer')
}

function rowTieneHistorial(row) {
  if (!row || row.tipoKey !== 'rendicion') return false
  if (row.observacionAdmin) return true
  if (Number(row.intento) > 1) return true
  return ['Devuelto', 'Por Corregir', 'Aprobado', 'Rechazado'].includes(row.estado)
}

function isCartolaAccordionOpen(key) {
  return cartolaAccordionOpen[key] !== false
}

function toggleCartolaAccordion(key) {
  cartolaAccordionOpen[key] = !isCartolaAccordionOpen(key)
}

function horaFromSubidoEl(subidoEl) {
  const m = String(subidoEl || '').match(/(\d{2}:\d{2})/)
  return m ? m[1] : '--:--'
}

function mismoTrabajadorCaja(a, b) {
  if (!a || !b) return false
  if (String(a.trabajadorId) !== String(b.trabajadorId)) return false
  if (a.cajaId != null && b.cajaId != null) {
    return Number(a.cajaId) === Number(b.cajaId)
  }
  return Boolean(a.cajaGroupKey) && a.cajaGroupKey === b.cajaGroupKey
}

/** Histórico migrado (`rendiciones_legacy`): solo lectura. */
function esLegacyHistorico(row) {
  return Boolean(row?.legacyId)
}

/** Import Excel operativo (`es_legacy` en gastos/anticipos): badge Legacy + adjuntar comprobante. */
function esLegacyOperacional(row) {
  return Boolean(row?.legacy && row?.id && !row?.legacyId)
}

/** Soft delete admin: visible solo dentro de 24h (fuera: oculto; API sigue bloqueando). */
function muestraSoftDeleteAdmin(row) {
  if (!isAdminSession.value || canDevForceDelete.value) return false
  if (!row?.id || esLegacyHistorico(row)) return false
  return estaDentroVentanaEdicion(createdAtRefMovimiento(row))
}

function createdAtRefMovimiento(row) {
  if (!row) return null
  if (row.createdAtMs) return row.createdAtMs
  if (row.created_at) return row.created_at
  return null
}

function puedeSoftDeleteAdmin(row) {
  return muestraSoftDeleteAdmin(row)
}

function tituloSoftDeleteAdmin(row) {
  if (puedeSoftDeleteAdmin(row)) return hintVentanaEdicionActiva()
  return hintFueraVentanaEdicion('eliminar')
}

function puedeAdjuntarComprobanteGasto(row) {
  return esLegacyOperacional(row)
}

function puedeAdjuntarComprobanteAsignacion(row) {
  if (!row?.id) return false
  return Boolean(row.legacy) || !row.comprobanteNombre
}

/** Pago con tarjeta de la empresa (vinculada) → Sin Devolución. */
function esPagoTarjetaEmpresa(row) {
  if (!row || esLegacyHistorico(row)) return false
  return (
    Boolean(row.tarjetaId) &&
    (row.metodoPago === 'debito' || row.metodoPago === 'credito')
  )
}

function tieneAnticipoMesTrabajadorCaja(row) {
  if (!row?.trabajadorId) return false
  const mes = mesFromFechaDDMMYYYY(row.fecha)
  if (!mes) return false
  return asignaciones.value.some(
    (a) =>
      mismoTrabajadorCaja(a, row) && mesFromFechaDDMMYYYY(a.fecha) === mes
  )
}

/**
 * Estado visible en historial:
 * - Estados admin (Por Corregir / Devuelto / Aprobado / Rechazado) se respetan.
 * - Tarjeta empresa → Sin Devolución.
 * - Efectivo (u otro sin tarjeta empresa) con anticipo del mes → Parcial (clickeable).
 */
function estadoDevolucionDisplay(row) {
  if (!row) return { label: '-', class: 'dash-status--off', parcial: false }
  const adminStates = ['Por Corregir', 'Devuelto', 'Aprobado', 'Rechazado']
  if (adminStates.includes(row.estado)) {
    return { label: row.estado, class: row.estadoClass, parcial: false }
  }
  if (esPagoTarjetaEmpresa(row)) {
    return { label: 'Sin Devolución', class: 'dash-status--warn', parcial: false }
  }
  if (tieneAnticipoMesTrabajadorCaja(row)) {
    return { label: 'Parcial', class: 'dash-status--info', parcial: true }
  }
  return {
    label: row.estado || 'Sin Devolución',
    class: row.estadoClass || 'dash-status--warn',
    parcial: false
  }
}

function openModalParcialMes(row) {
  if (!row?.trabajadorId) return
  const mes = mesFromFechaDDMMYYYY(row.fecha)
  if (!mes) return

  const anticiposMes = asignaciones.value.filter(
    (a) => mismoTrabajadorCaja(a, row) && mesFromFechaDDMMYYYY(a.fecha) === mes
  )
  // Gastos en efectivo del mes (consumen anticipo); tarjeta empresa no aplica
  const gastosMes = movimientos.value.filter(
    (m) =>
      !m.legacy &&
      mismoTrabajadorCaja(m, row) &&
      mesFromFechaDDMMYYYY(m.fecha) === mes &&
      m.metodoPago === 'efectivo'
  )

  const items = [
    ...anticiposMes.map((a) => ({
      tipo: 'Asignación',
      badgeClass: 'dash-badge--info',
      doc: a.doc || '-',
      docClass: 'dash-doc-muted',
      detalle: a.observaciones === '-' ? 'Asignación' : a.observaciones || 'Asignación',
      fecha: a.fecha,
      hora: horaFromSubidoEl(a.subidoEl),
      monto: a.monto,
      sortKey: `${a.fechaSort || ''}|${String(a.createdAtMs || 0).padStart(13, '0')}|A|${a.id}`
    })),
    ...gastosMes.map((g) => ({
      tipo: 'Gasto',
      badgeClass: 'dash-badge--warn',
      doc: g.rinde || '-',
      docClass: 'dash-rinde',
      detalle: g.descripcion || g.docto || 'Gasto',
      fecha: g.fecha,
      hora: horaFromSubidoEl(g.subidoEl),
      monto: g.monto,
      sortKey: `${g.fechaSort || ''}|${String(g.createdAtMs || 0).padStart(13, '0')}|G|${g.id}`
    }))
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  const totalAnticipos = anticiposMes.reduce((acc, a) => acc + parseMontoNumber(a.monto), 0)
  const totalDeclarado = gastosMes.reduce((acc, g) => acc + parseMontoNumber(g.monto), 0)
  const diff = totalAnticipos - totalDeclarado
  let quien = ''
  let labelDevolucion = 'Total devolución'
  let montoDevolucion = 0
  if (diff > 0) {
    quien = 'trabajador'
    labelDevolucion = 'Total devolución (trabajador)'
    montoDevolucion = diff
  } else if (diff < 0) {
    quien = 'empresa'
    labelDevolucion = 'Total devolución (empresa)'
    montoDevolucion = Math.abs(diff)
  } else {
    labelDevolucion = 'Total devolución'
    montoDevolucion = 0
  }

  modalParcialMes.open = true
  modalParcialMes.trabajador = row.trabajador || 'Trabajador'
  modalParcialMes.cajaLabel = labelCajaGroup(row.cajaGroupKey) || 'Caja'
  modalParcialMes.mesLabel = labelMes(mes)
  modalParcialMes.items = items
  modalParcialMes.totalAnticipos = formatMonto(totalAnticipos)
  modalParcialMes.totalDeclarado = formatMonto(totalDeclarado)
  modalParcialMes.totalDevolucion = formatMonto(montoDevolucion)
  modalParcialMes.labelDevolucion = labelDevolucion
  modalParcialMes.quien = quien
}

function closeModalParcialMes() {
  modalParcialMes.open = false
  modalParcialMes.items = []
}

function openModalHistorialCartola(row) {
  if (!row) return
  modalHistorialCartola.open = true
  modalHistorialCartola.doc = row.doc || ''
  modalHistorialCartola.tipo = row.tipo || ''
  modalHistorialCartola.fecha = row.fecha || ''
  modalHistorialCartola.responsable = row.responsable || ''
  modalHistorialCartola.monto =
    (row.abono && row.abono !== '-' ? row.abono : '') ||
    (row.cargo && row.cargo !== '-' ? row.cargo : '') ||
    ''
  modalHistorialCartola.pago = row.pago || ''
  modalHistorialCartola.docto = row.docto || ''
  modalHistorialCartola.estado = row.estado || ''
  modalHistorialCartola.estadoClass = row.estadoClass || ''
  modalHistorialCartola.intento = Number(row.intento) || 1
  modalHistorialCartola.detalle = row.detalle || ''
  modalHistorialCartola.observacionAdmin = row.observacionAdmin || ''
  modalHistorialCartola.comprobanteNombre = row.comprobanteNombre || ''
}

function closeModalHistorialCartola() {
  modalHistorialCartola.open = false
}

function openModalResponder(row) {
  if (!isAdminSession.value) return
  modalResponder.open = true
  modalResponder.rinde = row.rinde
  modalResponder.estado = 'aprobado'
  modalResponder.comentario = ''
  modalResponder.visibilidad = 'todos'
  modalResponder.comprobanteNombre = ''
  modalResponder.comprobanteFile = null
  Object.assign(modalResponder.campos, camposCorregirDefault())
}

function closeModalResponder() {
  modalResponder.open = false
}

function onRespuestaFile(event) {
  const file = event.target.files?.[0] || null
  modalResponder.comprobanteFile = file
  modalResponder.comprobanteNombre = file ? file.name : ''
}

async function onSaveRespuesta() {
  modalResponder.comentario = sanitizeTextoLibre(modalResponder.comentario, 500)
  if (comentarioRequeridoAdmin.value && !modalResponder.comentario.trim()) {
    return
  }
  if (modalResponder.comentario.length > 500) return

  const row = movimientos.value.find((m) => m.rinde === modalResponder.rinde)
  if (!row || esLegacyHistorico(row) || !row.id) {
    closeModalResponder()
    return
  }

  let estado = 'Aprobado'
  if (modalResponder.estado === 'corregir') estado = 'Por Corregir'
  else if (modalResponder.estado === 'rechazado') estado = 'Rechazado'
  else if (modalResponder.comprobanteFile) estado = 'Devuelto'

  const payload = { estado }
  if (modalResponder.comprobanteFile) {
    try {
      const fd = new FormData()
      fd.append('comprobante', modalResponder.comprobanteFile)
      fd.append('monto', String(parseMontoNumber(row.monto) || 1))
      fd.append('tipo_movimiento', 'devolucion')
      fd.append('tipo_documento', 'Comprobante')
      if (row.cajaId) fd.append('caja_id', String(row.cajaId))
      if (row.trabajadorId) fd.append('trabajador_id', String(row.trabajadorId))
      if (row.fechaSort) fd.append('fecha', String(row.fechaSort))
      else if (row.fecha) fd.append('fecha', String(row.fecha))
      const verifyResult = await api.verificarComprobante(fd)
      if (!verifyResult?.ok || !verifyResult?.comprobante_url) {
        throw new Error('No se pudo guardar el comprobante de devolución')
      }
      payload.comprobante_url = verifyResult.comprobante_url
    } catch (err) {
      saveError.value = err?.message || 'No se pudo subir el comprobante de devolución'
      return
    }
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
  const numeroMatch = String(row.docto || '').match(/#\s*(.+)\s*$/)
  const montoNum = String(row.monto || '').replace(/\D/g, '')
  let tipoBase = String(row.docto || 'Boleta').split('#')[0].trim() || 'Boleta'
  if (tipoBase === 'Ticket Peaje') tipoBase = 'Peaje'
  const campos = { ...camposCorregirDefault(), ...(row.camposCorregir || {}) }

  modalCorregir.open = true
  modalCorregir.rinde = row.rinde
  modalCorregir.trabajador = row.trabajador || ''
  modalCorregir.numeroLocked = numeroMatch ? numeroMatch[1].trim() : ''
  modalCorregir.observacionAdmin =
    row.observacionAdmin || 'Se solicita corrección de la rendición.'
  modalCorregir.intento = row.intento || 1
  modalCorregir.prevFecha = row.fecha
  modalCorregir.prevDocto = row.docto
  modalCorregir.prevPago = row.pago
  modalCorregir.prevMonto = row.monto
  modalCorregir.prevDescripcion = row.descripcion || '-'
  modalCorregir.tipo = tipoBase
  modalCorregir.monto = formatMontoInputCl(montoNum || '')
  modalCorregir.metodoPago = row.metodoPago || 'efectivo'
  modalCorregir.tarjetaUltimos4 = ''
  modalCorregir.descripcion = row.descripcion || ''
  modalCorregir.respuesta = ''
  modalCorregir.comprobanteNombre = ''
  modalCorregir.comprobanteFile = null
  Object.assign(modalCorregir.campos, campos)
}

function closeModalCorregir() {
  modalCorregir.open = false
}

function onCorreccionFile(event) {
  const file = event.target.files?.[0] || null
  modalCorregir.comprobanteFile = file
  modalCorregir.comprobanteNombre = file ? file.name : ''
}

function onGastoMontoInput(event) {
  const formatted = formatMontoInputCl(event.target.value)
  gasto.monto = formatted
  event.target.value = formatted
}

function onCorregirMontoInput(event) {
  const formatted = formatMontoInputCl(event.target.value)
  modalCorregir.monto = formatted
  event.target.value = formatted
}

function onAsignacionMontoInput(event) {
  const formatted = formatMontoInputCl(event.target.value)
  asignacion.monto = formatted
  event.target.value = formatted
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
  if (!row || esLegacyHistorico(row) || !row.id) {
    closeModalCorregir()
    return
  }

  const campos = modalCorregir.campos
  const payload = { estado: 'Sin Devolución' }

  if (campos.tipo_docto) {
    payload.tipo_documento = modalCorregir.tipo
    if (
      modalCorregir.tipo === 'Peaje' ||
      modalCorregir.tipo === 'Viático' ||
      modalCorregir.tipo === 'Otro pago'
    ) {
      payload.numero_documento = null
    } else if (
      modalCorregir.tipo === 'Factura' ||
      modalCorregir.tipo === 'Guía Despacho' ||
      modalCorregir.tipo === 'Boleta' ||
      modalCorregir.tipo === 'Orden de compra'
    ) {
      payload.numero_documento = modalCorregir.numeroLocked || null
      if (
        (modalCorregir.tipo === 'Factura' ||
          modalCorregir.tipo === 'Guía Despacho' ||
          modalCorregir.tipo === 'Orden de compra') &&
        !payload.numero_documento
      ) {
        saveError.value = `N° de documento es obligatorio para ${modalCorregir.tipo}.`
        return
      }
    }
  }
  if (campos.monto) {
    payload.monto = parseMontoInput(modalCorregir.monto)
  }
  if (campos.origen_pago) {
    payload.origen_pago = origenFromMetodo(modalCorregir.metodoPago)
    if (
      modalCorregir.metodoPago === 'debito' ||
      modalCorregir.metodoPago === 'credito'
    ) {
      const digits = String(modalCorregir.tarjetaUltimos4 || '').replace(/\D/g, '')
      if (digits.length !== 4) {
        saveError.value = 'Ingresa los últimos 4 dígitos de la tarjeta.'
        return
      }
      const tipoWanted = modalCorregir.metodoPago === 'debito' ? 'Débito' : 'Crédito'
      const match = tarjetasEmpresa.value.find(
        (t) => t.tipo === tipoWanted && String(t.ultimos4) === digits
      )
      payload.tarjeta_id = match?.id || null
    } else {
      payload.tarjeta_id = null
    }
  }
  if (campos.descripcion) {
    payload.descripcion = modalCorregir.descripcion.trim()
  }
  if (campos.comprobante && modalCorregir.comprobanteFile) {
    try {
      const fd = new FormData()
      fd.append('comprobante', modalCorregir.comprobanteFile)
      fd.append(
        'monto',
        String(payload.monto || parseMontoNumber(row.monto) || parseMontoInput(modalCorregir.monto) || 1)
      )
      fd.append('tipo_movimiento', 'gasto')
      fd.append('tipo_documento', modalCorregir.tipo || row.docto || 'Boleta')
      const tipoCorr = modalCorregir.tipo || ''
      if (
        (tipoCorr === 'Factura' ||
          tipoCorr === 'Guía Despacho' ||
          tipoCorr === 'Boleta' ||
          tipoCorr === 'Orden de compra') &&
        modalCorregir.numeroLocked
      ) {
        fd.append('numero_documento', String(modalCorregir.numeroLocked))
      }
      if (row.cajaId) fd.append('caja_id', String(row.cajaId))
      if (row.trabajadorId) fd.append('trabajador_id', String(row.trabajadorId))
      if (row.fechaSort) fd.append('fecha', String(row.fechaSort))
      else if (row.fecha) fd.append('fecha', String(row.fecha))
      const verifyResult = await api.verificarComprobante(fd)
      if (!verifyResult?.ok || !verifyResult?.comprobante_url) {
        throw new Error('No se pudo guardar el comprobante corregido')
      }
      payload.comprobante_url = verifyResult.comprobante_url
    } catch (err) {
      saveError.value = err?.message || 'No se pudo subir el comprobante'
      return
    }
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

function selectView(id) {
  if (!canAccessView(id)) return
  activeView.value = id
  if (id === 'personal') {
    personalSubview.value = 'personal'
  }
  if (id === 'importaciones' && isAdminSession.value) {
    loadImportacionesLotes()
  }
}

async function onSaveGasto() {
  if (letrasDescripcion.value > 500) return
  if (!String(gasto.descripcion || '').trim()) {
    saveError.value = 'La descripción / observación es obligatoria.'
    return
  }
  if (
    gastoRequiereNumeroDocto.value &&
    !gasto.numero.trim() &&
    !canSkipComprobanteIa.value
  ) {
    saveError.value = `N° de documento es obligatorio para ${gasto.tipo}.`
    return
  }
  if (!gasto.cajaGroupKey) return
  if (!gastoComprobanteFile.value && !gastoComprobanteOpcional.value) {
    saveError.value = 'El comprobante es obligatorio. Adjunta PDF, PNG o JPG.'
    return
  }
  if (gastoRequiereTarjetaDigits.value) {
    const digits = String(gasto.tarjetaUltimos4 || '').replace(/\D/g, '')
    if (digits.length !== 4) {
      saveError.value = 'Ingresa los últimos 4 dígitos de la tarjeta.'
      return
    }
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
  pendingVerifyKind.value = 'gasto'
  pendingGastoSave = {
    caja_id: cajaId,
    trabajador_id: trabajadorId,
    fecha_documento: gasto.fecha,
    tipo_documento: gasto.tipo,
    numero_documento: gastoMuestraNumeroDocto.value
      ? gasto.numero.trim() || null
      : null,
    patente: gastoMuestraPatente.value ? normalizePatente(gasto.patente) || null : null,
    monto: montoNum,
    origen_pago: origenFromMetodo(
      gastoFuerzaEfectivo.value ? 'efectivo' : gasto.metodoPago
    ),
    tarjeta_id:
      gastoFuerzaEfectivo.value || gasto.metodoPago === 'efectivo'
        ? null
        : resolveTarjetaIdParaGasto(),
    descripcion: String(gasto.descripcion || '').trim()
  }
  if (!gastoComprobanteFile.value && gastoComprobanteOpcional.value) {
    try {
      await api.createRendicion({ ...pendingGastoSave, comprobante_url: null })
      pendingGastoSave = null
      await loadDashboardData()
      closeFormGasto()
    } catch (err) {
      saveError.value = err?.message || 'No se pudo guardar el gasto.'
    }
    return
  }
  await ejecutarVerificacionYGuardado()
}

function resetGastoFormFields() {
  gasto.tipo = 'Boleta'
  gasto.numero = ''
  gasto.patente = ''
  gasto.patenteDisplay = ''
  gasto.monto = ''
  gasto.metodoPago = 'efectivo'
  gasto.tarjetaUltimos4 = ''
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
  asignacion.trabajadorId = ''
  asignacion.doc = ''
  asignacion.observaciones = ''
  asignacion.monto = ''
  asignacion.numeroCuenta = ''
  asignacion.bancoOrigen = ''
  asignacion.comprobanteNombre = ''
  anticipoComprobanteFile.value = null
  if (anticipoFileInputEl.value) anticipoFileInputEl.value.value = ''
  anticipoTrabajadorQuery.value = ''
  anticipoTrabajadorOpen.value = false
  anticipoTrabajadorHighlight.value = 0
  bancoOrigenOpen.value = false
  bancoOrigenHighlight.value = 0
  numeroCuentaOpen.value = false
  numeroCuentaHighlight.value = 0
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
  const cajaId =
    findCajaIdByGroupKey(asignacion.fondo) || findCajaIdForGasto(asignacion.fondo)
  if (!asignacion.fondo || !cajaId) {
    saveError.value = 'Selecciona una caja con presupuesto para el mes activo.'
    return
  }
  if (!String(asignacion.fecha || '').trim()) {
    saveError.value = 'La fecha es obligatoria.'
    return
  }
  if (!asignacion.trabajadorId) {
    saveError.value = 'Selecciona un trabajador.'
    return
  }
  const codigoVale = String(asignacion.doc || '').trim()
  if (!codigoVale) {
    saveError.value = 'N° Doc / Vale es obligatorio.'
    return
  }
  const montoNum = parseMontoInput(asignacion.monto)
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    saveError.value = 'Ingresa un monto válido mayor a 0.'
    return
  }
  const cuenta = String(asignacion.numeroCuenta || '').replace(/\D/g, '')
  if (!cuenta) {
    saveError.value = 'Número de cuenta es obligatorio.'
    return
  }
  const banco = normalizeBancoOrigenInput(asignacion.bancoOrigen)
  if (!banco) {
    saveError.value = 'Banco origen es obligatorio.'
    return
  }
  if (!anticipoComprobanteFile.value) {
    saveError.value = 'El comprobante es obligatorio. Adjunta PDF, PNG o JPG.'
    return
  }
  const observacion = String(asignacion.observaciones || '').trim()
  if (!observacion) {
    saveError.value = 'Las observaciones / motivo son obligatorias.'
    return
  }
  if (observacion.length > 500 || letrasObservacionAnticipo.value > 500) {
    saveError.value = 'Las observaciones no pueden superar 500 caracteres.'
    return
  }

  saveError.value = ''
  pendingVerifyKind.value = 'anticipo'
  pendingAnticipoSave = {
    caja_id: cajaId,
    trabajador_id: Number(asignacion.trabajadorId),
    fecha: asignacion.fecha,
    monto: montoNum,
    observacion,
    codigo_vale: codigoVale,
    numero_cuenta: cuenta,
    banco_origen: banco
  }
  await ejecutarVerificacionYGuardado()
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

/** Personal actualmente asignado a la caja (N:M), sin duplicados. */
function listPersonalAsignadoACaja(caja) {
  const clave = caja?.groupKey || caja?.nombreInterior || ''
  if (!clave) return []
  const byId = new Map()

  for (const p of personal.value) {
    if (!(p.cajasAsignadas || []).includes(clave)) continue
    if (p.id == null || byId.has(Number(p.id))) continue
    byId.set(Number(p.id), {
      id: p.id,
      nombre: p.nombre || '-',
      rut: p.rut || ''
    })
  }
  for (const t of trabajadores.value) {
    if (!(t.cajasAsignadas || []).includes(clave)) continue
    if (t.id == null || byId.has(Number(t.id))) continue
    byId.set(Number(t.id), {
      id: t.id,
      nombre: t.nombre || '-',
      rut: t.rut || ''
    })
  }

  return [...byId.values()].sort((a, b) =>
    String(a.nombre).localeCompare(String(b.nombre), 'es')
  )
}

function countPersonalCaja(caja) {
  const fromList = listPersonalAsignadoACaja(caja).length
  if (fromList > 0) return fromList
  return Number(caja?.personalAsignado) || 0
}

function openModalPersonalCaja(caja) {
  if (!caja) return
  modalPersonalCaja.open = true
  modalPersonalCaja.cajaNombre = caja.displayName || caja.groupKey || 'Caja'
  modalPersonalCaja.cajaClave = caja.groupKey || ''
  modalPersonalCaja.lista = listPersonalAsignadoACaja(caja)
}

function closeModalPersonalCaja() {
  modalPersonalCaja.open = false
  modalPersonalCaja.cajaNombre = ''
  modalPersonalCaja.cajaClave = ''
  modalPersonalCaja.lista = []
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

function syncInformeResultado() {
  const ccLabel = labelCentroCobroInforme(filtrosInforme.centroCobroId)
  const cajaLabel = filtrosInforme.caja ? labelCajaGroup(filtrosInforme.caja) : 'Todas'
  const q = String(filtrosInforme.busqueda || '').trim()
  const busquedaLabel = q ? ` | Buscar: ${q}` : ''
  informeResultado.titulo = 'Cartola Consolidada del Mes'
  informeResultado.periodo = `Período: ${labelMesCerradoCompleto(filtrosInforme.mes)} | CC: ${ccLabel} | Caja: ${cajaLabel}${busquedaLabel}`
  informeResultado.total = `${cartolaFiltrada.value.length} Registros`
}

function onCartolaMesChange(event) {
  const mes = event?.target?.value || ''
  if (!mes) return
  filtrosInforme.mes = mes
  syncInformeResultado()
}

function onCartolaCcChange(event) {
  const ccId = event?.target?.value || ''
  filtrosInforme.centroCobroId = ccId
  const ok = cajasOpcionesCartola.value.some((c) => c.groupKey === filtrosInforme.caja)
  if (!ok) {
    filtrosInforme.caja = ''
  }
  syncInformeResultado()
}

function onCartolaCajaChange(event) {
  const caja = event?.target?.value || ''
  filtrosInforme.caja = caja
  syncInformeResultado()
}

function onCartolaBusquedaInput(event) {
  const q = event?.target?.value || ''
  filtrosInforme.busqueda = q
  syncInformeResultado()
}

function mapCartolaExportRows(rows) {
  return rows.map((row) => ({
    ...row,
    cajaGroupKey: labelCajaGroup(row.cajaGroupKey) || row.cajaGroupKey || '',
    cajaLabel: labelCajaGroup(row.cajaGroupKey) || row.cajaGroupKey || '',
    centroCobroNombre:
      row.centroCobroNombre || labelCentroCobroInforme(row.centroCobroId) || ''
  }))
}

function openExportCartolaModal() {
  exportCartolaModalFormat.value = 'excel'
  exportCartolaModalOpen.value = true
}

function closeExportCartolaModal() {
  exportCartolaModalOpen.value = false
}

function confirmExportCartola() {
  const rows = cartolaFiltrada.value
  if (!rows.length) {
    saveError.value = 'No hay registros visibles para exportar con los filtros actuales.'
    return
  }
  saveError.value = ''
  saveOk.value = ''
  const mes = String(filtrosInforme.mes || '').replace(/-/g, '') || 'mes'
  const mapped = mapCartolaExportRows(rows)
  const format = exportCartolaModalFormat.value === 'pdf' ? 'pdf' : 'excel'
  try {
    if (format === 'pdf') {
      exportarCartolaPdf(mapped, {
        periodo: informeResultado.periodo,
        totales: cartolaTotales.value,
        filename: `cartola_${mes}_${rows.length}reg.pdf`
      })
    } else {
      exportarCartolaVisible(mapped, {
        periodo: informeResultado.periodo,
        totales: cartolaTotales.value,
        filename: `cartola_${mes}_${rows.length}reg.xlsx`
      })
    }
    exportCartolaModalOpen.value = false
    saveOk.value = `Cartola exportada (${format.toUpperCase()}, ${rows.length} registros).`
  } catch (err) {
    console.error('[exportar cartola]', err)
    saveError.value = err?.message || 'No se pudo exportar la cartola.'
  }
}

function openImportModal() {
  importModalOpen.value = true
  importModalTipo.value = 'gastos'
  clearImportModalFile()
  importModalDragOver.value = false
}

function closeImportModal() {
  if (importExcelLoading.value) return
  importModalOpen.value = false
  clearImportModalFile()
  importModalDragOver.value = false
}

function setImportModalTipo(tipo) {
  if (tipo === importModalTipo.value) return
  importModalTipo.value = tipo
  clearImportModalFile()
}

async function descargarPlantillaImportModal() {
  try {
    if (importModalTipo.value === 'asignaciones') await descargarPlantillaAsignaciones()
    else await descargarPlantillaGastos()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo descargar la plantilla'
  }
}

function clearImportModalFile() {
  importModalFile.value = null
  if (importModalInputEl.value) importModalInputEl.value.value = ''
}

function isExcelImportFile(file) {
  if (!file) return false
  const name = String(file.name || '').toLowerCase()
  return name.endsWith('.xlsx') || name.endsWith('.xls')
}

function setImportModalFile(file) {
  if (!file) return
  if (!isExcelImportFile(file)) {
    saveError.value = 'Selecciona un archivo Excel (.xlsx o .xls).'
    return
  }
  importModalFile.value = file
  saveError.value = ''
}

function triggerImportModalFilePicker() {
  if (importExcelLoading.value) return
  if (importModalInputEl.value) {
    importModalInputEl.value.value = ''
    importModalInputEl.value.click()
  }
}

function onImportModalFileChange(event) {
  const file = event.target.files?.[0]
  if (file) setImportModalFile(file)
}

function onImportModalDragEnter() {
  importModalDragOver.value = true
}

function onImportModalDragOver() {
  importModalDragOver.value = true
}

function onImportModalDragLeave(event) {
  const related = event.relatedTarget
  if (related && event.currentTarget?.contains?.(related)) return
  importModalDragOver.value = false
}

function onImportModalDrop(event) {
  importModalDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) setImportModalFile(file)
}

function formatImportFileSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

async function submitImportModal() {
  const file = importModalFile.value
  if (!file || importExcelLoading.value) return
  const kind = importModalTipo.value === 'asignaciones' ? 'Asignaciones' : 'Gastos'
  importExcelLoading.value = true
  saveError.value = ''
  saveOk.value = ''
  try {
    const fd = new FormData()
    fd.append('archivo', file)
    const data =
      importModalTipo.value === 'asignaciones'
        ? await api.importAsignacionesExcel(fd)
        : await api.importRendicionesExcel(fd)
    await Promise.all([loadDashboardData(), loadImportacionesLotes()])
    const msg = formatImportResultMessage(kind, data)
    if (data?.errores?.length || data?.conflictos) saveError.value = msg
    else saveOk.value = msg
    if (data?.lote_id && data?.conflictos) {
      importLoteOpen[data.lote_id] = true
      await loadImportLoteDetalle(data.lote_id)
    }
    importModalOpen.value = false
    clearImportModalFile()
    importModalDragOver.value = false
  } catch (err) {
    const faltan = Array.isArray(err?.faltantes) && err.faltantes.length
      ? ` Faltan: ${err.faltantes.join(', ')}.`
      : ''
    saveError.value = `${err?.message || 'No se pudo importar el Excel.'}${faltan}`
  } finally {
    importExcelLoading.value = false
  }
}

function formatImportResultMessage(kind, data) {
  const ok = Number(data?.creados) || 0
  const errs = Array.isArray(data?.errores) ? data.errores : []
  const omitidos = Number(data?.omitidos) || 0
  const conflictos = Number(data?.conflictos) || 0
  let msg = `${kind}: ${ok} fila(s) importada(s).`
  if (omitidos) msg += ` ${omitidos} omitida(s) (duplicado idéntico).`
  if (conflictos) {
    msg += ` ${conflictos} conflicto(s) de N° documento: resuélvelos en el lote antes de confirmar.`
  }
  if (errs.length) {
    const sample = errs
      .slice(0, 5)
      .map((e) => `Fila ${e.fila}: ${e.error}`)
      .join(' · ')
    msg += ` ${errs.length} con error. ${sample}`
    if (errs.length > 5) msg += '…'
  }
  if (data?.lote_id) msg += ` (lote #${data.lote_id})`
  return msg
}

const CONFLICT_COMPARE_FIELDS = [
  { key: 'fecha_documento', label: 'Fecha' },
  { key: 'tipo_documento', label: 'Tipo' },
  { key: 'monto', label: 'Monto' },
  { key: 'origen_pago', label: 'Forma de pago' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'patente', label: 'Patente' },
  { key: 'trabajador_rut', label: 'RUT' },
  { key: 'caja', label: 'Caja' },
  { key: 'cc', label: 'CC' },
  { key: 'tarjeta_ultimos4', label: 'Tarjeta' }
]

function conflictFieldDisplay(side, key) {
  if (!side) return '—'
  const v = side[key]
  if (v == null || v === '') return '—'
  if (key === 'monto') return formatMontoCl(v)
  if (key === 'fecha_documento') return formatFechaCortaImport(v)
  return String(v)
}

function conflictCompareRows(conf) {
  const diffs = new Set(conf?.diferencias || [])
  const keyAlias = {
    trabajador_id: 'trabajador_rut',
    caja_id: 'caja',
    tarjeta_id: 'tarjeta_ultimos4'
  }
  return CONFLICT_COMPARE_FIELDS.map((f) => {
    const diffKeys = [f.key]
    for (const [canon, alias] of Object.entries(keyAlias)) {
      if (alias === f.key) diffKeys.push(canon)
    }
    return {
      key: f.key,
      label: f.label,
      existente: conflictFieldDisplay(conf?.existente, f.key),
      importado: conflictFieldDisplay(conf?.importado, f.key),
      diff: diffKeys.some((k) => diffs.has(k))
    }
  })
}

async function resolverConflictoLote(lote, conf, accion) {
  if (!lote?.id || !conf?.id || importConflictoResolviendo.value) return
  const key = `${lote.id}:${conf.id}`
  importConflictoResolviendo.value = key
  saveError.value = ''
  try {
    const data = await api.resolverConflictoImportacion(lote.id, {
      conflicto_id: conf.id,
      accion
    })
    importLoteDetalles[lote.id] = data
    const idx = importacionesLotes.value.findIndex((l) => l.id === lote.id)
    if (idx >= 0) {
      importacionesLotes.value[idx] = {
        ...importacionesLotes.value[idx],
        ...data,
        movimientos: undefined,
        filas_invalidas: undefined,
        filas_omitidas: undefined,
        filas_conflicto: undefined,
        errores: undefined,
        detalle_creados: undefined,
        conflictos: undefined,
        omitidos: undefined
      }
    }
    await loadDashboardData()
    saveOk.value = `Conflicto N° ${conf.numero_documento} resuelto (${accion.replace(/_/g, ' ')})`
  } catch (err) {
    saveError.value = err?.message || 'No se pudo resolver el conflicto'
  } finally {
    importConflictoResolviendo.value = null
  }
}

function labelTipoImportacion(tipo) {
  if (tipo === 'gastos') return 'Gastos'
  if (tipo === 'asignaciones') return 'Asignaciones'
  return tipo || '—'
}

function labelEstadoImportacion(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'pendiente') return 'Pendiente'
  if (e === 'confirmado') return 'Confirmado'
  if (e === 'anulado') return 'Anulado'
  return estado || '—'
}

function badgeClassEstadoImport(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'confirmado' || e === 'completo') return 'dash-badge--ok'
  if (e === 'pendiente' || e === 'parcial') return 'dash-badge--warn'
  if (e === 'fallido' || e === 'anulado') return 'dash-badge--danger'
  return 'dash-badge--neutral'
}

function badgeClassCalidadMov(calidad) {
  const c = String(calidad || '').toLowerCase()
  if (c === 'correcto') return 'dash-badge--ok'
  if (c === 'parcial') return 'dash-badge--warn'
  if (c === 'invalido') return 'dash-badge--danger'
  return 'dash-badge--neutral'
}

function formatFechaHoraImport(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('es-CL')
}

function formatFechaCortaImport(value) {
  if (!value) return '—'
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('es-CL')
}

function isImportLoteOpen(id) {
  return Boolean(importLoteOpen[id])
}

async function toggleImportLote(lote) {
  if (!lote?.id) return
  const next = !isImportLoteOpen(lote.id)
  importLoteOpen[lote.id] = next
  if (next && !importLoteDetalles[lote.id]) {
    await loadImportLoteDetalle(lote.id)
  }
}

async function loadImportLoteDetalle(loteId) {
  importLoteDetalleLoading[loteId] = true
  try {
    const data = await api.getImportacion(loteId)
    importLoteDetalles[loteId] = data
    // sincronizar contadores del listado
    const idx = importacionesLotes.value.findIndex((l) => l.id === loteId)
    if (idx >= 0) {
      importacionesLotes.value[idx] = {
        ...importacionesLotes.value[idx],
        ...data,
        movimientos: undefined,
        filas_invalidas: undefined,
        errores: undefined,
        detalle_creados: undefined
      }
    }
  } catch (err) {
    saveError.value = err?.message || 'No se pudo cargar el detalle del lote'
    importLoteOpen[loteId] = false
  } finally {
    importLoteDetalleLoading[loteId] = false
  }
}

async function refreshImportLoteDetalle(loteId) {
  if (!loteId) return
  await Promise.all([loadImportacionesLotes(), loadImportLoteDetalle(loteId)])
  if (importComprobanteModal.open && importComprobanteModal.lote?.id === loteId) {
    const det = importLoteDetalles[loteId]
    const movId = importComprobanteModal.mov?.id
    const mov = (det?.movimientos || []).find((m) => m.id === movId)
    if (mov) importComprobanteModal.mov = mov
    const lote = importacionesLotes.value.find((l) => l.id === loteId)
    if (lote) importComprobanteModal.lote = lote
  }
}

async function loadImportacionesLotes() {
  if (!isAdminSession.value) return
  importacionesLoading.value = true
  try {
    importacionesLotes.value = await api.listImportaciones()
  } catch (err) {
    saveError.value = err?.message || 'No se pudieron cargar las importaciones'
    importacionesLotes.value = []
  } finally {
    importacionesLoading.value = false
  }
}

function openConfirmarImportacion(lote) {
  if (!lote?.id || !lote.puede_confirmar) return
  importConfirmModal.open = true
  importConfirmModal.lote = lote
}

function closeConfirmarImportacion() {
  if (importacionConfirmandoId.value) return
  importConfirmModal.open = false
  importConfirmModal.lote = null
}

async function submitConfirmarImportacion() {
  const lote = importConfirmModal.lote
  if (!lote?.id) return
  importacionConfirmandoId.value = lote.id
  saveError.value = ''
  saveOk.value = ''
  try {
    const data = await api.confirmarImportacion(lote.id)
    importLoteDetalles[lote.id] = data
    await loadImportacionesLotes()
    saveOk.value = `Lote #${lote.id} confirmado.`
    importConfirmModal.open = false
    importConfirmModal.lote = null
  } catch (err) {
    saveError.value = err?.message || 'No se pudo confirmar el lote'
  } finally {
    importacionConfirmandoId.value = null
  }
}

async function onAnularImportacion(lote) {
  if (!lote?.id || !lote.puede_anular) return
  const tipo = labelTipoImportacion(lote.tipo)
  const n = Number(lote.creados) || 0
  const esConfirmado = String(lote.estado || '').toLowerCase() === 'confirmado'
  const msg = esConfirmado
    ? `LOTE CONFIRMADO\n\nEsto anulará el lote #${lote.id} (${tipo}) y sus ${n} movimiento(s) (soft-delete).\nLos registros dejarán de aparecer en saldos y listados.\n\n¿Continuar?`
    : `¿Anular el lote #${lote.id} (${tipo})?\nSe eliminarán (soft-delete) los ${n} registro(s) creados por esta importación.`
  if (!confirm(msg)) {
    return
  }
  importacionAnulandoId.value = lote.id
  saveError.value = ''
  saveOk.value = ''
  try {
    const data = await api.anularImportacion(lote.id)
    delete importLoteDetalles[lote.id]
    importLoteOpen[lote.id] = false
    await Promise.all([loadImportacionesLotes(), loadDashboardData()])
    saveOk.value = `Lote #${lote.id} anulado. ${data?.anulados ?? 0} registro(s) eliminados.`
  } catch (err) {
    saveError.value = err?.message || 'No se pudo anular el lote'
  } finally {
    importacionAnulandoId.value = null
  }
}

function puedeSubirComprobanteImport({ lote, mov } = {}) {
  if (!lote || !mov) return false
  if (lote.estado === 'anulado' || lote.is_deleted) return false
  const tiene = Boolean(String(mov.comprobante_url || '').trim())
  if (lote.estado === 'confirmado') return !tiene
  // pendiente: subir o reemplazar
  return true
}

function openImportComprobanteModal(lote, mov) {
  if (!lote || !mov) return
  importComprobanteModal.open = true
  importComprobanteModal.lote = lote
  importComprobanteModal.mov = mov
}

function closeImportComprobanteModal() {
  if (importComprobanteUploading.value) return
  importComprobanteModal.open = false
  importComprobanteModal.lote = null
  importComprobanteModal.mov = null
}

function triggerImportComprobantePicker() {
  if (!puedeSubirComprobanteImport(importComprobanteModal)) return
  if (importComprobanteInputEl.value) {
    importComprobanteInputEl.value.value = ''
    importComprobanteInputEl.value.click()
  }
}

function mapImportMovToAttachRow(lote, mov) {
  if (lote?.tipo === 'asignaciones') {
    return {
      id: mov.id,
      monto: mov.monto,
      cajaId: mov.caja_id,
      trabajadorId: mov.trabajador_id,
      fechaSort: mov.fecha,
      comprobanteNombre: mov.comprobante_url || '',
      legacy: true
    }
  }
  return {
    id: mov.id,
    monto: mov.monto,
    tipoDocumento: mov.tipo_documento,
    numeroDocumento: mov.numero_documento,
    cajaId: mov.caja_id,
    trabajadorId: mov.trabajador_id,
    fechaSort: mov.fecha_documento,
    comprobanteNombre: mov.comprobante_url || '',
    legacy: true
  }
}

async function onImportComprobanteFileChange(event) {
  const file = event.target.files?.[0] || null
  if (event.target) event.target.value = ''
  const { lote, mov } = importComprobanteModal
  if (!file || !lote || !mov?.id) return
  if (!puedeSubirComprobanteImport(importComprobanteModal)) {
    saveError.value = 'No se puede subir comprobante en este estado del lote.'
    return
  }

  importComprobanteUploading.value = true
  saveError.value = ''
  try {
    const kind = lote.tipo === 'asignaciones' ? 'anticipo' : 'gasto'
    const row = mapImportMovToAttachRow(lote, mov)
    pendingLegacyAttach.value = { kind, row }
    pendingImportLoteRefreshId.value = lote.id
    if (kind === 'anticipo') {
      anticipoComprobanteFile.value = file
      pendingVerifyKind.value = 'anticipo-adjunto'
    } else {
      gastoComprobanteFile.value = file
      pendingVerifyKind.value = 'gasto-adjunto'
    }
    await ejecutarVerificacionYGuardado()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo subir el comprobante'
    pendingImportLoteRefreshId.value = null
  } finally {
    importComprobanteUploading.value = false
  }
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

async function onSoftDeleteRendicion(row) {
  if (!puedeSoftDeleteAdmin(row)) return
  if (
    !confirm(
      `¿Eliminar la rendición ${row.rinde}? (soft delete, solo dentro de 24 h desde Subido el)`
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

async function onHardDeleteRendicion(row) {
  if (!canDevForceDelete.value || !row?.id || esLegacyHistorico(row)) return
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

async function onSoftDeleteAnticipo(row) {
  if (!puedeSoftDeleteAdmin(row)) return
  if (
    !confirm(
      `¿Eliminar la asignación ${row.doc}? (soft delete, solo dentro de 24 h desde Subido el)`
    )
  ) {
    return
  }
  try {
    saveError.value = ''
    await api.deleteAnticipo(row.id)
    await loadDashboardData()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo eliminar la asignación'
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
  modalPersonal.esAdmin = false
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
  modalPersonal.esAdmin = Boolean(p.esAdmin)
  modalPersonal.rut = formatRut(p.rut || '')
  modalPersonal.nombre = sanitizeTextoLibre(p.nombre || '')
  modalPersonal.cargo = sanitizeTextoLibre(p.cargo === '-' ? '' : p.cargo || '')
  modalPersonal.cajas = [...(p.cajasAsignadas || [])]
  modalPersonal.crearUsuario = Boolean(p.usuarioId) && !p.esAdmin
  modalPersonal.correo = p.correo || ''
  modalPersonal.rol = p.usuarioRol || 'USER_RENDIDOR'
  modalPersonal.estado =
    p.usuarioEstado === 'inactivo' || p.accesoKind === 'inactivo' ? 'inactivo' : 'activo'
  modalPersonal.passType = p.usuarioId ? 'keep' : 'rut'
  modalPersonal.password = ''
  modalPersonal.error = ''
}

function openModalPersonalCrearUsuario(p) {
  if (!canEditPersonal.value || !p?.id || p.esAdmin || !p.puedeCrearUsuarioNormal) return
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

  const crearUsuario = Boolean(modalPersonal.crearUsuario) && !modalPersonal.esAdmin
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
    nombre_completo: sanitizeTextoLibre(modalPersonal.nombre).trim(),
    cargo: sanitizeTextoLibre(modalPersonal.cargo).trim() || null,
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
    return 'Super Admin - Dev (Acceso Total + Eliminación)'
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
    const payload = {
      correo: modalEditAdmin.correo.trim(),
      estado: modalEditAdmin.estado,
      nombre: modalEditAdmin.nombre.trim()
    }
    // No permitir cambiar hacia/desde Super Admin - Dev desde la UI
    if (!isEditingSuperAdminDev.value) {
      payload.rol = rolApiFromUi(shortAdminRol(modalEditAdmin.rol))
    }
    await api.updateUsuario(modalEditAdmin.id, payload)
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
  tarjetaForm.titular = sanitizeTextoLibre(t.titular === '-' ? '' : t.titular || '')
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
  if (adminForm.rol.includes('Dev')) return
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

/** Letras, números, espacios, / y - ; máx. configurable (default 100). */
function sanitizeTextoLibre(value, maxLen = 100) {
  return String(value || '')
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9 /\-]/g, '')
    .slice(0, maxLen)
}

function onGastoDescripcionInput(event) {
  gasto.descripcion = sanitizeTextoLibre(event.target.value, 500)
}

function onAnticipoObservacionInput(event) {
  asignacion.observaciones = sanitizeTextoLibre(event.target.value, 500)
}

function normalizeBancoOrigenInput(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 120)
}

function onAsignacionCuentaInput(event) {
  asignacion.numeroCuenta = String(event.target.value || '')
    .replace(/\D/g, '')
    .slice(0, 40)
  numeroCuentaOpen.value = true
  numeroCuentaHighlight.value = 0
  const match = cuentasBanco.value.find((c) => c.numeroCuenta === asignacion.numeroCuenta)
  if (match) {
    asignacion.bancoOrigen = match.banco
  }
}

const numeroCuentaSugerencias = computed(() => {
  const q = String(asignacion.numeroCuenta || '')
  const ccId = cajaSeleccionada.value?.centroCobroId
  let list = [...cuentasBanco.value]
  if (ccId != null && ccId !== '') {
    // Prioriza cuentas del mismo CC; incluye sin CC (legado) al final
    const same = []
    const sinCc = []
    for (const c of list) {
      if (c.centroCobroId == null || c.centroCobroId === '') sinCc.push(c)
      else if (Number(c.centroCobroId) === Number(ccId)) same.push(c)
    }
    list = [...same, ...sinCc]
  }
  if (!q) return list.slice(0, 12)
  return list.filter((c) => c.numeroCuenta.includes(q)).slice(0, 12)
})

const cuentaCatalogoMatch = computed(() => {
  const q = String(asignacion.numeroCuenta || '')
  if (!q) return null
  return cuentasBanco.value.find((c) => c.numeroCuenta === q) || null
})

function onNumeroCuentaFocus(e) {
  numeroCuentaOpen.value = true
  numeroCuentaHighlight.value = 0
  e?.target?.select?.()
}

function highlightNumeroCuenta(delta) {
  const n = numeroCuentaSugerencias.value.length
  if (!n) return
  numeroCuentaOpen.value = true
  numeroCuentaHighlight.value = (numeroCuentaHighlight.value + delta + n) % n
}

function confirmNumeroCuentaHighlight() {
  const opt = numeroCuentaSugerencias.value[numeroCuentaHighlight.value]
  if (opt) selectNumeroCuenta(opt)
}

function selectNumeroCuenta(cuenta) {
  if (!cuenta) return
  asignacion.numeroCuenta = cuenta.numeroCuenta
  asignacion.bancoOrigen = cuenta.banco
  numeroCuentaOpen.value = false
  numeroCuentaHighlight.value = 0
}

function onNumeroCuentaBlur() {
  setTimeout(() => {
    numeroCuentaOpen.value = false
  }, 120)
}

const bancoOrigenSugerencias = computed(() => {
  const q = normalizeBancoOrigenInput(asignacion.bancoOrigen)
  const list = [...bancosOrigen.value]
  if (!q) return list.slice(0, 12)
  return list.filter((b) => b.includes(q)).slice(0, 12)
})

function onBancoOrigenFocus(e) {
  bancoOrigenOpen.value = true
  bancoOrigenHighlight.value = 0
  e?.target?.select?.()
}

function onBancoOrigenInput(event) {
  asignacion.bancoOrigen = normalizeBancoOrigenInput(event.target.value)
  bancoOrigenOpen.value = true
  bancoOrigenHighlight.value = 0
}

function highlightBancoOrigen(delta) {
  const n = bancoOrigenSugerencias.value.length
  if (!n) return
  bancoOrigenOpen.value = true
  bancoOrigenHighlight.value = (bancoOrigenHighlight.value + delta + n) % n
}

function confirmBancoOrigenHighlight() {
  const opt = bancoOrigenSugerencias.value[bancoOrigenHighlight.value]
  if (opt) selectBancoOrigen(opt)
}

function selectBancoOrigen(nombre) {
  asignacion.bancoOrigen = normalizeBancoOrigenInput(nombre)
  bancoOrigenOpen.value = false
  bancoOrigenHighlight.value = 0
}

function onBancoOrigenBlur() {
  setTimeout(() => {
    bancoOrigenOpen.value = false
    asignacion.bancoOrigen = normalizeBancoOrigenInput(asignacion.bancoOrigen)
  }, 120)
}

function onComentarioAdminInput(event) {
  modalResponder.comentario = sanitizeTextoLibre(event.target.value, 500)
}

function onCorregirDescripcionInput(event) {
  modalCorregir.descripcion = sanitizeTextoLibre(event.target.value, 500)
}

function onCorregirRespuestaInput(event) {
  modalCorregir.respuesta = sanitizeTextoLibre(event.target.value, 500)
}

function onPersonalNombreInput(event) {
  modalPersonal.nombre = sanitizeTextoLibre(event.target.value)
}

function onPersonalCargoInput(event) {
  modalPersonal.cargo = sanitizeTextoLibre(event.target.value)
}

function onTarjetaTitularInput(event) {
  tarjetaForm.titular = sanitizeTextoLibre(event.target.value)
}

async function onSaveTarjeta() {
  if (!tarjetaForm.alias.trim() || !tarjetaForm.ultimos4.trim()) return
  try {
    saveError.value = ''
    const titular = sanitizeTextoLibre(tarjetaForm.titular).trim()
    const payload = {
      alias: tarjetaForm.alias.trim(),
      tipo: tarjetaForm.tipo === 'Débito' ? 'Debito' : 'Credito',
      ultimos_digitos: tarjetaForm.ultimos4.trim(),
      banco: tarjetaForm.banco.trim() || null,
      titular_nombre: titular || null,
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

function toggleFormCuentaBanco() {
  if (cuentaBancoFormOpen.value) {
    closeFormCuentaBanco()
    return
  }
  resetCuentaBancoForm()
  cuentaBancoFormOpen.value = true
}

function resetCuentaBancoForm() {
  cuentaBancoForm.editId = null
  cuentaBancoForm.centroCobroId = ''
  cuentaBancoForm.numeroCuenta = ''
  cuentaBancoForm.banco = ''
}

function closeFormCuentaBanco() {
  cuentaBancoFormOpen.value = false
  resetCuentaBancoForm()
}

function onCuentaBancoNumeroInput(event) {
  cuentaBancoForm.numeroCuenta = String(event.target.value || '')
    .replace(/\D/g, '')
    .slice(0, 40)
}

function onCuentaBancoBancoInput(event) {
  cuentaBancoForm.banco = normalizeBancoOrigenInput(event.target.value)
}

function onEditCuentaBanco(c) {
  cuentaBancoForm.editId = c.id
  cuentaBancoForm.centroCobroId = c.centroCobroId || ''
  cuentaBancoForm.numeroCuenta = c.numeroCuenta || ''
  cuentaBancoForm.banco = c.banco || ''
  cuentaBancoFormOpen.value = true
}

async function onDeleteCuentaBanco(c) {
  if (!canHardDelete.value || !c?.id) return
  if (!confirm(`¿Eliminar la cuenta ${c.numeroCuenta} (${c.banco})?`)) return
  try {
    saveError.value = ''
    await api.deleteCuentaBanco(c.id)
    await loadDashboardData()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo eliminar la cuenta'
  }
}

async function onSaveCuentaBanco() {
  const numero = String(cuentaBancoForm.numeroCuenta || '').replace(/\D/g, '')
  const banco = normalizeBancoOrigenInput(cuentaBancoForm.banco)
  const centroCobroId = Number(cuentaBancoForm.centroCobroId)
  if (!numero || !banco) {
    saveError.value = 'Número de cuenta y banco son obligatorios.'
    return
  }
  if (!Number.isFinite(centroCobroId) || centroCobroId <= 0) {
    saveError.value = 'Centro de cobro (CC) es obligatorio.'
    return
  }
  try {
    saveError.value = ''
    const payload = {
      numero_cuenta: numero,
      banco,
      centro_cobro_id: centroCobroId
    }
    if (cuentaBancoForm.editId) {
      await api.updateCuentaBanco(cuentaBancoForm.editId, payload)
    } else {
      await api.createCuentaBanco(payload)
    }
    await loadDashboardData()
    closeFormCuentaBanco()
  } catch (err) {
    saveError.value = err?.message || 'No se pudo guardar la cuenta de banco'
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
