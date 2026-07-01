-- H5.47 - PWA, offline, presença, comentários, preferências, analytics e assinatura digital.
-- Seguro para homologação HostGator/MySQL/MariaDB. Rode depois da 014.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint_hash CHAR(64) PRIMARY KEY,
  usuario_id VARCHAR(64) NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NULL,
  auth TEXT NULL,
  user_agent VARCHAR(255) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_push_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notificacoes (
  id VARCHAR(64) PRIMARY KEY,
  usuario_id VARCHAR(64) NULL,
  titulo VARCHAR(160) NOT NULL,
  mensagem TEXT NULL,
  tipo VARCHAR(40) NULL,
  lida_em DATETIME NULL,
  metadados TEXT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_usuario (usuario_id),
  INDEX idx_notif_criado (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_presence (
  usuario_id VARCHAR(64) PRIMARY KEY,
  usuario_nome VARCHAR(160) NULL,
  perfil VARCHAR(40) NULL,
  page VARCHAR(180) NULL,
  status VARCHAR(40) NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  last_seen DATETIME NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_presence_last_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS viagem_comentarios (
  id VARCHAR(64) PRIMARY KEY,
  viagem_id VARCHAR(64) NOT NULL,
  usuario_id VARCHAR(64) NULL,
  usuario_nome VARCHAR(160) NULL,
  comentario TEXT NOT NULL,
  mencoes TEXT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comentarios_viagem (viagem_id),
  INDEX idx_comentarios_criado (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
  usuario_id VARCHAR(64) PRIMARY KEY,
  preferencias TEXT NOT NULL,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id VARCHAR(64) NULL,
  evento VARCHAR(120) NOT NULL,
  path VARCHAR(255) NULL,
  props TEXT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_analytics_evento (evento),
  INDEX idx_analytics_criado (criado_em),
  INDEX idx_analytics_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS viagem_assinaturas (
  id VARCHAR(64) PRIMARY KEY,
  viagem_id VARCHAR(64) NOT NULL,
  usuario_id VARCHAR(64) NULL,
  tipo VARCHAR(60) NULL,
  assinatura_data_url MEDIUMTEXT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_assinaturas_viagem (viagem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE FROM user_presence WHERE last_seen < DATE_SUB(NOW(), INTERVAL 1 DAY);
