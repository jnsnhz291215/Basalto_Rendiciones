# Reglas del Sistema y Base de Datos — Basalto Rendiciones / Caja Chica

Documento de referencia para arquitectura, auth y persistencia. Mantener actualizado cuando se acuerden nuevas reglas de negocio o técnicas.

---

## 1. Desacoplamiento de JWT

La emisión y validación de tokens JWT del módulo **Rendiciones / Caja Chica** es **independiente** de la lógica de turnos (u otros módulos Basalto).

### Objetivos

- Evitar dependencias de sesión cruzadas entre módulos.
- Facilitar el control de roles **por módulo**.
- Permitir evolución del auth de rendiciones sin acoplarse al JWT de turnos.

### Roles contemplados (módulo)

| Rol | Alcance típico |
|-----|----------------|
| Super Admin - Dev | Acceso total del módulo, incluyendo operaciones sensibles de desarrollo |
| Admin Caja | Administración de caja, rendiciones, anticipos, usuarios rendidores |
| Usuario Rendidor | Declaración y seguimiento de sus propios gastos |

### Implicancias técnicas

- Endpoints de login/refresh del módulo de rendiciones emiten y validan **su propio** JWT (issuer/audience/secret propios o claramente namespaced).
- No reutilizar ni confiar en el token de turnos como sesión válida de este módulo.
- Claims del JWT deben incluir al menos: identidad del usuario, rol(es) del módulo y expiración.

---

## 2. Política de Eliminación: Soft Delete Obligatorio

### Marco normativo (Chile)

| Norma | Implicancia |
|-------|-------------|
| **Ley N° 21.719** (Protección de Datos Personales) | Otorga a las personas naturales el **derecho de supresión** de datos personales. |
| **Código Tributario y SII** | Obligan a conservar registros contables, comprobantes de pago, rendiciones y facturas por un plazo **mínimo de 6 años** (resguardo de auditoría). La **eliminación física** de registros financieros o contables está **prohibida**. |

En la práctica: los datos personales pueden requerir tratamiento especial bajo Ley 21.719, pero los **registros financieros/contables** no se borran de la base; se ocultan y se conservan para auditoría.

### Regla en base de datos

1. **Sin `DELETE` en SQL**  
   Ningún endpoint ni consulta de aplicación ejecutará sentencias `DELETE` sobre tablas de negocio.

2. **Soft Delete estándar**  
   Todos los modelos de negocio tendrán:

   | Campo | Tipo | Descripción |
   |-------|------|-------------|
   | `is_deleted` | `boolean` | `false` por defecto; `true` cuando el registro está “eliminado” (oculto) |
   | `deleted_at` | `timestamptz` (nullable) | Momento en que se marcó como eliminado; `NULL` si está activo |

3. **Consultas por defecto**  
   Listados y reportes operativos filtran `is_deleted = false` (o equivalente). Solo pantallas/roles de auditoría o procesos de conservación pueden ver registros marcados.

4. **Auditoría inmutable**  
   Cuando un administrador “elimina” un registro:

   - Solo se actualiza el estado (`is_deleted`, `deleted_at`).
   - Queda asentado en el **Audit Log** quién ejecutó la acción, sobre qué entidad/id y a qué hora.
   - El Audit Log **no** se soft-deletea ni se altera retroactivamente.

### Resumen operativo

```
Usuario pide “eliminar”
  → UPDATE ... SET is_deleted = true, deleted_at = now()
  → INSERT en audit_log (actor, acción, entidad, timestamp, detalle)
  → Nunca DELETE físico sobre datos contables / de rendición
```

---

## Historial de cambios de este documento

| Fecha | Cambio |
|-------|--------|
| 2026-07-24 | Alta inicial: JWT desacoplado + Soft Delete obligatorio (Ley 21.719 / SII 6 años) |
