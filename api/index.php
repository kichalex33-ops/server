<?php

declare(strict_types=1);

require __DIR__ . '/src/Response.php';
require __DIR__ . '/src/Database.php';
require __DIR__ . '/src/Jwt.php';
require __DIR__ . '/src/AuditLogger.php';
require __DIR__ . '/src/Auth.php';
require __DIR__ . '/src/Rbac.php';
require __DIR__ . '/src/ApiService.php';
require __DIR__ . '/src/AiService.php';

$config = require __DIR__ . '/config/env.php';

foreach ($config['paths'] as $path) {
    if (!is_dir($path)) {
        @mkdir($path, 0775, true);
    }
}

set_exception_handler(function (Throwable $error) use ($config): void {
    $dir = $config['paths']['logs'];
    @file_put_contents($dir . '/api.log', '[' . date('c') . '] exception method=' . ($_SERVER['REQUEST_METHOD'] ?? '-') . ' uri=' . ($_SERVER['REQUEST_URI'] ?? '-') . ' message=' . $error->getMessage() . "\n", FILE_APPEND);
    $message = $error->getMessage();
    $status = $error instanceof DomainException ? 403 : 400;
    if ($error instanceof PDOException) {
        $status = 500;
        $message = 'Erro interno de banco de dados.';
    } elseif (preg_match('/(credenciais|login inv|token inv|token expir|qr code expir)/i', $message)) {
        $status = 401;
    }
    Response::error($message, $status);
});

$db = new Database($config);
$audit = new AuditLogger($db, $config);
$jwt = new Jwt($config['jwt_secret'], $config['jwt_issuer']);
$auth = new Auth($db, $jwt, $config, $audit);
$rbac = new Rbac();
$service = new ApiService($db, $config, $audit);
$ai = new AiService($db, $config, $audit);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = internalApiPath($uri);
$body = json_decode(file_get_contents('php://input') ?: '[]', true);
if (!is_array($body)) {
    $body = [];
}

$publicRoutes = [
    'GET /status',
    'GET /system/health',
    'GET /watchdog',
    'POST /auth/login',
    'POST /auth/refresh',
    'POST /driver/qr-login',
    'POST /driver/pairing/confirm',
    'POST /driver/activate',
    'POST /driver/login',
];

$routeKey = $method . ' ' . $path;
$authorizationHeader = authorizationHeader();
$user = null;
if (!isPublicRoute($method, $path, $routeKey, $publicRoutes)) {
    $authError = null;
    try {
        $user = $auth->userFromBearer($authorizationHeader);
    } catch (Throwable $error) {
        $authError = $error;
    }

    if (isProtectedDriverRoute($method, $path, $routeKey)) {
        $driverUser = $service->driverUserFromBearer($authorizationHeader);
        if ($user && strtoupper((string) ($user['perfil'] ?? '')) === 'MOTORISTA') {
            $user = $driverUser;
        } elseif (!$user) {
            $user = $driverUser;
        }
    }

    if (!$user) {
        $audit->failure($authError ? 'auth_invalid' : 'auth_required', null, null);
        $message = isProtectedDriverRoute($method, $path, $routeKey)
            ? 'Token de motorista obrigatório.'
            : 'Token inválido ou expirado.';
        Response::error($message, 401);
        return;
    }

    $resource = routeResource($path, $routeKey);
    $rbac->require($user, $resource);
}

if ($routeKey === 'GET /status') {
    Response::ok($service->status());
    return;
}
if ($routeKey === 'GET /system/health') {
    Response::ok($service->systemHealth());
    return;
}
if ($routeKey === 'GET /watchdog') {
    Response::ok($service->watchdog());
    return;
}
if ($routeKey === 'GET /infra/status') {
    Response::ok($service->infraStatus());
    return;
}
if ($routeKey === 'POST /infra/backup') {
    Response::ok($service->runBackup($user), 201);
    return;
}
if ($routeKey === 'GET /dashboard/resumo-dia') {
    Response::ok($service->dashboardSummary());
    return;
}
if ($routeKey === 'GET /relatorios/viagens-historico') {
    Response::ok($service->tripsHistoryReport($_GET));
    return;
}
if ($routeKey === 'POST /auth/login') {
    Response::ok($auth->login($body));
    return;
}
if ($routeKey === 'POST /auth/refresh') {
    Response::ok($auth->refresh((string) ($body['refreshToken'] ?? $body['refresh_token'] ?? '')));
    return;
}
if ($routeKey === 'POST /auth/logout') {
    Response::ok($auth->logout((string) ($body['refreshToken'] ?? $body['refresh_token'] ?? ''), $user));
    return;
}

if ($routeKey === 'GET /gestao/operadores') {
    Response::ok($service->listOperadores($user));
    return;
}
if ($routeKey === 'POST /gestao/operadores') {
    Response::ok($service->createOperador($body, $user), 201);
    return;
}
if ($method === 'DELETE' && preg_match('#^/gestao/operadores/([^/]+)$#', $path, $m)) {
    Response::ok($service->deleteOperador($m[1], $user));
    return;
}
if ($routeKey === 'GET /motoristas') {
    Response::ok($service->listMotoristas());
    return;
}
if ($routeKey === 'POST /motoristas') {
    Response::ok($service->createMotorista($body, $user), 201);
    return;
}
if ($method === 'DELETE' && preg_match('#^/motoristas/([^/]+)$#', $path, $m)) {
    Response::ok($service->deleteMotorista($m[1], $user));
    return;
}
if ($method === 'POST' && preg_match('#^/motoristas/([^/]+)/qrcode$#', $path, $m)) {
    Response::ok($service->driverQr($m[1], $body, $user), 201);
    return;
}
if ($method === 'POST' && preg_match('#^/operator/drivers/([^/]+)/pairing$#', $path, $m)) {
    Response::ok($service->driverQr($m[1], $body, $user), 201);
    return;
}
if ($method === 'POST' && preg_match('#^/motoristas/([^/]+)/activation-code$#', $path, $m)) {
    Response::ok($service->driverActivationCode($m[1], $body, $user), 201);
    return;
}
if ($method === 'POST' && preg_match('#^/operator/drivers/([^/]+)/activation-code$#', $path, $m)) {
    Response::ok($service->driverActivationCode($m[1], $body, $user), 201);
    return;
}
if ($method === 'POST' && preg_match('#^/motoristas/([^/]+)/reveal-app-password$#', $path, $m)) {
    Response::ok($service->revealMotoristaAppPassword($m[1], $user));
    return;
}
if ($routeKey === 'POST /driver/qr-login') {
    Response::ok($service->driverQrLogin($body));
    return;
}
if ($routeKey === 'POST /driver/pairing/confirm') {
    Response::ok($service->driverQrLogin($body));
    return;
}
if ($routeKey === 'POST /driver/activate') {
    Response::ok($service->driverActivate($body));
    return;
}
if ($routeKey === 'POST /driver/login') {
    Response::ok($service->driverLogin($body));
    return;
}
if ($routeKey === 'GET /driver/trips') {
    Response::ok($service->driverTrips($_GET['motorista_id'] ?? $_GET['id'] ?? null, $user));
    return;
}
if ($routeKey === 'GET /driver/trips/active') {
    Response::ok($service->activeDriverTrip($_GET['motorista_id'] ?? $_GET['id'] ?? null, $user));
    return;
}
if ($routeKey === 'GET /driver/notices') {
    Response::ok($service->driverNotices($_GET['motorista_id'] ?? null, $user));
    return;
}
if ($routeKey === 'GET /driver/events') {
    Response::ok($service->driverEvents($user));
    return;
}
if ($routeKey === 'POST /driver/events') {
    Response::ok($service->genericCreate('eventos', driverScopedBody($body, $user), $user), 201);
    return;
}
if ($routeKey === 'GET /driver/locations') {
    Response::ok($service->driverLocations($user));
    return;
}
if ($routeKey === 'POST /driver/locations') {
    if (!empty($body['viagem_id']) || !empty($body['viagemId'])) {
        Response::ok($service->addGps(driverScopedBody($body, $user), $user), 201);
    } else {
        Response::ok($service->genericCreate('localizacoes', driverScopedBody($body, $user), $user), 201);
    }
    return;
}
if ($routeKey === 'GET /driver/trips/status') {
    Response::ok($service->listTripStatuses($user));
    return;
}
if ($routeKey === 'POST /driver/trips/status') {
    Response::ok($service->driverTripStatus(driverScopedBody($body, $user), $user), 201);
    return;
}
if ($routeKey === 'POST /driver/sync') {
    Response::ok($service->driverSync(driverScopedBody($body, $user), $user), 201);
    return;
}
if ($routeKey === 'POST /driver/change-password') {
    Response::ok($service->driverChangePassword($authorizationHeader, $body));
    return;
}
if ($routeKey === 'POST /gps') {
    Response::ok($service->addGps(driverScopedBody($body, $user), $user), 201);
    return;
}
if ($routeKey === 'GET /live-map') {
    Response::ok($service->liveMap());
    return;
}
if ($routeKey === 'GET /rastreamento' || $routeKey === 'GET /tracking') {
    Response::ok($service->tracking($_GET));
    return;
}
if ($routeKey === 'GET /emergencias') {
    Response::ok($service->emergencies());
    return;
}
if ($method === 'POST' && preg_match('#^/emergencias/([^/]+)/atender$#', $path, $m)) {
    Response::ok($service->updateEmergency($m[1], 'em_atendimento', $user));
    return;
}
if ($method === 'POST' && preg_match('#^/emergencias/([^/]+)/finalizar$#', $path, $m)) {
    Response::ok($service->updateEmergency($m[1], 'finalizada', $user));
    return;
}
if ($routeKey === 'GET /ai/status') {
    Response::ok($ai->status());
    return;
}

if ($routeKey === 'POST /ai/chat' || $routeKey === 'POST /ai/question' || $routeKey === 'POST /ai/ask') {
    Response::ok($ai->chat($body, $user));
    return;
}
if ($routeKey === 'POST /ai/operational-summary') {
    Response::ok($ai->operationalSummary($body, $user));
    return;
}
if ($routeKey === 'POST /ai/manager-report') {
    Response::ok($ai->managerReport($body, $user));
    return;
}
if ($routeKey === 'POST /ai/trip-analysis') {
    Response::ok($ai->tripAnalysis($body, $user));
    return;
}
if ($routeKey === 'POST /ai/statistics') {
    Response::ok($ai->statistics($body, $user));
    return;
}
if ($routeKey === 'POST /ai/route-intelligence') {
    Response::ok($ai->routeIntelligence($body, $user));
    return;
}
if ($routeKey === 'POST /ai/weather') {
    Response::ok($ai->weather($body, $user));
    return;
}
if ($method === 'GET' && preg_match('#^/viagens/([^/]+)$#', $path, $m)) {
    Response::ok(['viagem' => $service->findById('viagens', $m[1])]);
    return;
}
if ($method === 'POST' && preg_match('#^/viagens/([^/]+)/cancelar$#', $path, $m)) {
    Response::ok($service->cancelTrip($m[1], $body, $user));
    return;
}
if ($method === 'POST' && preg_match('#^/viagens/([^/]+)/reatribuir$#', $path, $m)) {
    Response::ok($service->reassignTrip($m[1], $body, $user));
    return;
}
if ($method === 'GET' && preg_match('#^/viagens/([^/]+)/passageiros$#', $path, $m)) {
    // H526 FIX: motorista so pode ver passageiros de viagens proprias
    if (strtoupper((string) ($user['perfil'] ?? '')) === 'MOTORISTA') {
        $service->assertDriverCanAccessTripId($m[1], $user);
    }
    Response::ok($service->listTripPassengers($m[1], $user));
    return;
}
if ($method === 'POST' && preg_match('#^/driver/trips/([^/]+)/checklist$#', $path, $m)) {
    Response::ok($service->driverChecklist($m[1], driverScopedBody($body, $user), $user), 201);
    return;
}
if ($method === 'POST' && preg_match('#^/driver/trips/([^/]+)/km-inicial$#', $path, $m)) {
    Response::ok($service->driverInitialKm($m[1], driverScopedBody($body, $user), $user));
    return;
}
if ($method === 'POST' && preg_match('#^/driver/trips/([^/]+)/flow$#', $path, $m)) {
    Response::ok($service->driverFlow($m[1], driverScopedBody($body, $user), $user));
    return;
}
if ($method === 'POST' && preg_match('#^/driver/trips/([^/]+)/finalizar$#', $path, $m)) {
    Response::ok($service->driverFinalizeTrip($m[1], driverScopedBody($body, $user), $user));
    return;
}
if ($routeKey === 'POST /driver/panic') {
    Response::ok($service->driverPanic(driverScopedBody($body, $user), $user), 201);
    return;
}
if ($routeKey === 'POST /driver/occurrences') {
    Response::ok($service->genericCreate('ocorrencias', driverScopedBody($body, $user), $user), 201);
    return;
}
if ($routeKey === 'POST /driver/messages') {
    Response::ok($service->genericCreate('mensagens', driverScopedBody($body, $user), $user), 201);
    return;
}
if ($routeKey === 'POST /driver/proofs') {
    Response::ok($service->driverProof(driverScopedBody($body, $user), $user), 201);
    return;
}
if ($method === 'POST' && preg_match('#^/driver/passengers/([^/]+)/(boarding|dropoff|absent)$#', $path, $m)) {
    Response::ok($service->driverPassengerAction($m[1], $m[2], driverScopedBody($body, $user), $user));
    return;
}
if ($routeKey === 'GET /sync/painel') {
    Response::ok($service->syncPanel($user));
    return;
}
if ($routeKey === 'POST /sync/reenvio') {
    Response::ok($service->syncReenvio($user));
    return;
}
if ($routeKey === 'GET /indicadores/operador') {
    Response::ok($service->operatorIndicators());
    return;
}
if ($method === 'GET' && preg_match('#^/operator/pairings/([^/]+)/status$#', $path, $m)) {
    Response::ok($service->pairingStatus($m[1]));
    return;
}
if ($method === 'POST' && preg_match('#^/operator/pairings/([^/]+)/cancel$#', $path, $m)) {
    Response::ok($service->cancelPairing($m[1], $user));
    return;
}
if ($routeKey === 'GET /gestao/dashboard') {
    Response::ok($service->dashboard());
    return;
}
if ($routeKey === 'GET /gestao/frota') {
    Response::ok($service->managementFleet());
    return;
}
if ($routeKey === 'GET /gestao/motoristas') {
    Response::ok($service->managementDrivers());
    return;
}
if ($routeKey === 'GET /gestao/passageiros') {
    Response::ok($service->managementPassengers());
    return;
}
if ($routeKey === 'GET /gestao/custos') {
    Response::ok($service->managementCosts());
    return;
}
if ($routeKey === 'GET /gestao/auditoria' || $routeKey === 'GET /auditoria') {
    Response::ok($service->audit());
    return;
}
if ($routeKey === 'GET /seguranca/login-attempts') {
    Response::ok($service->securityLoginAttempts());
    return;
}
if ($routeKey === 'GET /lgpd') {
    Response::ok($service->lgpdReport());
    return;
}
if ($routeKey === 'POST /lgpd/consents') {
    Response::ok($service->registerConsent($body, $user), 201);
    return;
}
if ($routeKey === 'POST /lgpd/anonymization-requests') {
    Response::ok($service->requestAnonymization($body, $user), 201);
    return;
}
if ($method === 'GET' && preg_match('#^/graficos/([^/]+)$#', $path, $m)) {
    Response::ok(['datasets' => $service->chart($m[1])]);
    return;
}
if ($routeKey === 'GET /export/csv') {
    Response::csv(($_GET['tipo'] ?? 'eventos') . '.csv', $service->export((string) ($_GET['tipo'] ?? 'eventos')));
    return;
}

$genericTables = ['viagens', 'veiculos', 'pacientes', 'destinos', 'passageiros', 'despesas', 'ocorrencias', 'alertas', 'mensagens', 'checklists', 'eventos', 'localizacoes'];
$first = explode('/', trim($path, '/'))[0] ?? '';
if (in_array($first, $genericTables, true) && $method === 'GET' && $path === '/' . $first) {
    Response::ok($service->genericList($first));
    return;
}
if (in_array($first, $genericTables, true) && $method === 'POST' && $path === '/' . $first) {
    Response::ok($service->genericCreate($first, $body, $user), 201);
    return;
}
if (in_array($first, $genericTables, true) && $method === 'DELETE' && preg_match('#^/' . preg_quote($first, '#') . '/([^/]+)$#', $path, $m)) {
    Response::ok($service->genericDelete($first, rawurldecode($m[1]), $user));
    return;
}

Response::error('Endpoint não encontrado.', 404);

function internalApiPath(string $uri): string
{
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/api/index.php');
    $apiBase = rtrim(str_replace('/index.php', '', $script), '/');
    if ($apiBase !== '' && strpos($uri, $apiBase) === 0) {
        $uri = substr($uri, strlen($apiBase));
    } elseif (preg_match('#/api(?:/|$)#', $uri, $match, PREG_OFFSET_CAPTURE)) {
        $uri = substr($uri, $match[0][1] + 4);
    }
    $path = '/' . trim($uri, '/');
    return $path === '/' ? '/status' : $path;
}


function authorizationHeader(): ?string
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

function isPublicRoute(string $method, string $path, string $routeKey, array $publicRoutes): bool
{
    return in_array($routeKey, $publicRoutes, true);
}

function isProtectedDriverRoute(string $method, string $path, string $routeKey): bool
{
    if (preg_match('#^/driver/#', $path)) {
        return !in_array($routeKey, ['POST /driver/activate', 'POST /driver/login', 'POST /driver/qr-login', 'POST /driver/pairing/confirm'], true);
    }
    return $routeKey === 'POST /gps';
}


function driverScopedBody(array $body, ?array $user): array
{
    if (strtoupper((string) ($user['perfil'] ?? '')) === 'MOTORISTA') {
        $driverId = (string) ($user['id'] ?? '');
        if ($driverId !== '') {
            $body['motorista_id'] = $driverId;
            $body['motoristaId'] = $driverId;
        }
    }
    return $body;
}

function routeResource(string $path, string $routeKey): string
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
