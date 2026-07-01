<?php
/**
 * homologacao/api/config/env.php
 */
declare(strict_types=1);

$envFile = dirname(__DIR__, 2) . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if ($key !== '' && getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

// CORREÇÃO FALHA 10: validar JWT_SECRET antes de prosseguir
$jwtSecret = (string) (getenv('JWT_SECRET') ?: '');
if (strlen($jwtSecret) < 32) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Configuração de segurança incompleta.']);
    exit;
}

return [
    'app_env'         => getenv('APP_ENV') ?: 'production',
    'base_url'        => rtrim((string) (getenv('PUBLIC_API_URL') ?: getenv('APP_URL') ?: ''), '/'),
    'jwt_secret'      => $jwtSecret,
    'jwt_issuer'      => getenv('JWT_ISSUER') ?: 'plataforma-logistica',
    'jwt_access_ttl'  => (int) (getenv('JWT_ACCESS_TTL_SECONDS') ?: 900),
    'jwt_refresh_ttl' => (int) (getenv('JWT_REFRESH_TTL_SECONDS') ?: 604800),
    'cors' => [
        // CORREÇÃO FALHA 2: nunca usar * em produção
        'allow_origin' => getenv('CORS_ALLOW_ORIGIN') ?: 'https://agsap.com.br',
    ],
    'push' => [
        'public_key' => getenv('WEB_PUSH_PUBLIC_KEY') ?: '',
        'private_key' => getenv('WEB_PUSH_PRIVATE_KEY') ?: '',
        'subject'     => getenv('WEB_PUSH_SUBJECT') ?: (getenv('APP_URL') ?: 'mailto:admin@example.com'),
    ],
    'realtime' => [
        'provider'        => getenv('REALTIME_PROVIDER') ?: 'none',
        'ably_key'        => getenv('ABLY_API_KEY') ?: '',
        'pusher_app_id'   => getenv('PUSHER_APP_ID') ?: '',
        'pusher_key'      => getenv('PUSHER_KEY') ?: '',
        'pusher_secret'   => getenv('PUSHER_SECRET') ?: '',
        'pusher_cluster'  => getenv('PUSHER_CLUSTER') ?: 'mt1',
        'default_channel' => getenv('REALTIME_CHANNEL') ?: 'logistica-saude',
    ],
    'ai' => [
        'provider'        => getenv('AI_PROVIDER') ?: 'gemini',
        'api_key'         => (string) (getenv('GEMINI_API_KEY') ?: getenv('AI_API_KEY') ?: ''),
        'model'           => getenv('GEMINI_MODEL') ?: (getenv('AI_MODEL') ?: 'gemini-flash-latest'),
        'timeout_seconds' => (int) (getenv('AI_TIMEOUT_SECONDS') ?: 20),
    ],
    'db' => [
        'host'     => getenv('DB_HOST') ?: 'localhost',
        'port'     => (int) (getenv('DB_PORT') ?: 3306),
        'name'     => getenv('DB_NAME') ?: '',
        'user'     => getenv('DB_USER') ?: '',
        'password' => getenv('DB_PASSWORD') ?: (getenv('DB_PASS') ?: ''),
        'charset'  => getenv('DB_CHARSET') ?: 'utf8mb4',
    ],
    'paths' => [
        'logs'    => dirname(__DIR__, 2) . '/storage/logs',
        'uploads' => dirname(__DIR__, 2) . '/storage/uploads',
        'backups' => dirname(__DIR__, 2) . '/storage/backups',
        'cache'   => dirname(__DIR__, 2) . '/storage/cache',
    ],
];
