<?php

declare(strict_types=1);

final class Response
{
    public static function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        if (class_exists('StructuredLogger')) { header('X-Request-Id: ' . StructuredLogger::requestId()); }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function ok(array $data = [], int $status = 200): void
    {
        self::json(['ok' => true, 'data' => $data], $status);
    }

    public static function error(string $message, int $status = 400, array $extra = []): void
    {
        self::json(array_merge(['ok' => false, 'error' => $message], $extra), $status);
    }

    public static function csv(string $filename, array $rows): void
    {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . preg_replace('/[^a-z0-9_.-]/i', '_', $filename) . '"');
        $out = fopen('php://output', 'wb');
        if ($rows === []) {
            fclose($out);
            return;
        }
        fputcsv($out, array_keys($rows[0]), ';');
        foreach ($rows as $row) {
            fputcsv($out, array_values($row), ';');
        }
        fclose($out);
    }
}
