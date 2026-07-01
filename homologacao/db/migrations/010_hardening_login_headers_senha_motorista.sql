-- 010 - Hardening de homologacao: rate limit de login e suporte a senha do app mascarada.
-- Seguro para rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  login_key CHAR(64) NOT NULL,
  ip VARCHAR(64) NOT NULL,
  succeeded TINYINT(1) NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempts_lookup (login_key, ip, criado_em),
  INDEX idx_login_attempts_created (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE FROM login_attempts WHERE criado_em < (NOW() - INTERVAL 7 DAY);
