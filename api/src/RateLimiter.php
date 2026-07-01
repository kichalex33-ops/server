<?php

declare(strict_types=1);

final class RateLimiter
{
    private Database $db;

    public function __construct(Database $db)
    {
        $this->db = $db;
    }

    public function hit(string $key, int $limit, int $windowSeconds): void
    {
        $this->ensureTable();
        $name = hash('sha256', $key);
        $now = time();
        $row = $this->db->fetch('SELECT key_name, attempts, reset_at FROM rate_limits WHERE key_name = :key_name LIMIT 1', ['key_name' => $name]);
        $resetAt = $row ? strtotime((string) $row['reset_at']) : 0;
        if (!$row || $resetAt <= $now) {
            $this->db->execute(
                'REPLACE INTO rate_limits (key_name, attempts, reset_at, updated_at) VALUES (:key_name, 1, FROM_UNIXTIME(:reset_at), NOW())',
                ['key_name' => $name, 'reset_at' => $now + $windowSeconds]
            );
            return;
        }
        $attempts = (int) ($row['attempts'] ?? 0) + 1;
        if ($attempts > $limit) {
            throw new RuntimeException('Rate limit excedido. Aguarde alguns minutos.');
        }
        $this->db->execute('UPDATE rate_limits SET attempts = attempts + 1, updated_at = NOW() WHERE key_name = :key_name', ['key_name' => $name]);
    }

    private function ensureTable(): void
    {
        $this->db->execute(
            "CREATE TABLE IF NOT EXISTS rate_limits (
                key_name CHAR(64) NOT NULL PRIMARY KEY,
                attempts INT UNSIGNED NOT NULL DEFAULT 0,
                reset_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_rate_limits_reset (reset_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }
}
