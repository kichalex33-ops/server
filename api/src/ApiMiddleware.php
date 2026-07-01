<?php

declare(strict_types=1);

final class ApiMiddleware
{
    public static function cors(array $config): void
    {
        $allowedOrigin = trim((string) (getenv('CORS_ALLOW_ORIGIN') ?: ($config['cors']['allow_origin'] ?? '*')));
        if ($allowedOrigin === '') {
            $allowedOrigin = '*';
        }

        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Action-Timestamp, X-Client-Id, X-Request-Id');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Max-Age: 86400');
        header('Vary: Origin');
        if (class_exists('StructuredLogger')) {
            header('X-Request-Id: ' . StructuredLogger::requestId());
        }

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }

    public static function request(): array
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $uri = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
        $path = self::internalApiPath($uri);
        $raw = file_get_contents('php://input') ?: '';
        $body = [];
        if (trim($raw) !== '') {
            $body = json_decode($raw, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($body)) {
                throw new InvalidArgumentException('JSON da requisição inválido.');
            }
        }

        return [
            'method' => $method,
            'path' => $path,
            'routeKey' => $method . ' ' . $path,
            'body' => $body,
            'rawBody' => $raw,
        ];
    }

    public static function publicRoutes(): array
    {
        return [
            'GET /status',
            'GET /system/health',
            'GET /watchdog',
            'GET /pwa/config',
            'POST /auth/login',
            'POST /auth/refresh',
            'POST /driver/qr-login',
            'POST /driver/pairing/confirm',
            'POST /driver/activate',
            'POST /driver/login',
        ];
    }

    public static function authenticate(
        string $method,
        string $path,
        string $routeKey,
        Auth $auth,
        ApiService $service,
        Rbac $rbac,
        AuditLogger $audit
    ): ?array {
        if (self::isPublicRoute($routeKey)) {
            return null;
        }

        $authorizationHeader = self::authorizationHeader();
        $user = null;
        $authError = null;

        try {
            $user = $auth->userFromBearer($authorizationHeader);
        } catch (Throwable $error) {
            $authError = $error;
        }

        if (self::isProtectedDriverRoute($path, $routeKey)) {
            $driverUser = $service->driverUserFromBearer($authorizationHeader);
            if ($user && strtoupper((string) ($user['perfil'] ?? '')) === 'MOTORISTA') {
                $user = $driverUser;
            } elseif (!$user) {
                $user = $driverUser;
            }
        }

        if (!$user) {
            $audit->failure($authError ? 'auth_invalid' : 'auth_required', null, null);
            $message = self::isProtectedDriverRoute($path, $routeKey)
                ? 'Token de motorista obrigatório.'
                : 'Token inválido ou expirado.';
            Response::error($message, 401);
            exit;
        }

        $rbac->require($user, self::routeResource($path, $routeKey));
        return $user;
    }

    public static function rejectLegacyPasswordHeader(string $method, string $path): void
    {
        $legacyHeader = self::headerValue(['HTTP_X_COMANDO_SENHA', 'HTTP_X_LOCAL_PASSWORD', 'X-Comando-Senha', 'X-Local-Password']);
        if ($legacyHeader === '') {
            return;
        }
        if ($method === 'POST' && $path === '/auth/login') {
            return;
        }
        Response::error('Senha local em header legado bloqueada. Use Authorization: Bearer.', 400);
        exit;
    }

    private static function headerValue(array $names): string
    {
        foreach ($names as $name) {
            $value = trim((string) ($_SERVER[$name] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }
        if (function_exists('apache_request_headers')) {
            foreach (apache_request_headers() as $name => $value) {
                foreach ($names as $candidate) {
                    $normalized = strtolower(str_replace(['HTTP_', '_'], ['', '-'], $candidate));
                    if (strtolower((string) $name) === $normalized && trim((string) $value) !== '') {
                        return trim((string) $value);
                    }
                }
            }
        }
        return '';
    }

    public static function authorizationHeader(): ?string
    {
        $candidates = [
            $_SERVER['HTTP_AUTHORIZATION'] ?? null,
            $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null,
            $_SERVER['Authorization'] ?? null,
        ];
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $name => $value) {
                if (strtolower((string) $name) === 'authorization') {
                    $candidates[] = $value;
                }
            }
        }
        foreach ($candidates as $value) {
            $value = trim((string) $value);
            if ($value !== '') {
                return $value;
            }
        }
        return null;
    }

    public static function internalApiPath(string $uri): string
    {
        $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/api/index.php'));
        $apiBase = rtrim(str_replace('/index.php', '', $script), '/');
        if ($apiBase !== '' && strpos($uri, $apiBase) === 0) {
            $uri = substr($uri, strlen($apiBase));
        } elseif (preg_match('#/api(?:/|$)#', $uri, $match, PREG_OFFSET_CAPTURE)) {
            $uri = substr($uri, $match[0][1] + 4);
        }
        $path = '/' . trim($uri, '/');
        return $path === '/' ? '/status' : $path;
    }

    private static function isPublicRoute(string $routeKey): bool
    {
        return in_array($routeKey, self::publicRoutes(), true);
    }

    private static function isProtectedDriverRoute(string $path, string $routeKey): bool
    {
        if (preg_match('#^/driver/#', $path)) {
            return !in_array($routeKey, ['POST /driver/activate', 'POST /driver/login', 'POST /driver/qr-login', 'POST /driver/pairing/confirm'], true);
        }
        return $routeKey === 'POST /gps';
    }

    private static function routeResource(string $path, string $routeKey): string
    {
        if (preg_match('#^/viagens/[^/]+/passageiros$#', $path)) {
            return 'trip-passengers';
        }
        if (preg_match('#^/driver/#', $path)) {
            return 'driver';
        }
        if ($routeKey === 'POST /gps') {
            return 'gps';
        }
        if ($routeKey === 'GET /rastreamento' || $routeKey === 'GET /tracking') {
            return 'rastreamento';
        }
        if (preg_match('#^/seguranca/#', $path)) {
            return 'seguranca';
        }
        return explode('/', trim($path, '/'))[0] ?: 'status';
    }
}
