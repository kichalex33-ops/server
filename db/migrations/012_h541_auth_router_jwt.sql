-- H5.41 - Router PHP, middleware unificado e endurecimento JWT
-- Seguro para rodar mais de uma vez em HostGator/MySQL/MariaDB.

CREATE TABLE IF NOT EXISTS jwt_blacklist (
  jti VARCHAR(64) PRIMARY KEY,
  usuario_id VARCHAR(64) NULL,
  revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  INDEX idx_jwt_blacklist_expires (expires_at),
  INDEX idx_jwt_blacklist_user (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @db := DATABASE();

SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='usuarios' AND COLUMN_NAME='token_version')=0,
  'ALTER TABLE usuarios ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER status', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Limpeza recomendada para manter blacklist leve.
DELETE FROM jwt_blacklist WHERE expires_at < NOW();
