-- H544 - UI/UX + backend hardening support
-- Execute em homologação antes da produção.

CREATE TABLE IF NOT EXISTS rate_limits (
    key_name CHAR(64) NOT NULL PRIMARY KEY,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    reset_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_rate_limits_reset (reset_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Limpeza recomendada via cron diário:
-- DELETE FROM rate_limits WHERE reset_at < (NOW() - INTERVAL 1 DAY);
-- DELETE FROM login_attempts WHERE criado_em < (NOW() - INTERVAL 7 DAY);
-- DELETE FROM jwt_blacklist WHERE expires_at < NOW();
