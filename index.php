<?php
/**
 * homologacao/index.php
 * Ponto de entrada alternativo — o .htaccess já redireciona / para portal.html.
 * Este arquivo existe como fallback para ambientes sem mod_rewrite.
 */
declare(strict_types=1);

$portal = __DIR__ . '/public/portal.html';
if (!is_file($portal)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Portal indisponível. Contate o suporte.';
    exit;
}

if (!headers_sent()) {
    header('Content-Type: text/html; charset=utf-8');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://fonts.googleapis.com; img-src 'self' data: blob:; connect-src 'self' https://agsap.com.br https://api.open-meteo.com; font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}

readfile($portal);
