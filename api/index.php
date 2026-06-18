<?php

declare(strict_types=1);

require __DIR__ . '/src/Response.php';
require __DIR__ . '/src/Database.php';
require __DIR__ . '/src/Jwt.php';
require __DIR__ . '/src/AuditLogger.php';
require __DIR__ . '/src/Auth.php';
require __DIR__ . '/src/Rbac.php';
require __DIR__ . '/src/ApiService.php';

$config = require __DIR__ . '/config/env.php';

foreach ($config['paths'] as $path) {
    if (!is_dir($path)) {
        @mkdir($path, 0775, true);
    }
}

set_exception_handler(function (Throwable $error) use ($config): void {
    $dir = $config['paths']['logs'];
    @file_put_contents($dir . '/api.log', '[' . date('c') . '] exception ' . $error->getMessage() . "\n", FILE_APPEND);
    $status = $error instanceof DomainException ? 403 : 400;
    Response::error($error->getMessage(), $status);
});

$db = new Database($config);
$audit = new AuditLogger($db, $config);
$jwt = new Jwt($config['jwt_secret'], $config['jwt_issuer']);
$auth = new Auth($db, $jwt, $config, $audit);
$rbac = new Rbac();
$service = new ApiService($db, $config, $audit);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/api#', '', $uri);
$path = '/' . trim((string) $path, '/');
$body = json_decode(file_get_contents('php://input') ?: '[]', true);
if (!is_array($body)) {
    $body = [];
}

$publicRoutes = [
    'GET /status',
    'GET /system/health',
    'POST /auth/login',
    'POST /auth/refresh',
    'POST /driver/qr-login',
    'POST /driver/pairing/confirm',
    'POST /driver/login',
    'GET /driver/trips',
    'GET /driver/trips/active',
    'GET /driver/notices',
    'GET /driver/events',
    'POST /driver/events',
    'GET /driver/locations',
    'POST /driver/locations',
    'GET /driver/trips/status',
    'POST /driver/trips/status',
    'POST /driver/sync',
    'POST /driver/change-password',
    'POST /gps',
    'GET /live-map',
    'GET /viagens',
    'GET /motoristas',
    'GET /veiculos',
    'GET /pacientes',
];

$routeKey = $method . ' ' . $path;
$user = null;
if (!isPublicRoute($method, $path, $routeKey, $publicRoutes)) {
    $user = $auth->userFromBearer($_SERVER['HTTP_AUTHORIZATION'] ?? null);
    if (!$user) {
        $audit->failure('auth_required', null, null);
        Response::error('Autenticação obrigatória.', 401);
        return;
    }
    $resource = explode('/', trim($path, '/'))[0] ?: 'status';
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
if ($routeKey === 'GET /dashboard/resumo-dia') {
    Response::ok($service->dashboardSummary());
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
if ($routeKey === 'GET /motoristas') {
    Response::ok($service->listMotoristas());
    return;
}
if ($routeKey === 'POST /motoristas') {
    Response::ok($service->createMotorista($body, $user), 201);
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
if ($routeKey === 'POST /driver/qr-login') {
    Response::ok($service->driverQrLogin($body));
    return;
}
if ($routeKey === 'POST /driver/pairing/confirm') {
    Response::ok($service->driverQrLogin($body));
    return;
}
if ($routeKey === 'POST /driver/login') {
    Response::ok($service->driverLogin($body));
    return;
}
if ($routeKey === 'GET /driver/trips') {
    Response::ok($service->driverTrips($_GET['motorista_id'] ?? $_GET['id'] ?? null));
    return;
}
if ($routeKey === 'GET /driver/trips/active') {
    Response::ok($service->activeDriverTrip($_GET['motorista_id'] ?? $_GET['id'] ?? null));
    return;
}
if ($routeKey === 'GET /driver/notices') {
    Response::ok($service->driverNotices($_GET['motorista_id'] ?? null));
    return;
}
if ($routeKey === 'GET /driver/events') {
    Response::ok($service->genericList('eventos'));
    return;
}
if ($routeKey === 'POST /driver/events') {
    Response::ok($service->genericCreate('eventos', $body), 201);
    return;
}
if ($routeKey === 'GET /driver/locations') {
    Response::ok($service->genericList('localizacoes'));
    return;
}
if ($routeKey === 'POST /driver/locations') {
    Response::ok($service->genericCreate('localizacoes', $body), 201);
    return;
}
if ($routeKey === 'GET /driver/trips/status') {
    Response::ok($service->listTripStatuses());
    return;
}
if ($routeKey === 'POST /driver/trips/status') {
    Response::ok($service->driverTripStatus($body), 201);
    return;
}
if ($routeKey === 'POST /driver/sync') {
    Response::ok($service->driverSync($body), 201);
    return;
}
if ($routeKey === 'POST /driver/change-password') {
    Response::ok($service->driverChangePassword($_SERVER['HTTP_AUTHORIZATION'] ?? null, $body));
    return;
}
if ($routeKey === 'POST /gps') {
    Response::ok($service->addGps($body), 201);
    return;
}
if ($routeKey === 'GET /live-map') {
    Response::ok($service->liveMap());
    return;
}
if ($method === 'GET' && preg_match('#^/viagens/([^/]+)$#', $path, $m)) {
    Response::ok(['viagem' => $service->findById('viagens', $m[1])]);
    return;
}
if ($method === 'GET' && preg_match('#^/viagens/([^/]+)/passageiros$#', $path, $m)) {
    Response::ok($service->listByTrip('passageiros', $m[1]));
    return;
}
if ($method === 'POST' && preg_match('#^/driver/trips/([^/]+)/checklist$#', $path, $m)) {
    Response::ok($service->driverChecklist($m[1], $body), 201);
    return;
}
if ($method === 'POST' && preg_match('#^/driver/trips/([^/]+)/km-inicial$#', $path, $m)) {
    Response::ok($service->driverInitialKm($m[1], $body));
    return;
}
if ($method === 'POST' && preg_match('#^/driver/trips/([^/]+)/flow$#', $path, $m)) {
    Response::ok($service->driverFlow($m[1], $body));
    return;
}
if ($method === 'POST' && preg_match('#^/driver/trips/([^/]+)/finalizar$#', $path, $m)) {
    Response::ok($service->driverFinalizeTrip($m[1], $body));
    return;
}
if ($routeKey === 'POST /driver/panic') {
    Response::ok($service->driverPanic($body), 201);
    return;
}
if ($routeKey === 'POST /driver/proofs') {
    Response::ok($service->driverProof($body), 201);
    return;
}
if ($routeKey === 'GET /indicadores/operador') {
    Response::ok($service->operatorIndicators());
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

$genericTables = ['viagens', 'veiculos', 'pacientes', 'despesas', 'ocorrencias', 'alertas', 'mensagens', 'checklists', 'eventos', 'localizacoes'];
$first = explode('/', trim($path, '/'))[0] ?? '';
if (in_array($first, $genericTables, true) && $method === 'GET' && $path === '/' . $first) {
    Response::ok($service->genericList($first));
    return;
}
if (in_array($first, $genericTables, true) && $method === 'POST' && $path === '/' . $first) {
    Response::ok($service->genericCreate($first, $body, $user), 201);
    return;
}

Response::error('Endpoint não encontrado.', 404);

function isPublicRoute(string $method, string $path, string $routeKey, array $publicRoutes): bool
{
    if (in_array($routeKey, $publicRoutes, true)) {
        return true;
    }
    if ($method === 'GET' && preg_match('#^/(viagens|motoristas|veiculos|pacientes)(?:/[^/]+)?$#', $path)) {
        return true;
    }
    if ($method === 'GET' && preg_match('#^/viagens/[^/]+/passageiros$#', $path)) {
        return true;
    }
    if (preg_match('#^/driver/#', $path)) {
        return true;
    }
    return false;
}
