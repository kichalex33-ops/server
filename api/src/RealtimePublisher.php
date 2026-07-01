<?php

declare(strict_types=1);

final class RealtimePublisher
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config['realtime'] ?? [];
    }

    public function publish(string $channel, string $event, array $payload): array
    {
        $provider = strtolower((string) ($this->config['provider'] ?? 'none'));
        if ($provider === '' || $provider === 'none') {
            return ['published' => false, 'provider' => 'none'];
        }

        try {
            if ($provider === 'ably') {
                return $this->publishAbly($channel, $event, $payload);
            }
            if ($provider === 'pusher') {
                return $this->publishPusher($channel, $event, $payload);
            }
        } catch (Throwable $error) {
            return ['published' => false, 'provider' => $provider, 'error' => $error->getMessage()];
        }

        return ['published' => false, 'provider' => $provider, 'error' => 'Provider realtime não suportado.'];
    }

    private function publishAbly(string $channel, string $event, array $payload): array
    {
        $apiKey = (string) ($this->config['ably_key'] ?? '');
        if ($apiKey === '') {
            return ['published' => false, 'provider' => 'ably', 'error' => 'ABLY_API_KEY ausente.'];
        }

        $url = 'https://rest.ably.io/channels/' . rawurlencode($channel) . '/messages';
        $body = json_encode(['name' => $event, 'data' => $payload], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $headers = [
            'Authorization: Basic ' . base64_encode($apiKey . ':'),
            'Content-Type: application/json',
        ];
        $status = $this->postJson($url, $body, $headers);
        return ['published' => $status >= 200 && $status < 300, 'provider' => 'ably', 'status' => $status];
    }

    private function publishPusher(string $channel, string $event, array $payload): array
    {
        $appId = (string) ($this->config['pusher_app_id'] ?? '');
        $key = (string) ($this->config['pusher_key'] ?? '');
        $secret = (string) ($this->config['pusher_secret'] ?? '');
        $cluster = (string) ($this->config['pusher_cluster'] ?? 'mt1');
        if ($appId === '' || $key === '' || $secret === '') {
            return ['published' => false, 'provider' => 'pusher', 'error' => 'PUSHER_APP_ID/KEY/SECRET ausentes.'];
        }

        $body = json_encode([
            'name' => $event,
            'channels' => [$channel],
            'data' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';

        $path = '/apps/' . rawurlencode($appId) . '/events';
        $query = [
            'auth_key' => $key,
            'auth_timestamp' => (string) time(),
            'auth_version' => '1.0',
            'body_md5' => md5($body),
        ];
        ksort($query);
        $queryString = http_build_query($query, '', '&', PHP_QUERY_RFC3986);
        $signature = hash_hmac('sha256', "POST\n{$path}\n{$queryString}", $secret);
        $url = 'https://api-' . rawurlencode($cluster) . '.pusher.com' . $path . '?' . $queryString . '&auth_signature=' . $signature;
        $status = $this->postJson($url, $body, ['Content-Type: application/json']);
        return ['published' => $status >= 200 && $status < 300, 'provider' => 'pusher', 'status' => $status];
    }

    private function postJson(string $url, string $body, array $headers): int
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $body,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
            ]);
            curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);
            return $status;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => $body,
                'timeout' => 5,
                'ignore_errors' => true,
            ],
        ]);
        @file_get_contents($url, false, $context);
        $statusLine = $http_response_header[0] ?? '';
        if (preg_match('/\s(\d{3})\s/', $statusLine, $matches)) {
            return (int) $matches[1];
        }
        return 0;
    }
}
