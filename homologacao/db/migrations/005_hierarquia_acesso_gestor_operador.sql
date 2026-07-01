CREATE TABLE IF NOT EXISTS operador_app_credenciais (
  usuario_id VARCHAR(64) PRIMARY KEY,
  cpf VARCHAR(32) NOT NULL,
  app_senha_hash VARCHAR(255) NOT NULL,
  codigo_hint VARCHAR(8) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_operador_app_cpf (cpf),
  CONSTRAINT fk_operador_app_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
