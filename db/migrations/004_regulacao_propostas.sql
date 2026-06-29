-- 004_regulacao_propostas.sql
-- Tabelas reais para Propostas de Viagem geradas pelo Planejador V1.

CREATE TABLE IF NOT EXISTS propostas_viagem (
  id VARCHAR(64) PRIMARY KEY,
  status ENUM('gerada','aprovada','rejeitada','obsoleta','cancelada') NOT NULL DEFAULT 'gerada',
  data_atendimento DATE NOT NULL,
  destino_id VARCHAR(64) NOT NULL,
  destino_nome_snapshot VARCHAR(180) NOT NULL,
  veiculo_id VARCHAR(64) NULL,
  veiculo_nome_snapshot VARCHAR(180) NULL,
  motorista_id VARCHAR(64) NULL,
  motorista_nome_snapshot VARCHAR(180) NULL,
  assentos_necessarios INT NOT NULL DEFAULT 0,
  capacidade_veiculo INT NULL,
  requer_acessibilidade TINYINT(1) NOT NULL DEFAULT 0,
  alertas JSON NULL,
  justificativa TEXT NULL,
  custo_previsto DECIMAL(12,2) NULL,
  km_previsto DECIMAL(12,2) NULL,
  metadados JSON NULL,
  criado_por VARCHAR(64) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_propostas_status_data (status, data_atendimento),
  INDEX idx_propostas_destino (destino_id),
  INDEX idx_propostas_veiculo (veiculo_id),
  INDEX idx_propostas_motorista (motorista_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proposta_solicitacoes (
  proposta_id VARCHAR(64) NOT NULL,
  solicitacao_id VARCHAR(64) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (proposta_id, solicitacao_id),
  INDEX idx_prop_sol_solicitacao (solicitacao_id),
  CONSTRAINT fk_prop_sol_proposta FOREIGN KEY (proposta_id) REFERENCES propostas_viagem(id) ON DELETE CASCADE,
  CONSTRAINT fk_prop_sol_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes_transporte(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
