<?php

declare(strict_types=1);

require __DIR__ . '/src/Response.php';
require __DIR__ . '/src/Database.php';
require __DIR__ . '/src/Jwt.php';
require __DIR__ . '/src/AuditLogger.php';
require __DIR__ . '/src/Auth.php';
require __DIR__ . '/src/RegulationProposalService.php';

$config = require __DIR__ . '/config/env.php';
$db = new Database($config);
$audit = new AuditLogger($db, $config);
$jwt = new Jwt($config['jwt_secret'], $config['jwt_issuer']);
$auth = new Auth($db, $jwt, $config, $audit);
$service = new RegulationProposalService($db, $audit);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = propostaPath($uri);
$body = json_decode(file_get_contents('php://input') ?: '[]', true);
if (!is_array($body)) {
    $body = [];
}

if ($method === 'GET' && $path === '/status') {
    Response::ok(['ok' => true, 'modulo' => 'propostas', 'timestamp' => date('c')]);
    return;
}

try {
    $user = $auth->userFromBearer($_SERVER['HTTP_AUTHORIZATION'] ?? null);
    $perfil = strtoupper((string) ($user['perfil'] ?? ''));
    if (!in_array($perfil, ['ADMIN', 'GESTOR', 'OPERADOR'], true)) {
        Response::error('Acesso negado às propostas de regulação.', 403);
        return;
    }

    if ($method === 'POST' && preg_match('#^/([^/]+)/aprovar$#', $path, $m)) {
        Response::ok($service->approve(rawurldecode($m[1]), $body, $user), 201);
        return;
    }

    if ($method === 'POST' && preg_match('#^/([^/]+)/rejeitar$#', $path, $m)) {
        Response::ok($service->reject(rawurldecode($m[1]), $body, $user));
        return;
    }

    Response::error('Endpoint de proposta não encontrado.', 404);
} catch (Throwable $error) {
    $status = $error instanceof PDOException ? 500 : 400;
    Response::error($status === 500 ? 'Erro interno de banco de dados.' : $error->getMessage(), $status);
}

function propostaPath(string $uri): string
{
    if (preg_match('#/api/propostas\.php#', $uri, $m, PREG_OFFSET_CAPTURE)) {
        $uri = substr($uri, $m[0][1] + strlen('/api/propostas.php'));
    }
    $path = '/' . trim($uri, '/');
    return $path === '/' ? '/status' : $path;
}
