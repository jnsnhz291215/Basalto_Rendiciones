-- Auditoría e importaciones: actor Central sin FK a usuarios local.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE audit_logs
  ADD COLUMN central_usuario_id INT UNSIGNED NULL AFTER usuario_id,
  ADD COLUMN actor_rut VARCHAR(20) NULL AFTER central_usuario_id;

ALTER TABLE audit_logs DROP FOREIGN KEY fk_audit_usuario;

CREATE INDEX idx_audit_central_usuario ON audit_logs(central_usuario_id);
CREATE INDEX idx_audit_actor_rut ON audit_logs(actor_rut);

-- importaciones_lotes (si existe)
-- ALTER TABLE importaciones_lotes ADD COLUMN central_usuario_id INT UNSIGNED NULL;
-- ALTER TABLE importaciones_lotes ADD COLUMN actor_rut VARCHAR(20) NULL;
