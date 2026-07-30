-- ============================================================
-- ALTER Turnos: updated_at para sync bidireccional Rendiciones ↔ Turnos
-- Ejecutar contra la BD de Turnos (basalto).
-- Idempotente. Equivalente a proyecto_basalto/server/migrate/059_sync_updated_at.sql
-- ============================================================

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
    COMMENT 'Para conflictos de sync con Rendiciones';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
    COMMENT 'Para conflictos de sync con Rendiciones';

ALTER TABLE trabajadores
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
    COMMENT 'Para conflictos de sync con Rendiciones';

UPDATE admin_users SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);
UPDATE users SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);
UPDATE trabajadores SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);
