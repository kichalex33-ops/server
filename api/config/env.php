<?php

declare(strict_types=1);

$envFile = dirname(__DIR__, 2) . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if ($key !== '' && getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

return [
    'app_env' => getenv('APP_ENV') ?: 'production',
    'base_url' => rtrim((string) (getenv('PUBLIC_API_URL') ?: getenv('APP_URL') ?: ''), '/'),
    'jwt_secret' => (string) (getenv('JWT_SECRET') ?: ''),
    'jwt_issuer' => getenv('JWT_ISSUER') ?: 'plataforma-logistica',
    'jwt_access_ttl' => (int) (getenv('JWT_ACCESS_TTL_SECONDS') ?: 900),
    'jwt_refresh_ttl' => (int) (getenv('JWT_REFRESH_TTL_SECONDS') ?: 604800),
    'db' => [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'port' => (int) (getenv('DB_PORT') ?: 3306),
        'name' => getenv('DB_NAME') ?: '',
        'user' => getenv('DB_USER') ?: '',
        'password' => getenv('DB_PASSWORD') ?: '',
        'charset' => getenv('DB_CHARSET') ?: 'utf8mb4',
    ],
    'paths' => [
        'logs' => dirname(__DIR__, 2) . '/storage/logs',
        'uploads' => dirname(__DIR__, 2) . '/storage/uploads',
        'backups' => dirname(__DIR__, 2) . '/storage/backups',
    ],
];
