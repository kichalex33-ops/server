<?php

declare(strict_types=1);

require __DIR__ . '/src/Response.php';
require __DIR__ . '/src/Database.php';
require __DIR__ . '/src/StructuredLogger.php';
require __DIR__ . '/src/ErrorHandler.php';
require __DIR__ . '/src/Validator.php';
require __DIR__ . '/src/FileCache.php';
require __DIR__ . '/src/RateLimiter.php';
require __DIR__ . '/src/Jwt.php';
require __DIR__ . '/src/AuditLogger.php';
require __DIR__ . '/src/Auth.php';
require __DIR__ . '/src/Rbac.php';
require __DIR__ . '/src/RealtimePublisher.php';
require __DIR__ . '/src/ApiService.php';
require __DIR__ . '/src/AiService.php';
require __DIR__ . '/src/Router.php';
require __DIR__ . '/src/ApiMiddleware.php';
require __DIR__ . '/controllers/BaseController.php';
require __DIR__ . '/controllers/LegacyController.php';

$config = require __DIR__ . '/config/env.php';
ApiMiddleware::cors($config);

foreach ($config['paths'] as $path) {
    if (!is_dir($path)) {
        @mkdir($path, 0775, true);
    }
}

ErrorHandler::register($config);

$db = new Database($config);
$audit = new AuditLogger($db, $config);
$jwt = new Jwt($config['jwt_secret'], $config['jwt_issuer']);
$auth = new Auth($db, $jwt, $config, $audit);
$rbac = new Rbac();
$service = new ApiService($db, $config, $audit);
$ai = new AiService($db, $config, $audit);
$cache = new FileCache((string) ($config['paths']['cache'] ?? dirname(__DIR__) . '/../storage/cache'));

$request = ApiMiddleware::request();
$method = $request['method'];
$path = $request['path'];
$routeKey = $request['routeKey'];
$body = $request['body'];
ApiMiddleware::rejectLegacyPasswordHeader($method, $path);
$body = Validator::validateRoute($routeKey, $body);
$authorizationHeader = ApiMiddleware::authorizationHeader();
$user = ApiMiddleware::authenticate($method, $path, $routeKey, $auth, $service, $rbac, $audit);
$controller = new LegacyController($auth, $service, $ai, $user);
$router = new Router();

$router->get('/status', fn () => $controller->respond($cache->remember('status', 30, fn () => $service->status())));
$router->get('/system/health', fn () => $controller->respond($cache->remember('system-health', 30, fn () => $service->systemHealth())));
$router->get('/watchdog', fn () => $controller->respond($cache->remember('watchdog', 30, fn () => $service->watchdog())));
$router->get('/pwa/config', fn () => $controller->respond($service->pwaConfig()));
$router->get('/infra/status', fn () => $controller->respond($cache->remember('infra-status', 60, fn () => $service->infraStatus())));
$router->post('/infra/backup', fn () => $controller->respond($service->runBackup($user), 201));
$router->get('/dashboard/resumo-dia', fn () => $controller->respond($service->dashboardSummary()));
$router->get('/relatorios/viagens-historico', fn () => $controller->respond($service->tripsHistoryReport($_GET)));

$router->post('/auth/login', fn () => $controller->respond($auth->login($body)));
$router->post('/auth/refresh', fn () => $controller->respond($auth->refresh((string) ($body['refreshToken'] ?? $body['refresh_token'] ?? ''))));
$router->post('/auth/logout', fn () => $controller->respond($auth->logout((string) ($body['refreshToken'] ?? $body['refresh_token'] ?? ''), $user)));
$router->post('/auth/revoke-all', fn () => $controller->respond($auth->revokeAllTokens($user)));
$router->get('/auth/sessions', fn () => $controller->respond($auth->sessions($user)));
$router->post('/auth/sessions/{id}/revoke', fn (string $id) => $controller->respond($auth->revokeSession($id, $user)));

$router->post('/notifications/subscribe', fn () => $controller->respond($service->savePushSubscription($body, $user), 201));
$router->get('/notifications', fn () => $controller->respond($service->notifications($_GET, $user)));
$router->post('/notifications/test', fn () => $controller->respond($service->createNotification($body, $user), 201));
$router->post('/presenca', fn () => $controller->respond($service->heartbeatPresence($body, $user)));
$router->get('/presenca', fn () => $controller->respond($service->presenceList($_GET, $user)));
$router->get('/users/preferences', fn () => $controller->respond($service->getPreferences($user)));
$router->put('/users/preferences', fn () => $controller->respond($service->savePreferences($body, $user)));
$router->post('/analytics/events', fn () => $controller->respond($service->recordAnalytics($body, $user), 202));

$router->get('/gestao/operadores', fn () => $controller->respond($service->listOperadores($user)));
$router->post('/gestao/operadores', fn () => $controller->respond($service->createOperador($body, $user), 201));
$router->delete('/gestao/operadores/{id}', fn (string $id) => $controller->respond($service->deleteOperador($id, $user)));

$router->get('/motoristas', fn () => $controller->respond($service->listMotoristas()));
$router->post('/motoristas', fn () => $controller->respond($service->createMotorista($body, $user), 201));
$router->delete('/motoristas/{id}', fn (string $id) => $controller->respond($service->deleteMotorista($id, $user)));
$router->post('/motoristas/{id}/qrcode', fn (string $id) => $controller->respond($service->driverQr($id, $body, $user), 201));
$router->post('/operator/drivers/{id}/pairing', fn (string $id) => $controller->respond($service->driverQr($id, $body, $user), 201));
$router->post('/motoristas/{id}/activation-code', fn (string $id) => $controller->respond($service->driverActivationCode($id, $body, $user), 201));
$router->post('/operator/drivers/{id}/activation-code', fn (string $id) => $controller->respond($service->driverActivationCode($id, $body, $user), 201));
$router->post('/motoristas/{id}/reveal-app-password', fn (string $id) => $controller->respond($service->revealMotoristaAppPassword($id, $user)));

$router->post('/driver/qr-login', fn () => $controller->respond($service->driverQrLogin($body)));
$router->post('/driver/pairing/confirm', fn () => $controller->respond($service->driverQrLogin($body)));
$router->post('/driver/activate', fn () => $controller->respond($service->driverActivate($body)));
$router->post('/driver/login', fn () => $controller->respond($service->driverLogin($body)));
$router->get('/driver/trips', fn () => $controller->respond($service->driverTrips($_GET['motorista_id'] ?? $_GET['id'] ?? null, $user)));
$router->get('/driver/trips/active', fn () => $controller->respond($service->activeDriverTrip($_GET['motorista_id'] ?? $_GET['id'] ?? null, $user)));
$router->get('/driver/notices', fn () => $controller->respond($service->driverNotices($_GET['motorista_id'] ?? null, $user)));
$router->get('/driver/events', fn () => $controller->respond($service->driverEvents($user)));
$router->post('/driver/events', fn () => $controller->respond($service->genericCreate('eventos', $controller->scoped($body), $user), 201));
$router->get('/driver/locations', fn () => $controller->respond($service->driverLocations($user)));
$router->post('/driver/locations', function () use ($controller, $service, $body, $user): void {
    $scoped = $controller->scoped($body);
    if (!empty($body['viagem_id']) || !empty($body['viagemId'])) {
        $controller->respond($service->addGps($scoped, $user), 201);
        return;
    }
    $controller->respond($service->genericCreate('localizacoes', $scoped, $user), 201);
});
$router->get('/driver/trips/status', fn () => $controller->respond($service->listTripStatuses($user)));
$router->post('/driver/trips/status', fn () => $controller->respond($service->driverTripStatus($controller->scoped($body), $user), 201));
$router->post('/driver/sync', fn () => $controller->respond($service->driverSync($controller->scoped($body), $user), 201));
$router->post('/driver/change-password', fn () => $controller->respond($service->driverChangePassword($authorizationHeader, $body)));
$router->post('/driver/trips/{id}/checklist', fn (string $id) => $controller->respond($service->driverChecklist($id, $controller->scoped($body), $user), 201));
$router->post('/driver/trips/{id}/km-inicial', fn (string $id) => $controller->respond($service->driverInitialKm($id, $controller->scoped($body), $user)));
$router->post('/driver/trips/{id}/flow', fn (string $id) => $controller->respond($service->driverFlow($id, $controller->scoped($body), $user)));
$router->post('/driver/trips/{id}/finalizar', fn (string $id) => $controller->respond($service->driverFinalizeTrip($id, $controller->scoped($body), $user)));
$router->post('/driver/panic', fn () => $controller->respond($service->driverPanic($controller->scoped($body), $user), 201));
$router->post('/driver/occurrences', fn () => $controller->respond($service->genericCreate('ocorrencias', $controller->scoped($body), $user), 201));
$router->post('/driver/messages', fn () => $controller->respond($service->genericCreate('mensagens', $controller->scoped($body), $user), 201));
$router->post('/driver/proofs', fn () => $controller->respond($service->driverProof($controller->scoped($body), $user), 201));
$router->post('/driver/passengers/{id}/{action}', fn (string $id, string $action) => $controller->respond($service->driverPassengerAction($id, $action, $controller->scoped($body), $user)));

$router->post('/gps', fn () => $controller->respond($service->addGps($controller->scoped($body), $user), 201));
$router->get('/live-map', fn () => $controller->respond($service->liveMap()));
$router->get('/rastreamento', fn () => $controller->respond($service->tracking($_GET)));
$router->get('/tracking', fn () => $controller->respond($service->tracking($_GET)));

$router->get('/emergencias', fn () => $controller->respond($service->emergencies()));
$router->post('/emergencias/{id}/atender', fn (string $id) => $controller->respond($service->updateEmergency($id, 'em_atendimento', $user)));
$router->post('/emergencias/{id}/finalizar', fn (string $id) => $controller->respond($service->updateEmergency($id, 'finalizada', $user)));

$router->get('/ai/status', fn () => $controller->respond($ai->status()));
$router->post('/ai/chat', fn () => $controller->respond($ai->chat($body, $user)));
$router->post('/ai/question', fn () => $controller->respond($ai->chat($body, $user)));
$router->post('/ai/ask', fn () => $controller->respond($ai->chat($body, $user)));
$router->post('/ai/operational-summary', fn () => $controller->respond($ai->operationalSummary($body, $user)));
$router->post('/ai/manager-report', fn () => $controller->respond($ai->managerReport($body, $user)));
$router->post('/ai/trip-analysis', fn () => $controller->respond($ai->tripAnalysis($body, $user)));
$router->post('/ai/statistics', fn () => $controller->respond($ai->statistics($body, $user)));
$router->post('/ai/route-intelligence', fn () => $controller->respond($ai->routeIntelligence($body, $user)));
$router->post('/ai/weather', fn () => $controller->respond($ai->weather($body, $user)));
$router->get('/ai/sugestoes-agendamento', fn () => $controller->respond($service->operatorSuggestions($user)));
$router->get('/ai/anomalias-viagens', fn () => $controller->respond($service->tripAnomalies($user)));
$router->get('/destinos/sugestoes', fn () => $controller->respond($service->destinationSuggestions($_GET)));
$router->get('/integrations/cnes/search', fn () => $controller->respond($service->integrationCnesSearch($_GET)));
$router->get('/gamificacao/resumo', fn () => $controller->respond($service->gamificationSummary($user)));

$router->get('/viagens/{id}', fn (string $id) => $controller->respond(['viagem' => $service->findById('viagens', $id)]));
$router->get('/viagens/{id}/comentarios', fn (string $id) => $controller->respond($service->tripComments($id, $user)));
$router->post('/viagens/{id}/comentarios', fn (string $id) => $controller->respond($service->addTripComment($id, $body, $user), 201));
$router->post('/viagens/{id}/assinatura', fn (string $id) => $controller->respond($service->saveTripSignature($id, $body, $user), 201));
$router->post('/viagens/{id}/cancelar', fn (string $id) => $controller->respond($service->cancelTrip($id, $body, $user)));
$router->post('/viagens/{id}/status', fn (string $id) => $controller->respond($service->operatorTripStatus($id, $body, $user)));
$router->patch('/viagens/{id}/status', fn (string $id) => $controller->respond($service->operatorTripStatus($id, $body, $user)));
$router->post('/viagens/{id}/reatribuir', fn (string $id) => $controller->respond($service->reassignTrip($id, $body, $user)));
$router->get('/viagens/{id}/passageiros', function (string $id) use ($controller, $service, $user): void {
    if (strtoupper((string) ($user['perfil'] ?? '')) === 'MOTORISTA') {
        $service->assertDriverCanAccessTripId($id, $user);
    }
    $controller->respond($service->listTripPassengers($id, $user));
});

$router->get('/sync/painel', fn () => $controller->respond($service->syncPanel($user)));
$router->post('/sync/reenvio', fn () => $controller->respond($service->syncReenvio($user)));
$router->post('/sync/offline', fn () => $controller->respond($service->offlineSync($body, $user), 207));
$router->post('/sync/resolve-conflict', fn () => $controller->respond($service->resolveSyncConflict($body, $user)));

$router->get('/indicadores/operador', fn () => $controller->respond($service->operatorIndicators()));
$router->get('/operator/pairings/{id}/status', fn (string $id) => $controller->respond($service->pairingStatus($id)));
$router->post('/operator/pairings/{id}/cancel', fn (string $id) => $controller->respond($service->cancelPairing($id, $user)));

$router->get('/gestao/dashboard', fn () => $controller->respond($service->dashboard()));
$router->get('/gestao/frota', fn () => $controller->respond($service->managementFleet()));
$router->get('/gestao/motoristas', fn () => $controller->respond($service->managementDrivers()));
$router->get('/gestao/passageiros', fn () => $controller->respond($service->managementPassengers()));
$router->get('/gestao/custos', fn () => $controller->respond($service->managementCosts()));
$router->get('/gestao/auditoria', fn () => $controller->respond($service->audit()));
$router->get('/auditoria', fn () => $controller->respond($service->audit()));
$router->get('/seguranca/login-attempts', fn () => $controller->respond($service->securityLoginAttempts()));
$router->get('/lgpd', fn () => $controller->respond($service->lgpdReport()));
$router->post('/lgpd/consents', fn () => $controller->respond($service->registerConsent($body, $user), 201));
$router->post('/lgpd/anonymization-requests', fn () => $controller->respond($service->requestAnonymization($body, $user), 201));
$router->get('/graficos/{name}', fn (string $name) => $controller->respond(['datasets' => $service->chart($name)]));
$router->get('/export/csv', fn () => $controller->respondCsv((string) ($_GET['tipo'] ?? 'eventos') . '.csv', $service->export((string) ($_GET['tipo'] ?? 'eventos'))));

$genericTables = ['viagens', 'veiculos', 'pacientes', 'destinos', 'passageiros', 'despesas', 'ocorrencias', 'alertas', 'mensagens', 'checklists', 'eventos', 'localizacoes'];
foreach ($genericTables as $table) {
    $router->get('/' . $table, fn () => $controller->respond($service->genericList($table, $_GET)));
    $router->post('/' . $table, fn () => $controller->respond($service->genericCreate($table, $body, $user), 201));
    $router->delete('/' . $table . '/{id}', fn (string $id) => $controller->respond($service->genericDelete($table, $id, $user)));
}

if (!$router->dispatch($method, $path)) {
    Response::error('Endpoint não encontrado.', 404);
}
