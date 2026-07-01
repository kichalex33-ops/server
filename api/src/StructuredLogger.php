<?php

declare(strict_types=1);

final class StructuredLogger
{
    private string $dir;

    public function __construct(string $dir)
    {
        $this->dir = rtrim($dir, '/');
        if (!is_dir($this->dir)) {
            @mkdir($this->dir, 0775, true);
        }
    }

    public function info(string $event, array $context = []): void
    {
        $this->write('info', $event, $context);
    }

    public function warning(string $event, array $context = []): void
    {
        $this->write('warning', $event, $context);
    }

    public function error(string $event, array $context = []): void
    {
        $this->write('error', $event, $context);
    }

    public function security(string $event, array $context = []): void
    {
        $this->write('security', $event, $context);
    }

    private function write(string $level, string $event, array $context): void
    {
        $record = [
            'ts' => date('c'),
            'level' => $level,
            'event' => $event,
            'request_id' => self::requestId(),
            'ip' => self::clientIp(),
            'method' => $_SERVER['REQUEST_METHOD'] ?? null,
            'uri' => $_SERVER['REQUEST_URI'] ?? null,
            'user_id' => $_SERVER['AUTH_USER_ID'] ?? null,
            'role' => $_SERVER['AUTH_ROLE'] ?? null,
            'context' => self::redact($context),
        ];
        $file = $this->dir . '/structured-' . date('Y-m-d') . '.log';
        @file_put_contents($file, json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    public static function requestId(): string
    {
        $incoming = trim((string) ($_SERVER['HTTP_X_REQUEST_ID'] ?? ''));
        if ($incoming !== '' && preg_match('/^[a-zA-Z0-9_.:-]{8,80}$/', $incoming)) {
            return $incoming;
        }
        if (empty($_SERVER['LOGISAUDE_REQUEST_ID'])) {
            $_SERVER['LOGISAUDE_REQUEST_ID'] = bin2hex(random_bytes(8));
        }
        return (string) $_SERVER['LOGISAUDE_REQUEST_ID'];
    }

    public static function clientIp(): string
    {
        $forwarded = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
        if ($forwarded !== '') {
            return substr(trim(explode(',', $forwarded)[0]), 0, 64);
        }
        return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 64);
    }

    private static function redact(array $data): array
    {
        $blocked = ['password', 'senha', 'senha_hash', 'token', 'accessToken', 'refreshToken', 'authorization', 'jwt', 'secret'];
        $out = [];
        foreach ($data as $key => $value) {
            $normalized = strtolower((string) $key);
            $sensitive = false;
            foreach ($blocked as $name) {
                if (strpos($normalized, strtolower($name)) !== false) {
                    $sensitive = true;
                    break;
                }
            }
            if ($sensitive) {
                $out[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $out[$key] = self::redact($value);
            } elseif (is_scalar($value) || $value === null) {
                $out[$key] = $value;
            } else {
                $out[$key] = get_debug_type($value);
            }
        }
        return $out;
    }
}
