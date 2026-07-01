-- Salva a senha/codigo alfanumerico atual do app no cadastro do motorista.
-- Use este arquivo no phpMyAdmin depois das migrations anteriores.

SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'motoristas' AND COLUMN_NAME = 'app_senha_atual') = 0,
  'ALTER TABLE motoristas ADD COLUMN app_senha_atual VARCHAR(32) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'motoristas' AND COLUMN_NAME = 'app_senha_hash') = 0,
  'ALTER TABLE motoristas ADD COLUMN app_senha_hash VARCHAR(255) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'motoristas' AND COLUMN_NAME = 'app_senha_gerada_em') = 0,
  'ALTER TABLE motoristas ADD COLUMN app_senha_gerada_em DATETIME NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'motoristas' AND COLUMN_NAME = 'app_senha_expira_em') = 0,
  'ALTER TABLE motoristas ADD COLUMN app_senha_expira_em DATETIME NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
