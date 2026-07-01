<?php

declare(strict_types=1);

$portal = __DIR__ . '/public/portal.html';
if (!is_file($portal)) {
    http_response_code(404);
    echo 'Portal nao encontrado.';
    exit;
}

header('Content-Type: text/html; charset=utf-8');
readfile($portal);
