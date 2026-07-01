<?php

declare(strict_types=1);

final class Jwt
{
    private string $secret;
    private string $issuer;

    public function __construct(string $secret, string $issuer)
    {
        $this->secret = $secret;
        $this->issuer = $issuer;
    }

    public function sign(array $claims, int $ttl): string
    {
        $this->assertConfigured();
        $now = time();
        $payload = array_merge($claims, [
            'iss' => $this->issuer,
            'iat' => $now,
            'exp' => $now + $ttl,
        ]);
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $segments = [$this->b64(json_encode($header) ?: '{}'), $this->b64(json_encode($payload) ?: '{}')];
        $segments[] = $this->b64(hash_hmac('sha256', implode('.', $segments), $this->secret, true));
        return implode('.', $segments);
    }

    public function verify(string $token): array
    {
        $this->assertConfigured();
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('Token inválido.');
        }
        [$header, $payload, $signature] = $parts;
        $decodedHeader = json_decode($this->unb64($header), true);
        if (!is_array($decodedHeader) || ($decodedHeader['alg'] ?? '') !== 'HS256' || ($decodedHeader['typ'] ?? '') !== 'JWT') {
            throw new RuntimeException('Token inválido.');
        }
        $expected = $this->b64(hash_hmac('sha256', $header . '.' . $payload, $this->secret, true));
        if (!hash_equals($expected, $signature)) {
            throw new RuntimeException('Assinatura invalida.');
        }
        $claims = json_decode($this->unb64($payload), true);
        if (!is_array($claims) || ($claims['exp'] ?? 0) < time()) {
            throw new RuntimeException('Token expirado.');
        }
        // H526: validar claim iss - rejeita tokens de ambientes diferentes
        if (($claims['iss'] ?? '') !== $this->issuer) {
            throw new RuntimeException('Token de emissor invalido.');
        }
        return $claims;
    }

    private function assertConfigured(): void
    {
        if (trim($this->secret) === '') {
            throw new RuntimeException('JWT_SECRET nao configurado.');
        }
    }

    private function b64(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function unb64(string $value): string
    {
        $padded = strtr($value, '-_', '+/');
        $padded .= str_repeat('=', (4 - strlen($padded) % 4) % 4);
        return base64_decode($padded, true) ?: '';
    }
}
