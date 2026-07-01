-- H5.34 - Segurança, LGPD e operação
-- Execute em homologação antes de testar as novas telas, se o auto-migration via API não for suficiente.

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  login_key CHAR(64) NOT NULL,
  ip VARCHAR(64) NOT NULL,
  succeeded TINYINT(1) NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempts_lookup (login_key, ip, criado_em),
  INDEX idx_login_attempts_created (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS motorista_activation_codes (
  id VARCHAR(64) PRIMARY KEY,
  motorista_id VARCHAR(64) NOT NULL,
  code_hash CHAR(64) NOT NULL UNIQUE,
  codigo_hint VARCHAR(8) NULL,
  origem VARCHAR(80) NULL,
  ip VARCHAR(64) NULL,
  device_id VARCHAR(120) NULL,
  plataforma VARCHAR(40) NULL,
  expira_em DATETIME NOT NULL,
  usado_em DATETIME NULL,
  revogado_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activation_motorista (motorista_id),
  INDEX idx_activation_expira (expira_em),
  INDEX idx_activation_usado (usado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @db := DATABASE();

SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='motoristas' AND COLUMN_NAME='cnh')=0,
  'ALTER TABLE motoristas ADD COLUMN cnh VARCHAR(40) NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='motoristas' AND COLUMN_NAME='cnh_validade')=0,
  'ALTER TABLE motoristas ADD COLUMN cnh_validade DATE NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='viagens' AND COLUMN_NAME='motivo_cancelamento')=0,
  'ALTER TABLE viagens ADD COLUMN motivo_cancelamento TEXT NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='viagens' AND COLUMN_NAME='cancelado_em')=0,
  'ALTER TABLE viagens ADD COLUMN cancelado_em DATETIME NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='viagens' AND COLUMN_NAME='cancelado_por')=0,
  'ALTER TABLE viagens ADD COLUMN cancelado_por VARCHAR(64) NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='viagens' AND COLUMN_NAME='reatribuido_em')=0,
  'ALTER TABLE viagens ADD COLUMN reatribuido_em DATETIME NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='viagens' AND COLUMN_NAME='reatribuido_por')=0,
  'ALTER TABLE viagens ADD COLUMN reatribuido_por VARCHAR(64) NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='viagens' AND COLUMN_NAME='sentido_viagem')=0,
  "ALTER TABLE viagens ADD COLUMN sentido_viagem VARCHAR(20) NOT NULL DEFAULT 'ida'", 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='viagens' AND COLUMN_NAME='viagem_vinculada_id')=0,
  'ALTER TABLE viagens ADD COLUMN viagem_vinculada_id VARCHAR(64) NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- saneamento: remove credenciais reversíveis antigas de motorista.
UPDATE motoristas SET app_senha_atual = NULL WHERE app_senha_atual IS NOT NULL AND app_senha_atual <> '';
