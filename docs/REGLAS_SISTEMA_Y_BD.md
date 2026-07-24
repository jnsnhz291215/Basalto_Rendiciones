# Reglas del Sistema y Base de Datos — Basalto Rendiciones / Caja Chica

Documento de referencia para arquitectura, auth, modelo de datos y persistencia. Mantener actualizado cuando se acuerden nuevas reglas de negocio o técnicas.

---

## 1. Autenticación y JWT aislado

La emisión y validación de tokens JWT del módulo **Rendiciones / Caja Chica** es **independiente** de la lógica de turnos (u otros módulos Basalto).

### Login

- `POST /api/auth/login`
- Valida `correo` **o** `rut` + `password_hash` contra la tabla `usuarios` (MariaDB).
- Emite JWT firmado con clave propia: `JWT_SECRET_RENDICIONES`.

### Payload JWT (mínimo)

| Claim | Descripción |
|-------|-------------|
| `id` | ID de `usuarios` |
| `trabajador_id` | FK a `trabajadores` (nullable si el admin no tiene ficha) |
| `rol` | `SUPER_ADMIN_DEV` \| `SUPER_ADMIN` \| `ADMIN_CAJA` \| `USER_RENDIDOR` |
| `exp` | Expiración |
| `iss` / `aud` | Namespaced al módulo de rendiciones (recomendado) |

### Middleware

- `authMiddleware` protege todas las rutas del módulo.
- Verifica el token y restringe endpoints según rol.
- **No** reutiliza ni confía en el JWT de turnos.

### Endpoints auth

| Ruta | Uso |
|------|-----|
| `POST /api/auth/login` | Login |
| `GET /api/auth/me` | Hidratar sesión / perfil (recomendado) |

### Roles

| Rol | Alcance típico |
|-----|----------------|
| Super Admin - Dev | Acceso total del módulo, operaciones sensibles de desarrollo |
| Super Admin | Crea Admin de Caja; no crea Super Admins |
| Admin Caja | Caja, rendiciones, anticipos, usuarios rendidores, trabajadores |
| Usuario Rendidor | Declaración y seguimiento de sus propios gastos |

---

## 2. Soft Delete obligatorio

### Marco normativo (Chile)

| Norma | Implicancia |
|-------|-------------|
| **Ley N° 21.719** (Protección de Datos Personales) | Derecho de supresión de datos personales. |
| **Código Tributario y SII** | Conservar registros contables, comprobantes, rendiciones y facturas **mínimo 6 años**. Eliminación física de registros financieros/contables **prohibida**. |

### Regla técnica

1. **Cero `DELETE` SQL** en controladores de negocio.
2. “Eliminar” = soft delete:

```sql
UPDATE tabla
SET is_deleted = TRUE, deleted_at = NOW()
WHERE id = ?;
```

3. Toda lectura operativa incluye `WHERE is_deleted = FALSE` (o equivalente en el ORM).
4. Campos en **todas** las tablas de negocio: `is_deleted` (bool), `deleted_at` (timestamp TZ, nullable). Opcional: `deleted_by`.
5. **`audit_logs` no se soft-deletea** ni se altera retroactivamente.
6. Cada soft delete deja traza en el Audit Log (quién, qué, cuándo).

---

## 3. Arrastre automático

Al registrar un gasto (`POST /api/rendiciones`):

1. El backend recibe `fecha_documento` y la `caja_id` (presupuesto con `mes_asignado`, ej. `2026-07`).
2. Si el **mes/año del documento** es **menor** al `mes_asignado` de la caja → calcula y guarda en `arrastre_mes` el texto inmutable, ej. `"Arrastre (Junio)"`.
3. Si es el mismo mes (o posterior no esperado) → `arrastre_mes = NULL`.
4. “Subido el” = `created_at` del registro (fecha/hora de inserción en servidor). **No** lo inventa el cliente.

> **Fuente de verdad:** el front muestra `arrastre_mes` y `created_at` que vienen del API; no recalcula arrastre en UI.

---

## 4. Auditoría inmutable (Audit Log)

Helper centralizado: `registrarAuditoria(...)`.

Se invoca al **crear**, **modificar** o **eliminar (soft)** cajas, gastos, anticipos, usuarios, trabajadores, tarjetas, etc., e idealmente en **LOGIN**.

Campos típicos insertados en `audit_logs`:

| Campo | Ejemplo |
|-------|---------|
| `usuario_id` / `usuario_nombre` | Actor |
| `accion` | `CREAR`, `MODIFICAR`, `ELIMINAR`, `LOGIN` |
| `modulo` | `Gastos`, `Admin Users`, `Anticipos`, … |
| `detalle` | Texto del cambio (antes → después) |
| `created_at` | Timestamp del evento |

---

## 5. Mapa de endpoints (API REST)

| Prefijo | Responsabilidad |
|---------|-----------------|
| `/api/auth` | Login, me, validación de token |
| `/api/cajas` | Cajas / presupuestos mensuales (`clave_interna` + `mes_asignado`) |
| `/api/rendiciones` | Gastos, comprobantes, filtros, estados de devolución |
| `/api/anticipos` | Vales / fondos a conductores |
| `/api/reportes` | Cartola por **mes cerrado**, import/export |
| `/api/admin` | Trabajadores, usuarios, tarjetas, asignación de cajas, audit_logs |

Reportes: filtro por **mes cerrado** (1 al último día del mes), no rango libre “desde/hasta”.

---

## 6. Modelo de tablas (MariaDB)

Todas las tablas de negocio (salvo `audit_logs`) incluyen `is_deleted` + `deleted_at`.

### 6.1 `trabajadores` — Base de personal

**Propósito:** Directorio general (conductores, mecánicos, operadores). No todos necesitan login; muchos solo reciben anticipos o rinden vía admin.

| Campo | Notas |
|-------|--------|
| `id` | PK |
| `rut` | Único |
| `nombre_completo` | |
| `cargo` | |

**Validación:** Correcto y alineado con la UI (nómina + anticipos sin usuario).

**Falta respecto a la UI actual:** relación de **cajas asignadas** al trabajador (al rendir “por su cuenta” solo ve esas cajas). Ver §6.8.

---

### 6.2 `usuarios` — Credenciales

**Propósito:** Quién puede iniciar sesión.

| Campo | Notas |
|-------|--------|
| `id` | PK |
| `trabajador_id` | FK → `trabajadores` (**nullable** para admins sin ficha operativa) |
| `rut` / `correo` | Login |
| `password_hash` | |
| `rol` | `SUPER_ADMIN_DEV`, `SUPER_ADMIN`, `ADMIN_CAJA`, `USER_RENDIDOR` |

**Validación:** Correcto. Un usuario rendidor **debe** tener `trabajador_id`. Un Super Admin puede no tener ficha de faena → `trabajador_id` opcional.

---

### 6.3 `cajas_chicas` — Presupuestos mensuales

**Propósito:** Cada fila = caja de **un mes** para una faena/grupo.

| Campo | Notas |
|-------|--------|
| `id` | PK |
| `clave_interna` | Agrupador inmutable (ej. `FAENA_NORTE`) |
| `nombre_exterior` | Texto libre visible (ej. “caja pagos x mes julio”) |
| `mes_asignado` | `YYYY-MM` |
| `fondo_estimado_mes` | |
| `centro_costo` | Opcional |
| `responsable_id` | FK → `trabajadores` |
| `estado` | `activa` / `inactiva` |

**Lógica:** Misma `clave_interna` + distinto `mes_asignado` = otro presupuesto mensual; reportes anuales agrupan por `clave_interna`.

**Validación:** Correcto y alineado con Gestión de Cajas.

**Unique sugerido:** (`clave_interna`, `mes_asignado`) donde `is_deleted = false`.

---

### 6.4 `tarjetas_empresa` — Tarjetas corporativas

**Propósito:** Catálogo de tarjetas de la empresa.

| Campo | Notas |
|-------|--------|
| `alias`, `tipo`, `ultimos_digitos`, `banco`, `titular_nombre` | |
| `estado` | Activa / … |

**Validación:** Tabla OK para el módulo Admin → Tarjetas.

**Inconsistencia a resolver con la UI (feedback vigente):**

| En schema propuesto | En UI actual |
|---------------------|--------------|
| `origen_pago`: Efectivo / Tarjeta Personal / Tarjeta Empresa | Solo **Efectivo**, **Débito**, **Crédito** |

**Recomendación:**  
- `origen_pago` enum: `efectivo` \| `debito` \| `credito`.  
- `tarjeta_id` opcional solo si en el futuro se vuelve a vincular tarjeta corporativa; hoy el front no exige elegir tarjeta empresa en el ingreso de gasto.  
- Mantener `tarjetas_empresa` como maestro administrativo aunque no mueva el origen de pago hasta que se defina de nuevo.

---

### 6.5 `rendiciones_gastos` — Gastos

| Campo | Notas |
|-------|--------|
| `fecha_documento` | Fecha de la boleta/factura |
| `created_at` | “Subido el” |
| `arrastre_mes` | Texto inmutable o `NULL` |
| `origen_pago` | Ver §6.4 — preferir Efectivo/Débito/Crédito |
| `caja_id` | FK → `cajas_chicas` |
| `trabajador_id` | FK → `trabajadores` |
| `tarjeta_id` | Opcional |
| `tipo_docto` | Boleta / Factura / Ticket Peaje / … |
| `numero_docto` | **Solo obligatorio si Factura**; nullable en resto |
| `monto`, `descripcion`, `comprobante_url` | |
| `estado` | Ej. `SIN_DEVOLUCION`, `DEVUELTO`, `POR_CORREGIR`, `RECHAZADO`, `APROBADO` |
| `rinde_codigo` / `codigo_rinde` | ID visible tipo `R-103` |
| — | **Sin** flag legacy: los migrados van a `rendiciones_legacy` (§6.9 / §8) |

**Validación:** Núcleo correcto. Completar campos de docto, monto, estado y comprobante que ya usa la UI. N° docto solo para Factura.

---

### 6.6 `anticipos` — Vales / fondos

| Campo | Notas |
|-------|--------|
| `codigo_vale` | Ej. `V-5541` |
| `fecha` | Sin hora en UI |
| `monto`, `observacion`, `comprobante_url` | Adjunto opcional |
| `caja_id`, `trabajador_id` | FKs |

**Validación:** Correcto. **No** modelar patente / tipo vehículo / hora (quitados del producto).

---

### 6.7 `audit_logs` — Historial inmutable

| Campo | Notas |
|-------|--------|
| `usuario_id`, `usuario_nombre` | |
| `accion` | `CREAR`, `MODIFICAR`, `ELIMINAR`, `LOGIN` |
| `modulo`, `detalle`, `created_at` | |
| — | **Sin** `is_deleted` |

**Validación:** Correcto. Sin columna IP (quitada de la UI).

---

### 6.8 `trabajador_cajas` — N:M trabajador ↔ clave interna

Incluida en el DDL canónico (§8). Asigna por `clave_interna` (no por mes).

---

### 6.9 `rendiciones_legacy` — Histórico migrado (tabla aparte)

**Por qué no un flag `es_legacy` en `rendiciones_gastos`:** las planillas antiguas suelen venir incompletas o con columnas distintas; forzarlas en la tabla nueva rompe validaciones (`NOT NULL`, ENUMs, FKs).

**Reglas:**

- Solo lectura en UI (badge Legacy / “Solo lectura”).
- Campos mayormente **nullable**.
- Nombres textuales de respaldo (`caja_nombre_legacy`, `trabajador_nombre_legacy`) si no hay match a FK.
- `datos_extra` JSON para columnas raras de la planilla.
- Soft delete permitido; no se editan como rendiciones operativas.
- El historial de gastos en API puede hacer `UNION` o endpoint separado; el front distingue origen `legacy` vs `operativo`.

---

## 7. Checklist de coherencia UI ↔ BD

| Regla de producto | ¿Cubierta en DDL actual? |
|-------------------|--------------------------|
| JWT aislado de turnos | Sí (capa API) |
| Soft delete (salvo audit) | Sí |
| Arrastre + Subido el = `created_at` | Sí |
| Trabajador sin usuario | Sí |
| Usuario ↔ trabajador nullable | Sí |
| Caja = clave_interna + mes | Sí (falta UNIQUE compuesto — ver §8.1) |
| Anticipo sin patente/hora/tipo | Sí |
| Audit sin IP / sin soft delete | Sí |
| Origen pago Efectivo/Débito/Crédito | Sí |
| N° docto nullable (Factura en backend) | Sí |
| Asignar cajas al trabajador | Sí (`trabajador_cajas`) |
| Rol Super Admin (no Dev) | Sí |
| Estados Aprobado / Rechazado | Sí |
| Datos legacy / migrados | Sí (tabla `rendiciones_legacy`, sin `es_legacy` en gastos) |
| UNIQUE (`clave_interna`, `mes_asignado`) | Sí |

---

## 8. DDL canónico (MariaDB) — creado 2026-07-24

Esquema aplicado / de referencia. Ajustes pendientes en §8.1.

```sql
-- 1. TRABAJADORES
CREATE TABLE trabajadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    cargo VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. ASIGNACIÓN N:M (TRABAJADOR <-> CAJAS POR CLAVE INTERNA)
CREATE TABLE trabajador_cajas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trabajador_id INT NOT NULL,
    clave_interna VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tc_trabajador FOREIGN KEY (trabajador_id) REFERENCES trabajadores(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_trabajador_clave (trabajador_id, clave_interna)
) ENGINE=InnoDB;

-- 3. USUARIOS
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trabajador_id INT NULL,
    rut VARCHAR(12) UNIQUE NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('SUPER_ADMIN_DEV', 'SUPER_ADMIN', 'ADMIN_CAJA', 'USER_RENDIDOR') NOT NULL,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_trabajador FOREIGN KEY (trabajador_id) REFERENCES trabajadores(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. CAJAS CHICAS
CREATE TABLE cajas_chicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave_interna VARCHAR(50) NOT NULL,
    nombre_exterior VARCHAR(150) NOT NULL,
    centro_costo VARCHAR(100) NOT NULL,
    responsable_id INT NULL,
    mes_asignado VARCHAR(7) NOT NULL,
    fondo_estimado_mes DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    estado ENUM('activa', 'inactiva') DEFAULT 'activa',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cajas_responsable FOREIGN KEY (responsable_id) REFERENCES trabajadores(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_caja_clave_mes (clave_interna, mes_asignado)
) ENGINE=InnoDB;

-- 5. TARJETAS CORPORATIVAS
CREATE TABLE tarjetas_empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alias VARCHAR(100) NOT NULL,
    tipo ENUM('Credito', 'Debito') NOT NULL,
    ultimos_digitos VARCHAR(4) NOT NULL,
    banco VARCHAR(100),
    titular_nombre VARCHAR(150),
    estado ENUM('activa', 'inactiva') DEFAULT 'activa',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. RENDICIONES DE GASTOS
CREATE TABLE rendiciones_gastos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_rinde VARCHAR(20) UNIQUE NOT NULL,
    caja_id INT NOT NULL,
    trabajador_id INT NOT NULL,
    fecha_documento DATE NOT NULL,
    tipo_documento ENUM('Boleta', 'Factura', 'Ticket Peaje', 'Otro') NOT NULL,
    numero_documento VARCHAR(50) NULL,
    monto DECIMAL(12, 2) NOT NULL,
    origen_pago ENUM('Efectivo', 'Debito', 'Credito') NOT NULL,
    tarjeta_id INT NULL,
    comprobante_url TEXT NULL,
    descripcion TEXT NULL,
    estado ENUM('Sin Devolución', 'Devuelto', 'Por Corregir', 'Aprobado', 'Rechazado')
        DEFAULT 'Sin Devolución',
    arrastre_mes VARCHAR(30) DEFAULT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rendiciones_caja FOREIGN KEY (caja_id) REFERENCES cajas_chicas(id) ON DELETE RESTRICT,
    CONSTRAINT fk_rendiciones_trabajador FOREIGN KEY (trabajador_id) REFERENCES trabajadores(id) ON DELETE RESTRICT,
    CONSTRAINT fk_rendiciones_tarjeta FOREIGN KEY (tarjeta_id) REFERENCES tarjetas_empresa(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 6b. RENDICIONES LEGACY (migradas / planillas antiguas)
CREATE TABLE rendiciones_legacy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_original VARCHAR(50) NULL,
    caja_id INT NULL,
    caja_nombre_legacy VARCHAR(150) NULL,
    trabajador_id INT NULL,
    trabajador_nombre_legacy VARCHAR(150) NULL,
    fecha_documento DATE NULL,
    tipo_documento VARCHAR(50) NULL,
    numero_documento VARCHAR(50) NULL,
    monto DECIMAL(12, 2) NULL,
    origen_pago VARCHAR(50) NULL,
    descripcion TEXT NULL,
    estado VARCHAR(50) NULL,
    datos_extra JSON NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_legacy_caja FOREIGN KEY (caja_id) REFERENCES cajas_chicas(id) ON DELETE SET NULL,
    CONSTRAINT fk_legacy_trabajador FOREIGN KEY (trabajador_id) REFERENCES trabajadores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. ANTICIPOS
CREATE TABLE anticipos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_vale VARCHAR(20) NOT NULL,
    caja_id INT NOT NULL,
    trabajador_id INT NOT NULL,
    fecha DATE NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    observacion TEXT NULL,
    comprobante_url TEXT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_anticipos_caja FOREIGN KEY (caja_id) REFERENCES cajas_chicas(id) ON DELETE RESTRICT,
    CONSTRAINT fk_anticipos_trabajador FOREIGN KEY (trabajador_id) REFERENCES trabajadores(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 8. AUDIT LOGS (sin soft delete)
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    usuario_nombre VARCHAR(150),
    accion ENUM('CREAR', 'MODIFICAR', 'ELIMINAR', 'LOGIN') NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    detalle TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_cajas_clave_mes ON cajas_chicas(clave_interna, mes_asignado);
CREATE INDEX idx_rendiciones_caja ON rendiciones_gastos(caja_id);
CREATE INDEX idx_anticipos_caja ON anticipos(caja_id);
CREATE INDEX idx_rendiciones_trabajador ON rendiciones_gastos(trabajador_id);
CREATE INDEX idx_trabajador_cajas_clave ON trabajador_cajas(clave_interna);
```

**Índices adicionales aplicados (2026-07-24):**

```sql
-- Rendiciones: filtros por trabajador + soft delete, y por fecha documento
CREATE INDEX idx_rendiciones_trabajador ON rendiciones_gastos(trabajador_id, is_deleted);
CREATE INDEX idx_rendiciones_fecha ON rendiciones_gastos(fecha_documento);

-- Anticipos: por conductor + soft delete
CREATE INDEX idx_anticipos_trabajador ON anticipos(trabajador_id, is_deleted);

-- Auditoría: por fecha y módulo
CREATE INDEX idx_audit_fecha ON audit_logs(created_at);
CREATE INDEX idx_audit_modulo ON audit_logs(modulo);

-- Limpieza: uk_cajas_clave_mes (UNIQUE) ya cubre (clave_interna, mes_asignado)
DROP INDEX idx_cajas_clave_mes ON cajas_chicas;
```

> Si al crear `idx_rendiciones_trabajador` ya existía un índice homónimo solo sobre `trabajador_id`, dropear el viejo o renombrar el nuevo. Lo mismo aplica a anticipos.

### 8.1 Ajustes si ya creaste la BD con el script original

Aplicar con `ALTER` (o recrear en vacío):

```sql
-- Rol Super Admin (además de Dev)
ALTER TABLE usuarios
  MODIFY rol ENUM('SUPER_ADMIN_DEV', 'SUPER_ADMIN', 'ADMIN_CAJA', 'USER_RENDIDOR') NOT NULL;

-- Evitar CASCADE físico (política soft delete)
ALTER TABLE trabajador_cajas
  DROP FOREIGN KEY fk_tc_trabajador,
  ADD CONSTRAINT fk_tc_trabajador
    FOREIGN KEY (trabajador_id) REFERENCES trabajadores(id) ON DELETE RESTRICT;

-- Una sola caja por clave+mes
ALTER TABLE cajas_chicas
  ADD UNIQUE KEY uk_caja_clave_mes (clave_interna, mes_asignado);

-- Estados admin
ALTER TABLE rendiciones_gastos
  MODIFY estado ENUM(
    'Sin Devolución', 'Devuelto', 'Por Corregir', 'Aprobado', 'Rechazado'
  ) DEFAULT 'Sin Devolución';

-- Legacy: NO usar es_legacy en rendiciones_gastos
ALTER TABLE rendiciones_gastos DROP COLUMN IF EXISTS es_legacy;
-- + CREATE TABLE rendiciones_legacy (ver DDL arriba)
```

> **Decisión 2026-07-24:** los datos migrados viven en **`rendiciones_legacy`**, no con un flag en la tabla operativa.

Notas:

- `tarjeta_id` puede quedar nullable; con origen Efectivo/Débito/Crédito no es obligatorio usarlo.
- Desasignar caja a trabajador = borrar fila de `trabajador_cajas` (no es dato contable) o soft-delete si prefieres historial de asignaciones.
- `ON DELETE CASCADE` en `trabajador_cajas` del script original contradice “cero DELETE físico”: preferir `RESTRICT`.

---

## 9. Seguridad API — cierre de bypasses (plan obligatorio)

Objetivo: backend **sin atajos de desarrollo** en producción / staging.

### A. Limpieza de mocks en auth middleware

- Eliminar flags tipo `ALLOW_BYPASS=true`, tokens hardcodeados o headers mágicos.
- Todo request sin `Authorization: Bearer <JWT_VÁLIDO>` → **HTTP 401**.

### B. Validación estricta de JWT e identidad

- Secret único: `JWT_SECRET_RENDICIONES` en `.env` (nunca en el repo).
- Payload mínimo: `id`, `rut`, `rol`, `trabajador_id`, `exp`.
- En **cada** request autenticado, revalidar en BD que el usuario tenga `estado = 'activo'` y `is_deleted = FALSE` (token válido no basta si fue desactivado).

### C. RBAC middleware

- Helper reutilizable, ej. `checkRole(['SUPER_ADMIN_DEV', 'SUPER_ADMIN'])`.
- Rutas críticas (crear admins, audit logs, gestión global de cajas) exigen roles explícitos; 403 si no aplica.

### D. Consultas sanitizadas

- Solo **prepared statements** con placeholders (`?`) vía `mysql2/promise` (u ORM parametrizado).
- Cero concatenación de SQL con input de usuario.

### Front (este repo Vue)

- Existe `TEMP_AUTH_BYPASS` (`src/TEMP_AUTH_BYPASS.js`) para maquetar sin API.
- **Antes de producción:** `TEMP_AUTH_BYPASS = false` y login real contra `/api/auth/login`.
- Buscar en el repo: `TEMP_AUTH_BYPASS`.

### Checklist de cierre

| Ítem | Estado |
|------|--------|
| Sin bypass en middleware backend | Pendiente (repo API) |
| JWT + recheck activo/no borrado | Pendiente |
| `checkRole` en rutas críticas | Pendiente |
| Prepared statements en todas las queries | Pendiente |
| Front: `TEMP_AUTH_BYPASS = false` | Pendiente |

---

## Historial de cambios de este documento

| Fecha | Cambio |
|-------|--------|
| 2026-07-24 | Alta inicial: JWT desacoplado + Soft Delete (Ley 21.719 / SII 6 años) |
| 2026-07-24 | API (auth, arrastre, audit, endpoints) + modelo de tablas validado vs UI |
| 2026-07-24 | DDL canónico MariaDB + ALTERs recomendados post-creación |
| 2026-07-24 | ALTERs aplicados: SUPER_ADMIN, uk_cajas_clave_mes, FK RESTRICT, estados + es_legacy |
| 2026-07-24 | Legacy separado: DROP es_legacy + tabla `rendiciones_legacy` |
| 2026-07-24 | Índices: trabajador+is_deleted, fecha_documento, audit; DROP idx_cajas_clave_mes duplicado |
| 2026-07-24 | §9 Plan seguridad API: cierre bypass, JWT, RBAC, prepared statements |
