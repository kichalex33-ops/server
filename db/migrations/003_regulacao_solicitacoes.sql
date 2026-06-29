-- 003_regulacao_solicitacoes.sql
-- Base real para Solicitações de Transporte da Plataforma Web.
-- Sem dados mockados. Execute após 001_php_hostgator_core.sql e 002_destinos.sql.

CREATE TABLE IF NOT EXISTS solicitacoes_transporte (
  id VARCHAR(64) PRIMARY KEY,
  status ENUM('pendente','em_planejamento','proposta_gerada','agendada','cancelada') NOT NULL DEFAULT 'pendente',

  paciente_id VARCHAR(64) NOT NULL,
  nome_snapshot VARCHAR(180) NOT NULL,
  telefone_whatsapp VARCHAR(40) NULL,
  documento_snapshot VARCHAR(40) NULL,
  cns_cartao_sus VARCHAR(40) NULL,

  data_atendimento DATE NOT NULL,
  horario_consulta TIME NOT NULL,
  horario_limite_chegada TIME NULL,
  destino_id VARCHAR(64) NOT NULL,
  destino_nome_snapshot VARCHAR(180) NOT NULL,
  especialidade VARCHAR(120) NULL,
  prioridade ENUM('baixa','media','alta','critica') NOT NULL DEFAULT 'media',

  endereco_origem TEXT NOT NULL,
  bairro VARCHAR(120) NULL,
  cidade VARCHAR(120) NULL,
  ponto_referencia TEXT NULL,
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,

  possui_acompanhante TINYINT(1) NOT NULL DEFAULT 0,
  acompanhante_obrigatorio TINYINT(1) NOT NULL DEFAULT 0,
  quantidade_acompanhantes INT NOT NULL DEFAULT 0,

  cadeirante TINYINT(1) NOT NULL DEFAULT 0,
  maca TINYINT(1) NOT NULL DEFAULT 0,
  oxigenio TINYINT(1) NOT NULL DEFAULT 0,
  mobilidade_reduzida TINYINT(1) NOT NULL DEFAULT 0,
  idoso_fragil TINYINT(1) NOT NULL DEFAULT 0,
  precisa_veiculo_acessivel TINYINT(1) NOT NULL DEFAULT 0,

  hemodialise TINYINT(1) NOT NULL DEFAULT 0,
  oncologia_imunossuprimido TINYINT(1) NOT NULL DEFAULT 0,
  infectocontagioso TINYINT(1) NOT NULL DEFAULT 0,
  isolamento_recomendado TINYINT(1) NOT NULL DEFAULT 0,
  nao_agrupar TINYINT(1) NOT NULL DEFAULT 0,

  enviar_whatsapp TINYINT(1) NOT NULL DEFAULT 1,
  confirmar_presenca TINYINT(1) NOT NULL DEFAULT 1,
  telefone_confirmado TINYINT(1) NOT NULL DEFAULT 0,
  canal_preferido VARCHAR(40) NOT NULL DEFAULT 'whatsapp',

  criado_por VARCHAR(64) NULL,
  origem_da_solicitacao ENUM('painel_operador','integracao_sus','portal_paciente') NOT NULL DEFAULT 'painel_operador',
  observacoes_operacionais TEXT NULL,
  metadados JSON NULL,

  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_solicitacoes_status_data (status, data_atendimento, horario_consulta),
  INDEX idx_solicitacoes_paciente (paciente_id),
  INDEX idx_solicitacoes_destino (destino_id),
  INDEX idx_solicitacoes_criado_por (criado_por)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS regulacao_eventos (
  id VARCHAR(64) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  usuario_id VARCHAR(64) NULL,
  usuario_nome VARCHAR(180) NULL,
  perfil VARCHAR(40) NULL,
  payload JSON NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reg_event_type (event_type),
  INDEX idx_reg_entity (entity_type, entity_id),
  INDEX idx_reg_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
