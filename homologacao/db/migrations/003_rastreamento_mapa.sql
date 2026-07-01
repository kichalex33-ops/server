-- H4.28 - Rastreamento em tempo quase real no painel web
-- Seguro para rodar mais de uma vez: cria indices apenas se ainda nao existirem.

SET @db_name := DATABASE();

SET @sql := IF(
  EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'localizacoes' AND INDEX_NAME = 'idx_localizacoes_viagem_data'),
  'SELECT 1',
  'CREATE INDEX idx_localizacoes_viagem_data ON localizacoes (viagem_id, criado_em)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'localizacoes' AND INDEX_NAME = 'idx_localizacoes_motorista_data'),
  'SELECT 1',
  'CREATE INDEX idx_localizacoes_motorista_data ON localizacoes (motorista_id, criado_em)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'localizacoes' AND INDEX_NAME = 'idx_localizacoes_veiculo_data'),
  'SELECT 1',
  'CREATE INDEX idx_localizacoes_veiculo_data ON localizacoes (veiculo_id, criado_em)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
