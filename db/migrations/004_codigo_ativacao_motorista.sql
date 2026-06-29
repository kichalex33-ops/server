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
  INDEX idx_activation_usado (usado_em),
  CONSTRAINT fk_activation_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
